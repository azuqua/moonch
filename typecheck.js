"use strict";

function isString(x){
  return (typeof x) === "string";
}
function isNumber(x){
  return (typeof x) === "number";
}
function isArray(x){
  return Array.isArray(x);
}
function isFunction(x) {
  return !!(x && x.constructor && x.call && x.apply);
}
function isObject(x){
  return (typeof x) === 'object' && x !== null && !isArray(x) && !isFunction(x);
}
function isBool(x){
  return (typeof x) === 'boolean';
}
function isNull(x){
  return x === null;
}
function isNumber(x){
  return (typeof x) === "number";
}
function isArray(x){
  return Array.isArray(x);
}
function isFunction(x) {
  return !!(x && x.constructor && x.call && x.apply);
}
function isObject(x){
  return (typeof x) === 'object' && x !== null && !isArray(x) && !isFunction(x);
}
function isBool(x){
  return (typeof x) === 'boolean';
}
function isNull(x){
  return x === null;
}

module.exports = {
  "isString": isString,
  "isNumber": isNumber,
  "isArray": isArray,
  "isFunction": isFunction,
  "isObject": isObject,
  "isBool": isBool,
  "isNull": isNull
};
