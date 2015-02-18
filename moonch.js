"use strict";

var ParseError = require('./errors').ParseError,
    type = require('./typecheck');

function lexPath(path){
  return path.split(".")
             .filter(function(c){return c !== "";});
}

function lexInside(texp) {
  return texp.split(/(:|->)/)
             .map(function(s){return s.trim();})
             .filter(function(c){return c !== "";});
}

// Special case handling of '{{{' strings
function parseInsideTriple(texp){
  var tokens = lexInside(texp);

  if (tokens.length > 1) {
    throw new ParseError(
      "Triple-brace expressions can't specify a type or a coercion"
    );
  }

  return {"path": lexPath(tokens[0]),
          "from": "string",
          "to": "string"
  };
}

// Parses what's inside {{ }}'s
//    "a.b.c : num -> string" =>
//    {"path": ["a", "b", "c"], "from": "num", "to": "string"}
function parseInside(texp){
  var tokens = lexInside(texp);

  // Edge case where there are (illegal) nested braces, but with a string
  // between them. (e.g. "{{ hello {{a:num}} }} ).
  // Would make outer-parsing more complicated, so handled here instead.
  if (tokens.indexOf("{{") > -1) {
    throw new ParseError("Nested template expressions are not allowed");
  }


  // Syntax checks-- corresponds to the form `path : from [-> to]`
  if (tokens.length === 1) {
    return {"path": lexPath(tokens[0]),
            "from": "string",
            "to": "html"
    };
  } else if (tokens[1] !== ':') {
    throw new ParseError(
        "Expected the second atom of the template expression"+
        " to be ':', but found "+tokens[1]+" instead");
  }
  if (tokens.length === 3) {
      return {"path": lexPath(tokens[0]),
              "from": tokens[2],
              "to": tokens[2]
      };
  } else if (tokens.length === 5) {
    if (tokens[3] !== '->') {
      throw new ParseError(
          "Expected the fourth atom of the template expression"+
          " to be '->', but found "+tokens[3]+" instead");
    } else {
      return {"path": lexPath(tokens[0]),
              "from": tokens[2],
              "to": tokens[4]
      };
    }
  }
  else {
    throw new ParseError("Wrong number of arguments in template expression");
  }

}

function lex(template){
  if (!template) {
    return [];
  } else {
    // Split at double-curlies, then delete instances
    // of the empty string left over from splitting.
    return template.split(/({{{|}}}|{{|}})/)
                   .filter(function(c){return c !== "";});
  }
}

// Parses a template string
//    `"She sells {{a: string}} by the seashore"`
//  into  the form
//    `[
//      "She sells ",
//      {ident: "a", from: "string", to: "string"},
//      " by the seashore"
//    ]`
function parse(template){

  if (!type.isString(template)) {
    throw new ParseError("Template must be a string");
  } else if (template.indexOf("{{") === -1) {
    // Short circuit for non-stached strings
    // TBH, kind of a hack. Avoids a million special parsing cases
    return [template];
  }

  var tokens = lex(template);

  var braces = [];

  var parsedExp = [];
  tokens.forEach(function(token) {
    if (token === "{{") {

      if (braces[braces.length-1] === "{{{" || braces[braces.length-1] === "{{") {
        throw new ParseError("Nested template expressions are not allowed");
      } else {
        braces.push("{{");
      }

    } else if (token === "}}") {

      if (braces[braces.length-1] === "{{") {
        braces.pop();
      } else {
        throw new ParseError("Unmatched '{{' in template expression");
      }
    } else if (token === "{{{") {

      if (braces[braces.length-1] === "{{{" || braces[braces.length-1] === "{{") {
        throw new ParseError("Nested template expressions are not allowed");
      } else {
        braces.push("{{{");
      }

    } else if (token === "}}}") {

      if (braces[braces.length-1] === "{{{") {
        braces.pop();
      } else {
        throw new ParseError("Unmatched '{{{' in template expression");
      }

    } else if (braces[braces.length-1] === "{{") {
      parsedExp.push( parseInside(token) );
    } else if (braces[braces.length-1] === "{{{") {
      parsedExp.push( parseInsideTriple(token) );
    } else {
      parsedExp.push(token);
    }

  });

  if (braces.length > 0){
    throw new ParseError("Unclosed mustaches in template expression");
  }

  return parsedExp;
}

var htmlEntities = {
  // " ": "&nbsp",
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "/": "&#x2F;"
};

var urlEntities = {
  "!": "%23",
  "$": "%24",
  "&": "%26",
  "'": "%27",
  "(": "%28",
  ")": "%29",
  "*": "%2A",
  "+": "%2B",
  ",": "%2C",
  "/": "%2F",
  ":": "%3A",
  ";": "%3B",
  "=": "%3D",
  "?": "%3F",
  "@": "%40",
  "[": "%5B",
  "]": "%5D"
};

function toHtml(s){
  return s.replace(/[&<>"'\/]/g, function (c) {
    return htmlEntities[c];
  });
}

