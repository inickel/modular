var undefined, key, $, classList, emptyArray = [],
	concat = emptyArray.concat,
	filter = emptyArray.filter,
	slice = emptyArray.slice,
	document = window.document,
	elementDisplay = {},
	classCache = {},
	cssNumber = {
		'column-count': 1,
		'columns': 1,
		'font-weight': 1,
		'line-height': 1,
		'opacity': 1,
		'z-index': 1,
		'zoom': 1
	},
	singleTagRE = /^<(\w+)\s*\/?>(?:<\/\1>|)$/,
	tagExpanderRE = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/ig,
	rootNodeRE = /^(?:body|html)$/i,
	capitalRE = /([A-Z])/g,
	readyRE = /complete|loaded|interactive/,
	simpleSelectorRE = /^[\w-]*$/,
	// special attributes that should be get/set via method calls
	methodAttributes = ['val', 'css', 'html', 'text', 'data', 'width', 'height', 'offset'],

	adjacencyOperators = ['after', 'prepend', 'before', 'append'],
	table = document.createElement('table'),
	tableRow = document.createElement('tr'),
	containers = {
		'tr': document.createElement('tbody'),
		'tbody': table,
		'thead': table,
		'tfoot': table,
		'td': tableRow,
		'th': tableRow,
		'*': document.createElement('div')
	},
	toString = class2type.toString,
	xdom = {},
	camelize, uniq,
	tempParent = document.createElement('div'),
	propMap = {
		'tabindex': 'tabIndex',
		'readonly': 'readOnly',
		'for': 'htmlFor',
		'class': 'className',
		'maxlength': 'maxLength',
		'cellspacing': 'cellSpacing',
		'cellpadding': 'cellPadding',
		'rowspan': 'rowSpan',
		'colspan': 'colSpan',
		'usemap': 'useMap',
		'frameborder': 'frameBorder',
		'contenteditable': 'contentEditable'
	},
	isArray = Array.isArray || function(object) {
		return object instanceof Array
	};

var class2type = {};
var REG_FRAGMENT = /^\s*<(\w+|!)[^>]*>/;
var REG_TAG_EXPANDER = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/ig;
var REG_TAG_SINGLE = /^<(\w+)\s*\/?>(?:<\/\1>|)$/;
var toString = Object.prototype.toString;

function hasOwnProperty(o, p) {
	return Object.prototype.hasOwnProperty.call(o, p);
}

var Tools = {
	compact: function(array) {
		return Array.prototype.filter.call(array, function(item) {
			return item != null;
		});
	},
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
};
var types = 'Boolean,Number,String,Function,Date,RegExp,Object,Array'.split(',');

for (var i = 0; i < types.length; i++) {
	(function(name, lc) {
		class2type['[object ' + name + ']'] = lc = name.toLowerCase();
		Tools['is' + name] = function(o) {
			return Tools.type(o) === lc;
		};
	}(types[i], i));
}

Tools.isArray = Array.isArray || Tools.isArray;

function DOM(dom, selector) {
	var i, length = dom ? dom.length : 0
	for (i = 0; i < length; i++) {
		this[i] = dom[i];
	}
	this.length = length;
	this.selector = selector || '';
}

xdom.fragment = function(html, name, properties) {
	var dom, nodes, container;

	if (REG_TAG_SINGLE.test(html)) {
		dom = $(document.createElement(RegExp.$1));
	}

	if (!dom) {
		if (html.replace)
			html = html.replace(REG_TAG_EXPANDER, "<$1></$2>");
		if (name === undefined) {
			name = REG_FRAGMENT.test(html) && RegExp.$1;
		}
		if (!(name in containers)) {
			name = '*';
		}

		container = containers[name];
		container.innerHTML = '' + html;
		dom = $.each(slice.call(container.childNodes), function() {
			container.removeChild(this);
		});
	}

	var hook_methods = ['val', 'css', 'html', 'text', 'data', 'width', 'height', 'offset'];

	if (Tools.isPlainObject(properties)) {
		nodes = $(dom);
		$.each(properties, function(key, value) {
			if (hook_methods.indexOf(key) > -1) {
				nodes[key](value);
			} else {
				nodes.attr(key, value);
			}
		});
	}

	return dom;
}

xdom.DOM = function(dom, selector) {
	return new DOM(dom, selector);
}

xdom.isDOM = function(object) {
	return object instanceof xdom.DOM;
}

xdom.querySelectorAll = function(element, selector) {
	var found,
		idSelector = selector[0] == '#',
		classSelector = !idSelector && selector[0] == '.',
		nameOnly = idSelector || classSelector ? selector.slice(1) : selector,
		isSimple = /^[\w-]*$/.test(nameOnly);

	return (element.getElementById && isSimple && idSelector) ?
		((found = element.getElementById(nameOnly)) ? [found] : []) :
		(element.nodeType !== 1 && element.nodeType !== 9 && element.nodeType !== 11) ? [] :
		slice.call(
			isSimple && !idSelector && element.getElementsByClassName ?
			classSelector ? element.getElementsByClassName(nameOnly) :
			element.getElementsByTagName(selector) :
			element.querySelectorAll(selector)
		);
}

xdom.init = function(selector, context) {
	var dom;
	if (!selector) {
		return xdom.DOM();
	} else if (typeof selector == 'string') {
		selector = selector.trim();
		if (selector[0] == '<' && REG_FRAGMENT.test(selector)) {
			dom = xdom.fragment(selector, RegExp.$1, context), selector = null;
		} else if (context !== undefined) {
			return $(context).find(selector);
		} else {
			dom = xdom.querySelectorAll(document, selector);
		}
	} else if (Tools.isFunction(selector)) {
		return $(document).ready(selector);
	} else if (xdom.isDOM(selector)) {
		return selector;
	} else {
		if (Tools.isArray(selector)) {
			dom = Tools.compact(selector);
		} else if (Tools.isObject(selector)) {
			dom = [selector];
			selector = null;
		} else if (REG_FRAGMENT.test(selector)) {
			dom = xdom.fragment(selector.trim(), RegExp.$1, context);
			selector = null;
		} else if (context !== undefined) {
			return $(context).find(selector);
		} else {
			dom = xdom.querySelectorAll(document, selector);
		}
	}
	return xdom.DOM(dom, selector);
}

$ = function(selector, context) {
	return xdom.init(selector, context);
};

$.ready = function(callback) {
	if (/complete|loaded|interactive/.test(document.readyState) && document.body) {
		callback($);
	} else {
		document.addEventListener('DOMContentLoaded', function() {
			callback($);
		}, false);
	}
	return this;
};