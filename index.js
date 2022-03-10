"use strict";

var mustache = require('mustache'),
  Utils = require('./utils');

// It's absurd to have a separate repo for this tiny ~100 line library which is still
// a vector for vulnerabilities and causes problems when upgrading node versions. I have migrated
// it to common so that we can still use common.moonch for the `render` function which is still
// absurd but at least a bit less painful. -CG
const common = require("common");
const logger = common.logging({ __filedepth: 1, __filename: __filename });
const err = new Error("Moonch is in the process of deprecation. Please use common.moonch instead.");
logger.error({err: err});

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