function toUrl(s){
  return s.replace(/[!*'();:@&=+$,/?#[\]]/g, function (c) {
    return urlEntities[c];
  });
}

// Is a maybe-type? (can hold null or undefined)
function isMaybe(s){
  return s[s.length - 1] === "?";
}

function coerce(item, from, to) {
  var output;
  // Maybe types- e.g. string? will pass on null and undefined
  if (isMaybe(from)) {
    if (!isMaybe(to)) {
      throw new TypeError(
        "expected destination to be a maybe type (end with a '?')"
      );
    }
    if (item === null || item === undefined) {
      return item;
    }
  }
  // Clean up maybe types for coercion
  if (isMaybe(from)) {
    from = from.slice(0, -1);
  }
  if (isMaybe(to)) {
    to = to.slice(0, -1);
  }
  switch(from){
    case 'string':
      if (!type.isString(item)) {
        throw new TypeError(item+" was expected to be a string, but isn't.");
      } else if (to === 'string') {
        output = item;
      } else if (to === 'num') {
        // Using +(str) to coerce to number because parseFloat accepts
        // non-number chars after a digit.
        var tmp = +(item);
        if (isNaN(tmp)) {
          throw new TypeError("Can't coerce non-digit string to number");
        } else {
          output = tmp;
        }
      } else if (to === 'html') {
        return toHtml(item);
      } else if (to === 'url') {
        return toUrl(item);
      } else {
        throw new TypeError("Can't coerce string to "+to);
      }
      break;

    case 'num':
      if (!type.isNumber(item)) {
        throw new TypeError(item+" was expected to be a number, but isn't.");
      } else if (to === 'string') {
        output = item.toString();
      } else if (to === 'num') {
        output = item;
      } else {
        throw new TypeError("Can't coerce 'num' to "+to);
      }
      break;

    case 'bool':
      if (!type.isBool(item)) {
        throw new TypeError(item+" was expected to be an array, but isn't.");
      }
      if (to !== 'bool') {
        throw new TypeError("Can't convert from 'bool' to anything else");
      }
      break;

    case 'array':
      if (!type.isArray(item)) {
        throw new TypeError(item + " was expected to be an array, but isn't.");
      } else if (to !== 'array') {
        throw new TypeError("Can't convert from 'array' to anything else");
      } else {
        output = item;
      }
      break;

    case 'obj':
      if (!type.isObject(item)) {
        throw new TypeError(item+" was expected to be a object, but isn't.");
      } else if (to !== 'obj') {
        throw new TypeError("Can't convert from 'obj' to anything else");
      } else {
        output = item;
      }
      break;

    case 'null':
      if (!type.isNull(item)) {
        throw new TypeError(item+" was expected to be null, but isn't.");
      } else if (to !== 'null') {
        throw new TypeError("Can't convert from 'null' to anything else");
      } else {
        output = item;
      }
      break;

    default:
      // Cheap error messages
      if (from === 'object') {
        throw new TypeError(
            "Unrecognized type '"+from+"' to coerce."+
            "Did you mean 'obj'?");
      } else if (from === 'number') {
        throw new TypeError(
            "Unrecognized type '"+from+"' to coerce."+
            "Did you mean 'num'?");
      } else {
        throw new TypeError("Unrecognized type '"+from+"' to coerce");
      }
  }

  return output;
}

// Walks along a path, looking up properties from the environment. At each
// stage, it makes sure that property exists.
function lookup(path, env, isMaybe) {
  var ret = env;
  for (var i = 0; i < path.length; i++) {
    var tmp = ret[path[i]];
    if (tmp === undefined) {
      if (isMaybe) {
        return undefined;
      }
      throw new ParseError(
        "Can't find property '"+path[i]+"'"+
        " of environment "+JSON.stringify(ret)
      );
    } else {
      ret = tmp;
    }
  }
  return ret;
}

function render(template, env){
  if (template === undefined || env === undefined) {
    throw new Error("Render needs both a template and an environment");
  }

  var parseTree = parse(template);

  var stringOutput = [];
  var typedOutput;
  parseTree.forEach(function(node) {

    if (type.isString(node)) {
      stringOutput.push(node);
    } else {
      var item = lookup(node.path, env, isMaybe(node.from));
      var output = coerce(item, node.from, node.to);
      if (type.isString(output)) {
        stringOutput.push(output);
      } else if (typedOutput !== undefined) {
        throw new TypeError(
          "Can't reconcile multiple typed objects in a single template"
        );
      } else {
        typedOutput = output;
      }
    }
  });

  if (typedOutput !== undefined && stringOutput.length > 0) {
    throw new TypeError(
      "Can't return a typed output if destination is in a string"
    );
  } else if (stringOutput.length > 0) {
    return stringOutput.join("");
  } else {
    return typedOutput;
  }
}

module.exports.lookup = lookup;
module.exports.coerce = coerce;
module.exports.lexPath = lexPath;
module.exports.lexInside = lexInside;
module.exports.parseInside = parseInside;
module.exports.lex = lex;
module.exports.parse = parse;
module.exports.render = render;
