(function() {
  var REG_SINGLE_TAG = /^<(\w+)\s*\/?>(?:<\/\1>)?$/;
  var REG_FRAGMENT = /^\s*<(\w+|!)[^>]*>/;
  var REG_EXPANDER_TAG = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi;
  var REG_ROOT = /^(?:body|html)$/i;
  var REG_CAPITAL = /([A-Z])/g;
  var REG_SIMPLE_SELECTOR = /^[\w-]*$/;
  var REG_READY = /complete|loaded|interactive/;
  var REG_ClassSelector = /^\.([\w-]+)$/;
  var REG_IdSelector = /^#([\w-]+)$/;
  var REG_TagSelector = /^([\w-])+$/;
  var REG_TagIdSelector = /^([\w-]+)#([\w-]+)$/;
  var REG_SimpleSelector = /^(?:#([\w-]+))?\s*([\w-]+|\*)?\.?([\w-]+)?$/;


  var classCache = {};
  var class2type = {};
  var types = 'Boolean,Number,String,Function,Array,Date,RegExp,Object,Error'.split(',');

  var table = document.createElement('table'),
    tableRow = document.createElement('tr'),
    containers = {
      'tr': document.createElement('tbody'),
      'tbody': table,
      'thead': table,
      'tfoot': table,
      'td': tableRow,
      'th': tableRow,
      '*': document.createElement('div')
    };

  var Util = {
    mix: function(to, from) {
      for (var key in from) {
        to[key] = from[key];
      }
    },
    extend: function(target) {
      var deep, args = Array.prototype.slice.call(arguments, 1);
      if (typeof target == 'boolean') {
        deep = target;
        target = args.shift();
      }
      args.forEach(function(arg) {
        Util.extend(target, arg, deep);
      })
      return target;
    },
    noop: function() {},
    type: function(target) {
      return target == null ? String(target) : class2type[Object.prototype.toString.call(target)] || "object";
    },
    unique: function(target) {
      return Array.prototype.filter.call(target, function(item, idx) {
        return target.indexOf(item) == idx;
      });
    },

    isPlainObject: function(target) {
      return Util.isObject(target) && !Util.isWindow(target) && Object.getPrototypeOf(target) == Object.prototype;
    },
    isEmptyObject: function(target) {
      var name;
      for (name in target) {
        return false;
      }
      return true;
    },
    inArray: function(elem, target, i) {
      return Array.prototype.indexOf.call(target, elem, i);
    },
    likeArray: function(target) {
      return typeof target.length == 'number';
    },

    compact: function(target) {
      return Array.prototype.filter.call(target, function(item) {
        return item != null;
      });
    },
    flatten: function(target) {
      return target.length > 0 ? $.fn.concat.apply([], target) : target;
    },
    camelize: function(input) {
      return input.replace(/-+(.)?/g, function(match, chr) {
        return chr ? chr.toUpperCase() : '';
      });
    },
    dasherize: function(input) {
      return input.replace(/::/g, '/')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
        .replace(/([a-z\d])([A-Z])/g, '$1_$2')
        .replace(/_/g, '-')
        .toLowerCase();
    },
    trim: function(str) {
      return str == null ? "" : String.prototype.trim.call(str);
    }
  };

  for (var i = 0; i < types.length; i++) {
    (function(name, lc) {
      class2type['[object ' + name + ']'] = lc = name.toLowerCase();
      Util['is' + name] = function(o) {
        return Util.type(o) === lc;
      };
    }(types[i], i));
  }

  function Node(dom, selector) {
    var i, length = dom ? dom.length : 0;
    for (i = 0; i < length; i++) {
      this[i] = dom[i];
    }

    this.length = length;
    this.selector = selector || '';
    this.isNode = true;
  }

  var Api = {
    init: function(selector, context) {
      var dom;
      if (!selector) {
        return Api.Node();
      } else if (Util.isString(selector)) {
        selector = selector.trim();
        if (selector[0] == '<' && REG_FRAGMENT.test(selector)) {
          dom = Api.fragment(selector, RegExp.$1, context);
          selector = null;
        }
        // If there's a context, create a collection on that context first, and select
        // nodes from there
        else if (context !== undefined) {
          return $(context).find(selector);
        }
        // If it's a CSS selector, use it to select nodes.
        else {
          dom = Api.querySelectorAll(document, selector);
        }
      } else if (Util.isFunction(selector)) {
        return $(document).ready(selector);
      } else if (Api.isNode(selector)) {
        return selector;
      } else {
        if (Util.isArray(selector)) {
          dom = Util.compact(selector);
        } else if (Util.isObject(selector)) {
          dom = [selector];
          selector = null;
        } else if (REG_FRAGMENT.test(selector)) {
          dom = Api.fragment(selector.trim(), RegExp.$1, context);
          selector = null;
        } else if (context !== undefined) {
          return $(context).find(selector);
        } else {
          dom = Api.querySelectorAll(document, selector);
        }
      }
      return Api.Node(dom, selector);
    },
    Node: function(dom, selector) {
      return new Node(dom, selector);
    },
    isNode: function(object) {
      return object instanceof Api.Node;
    },
    matches: function(element, selector) {
      //not element node tye
      if (!selector || !element || element.nodeType !== 1) {
        return false;
      }
      var matchesSelector = element.webkitMatchesSelector || element.mozMatchesSelector || element.oMatchesSelector || element.matchesSelector;

      if (matchesSelector) {
        return matchesSelector.call(element, selector);
      }

      // fall back to performing a selector:
      var match, parent = element.parentNode,
        temp = !parent;

      if (temp) {
        (parent = tempParent).appendChild(element);
      }

      match = ~Api.querySelectorAll(parent, selector).indexOf(element);
      temp && tempParent.removeChild(element);

      return match;
    },
    fragment: function(html, name, properties) {
      var dom, nodes, container

      // A special case optimization for a single tag
      if (REG_SINGLE_TAG.test(html))
        dom = $(document.createElement(RegExp.$1));

      if (!dom) {

        if (html.replace) {
          html = html.replace(REG_EXPANDER_TAG, "<$1></$2>");
        }

        if (name === undefined) {
          name = REG_FRAGMENT.test(html) && RegExp.$1;
        }

        if (!(name in containers)) {
          name = '*';
        }

        container = containers[name];
        container.innerHTML = '' + html;
        dom = $.each(Array.prototype.slice.call(container.childNodes), function() {
          container.removeChild(this);
        });
      }

      if (Util.isPlainObject(properties)) {
        nodes = $(dom);
        $.each(properties, function(key, value) {
          if (methodAttributes.indexOf(key) > -1) {
            nodes[key](value);
          } else {
            nodes.attr(key, value);
          }
        });
      }

      return dom;
    },
    querySelectorAll: function(element, selector) {
      var found,
        IDSelector = selector[0] == '#',
        ClassSelector = !IDSelector && selector[0] == '.',
        nameOnly = IDSelector || ClassSelector ? selector.slice(1) : selector, // Ensure that a 1 char tag name still gets checked
        isSimple = REG_SIMPLE_SELECTOR.test(nameOnly);

      return (element.getElementById && isSimple && IDSelector) ? // Safari DocumentFragment doesn't have getElementById
        ((found = element.getElementById(nameOnly)) ? [found] : []) :
        (element.nodeType !== 1 && element.nodeType !== 9 && element.nodeType !== 11) ? [] :
        Array.prototype.slice.call(
          isSimple && !IDSelector && element.getElementsByClassName ? // DocumentFragment doesn't have getElementsByClassName/TagName
          ClassSelector ? element.getElementsByClassName(nameOnly) : // If it's simple, it could be a class
          element.getElementsByTagName(selector) : // Or a tag
          element.querySelectorAll(selector) // Or it's not simple, and we need to query all
        );
    }
  };

  $ = function(selector, context) {
    return Api.init(selector, context);
  }

  $.contains = document.documentElement.contains ? function(parent, node) {
      return parent !== node && parent.contains(node);
    } :
    function(parent, node) {
      while (node && (node = node.parentNode)) {
        if (node === parent) {
          return true;
        }
      }
      return false;
    }

  $.map = function(elements, callback) {
    var value, i, key, values = [];
    if (Util.likeArray(elements))
      for (i = 0; i < elements.length; i++) {
        value = callback(elements[i], i);
        if (value != null) {
          values.push(value);
        }
      } else {
        for (key in elements) {
          value = callback(elements[key], key);
          if (value != null) {
            values.push(value);
          }
        }
      }
    return Util.flatten(values);
  }

  $.each = function(elements, callback) {
    var i, key;
    if (Util.likeArray(elements)) {
      for (i = 0; i < elements.length; i++) {
        if (callback.call(elements[i], i, elements[i]) === false) {
          return elements;
        }
      }
    } else {
      for (key in elements) {
        if (callback.call(elements[key], key, elements[key]) === false) {
          return elements;
        }
      }
    }
    return elements;
  }

  $.grep = function(elements, callback) {
    return Array.prototype.filter.call(elements, callback);
  }

  $.fn = {
    constructor: Api.Node,
    length: 0,
    ready: function(callback) {
      if (REG_READY.test(document.readyState) && document.body) {
        callback($);
      } else {
        document.addEventListener('DOMContentLoaded', function() {
          callback($);
        }, false);
      }
      return this;
    },
    map: function(fn) {
      return $($.map(this, function(el, i) {
        return fn.call(el, i, el);
      }))
    },
    contents: function() {
      return this.map(function() {
        return this.contentDocument || Array.prototype.slice.call(this.childNodes);
      });
    },
    filter: function(selector) {
      if (Util.isFunction(selector)) {
        return this.not(this.not(selector));
      }

      return $(Array.prototype.filter.call(this, function(element) {
        return Api.matches(element, selector);
      }));
    },
    is: function(selector) {
      return this.length > 0 && Api.matches(this[0], selector);
    },
    not: function(selector) {
      var nodes = []
      if (Util.isFunction(selector) && selector.call !== undefined)
        this.each(function(idx) {
          if (!selector.call(this, idx)) nodes.push(this);
        });
      else {
        var excludes = typeof selector == 'string' ? this.filter(selector) : (Util.likeArray(selector) && Util.isFunction(selector.item)) ? slice.call(selector) : $(selector)
        this.forEach(function(el) {
          if (excludes.indexOf(el) < 0) {
            nodes.push(el);
          }
        });
      }
      return $(nodes);
    },
    has: function(selector) {
      return this.filter(function() {
        return Util.isObject(selector) ? $.contains(this, selector) : $(this).find(selector).size();
      });
    },
    eq: function(idx) {
      return idx === -1 ? this.slice(idx) : this.slice(idx, +idx + 1);
    },
    first: function() {
      var el = this[0];
      return el && !Util.isObject(el) ? el : $(el);
    },
    last: function() {
      var el = this[this.length - 1];
      return el && !Util.isObject(el) ? el : $(el);
    },
    find: function(selector) {
      var result, $this = this;
      if (!selector) {
        result = $();
      } else if (typeof selector == 'object') {
        result = $(selector).filter(function() {
          var node = this;
          return Array.prototype.some.call($this, function(parent) {
            return $.contains(parent, node);
          });
        });
      } else if (this.length == 1) {
        result = $(Api.querySelectorAll(this[0], selector));
      } else {
        result = this.map(function() {
          return Api.querySelectorAll(this, selector);
        });
      }
      return result;
    },
    concat: function() {
      var i, value, args = [];
      for (i = 0; i < arguments.length; i++) {
        value = arguments[i];
        args[i] = Api.isNode(value) ? value.toArray() : value;
      }
      return Array.prototype.concat.apply(Api.isNode(this) ? this.toArray() : this, args);
    },
    get: function(idx) {
      return idx === undefined ? Array.prototype.slice.call(this) : this[idx >= 0 ? idx : idx + this.length];
    },
    toArray: function() {
      return this.get();
    },
    each: function(callback) {
      Array.prototype.every.call(this, function(el, idx) {
        return callback.call(el, idx, el) !== false;
      });
      return this;
    },
    remove: function() {
      var self = this;
      self.each(function() {
        if (this.parentNode != null) {
          this.parentNode.removeChild(this);
        }
      });
      return self;
    },
  }

  Api.Node.prototype = Node.prototype = $.fn;

  Util.mix($, Util);

  window.$ = $;

})(window);