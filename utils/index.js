"use strict";

var utils = require('./utils');

function Utils(renderWith) {
  this.renderWith = renderWith;
}

Object.keys(utils).forEach(function(fn) {
  Utils.prototype[fn] = function() { return utils[fn].bind(this); };
});

module.exports = Utils;
