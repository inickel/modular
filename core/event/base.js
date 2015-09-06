define(function(require, exports, module) {

	var UNDEFINED;
	var Tools = require('../tools');
	var returnFalse = function() {
		return false;
	};
	var returnTrue = function() {
		return true;
	};

	//event base object
	var _Object = function() {
		var self = this;
		self.timeStamp = util.now();
		self.target = UNDEFINED;
		self.currentTarget = UNDEFINED;
	}

	_Object.prototype = {
		isEventObject: 1,
		constructor: EventObject,
		isDefaultPrevented: returnFalse,
		isPropagationStopped: returnFalse,
		isImmediatePropagationStopped: returnFalse,
		//阻止事件默认行为
		preventDefault: function() {
			this.isDefaultPrevented = returnTrue;
		},
		//停止事件冒泡
		stopPropagation: function() {
			this.isPropagationStopped = returnTrue;
		},
		//立即中断事件冒泡
		stopImmediatePropagation: function() {
			var self = this;
			self.isImmediatePropagationStopped = returnTrue;
			self.stopPropagation();
		},
		//中断事件传递
		halt: function(immediate) {
			var self = this;
			if (immediate) {
				self.stopImmediatePropagation();
			} else {
				self.stopPropagation();
			}
			self.preventDefault();
		}
	};

	//可观察的事件对象
	var Observable = function(cfg) {
		var self = this;
		self.currentTarget = null;
		Tools.mix(self, cfg);
		self.reset();
	}

	Observable.prototype = {
		constructor: Observable,
		//是否有观察者
		hasObserver: function() {
			return !!this.observers.length;
		},
		//清空观察者列表
		reset: function() {
			var self = this;
			self.observers = [];
		},
		//删除观察者
		removeObserver: function(observer) {
			var self = this,
				i,
				observers = self.observers,
				len = observers.length;
			for (i = 0; i < len; i++) {
				if (observers[i] === observer) {
					observers.splice(i, 1);
					break;
				}
			}
			self.checkMemory();
		},
		findObserver: function(observer) {
			var observers = this.observers,
				i;

			for (i = observers.length - 1; i >= 0; --i) {

				if (observer.equals(observers[i])) {
					return i;
				}
			}

			return -1;
		},
		checkMemory: function() {
			//wh 4?
		}
	};

	var Observer = function(cfg) {
		this.config = cfg || {};
	};

	//事件观察者
	Observer.prototype = {
		constructor: Observer,
		equals: function(s2) {
			var self = this;
			return !!Tools.reduce(self.keys, function(v, k) {
				return v && (self.config[k] === s2.config[k]);
			}, 1);
		},
		notifySimple: function(event, ce) {
			var result,
				self = this,
				config = self.config;
			result = config.fn.call(config.conetxt || ce.currentTarget, event, config.data);
			if (config.once) {
				ce.removeObserver(self);
			}
			return result;
		},
		notifyInternal: function(event, ce) {
			var result = this.notifySimple(event, ce);
			if (result === false) {
				event.halt();
			}
			return result;
		},
		notify: function(event, ce) {
			var self = this,
				config = self.config,
				groups = event.__groups;

			if (groups && (!config.groups || !config.groups.mathc(groups))) {
				return UNDEFINED;
			}
			return self.notifyInternal(event, ce);

		}
	};

	var splitAndRun,
		getGroupsRe,
		getTypedGroups;


	splitAndRun = function(type, fn) {
		if (Tools.isArray(type)) {
			ToolsTools.each(type, fn);
			return;
		}
		type = Tools.trim(type);
		if (type.indexOf(' ') === -1) {
			fn(type);
		} else {
			Tools.each(type.split(/\s+/), fn);
		}
	}

	getGroupsReg = function(groups) {
			return new RegExp(groups.split('.').join('.*\\.') + '(?:\\.|$)');
		}
		//'a.b.c' => ['a','b.c']
	getTypedGroups = function(type) {
		if (type.indexOf('.') < 0) {
			return [type, ''];
		}
		var m = type.match(/([^.]+)?(\..+)?$/),
			t = m[1],
			ret = [t],
			gs = m[2];
		if (gs) {
			gs = gs.split('.').sort();
			ret.push(gs.join('.'));
		} else {
			ret.push('');
		}
		return ret;
	}

	var Utils = {
		splitAndRun: splitAndRun,

		//识别事件分组
		normalizeParam: function(type, fn, context) {
			var cfg = fn || {};

			if (typeof fn === 'function') {
				cfg = {
					fn: fn,
					context: context
				};
			} else {
				// copy
				cfg = Tools.merge(cfg);
			}

			var typedGroups = getTypedGroups(type);

			type = typedGroups[0];

			cfg.groups = typedGroups[1];

			cfg.type = type;

			return cfg;
		},
		//
		batchForType: function(fn, num) {
			var args = Tools.makeArray(arguments),
				types = args[2 + num];
			// in case null
			// Tools.isObject([]) === false
			if (types && Tools.isObject(types)) {
				Tools.each(types, function(value, type) {
					var args2 = [].concat(args);
					args2.splice(0, 2);
					args2[num] = type;
					args2[num + 1] = value;
					fn.apply(null, args2);
				});
			} else {
				splitAndRun(types, function(type) {
					var args2 = [].concat(args);
					args2.splice(0, 2);
					args2[num] = type;
					fn.apply(null, args2);
				});
			}
		},

		fillGroupsForEvent: function(type, eventData) {
			var typedGroups = getTypedGroups(type),
				_ksGroups = typedGroups[1];

			if (_ksGroups) {
				_ksGroups = getGroupsReg(_ksGroups);
				eventData._ksGroups = _ksGroups;
			}

			eventData.type = typedGroups[0];
		},

		getGroupsReg: getGroupsReg
	};


	module.exports = {
		Utils: Utils,
		Object: _Object,
		Observer: Observer,
		Observable: Observable
	};

});