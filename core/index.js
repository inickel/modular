var modular = function() {};
var mix = function(to, from) {

}

function checkGlobalIfNotExist(self, property) {
	return self[property] !== undefined ? self[property] : Config[property];
}

function Package(cfg) {
	var self = this;
	/**
	 * name of package
	 */
	self.name = undefined;
	/**
	 * package base of package
	 */
	self.base = undefined;
	/**
	 * package entry module
	 */
	self.main = undefined;
	/**
	 * filter for package's modules
	 */
	self.filter = undefined;
	/**
	 * tag for package's modules
	 */
	self.tag = undefined;
	/**
	 * charset for package's modules
	 */
	self.charset = undefined;
	/**
	 * whether combine package's modules
	 */
	self.combine = undefined;
	/**
	 * combine modules in packages within the same group if combine is true
	 */
	self.group = undefined;
	mix(self, cfg);
}

Package.prototype = {
	constructor: Package,
	reset: function(cfg) {
		mix(this, cfg);
	},
	getFilter: function() {
		return checkGlobalIfNotExist(this, 'filter');
	},
	getTag: function() {
		return checkGlobalIfNotExist(this, 'tag');
	},
	getBase: function() {
		return this.base;
	},
	getCharset: function() {
		return checkGlobalIfNotExist(this, 'charset');
	},
	isCombine: function() {
		return checkGlobalIfNotExist(this, 'combine');
	},
	getGroup: function() {
		return checkGlobalIfNotExist(this, 'group');
	}
};

Loader.Package = Package;

function async(self, mods, callback) {
	for (var i = 0; i < mods.length; i++) {
		mods[i] = self.resolve(mods[i]).id;
	}
	modular.use(mods, callback);
}



function Module(cfg) {
	var self = this;
	self.exports = undefined;
	self.module = self;
	self.status = Status.UNLOADED;
	self.id = undefined;
	self.facto
	self.config = undefined;
	self.cjs = 1;
	mix(self, cfg);
	self.waits = {};

	var require = self._require = function(id, callback) {
		if (typeof id === 'string') {
			var requiresModule = self.resolve(id);
			Utils.initModules(requiresModule.getNormalizedModules());
			return requiresModule.getExports();
		} else {
			async(self, id, callback);
		}
	};

	require.toUrl = function(relativeUrl) {
		var url = self.getUri();
		var prefix = '';
		var suffix = url;
		var index = url.indexOf('//');
		if (index !== -1) {
			prefix = url.slice(0, index + 2);
			suffix = url.slice(index + 2);
		}
		return prefix + Utils.normalizePath(suffix, relativeUrl);
	};

	require.load = modular.getScript;
}

