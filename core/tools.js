var enumProperties = 'constructor,hasOwnProperty,isPrototypeOf,propertyIsEnumerable,toString,toLocaleString,valueOf'.split(',');
var Obj = Object;
var objectCreate = Obj.create;
var toString = {}.toString;
var COMPARE_MARKER = '__~compared';
var MIX_CIRCULAR_DETECTION = '__MIX_CIRCULAR';
var STAMP_MARKER = '__~stamped';
var CLONE_MARKER = '__~cloned';
var host = typeof window === 'undefined' ? global : window;


function hasKey(obj, keyName) {
	return obj !== null && obj !== undefined && obj[keyName] !== undefined;
}

function cleanAndReturn(a, b, ret) {
	delete a[COMPARE_MARKER];
	delete b[COMPARE_MARKER];
	return ret;
}

function compareObjects(a, b) {
	if (a[COMPARE_MARKER] === b && b[COMPARE_MARKER] === a) {
		return true;
	}
	a[COMPARE_MARKER] = b;
	b[COMPARE_MARKER] = a;
	for (var property in b) {
		if (!hasKey(a, property) && hasKey(b, property)) {
			return cleanAndReturn(a, b, false);
		}
	}
	for (property in a) {
		if (!hasKey(b, property) && hasKey(a, property)) {
			return cleanAndReturn(a, b, false);
		}
	}
	for (property in b) {
		if (property === COMPARE_MARKER) {
			continue;
		}
		if (!tools.equals(a[property], b[property])) {
			return cleanAndReturn(a, b, false);
		}
	}
	if (tools.isArray(a) && tools.isArray(b) && a.length !== b.length) {
		return cleanAndReturn(a, b, false);
	}
	return cleanAndReturn(a, b, true);
};

var tools = {
	equals: function(a, b) {
		if (a === b) {
			return true;
		}
		if (a === undefined || a === null || b === undefined || b === null) {
			return a == null && b == null;
		}
		if (a instanceof Date && b instanceof Date) {
			return a.getTime() === b.getTime();
		}
		if (typeof a === 'string' && typeof b === 'string') {
			return a === b;
		}
		if (typeof a === 'number' && typeof b === 'number') {
			return a === b;
		}
		if (typeof a === 'object' && typeof b === 'object') {
			return compareObjects(a, b);
		}
		return a === b;
	},
	keys: Object.keys || function(o) {
		var result = [],
			p, i;
		for (p in o) {
			if (o.hasOwnProperty(p)) {
				result.push(p);
			}
		}
		if (hasEnumBug) {
			for (i = enumProperties.length - 1; i >= 0; i--) {
				p = enumProperties[i];
				if (o.hasOwnProperty(p)) {
					result.push(p);
				}
			}
		}
		return result;
	},
	each: function(object, fn, context) {
		if (object) {
			var key, val, keys, i = 0,
				length = object && object.length,
				isObj = length === undefined || toString.call(object) === '[object Function]';
			context = context || null;
			if (isObj) {
				keys = tools.keys(object);
				for (; i < keys.length; i++) {
					key = keys[i];
					if (fn.call(context, object[key], key, object) === false) {
						break;
					}
				}
			} else {
				for (val = object[0]; i < length; val = object[++i]) {
					if (fn.call(context, val, i, object) === false) {
						break;
					}
				}
			}
		}
		return object;
	},
	now: Date.now || function() {
		return +new Date();
	},
	isEmptyObject: function(o) {
		for (var p in o) {
			if (p !== undefined) {
				return false;
			}
		}
		return true;
	},
	stamp: function(o, readOnly, marker) {
		marker = marker || STAMP_MARKER;
		var guid = o[marker];
		if (guid) {
			return guid;
		} else if (!readOnly) {
			try {
				guid = o[marker] = tools.guid(marker);
			} catch (e) {
				guid = undefined;
			}
		}
		return guid;
	},
	mix: function(r, s, ov, wl, deep) {
		var structured;
		if (typeof ov === 'object') {
			wl = ov.whitelist;
			deep = ov.deep;
			structured = ov.structured;
			ov = ov.overwrite;
		}
		if (wl && typeof wl !== 'function') {
			var originalWl = wl;
			wl = function(name, val) {
				return tools.inArray(name, originalWl) ? val : undefined;
			};
		}
		if (ov === undefined) {
			ov = true;
		}
		if (structured === undefined) {
			structured = true;
		}
		var cache = [];
		var i = 0;
		var c;
		mixInternal(r, s, ov, wl, deep, cache, structured);
		while (c = cache[i++]) {
			delete c[MIX_CIRCULAR_DETECTION];
		}
		return r;
	},
	merge: function(varArgs) {
		varArgs = tools.makeArray(arguments);
		var o = {},
			i, l = varArgs.length;
		for (i = 0; i < l; i++) {
			tools.mix(o, varArgs[i]);
		}
		return o;
	},
	augment: function(r, varArgs) {
		var args = tools.makeArray(arguments),
			len = args.length - 2,
			i = 1,
			proto, arg, ov = args[len],
			wl = args[len + 1];
		args[1] = varArgs;
		if (!tools.isArray(wl)) {
			ov = wl;
			wl = undefined;
			len++;
		}
		if (typeof ov !== 'boolean') {
			ov = undefined;
			len++;
		}
		for (; i < len; i++) {
			arg = args[i];
			if (proto = arg.prototype) {
				arg = tools.mix({}, proto, true, removeConstructor);
			}
			tools.mix(r.prototype, arg, ov, wl);
		}
		return r;
	},
	extend: function(r, s, px, sx) {
		var sp = s.prototype,
			rp;
		sp.constructor = s;
		rp = createObject(sp, r);
		r.prototype = tools.mix(rp, r.prototype);
		r.superclass = sp;
		if (px) {
			tools.mix(rp, px);
		}
		if (sx) {
			tools.mix(r, sx);
		}
		return r;
	},
	namespace: function(name, holder) {
		var o, j, p;
		p = name.split('.');
		o = holder || host;
		for (j = 0; j < p.length; ++j) {
			o = o[p[j]] = o[p[j]] || {};
		}
		return o;
	},
	clone: function(input, filter) {
		var structured;
		if (typeof filter === 'object') {
			structured = filter.structured;
			filter = filter.filter;
		}
		if (structured === undefined) {
			structured = true;
		}
		var memory;
		if (structured) {
			memory = {};
		}
		var ret = cloneInternal(input, filter, memory, structured);
		if (structured) {
			tools.each(memory, function(v) {
				v = v.input;
				if (v[CLONE_MARKER]) {
					try {
						delete v[CLONE_MARKER];
					} catch (e) {
						v[CLONE_MARKER] = undefined;
					}
				}
			});
		}
		memory = null;
		return ret;
	}
};