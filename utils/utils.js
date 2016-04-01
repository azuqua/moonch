"use strict";

var crypto = require('crypto'),
    qs = require('querystring');


function scopeObject(obj, scope) {
  scope = Array.isArray(scope) ? scope : String(scope).trim().split('.');

  for (var i = 0, l = scope.length; i < l; i++) {
    if (!obj) break;
    obj = obj[scope[i]];
  }

  return (obj === undefined) ? null: obj;
};

function guaranteeString(scope, objPath) {
  var obj = scopeObject(scope, objPath) || '',
      objString = (typeof obj === 'string') ? obj : JSON.stringify(obj);

  return objString;
}

// Trim whitespace from each string in an array
// Non-strings are ignored
function trimArrayStrings(str) {
  if (typeof str !== 'string') return str;
  else return str.trim();
}

exports.unstringify = exports.stringify = function unstringify(objPath) {
  var objString = guaranteeString(this, objPath);

  if (!objString) objString = JSON.stringify(null);

  return JSON.stringify(objString).slice(1, -1);
};

//{{#utils.hash}}} my{{mustached.data}}, hash, digestvalue {{/utils.hash}}
exports.hash = function(objPath, render) {
  var args = objPath.split(',').map(trimArrayStrings), // Trim whitespace from args
      value = render(args[0]),
      hash = args[1] || 'md5',
      digest = args[2] || 'base64';

  return crypto.createHash(hash).update(value, 'utf8').digest(digest);
};

exports.base64 = function(unEncoded, render) {
  var parsed = render(unEncoded);
  return new Buffer(parsed).toString("base64");
};

exports.querystringify = function(objPath) {
  var query = scopeObject(this, objPath);
  return qs.stringify(query);
};

exports.lowercase = function(objPath, render) {
  return render(objPath).toLowerCase();
};