Module.prototype = {
	modulex: 1,
	constructor: Module,
	config: function() {
		return this.config;
	},
	reset: function(cfg) {
		var self = this;
		mix(self, cfg);
		if (cfg.requires) {
			self.setRequiresModules(cfg.requires);
		}
	},
	require: function(id) {
		return this.resolve(id).getExports();
	},
	resolve: function(relativeId) {
		return createModule(Utils.normalizePath(this.id, relativeId));
	},
	add: function(loader) {
		this.waits[loader.id] = loader;
	},
	remove: function(loader) {
		delete this.waits[loader.id];
	},
	contains: function(loader) {
		return this.waits[loader.id];
	},
	flush: function() {
		Utils.each(this.waits, function(loader) {
			loader.flush();
		});
		this.waits = {};
	},
	getType: function() {
		var self = this;
		var v = self.type;
		if (!v) {
			var id = self.id;
			if (Utils.endsWith(id, '.css')) {
				v = 'css';
			} else {
				v = 'js';
			}
			self.type = v;
		}
		return v;
	},
	getAlias: function() {
		var self = this;
		var id = self.id;
		if (self.normalizedAlias) {
			return self.normalizedAlias;
		}
		var alias = getShallowAlias(self);
		var ret = [];
		if (alias[0] === id) {
			ret = alias;
		} else {
			for (var i = 0, l = alias.length; i < l; i++) {
				var aliasItem = alias[i];
				if (aliasItem && aliasItem !== id) {
					var mod = createModule(aliasItem);
					var normalAlias = mod.getAlias();
					if (normalAlias) {
						ret.push.apply(ret, normalAlias);
					} else {
						ret.push(aliasItem);
					}
				}
			}
		}
		self.normalizedAlias = ret;
		return ret;
	},
	getNormalizedModules: function() {
		var self = this;
		if (self.normalizedModules) {
			return self.normalizedModules;
		}
		self.normalizedModules = Utils.map(self.getAlias(), function(alias) {
			return createModule(alias);
		});
		return self.normalizedModules;
	},
	getUri: function() {
		var self = this;
		if (!self.uri) {
			self.uri = Utils.normalizeSlash(mx.Config.resolveModFn(self));
		}
		return self.uri;
	},
	getUrl: function() {
		return this.getUri();
	},
	getExports: function() {
		var normalizedModules = this.getNormalizedModules();
		return normalizedModules[0] && normalizedModules[0].exports;
	},
	getPackage: function() {
		var self = this;
		if (self.packageInfo === undefined) {
			var id = self.id;
			// absolute path does not belong to any package
			var packages = Config.packages;
			var modIdSlash = self.id + '/';
			var pName = '';
			var p;
			for (p in packages) {
				var pWithSlash = p;
				if (!Utils.endsWith(pWithSlash, '/')) {
					pWithSlash += '/';
				}
				if (startsWith(modIdSlash, pWithSlash) && p.length > pName.length) {
					pName = p;
				}
			}
			if (!packages[pName]) {
				if (startsWith(id, '/') ||
					startsWith(id, 'http://') ||
					startsWith(id, 'https://') ||
					startsWith(id, 'file://')) {
					self.packageInfo = null;
					return self.packageInfo;
				}
			}
			self.packageInfo = packages[pName] || packages.core;
		}
		return self.packageInfo;
	},
	getTag: function() {
		var self = this;
		return self.tag || self.getPackage() && self.getPackage().getTag();
	},
	getCharset: function() {
		var self = this;
		return self.charset || self.getPackage() && self.getPackage().getCharset();
	},
	setRequiresModules: function(requires) {
		var self = this;
		var requiredModules = self.requiredModules = Utils.map(normalizeRequires(requires, self), function(m) {
			return createModule(m);
		});
		var normalizedRequiredModules = [];
		Utils.each(requiredModules, function(mod) {
			normalizedRequiredModules.push.apply(normalizedRequiredModules, mod.getNormalizedModules());
		});
		self.normalizedRequiredModules = normalizedRequiredModules;
	},
	getNormalizedRequiredModules: function() {
		var self = this;
		if (self.normalizedRequiredModules) {
			return self.normalizedRequiredModules;
		}
		self.setRequiresModules(self.requires);
		return self.normalizedRequiredModules;
	},
	getRequiredModules: function() {
		var self = this;
		if (self.requiredModules) {
			return self.requiredModules;
		}
		self.setRequiresModules(self.requires);
		return self.requiredModules;
	},
	callFactory: function() {
		var self = this;
		return self.factory.apply(self, (
			self.cjs ?
			[self._require, self.exports, self] :
			Utils.map(self.getRequiredModules(), function(m) {
				return m.getExports();
			})
		));
	},
	initSelf: function() {
		var self = this;
		var factory = self.factory;
		var exports;
		if (typeof factory === 'function') {
			self.exports = {};

			if (Config.debug) {
				exports = self.callFactory();
			} else {
				try {
					exports = self.callFactory();
				} catch (e) {
					self.status = ERROR;
					if (self.onError || Config.onModuleError) {
						var error = {
							type: 'init',
							exception: e,
							module: self
						};
						self.error = error;
						if (self.onError) {
							self.onError(error);
						}
						if (Config.onModuleError) {
							Config.onModuleError(error);
						}
					} else {
						setTimeout(function() {
							throw e;
						}, 0);
					}
					return 0;
				}
				var success = 1;
				Utils.each(self.getNormalizedRequiredModules(), function(m) {
					if (m.status === ERROR) {
						success = 0;
						return false;
					}
				});
				if (!success) {
					return 0;
				}
			}

			if (exports !== undefined) {
				self.exports = exports;
			}
		} else {
			self.exports = factory;
		}
		self.status = INITIALIZED;
		if (self.afterInit) {
			self.afterInit(self);
		}
		if (Config.afterModuleInit) {
			Config.afterModuleInit(self);
		}
		return 1;
	},
	initRecursive: function() {
		var self = this;
		var success = 1;
		var status = self.status;
		if (status === ERROR) {
			return 0;
		}
		// initialized or circular dependency
		if (status >= INITIALIZING) {
			return success;
		}
		self.status = INITIALIZING;
		if (self.cjs) {
			// commonjs format will call require in module code again
			success = self.initSelf();
		} else {
			Utils.each(self.getNormalizedRequiredModules(), function(m) {
				success = success && m.initRecursive();
			});
			if (success) {
				self.initSelf();
			}
		}
		return success;
	},
	undef: function() {
		this.status = Status.UNLOADED;
		this.error = null;
		this.factory = null;
		this.exports = null;
	}
};