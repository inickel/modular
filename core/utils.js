

var utils = {
	version: '',
	mixin: function(to, from) {
		for (var key in from) {
			to[key] = from[key];
		}
	},
	map: map ? function() {},
};

module.exports = utils;