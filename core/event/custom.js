var Base = require('./base');
var Tools = require('../../tools');

function _Object(data) {
	_Object.superclass.constructor.call(this);
	Tools.mix(this, data);
}

Tools.extend(_Object, Base.Object);


function Observable() {
	var self = this;
	Observable.superclass.constructor.apply(self, arguments);
	self.defaultFn = null;
	self.defaultTargetOnly = false;
	self.bubbles = true;
}

Tools.extend(Observable, Base.Observable, {
	//注册
	on: function(cfg) {
		var observer = new Observer(cfg);
		if (this.findObserver(observer) === -1) {
			this.observers.push(observer);
		}
	},
	//派发
	fire: function(eventData) {
		eventData = eventData || {};

		var self = this,
			bubbles = self.bubbles,
			currentTarget = self.currentTarget,
			parents,
			parentsLen,
			type = self.type,
			defaultFn = self.defaultFn,
			i,
			customEventObject = eventData,
			gRet, ret;

		eventData.type = type;

		if (!customEventObject.isEventObject) {
			customEventObject = new _Object(customEventObject);
		}

		customEventObject.target = customEventObject.target || currentTarget;
		customEventObject.currentTarget = currentTarget;

		ret = self.notify(customEventObject);

		if (gRet !== false && ret !== undefined) {
			gRet = ret;
		}

		// gRet === false prevent
		if (bubbles && !customEventObject.isPropagationStopped()) {
			parents = currentTarget.getTargets();

			parentsLen = parents && parents.length || 0;

			for (i = 0; i < parentsLen && !customEventObject.isPropagationStopped(); i++) {
				ret = parents[i].fire(type, customEventObject);

				// false 优先返回
				if (gRet !== false && ret !== undefined) {
					gRet = ret;
				}
			}
		}

		// bubble first
		// parent defaultFn first
		// child defaultFn last
		if (defaultFn && !customEventObject.isDefaultPrevented()) {
			var target = customEventObject.target,
				lowestCustomEventObservable = target.getEventListeners(customEventObject.type);
			if ((!self.defaultTargetOnly &&
					// defaults to false
					(!lowestCustomEventObservable || !lowestCustomEventObservable.defaultTargetOnly)) ||
				currentTarget === target) {
				// default value as final value if possible
				gRet = defaultFn.call(currentTarget, customEventObject);
			}
		}

		return gRet;

	},
	notify: function(event) {
		var observers = [].concat(this.observers),
			ret,
			gRet,
			len = observers.length,
			i;

		for (i = 0; i < len && !event.isImmediatePropagationStopped(); i++) {
			ret = observers[i].notify(event, this);
			if (gRet !== false && ret !== undefined) {
				gRet = ret;
			}
		}

		return gRet;
	},
	//取消
	detach: function(cfg) {
		var groupsRe,
			self = this,
			fn = cfg.fn,
			context = cfg.context,
			currentTarget = self.currentTarget,
			observers = self.observers,
			groups = cfg.groups;

		if (!observers.length) {
			return;
		}

		if (groups) {
			groupsRe = Utils.getGroupsRe(groups);
		}

		var i, j, t, observer, observerContext, len = observers.length;

		// 移除 fn
		if (fn || groupsRe) {
			context = context || currentTarget;

			for (i = 0, j = 0, t = []; i < len; ++i) {
				observer = observers[i];
				var observerConfig = observer.config;
				observerContext = observerConfig.context || currentTarget;
				if (
					(context !== observerContext) ||
					// 指定了函数，函数不相等，保留
					(fn && fn !== observerConfig.fn) ||
					// 指定了删除的某些组，而该 observer 不属于这些组，保留，否则删除
					(groupsRe && !observerConfig.groups.match(groupsRe))
				) {
					t[j++] = observer;
				}
			}

			self.observers = t;
		} else {
			self.reset();
		}

		// does not need to clear memory if customEvent has no observer
		// customEvent has defaultFn .....!
		// self.checkMemory();
	}
});

