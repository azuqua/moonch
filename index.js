"use strict";

var mustache = require('mustache'),
  Utils = require('./utils');

function mixin(obj, properties, whitelist) {
  if (whitelist) {
    if (!Array.isArray(whitelist)) {
      return;
    }
    whitelist.forEach(function(key) {
      if (properties[key] !== undefined) {
        obj[key] = properties[key];
      }
    });
  } else {
    var propKeys = Object.keys(properties);
    for(var i = 0; i < propKeys.length; i++) {
      var key = propKeys[i];
      obj[key] = properties[key];
    }
  }
  return obj;
}

exports.render = function(obj, _renderWith) {
  var renderWith = (typeof _renderWith === 'object') ? _renderWith : {};

  renderWith = mixin({
    utils: new Utils(renderWith)
  }, renderWith);

  return JSON.parse(
    mustache.render(
      JSON.stringify(obj),
      renderWith
    )
  );
};
