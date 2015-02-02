"use strict";

var render = require('./moonch').render,
    type = require('./typecheck');

module.exports.render = render;

var mapjson = function(obj, env) {
  if (obj === undefined || env === undefined) {
    throw new Error("Map needs both an object and an environment");
  }

  // Recurse down the object, applying mapjson to each terminal string
  var tmp;
  if (type.isString(obj)) {
    return render(obj, env);
  } else if (type.isArray(obj)) {
    tmp = [];
    obj.forEach(function(property){
      tmp.push(mapjson(property, env));
    });
    return tmp;
  } else if (type.isObject(obj)) {
    tmp = {};
    for (var property in obj) {
      tmp[property] = mapjson(obj[property], env);
    }
    return tmp;
  } else {
    throw new TypeError("Object is not a JSON object");
  }

};

module.exports.map = mapjson;