//事件观察者
function Observer() {
	Observer.superclass.constructor.apply(this, arguments);
}

Tools.extend(Observer, Base.Observer, {
	keys: ['fn', 'context', 'groups']
});

var Utils = Base.Utils,
	splitAndRun = Utils.splitAndRun;

var BUBBLE_TARGETS = '~bubble_targets';
var CUSTOM_EVENTS = '~custom_events';

function getCustomEventObservable(self, type) {
	var customEvent = self.getEventListeners(type);
	if (!customEvent) {
		customEvent = self.getEventListeners()[type] = new Observable({
			currentTarget: self,
			type: type
		});
	}
	return customEvent;
}

var Target = {
	isTarget: 1,
	fire: function(type, eventData) {
		var self = this,
			ret,
			targets = self.getTargets(),
			hasTargets = targets && targets.length;

		if (type.isEventObject) {
			eventData = type;
			type = type.type;
		}

		eventData = eventData || {};

		splitAndRun(type, function(type) {

			var r2, customEventObservable;

			Utils.fillGroupsForEvent(type, eventData);

			type = eventData.type;

			// default bubble true
			// if bubble false, it must has customEvent structure set already
			customEventObservable = self.getEventListeners(type);

			// optimize performance for empty event listener
			if (!customEventObservable && !hasTargets) {
				return;
			}

			if (customEventObservable) {

				if (!customEventObservable.hasObserver() && !customEventObservable.defaultFn) {

					if (customEventObservable.bubbles && !hasTargets || !customEventObservable.bubbles) {
						return;
					}

				}

			} else {
				// in case no publish custom event but we need bubble
				// because bubbles defaults to true!
				customEventObservable = new Observable({
					currentTarget: self,
					type: type
				});
			}

			r2 = customEventObservable.fire(eventData);

			if (ret !== false && r2 !== undefined) {
				ret = r2;
			}

		});

		return ret;
	},
	publish: function(type, cfg) {
		var customEventObservable,
			self = this;

		splitAndRun(type, function(t) {
			customEventObservable = getCustomEventObservable(self, t);
			Tools.mix(customEventObservable, cfg);
		});

		return self;
	},
	addTarget: function(anotherTarget) {
		var self = this,
			targets = self.getTargets();
		if (!Tools.inArray(anotherTarget, targets)) {
			targets.push(anotherTarget);
		}
		return self;
	},
	removeTarget: function(anotherTarget) {
		var self = this,
			targets = self.getTargets(),
			index = Tools.indexOf(anotherTarget, targets);
		if (index !== -1) {
			targets.splice(index, 1);
		}
		return self;
	},
	getTargets: function() {
		return this[BUBBLE_TARGETS] || (this[BUBBLE_TARGETS] = []);
	},

	getEventListeners: function(type) {
		var observables = this[CUSTOM_EVENTS] || (this[CUSTOM_EVENTS] = {});
		return type ? observables[type] : observables;
	},
	on: function(type, fn, context) {
		var self = this;
		Utils.batchForType(function(type, fn, context) {
			var cfg = Utils.normalizeParam(type, fn, context);
			type = cfg.type;
			var customEvent = getCustomEventObservable(self, type);
			customEvent.on(cfg);
		}, 0, type, fn, context);
		return self;
	},
	detach: function(type, fn, context) {
		var self = this;
		Utils.batchForType(function(type, fn, context) {
			var cfg = Utils.normalizeParam(type, fn, context);
			type = cfg.type;
			if (type) {
				var customEvent = self.getEventListeners(type);
				if (customEvent) {
					customEvent.detach(cfg);
				}
			} else {
				Tools.each(self.getEventListeners(), function(customEvent) {
					customEvent.detach(cfg);
				});
			}
		}, 0, type, fn, context);

		return self; // chain
	}
};

module.exports = {
	Target: Target,
	Object: _Object,
	global: Tools.mix({}, Target)
};