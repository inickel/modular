var enumProperties = 'constructor,hasOwnProperty,isPrototypeOf,propertyIsEnumerable,toString,toLocaleString,valueOf'.split(',');
var types = 'Boolean,Number,String,Function,Date,RegExp,Object,Array'.split(',');

var objectCreate = Object.create;
var toString = Object.prototype.toString;
var host = typeof window === 'undefined' ? global : window;
var trim = String.prototype.trim;
var class2type = {};
var MIX_CIRCULAR_DETECTION = '__MIX_CIRCULAR';

var MARKER_COMPARED = '__~compared';
var MARKER_STAMPED = '__~stamped';
var MARKER_CLONED = '__~cloned';
var EMPTY = '';
var REG_SUBSTITUTE = /\\?\{([^{}]+)\}/g;
var REG_TRIM = /^[\s\xa0]+|[\s\xa0]+$/g;
var REG_DASH = /-([a-z])/gi;

var AP = Array.prototype,
	indexOf = AP.indexOf,
	lastIndexOf = AP.lastIndexOf,
	filter = AP.filter,
	every = AP.every,
	some = AP.some,
	map = AP.map;

function bindFn(r, fn, obj) {
	function FNOP() {}
	var slice = [].slice,
		args = slice.call(arguments, 3),
		bound = function() {
			var inArgs = slice.call(arguments);
			return fn.apply(this instanceof FNOP ? this : obj || this, r ? inArgs.concat(args) : args.concat(inArgs));
		};
	FNOP.prototype = fn.prototype;
	bound.prototype = new FNOP();
	return bound;
}

function hasKey(obj, keyName) {
	return obj !== null && obj !== undefined && obj[keyName] !== undefined;
}

function cleanAndReturn(a, b, ret) {
	delete a[MARKER_COMPARED];
	delete b[MARKER_COMPARED];
	return ret;
}

function compareObjects(a, b) {
	if (a[MARKER_COMPARED] === b && b[MARKER_COMPARED] === a) {
		return true;
	}
	a[MARKER_COMPARED] = b;
	b[MARKER_COMPARED] = a;
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
		if (property === MARKER_COMPARED) {
			continue;
		}
		if (!Tools.equals(a[property], b[property])) {
			return cleanAndReturn(a, b, false);
		}
	}
	if (Tools.isArray(a) && Tools.isArray(b) && a.length !== b.length) {
		return cleanAndReturn(a, b, false);
	}
	return cleanAndReturn(a, b, true);
}

function hasOwnProperty(o, p) {
	return Object.prototype.hasOwnProperty.call(o, p);
}

