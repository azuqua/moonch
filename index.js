"use strict";

var mustache = require('mustache'),
    Utils = require('../utils');

exports.render = function(obj, _renderWith) {
  var renderWith = (typeof renderWith === 'object') ? _renderWith : {};

  renderWith = exports.mixin({ utils: new Utils(renderWith) }, renderWith);

  return JSON.parse(
    mustache.render(
      JSON.stringify(obj),
      renderWith
    )
  );
};