var Tools = {
	type: function(o) {
		return o == null ? String(o) : class2type[toString.call(o)] || 'object';
	},
	isPlainObject: function(obj) {
		if (!obj || Tools.type(obj) !== 'object' || obj.nodeType || obj.window == obj) {
			return false;
		}
		var key, objConstructor;
		try {
			if ((objConstructor = obj.constructor) && !hasOwnProperty(obj, 'constructor') && !hasOwnProperty(objConstructor.prototype, 'isPrototypeOf')) {
				return false;
			}
		} catch (e) {
			return false;
		}
		for (key in obj) {}
		return key === undefined || hasOwnProperty(obj, key);
	},
	startsWith: function(str, prefix) {
		return str.lastIndexOf(prefix, 0) === 0;
	},
	endsWith: function(str, suffix) {
		var ind = str.length - suffix.length;
		return ind >= 0 && str.indexOf(suffix, ind) === ind;
	},
	trim: trim ? function(str) {
		return str == null ? EMPTY : trim.call(str);
	} : function(str) {
		return str == null ? EMPTY : (str + '').replace(REG_TRIM, EMPTY);
	},
	urlEncode: function(s) {
		return encodeURIComponent(String(s));
	},
	urlDecode: function(s) {
		return decodeURIComponent(s.replace(/\+/g, ' '));
	},
	camelCase: function(name) {
		if (name.indexOf('-') === -1) {
			return name;
		}
		return name.replace(REG_DASH, upperCase);
	},
	substitute: function(str, o, regexp) {
		if (typeof str !== 'string' || !o) {
			return str;
		}
		return str.replace(regexp || REG_SUBSTITUTE, function(match, name) {
			if (match.charAt(0) === '\\') {
				return match.slice(1);
			}
			return o[name] === undefined ? EMPTY : o[name];
		});
	},
	ucfirst: function(s) {
		s += '';
		return s.charAt(0).toUpperCase() + s.substring(1);
	},
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
				keys = Tools.keys(object);
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
	now: function() {
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
		marker = marker || MARKER_STAMPED;
		var guid = o[marker];
		if (guid) {
			return guid;
		} else if (!readOnly) {
			try {
				guid = o[marker] = Tools.guid(marker);
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
				return Tools.inArray(name, originalWl) ? val : undefined;
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
		varArgs = Tools.makeArray(arguments);
		var o = {},
			i, l = varArgs.length;
		for (i = 0; i < l; i++) {
			Tools.mix(o, varArgs[i]);
		}
		return o;
	},
	augment: function(r, varArgs) {
		var args = Tools.makeArray(arguments),
			len = args.length - 2,
			i = 1,
			proto, arg, ov = args[len],
			wl = args[len + 1];
		args[1] = varArgs;
		if (!Tools.isArray(wl)) {
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
				arg = Tools.mix({}, proto, true, removeConstructor);
			}
			Tools.mix(r.prototype, arg, ov, wl);
		}
		return r;
	},
	extend: function(r, s, px, sx) {
		var sp = s.prototype,
			rp;
		sp.constructor = s;
		rp = createObject(sp, r);
		r.prototype = Tools.mix(rp, r.prototype);
		r.superclass = sp;
		if (px) {
			Tools.mix(rp, px);
		}
		if (sx) {
			Tools.mix(r, sx);
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
			Tools.each(memory, function(v) {
				v = v.input;
				if (v[MARKER_CLONED]) {
					try {
						delete v[MARKER_CLONED];
					} catch (e) {
						v[MARKER_CLONED] = undefined;
					}
				}
			});
		}
		memory = null;
		return ret;
	},
	noop: function() {},
	bind: bindFn(0, bindFn, null, 0),
	rbind: bindFn(0, bindFn, null, 1),
	later: function(fn, when, periodic, context, data) {
		when = when || 0;
		var m = fn,
			d = Tools.makeArray(data),
			f, r;
		if (typeof fn === 'string') {
			m = context[fn];
		}
		f = function() {
			m.apply(context, d);
		};
		r = periodic ? setInterval(f, when) : setTimeout(f, when);
		return {
			id: r,
			interval: periodic,
			cancel: function() {
				if (this.interval) {
					clearInterval(r);
				} else {
					clearTimeout(r);
				}
			}
		};
	},
	throttle: function(fn, ms, context) {
		ms = ms || 150;
		if (ms === -1) {
			return function() {
				fn.apply(context || this, arguments);
			};
		}
		var last = Tools.now();
		return function() {
			var now = Tools.now();
			if (now - last > ms) {
				last = now;
				fn.apply(context || this, arguments);
			}
		};
	},
	buffer: function(fn, ms, context) {
		ms = ms || 150;
		if (ms === -1) {
			return function() {
				fn.apply(context || this, arguments);
			};
		}
		var bufferTimer = null;

		function f() {
			f.stop();
			bufferTimer = Tools.later(fn, ms, 0, context || this, arguments);
		}
		f.stop = function() {
			if (bufferTimer) {
				bufferTimer.cancel();
				bufferTimer = 0;
			}
		};
		return f;
	},
	isArray:function(){},
	indexOf: indexOf ? function(item, arr, fromIndex) {
		return fromIndex === undefined ? indexOf.call(arr, item) : indexOf.call(arr, item, fromIndex);
	} : function(item, arr, fromIndex) {
		for (var i = fromIndex || 0, len = arr.length; i < len; ++i) {
			if (arr[i] === item) {
				return i;
			}
		}
		return -1;
	},
	lastIndexOf: lastIndexOf ? function(item, arr, fromIndex) {
		return fromIndex === undefined ? lastIndexOf.call(arr, item) : lastIndexOf.call(arr, item, fromIndex);
	} : function(item, arr, fromIndex) {
		if (fromIndex === undefined) {
			fromIndex = arr.length - 1;
		}
		for (var i = fromIndex; i >= 0; i--) {
			if (arr[i] === item) {
				break;
			}
		}
		return i;
	},
	unique: function(a, override) {
		var b = a.slice();
		if (override) {
			b.reverse();
		}
		var i = 0,
			n, item;
		while (i < b.length) {
			item = b[i];
			while ((n = Tools.lastIndexOf(item, b)) !== i) {
				b.splice(n, 1);
			}
			i += 1;
		}
		if (override) {
			b.reverse();
		}
		return b;
	},
	inArray: function(item, arr) {
		return Tools.indexOf(item, arr) > -1;
	},
	filter: filter ? function(arr, fn, context) {
		return filter.call(arr, fn, context || this);
	} : function(arr, fn, context) {
		var ret = [];
		Tools.each(arr, function(item, i, arr) {
			if (fn.call(context || this, item, i, arr)) {
				ret.push(item);
			}
		});
		return ret;
	},
	map: map ? function(arr, fn, context) {
		return map.call(arr, fn, context || this);
	} : function(arr, fn, context) {
		var len = arr.length,
			res = new Array(len);
		for (var i = 0; i < len; i++) {
			var el = typeof arr === 'string' ? arr.charAt(i) : arr[i];
			if (el || i in arr) {
				res[i] = fn.call(context || this, el, i, arr);
			}
		}
		return res;
	},
	reduce: function(arr, callback, initialValue) {
		var len = arr.length;
		if (typeof callback !== 'function') {
			throw new TypeError('callback is not function!');
		}
		if (len === 0 && arguments.length === 2) {
			throw new TypeError('arguments invalid');
		}
		var k = 0;
		var accumulator;
		if (arguments.length >= 3) {
			accumulator = initialValue;
		} else {
			do {
				if (k in arr) {
					accumulator = arr[k++];
					break;
				}
				k += 1;
				if (k >= len) {
					throw new TypeError();
				}
			} while (TRUE);
		}
		while (k < len) {
			if (k in arr) {
				accumulator = callback.call(undefined, accumulator, arr[k], k, arr);
			}
			k++;
		}
		return accumulator;
	},
	every: every ? function(arr, fn, context) {
		return every.call(arr, fn, context || this);
	} : function(arr, fn, context) {
		var len = arr && arr.length || 0;
		for (var i = 0; i < len; i++) {
			if (i in arr && !fn.call(context, arr[i], i, arr)) {
				return false;
			}
		}
		return TRUE;
	},
	some: some ? function(arr, fn, context) {
		return some.call(arr, fn, context || this);
	} : function(arr, fn, context) {
		var len = arr && arr.length || 0;
		for (var i = 0; i < len; i++) {
			if (i in arr && fn.call(context, arr[i], i, arr)) {
				return TRUE;
			}
		}
		return false;
	},
	makeArray: function(o) {
		if (o == null) {
			return [];
		}
		if (Tools.isArray(o)) {
			return o;
		}
		var lengthType = typeof o.length,
			oType = typeof o;
		if (lengthType !== 'number' || typeof o.nodeName === 'string' || o != null && o == o.window || oType === 'string' || oType === 'function' && !('item' in o && lengthType === 'number')) {
			return [o];
		}
		var ret = [];
		for (var i = 0, l = o.length; i < l; i++) {
			ret[i] = o[i];
		}
		return ret;
	}

};

for (var i = 0; i < types.length; i++) {
	(function(name, lc) {
		class2type['[object ' + name + ']'] = lc = name.toLowerCase();
		Tools['is' + name] = function(o) {
			return Tools.type(o) === lc;
		};
	}(types[i], i));
}

Tools.isArray = Array.isArray || Tools.isArray;

module.exports = Tools;