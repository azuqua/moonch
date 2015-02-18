/*global describe, it*/
"use strict";
var should = require('chai').should(),
    assert = require('chai').assert,
    fail = require('chai').fail;

var t = require('../moonch.js'),
    api = require('../'),
    ParseError = require('../errors').ParseError;


describe("lexing a path", function() {
  it("lexes a path", function() {
    t.lexPath("a").should.deep.equal(["a"]);
    t.lexPath("a.b.c").should.deep.equal(["a", "b", "c"]);
  });
});

describe("lexing a template expression", function() {

  it("lexes a texp", function() {
    t.lexInside("a : num")
      .should.deep.equal(['a', ':', 'num']);
  });

  it("lexes a coercing texp", function() {
    t.lexInside("a: num -> string")
      .should.deep.equal(['a', ':', 'num', '->', 'string']);
  });

  it("handles pathological cases", function() {
    t.lexInside(": : :")
      .should.deep.equal([':', ':', ':']);

    t.lexInside(": : -> -> ->")
      .should.deep.equal([':', ':', '->', '->', '->']);
  });


});

describe("parsing a template expression", function() {

  it("rejects invalid texps", function() {

    (function(){t.parseInside("a : num -> ");}).should.throw(ParseError);
    (function(){t.parseInside("a : num -> string -> num");})
      .should.throw(ParseError);
  });

  it("parses a texp", function() {
    t.parseInside("a: num")
      .should.deep.equal({"path": ["a"], "from": "num", "to":"num"});
    t.parseInside("a: num -> string")
      .should.deep.equal({"path": ["a"], "from": "num", "to":"string"});
  });

});


describe("lexing a full template string", function() {

  it("splits braces correctly", function() {
    t.lex("{{a: num}}").should.deep.equal(['{{', 'a: num', '}}']);
  });

  it("can differentiate triple and double braces ", function() {
    t.lex("{{a: num}} {{{b:num}}}")
      .should.deep.equal(['{{', 'a: num', '}}', ' ', '{{{', 'b:num', '}}}']);
  });

  it("doesn't touch braces not part of a template", function() {
    t.lex("{a b c }, {}, {.{}").should.deep.equal(["{a b c }, {}, {.{}"]);
  });

  it("handles characters outside braces", function() {
    t.lex("inexplicably mimicking {{a: string}} hiccuping")
      .should.deep.equal(
        ['inexplicably mimicking ', '{{', 'a: string', '}}', ' hiccuping']);
  });

});


describe("parsing a full template string", function() {

  it("parses a template expression", function() {
    t.parse("{{a: num}}")
      .should.deep.equal([{"path": ["a"],"from":"num","to":"num"}]);
  });

  it("returns a non-template exp without changes ", function() {
    t.parse("The Leith police dismisseth us")
      .should.deep.equal(["The Leith police dismisseth us"]);
  });

  it("assumes type 'string -> html' for unlabeled texps", function() {
    t.parse("{{a}}")
      .should.deep.equal([{"path": ["a"],"from":"string", "to":"html"}]);
  });

  it("parses a template expression with type coercion", function() {
    t.parse("{{ a: num -> string }}")
      .should.deep.equal([{"path":["a"],"from":"num","to":"string"}]);
  });

  it("can cope with a lack of spaces in template exp", function() {
    t.parse("{{a:num->string}}")
      .should.deep.equal([{"path":["a"],"from":"num", "to":"string"}]);
  });

  it("parses a template string with multiple texps", function() {
    t.parse("Red {{a:string}}, yellow {{b:string}}")
      .should.deep.equal([
        "Red ",
        {"path":["a"], "from":"string", "to":"string"},
        ", yellow ",
        {"path":["b"], "from":"string", "to":"string"}
      ]);
  });

  it("doesn't accept non-string templates", function() {
    (function(){t.parse({});}).should.throw("Template must be a string");
  });

  it("insists on closing braces", function() {
    (function(){t.parse("{{a:num->string");}).should.throw(ParseError);
  });

  it("Parses a dot-delimited path correctly", function() {
    t.parse("{{a.b.c : num -> string}}").should.deep.equal(
      [{"path":["a", "b", "c"], "from":"num", "to":"string"}]
    );
  });

  it("Parses a triple-braced string", function() {
    t.parse("{{{a}}}").should.deep.equal(
      [{"path":["a"], "from":"string", "to":"string"}]
    );
  });


  xit("Reports the correct error for this parsing edge-case", function() {
    (function(){t.parse("{{ {{a: num}} }}");})
      .should.throw("Nested template expressions are not allowed");
  });

});


describe("looking up a path in an environment", function() {

  it("looks up in a single level environment", function() {
    t.lookup(['a'], {'a': 1}).should.equal(1);
  });

  it("looks up in a multi-level environment", function() {
    t.lookup(['a', 'b', 'c',], {'a': {'b': {'c': 1}}}).should.equal(1);
  });

  it("doesn't accept incorrect paths", function() {
    (function(){t.lookup(['a', 'b', 'c',], {'z': 1});})
      .should.throw(ParseError);
    (function(){t.lookup(['a', 'b', 'c',], {'a': {'b': {'z': 1}}});})
      .should.throw(ParseError);
  });
});

describe("coercion", function() {
  describe("things that can be coreced", function() {
    it("coerces a number to a string", function() {
      t.coerce(1, "num", "string").should.equal("1");
    });

    it("coerces a string to a number", function() {
      t.coerce("1", "string", "num").should.equal(1);
    });

    it("coerces a bool to a string", function() {
      t.coerce("1", "string", "num").should.equal(1);
    });

  });

  it("is okay with coercing a type to itself", function() {
    t.coerce(1, "num", "num").should.equal(1); // or unixy?
  });

  it("but won't just let any type through", function() {
    (function(){t.render("{{a : purple -> purple}}", {"a": 1});})
      .should.throw(TypeError);
  });

  it("won't accept coercion to unknown types", function() {
    (function(){t.coerce(1, "sphere", "cube");}).should.throw(TypeError);
    (function(){t.render("{{a : sphere}}", {'a':1});}).should.throw(TypeError);
    // Name shadowing to make sure the parser can cope
    (function(){t.render("{{a : num -> string string}}", {"a": 1});})
      .should.throw(TypeError);
  });

  describe("refusing to convert between incompatable types", function() {

    // String
    it("won't convert string -> array", function() {
      (function(){t.render("{{a : string -> array}}", { 'a': {} });})
        .should.throw(TypeError);
    });
    it("won't convert string -> obj", function() {
      (function(){t.render("{{a : string -> obj}}", { 'a': {} });})
        .should.throw(TypeError);
    });
    it("won't convert string -> bool", function() {
      (function(){t.render("{{a : string -> bool}}", { 'a': {} });})
        .should.throw(TypeError);
    });

    // Object
    it("won't convert obj -> string", function() {
      (function(){t.render("{{a : obj -> string}}", { 'a': {} });})
        .should.throw(TypeError);
    });
    it("won't convert obj -> array", function() {
      (function(){t.render("{{a : obj -> array}}", { 'a': {} });})
        .should.throw(TypeError);
    });
    it("won't convert obj -> number", function() {
      (function(){t.render("{{a : obj -> num}}", { 'a': {} });})
        .should.throw(TypeError);
    });
    // Array
    it("won't convert array -> string", function() {
      (function(){t.render("{{a : array -> string}}", { 'a': {} });})
        .should.throw(TypeError);
    });
    it("won't convert array -> number", function() {
      (function(){t.render("{{a : array -> number}}", { 'a': {} });})
        .should.throw(TypeError);
    });
    it("won't convert string -> obj", function() {
      (function(){t.render("{{a : obj -> string}}", { 'a': {} });})
        .should.throw(TypeError);
    });
    // TODO (Lito): Enumerate all the compatable and incompatable conversions
  });
});


describe("rendering a template", function() {

  it("renders a number", function() {
    t.render("{{a: num}}", {'a': 1}).should.equal(1);
  });

  it("ignores a non-template exp", function() {
    t.render("a", {'a': 1}).should.equal("a");
  });

  it("renders a string", function() {
    t.render("{{a: string}}", {'a': "1"}).should.equal("1");
  });

  it("coerces a number to a string", function() {
    t.render("{{a: num -> string}}", {'a': 1}).should.equal("1");
  });

  it("coerces a string to a number", function() {
    t.render("{{a: string -> num}}", {'a': "1"}).should.equal(1);
  });

  it("but refuses to coerce anything that's not just digits", function() {
    (function(){t.render("{{a: string -> num}}", {'a': "seven"});})
      .should.throw(TypeError, /coerce non-digit string to number/);
    // Plain ol' parseFloat is too permissive 
    (function(){t.render("{{a: string -> num}}", {'a': "40 years"});})
      .should.throw(TypeError, /coerce non-digit string to number/);
  });

  it("can substitute strings in longer strings", function() {
    t.render("{{a : num -> string}}, 2", { 'a': 1 }).should.equal("1, 2");
  });

  it("won't accept non-string types if chars outside template", function() {
    (function(){t.render("Seventy-{{a: num}} benevolent elephants", {"a": 1});})
      .should.throw(TypeError);
  });

  it("will accept html and url types in a string", function() {
    t.render("<h1>{{title : string -> html}}</h1>", 
      {"title": "how to write <div>s" })
      .should.equal("<h1>how to write &lt;div&gt;s</h1>");
    t.render("The resource is linked here: {{link: string -> url}}", 
      {"link": "http://www.azuqua.com/'!'" })
      .should.equal(
        "The resource is linked here: http%3A%2F%2Fwww.azuqua.com%2F%27%23%27"
      );
  });

  it("has a sane response to empty strings", function() {
    t.render("", { 'a': "" }).should.equal("");
    t.render("{{a : string}}", { 'a': "" }).should.equal("");
    // Empty string is NOT false!
    (function(){t.render("{{a : bool}}", { 'a': "" });})
      .should.throw(TypeError);
  });

  it("doesn't kill spaces", function() {
    t.render(" ", { 'a': "" }).should.equal(" ");
    t.render("{{a: string}}", { 'a': " " }).should.equal(" ");
    t.render(" {{a : string}} ", { 'a': " " }).should.equal("   ");
  });

  it("can can cope with Unicode", function() {
    // Thankfully this is supported by default in Node, we'll just have to pass
    // "charset: utf-8" in the Content-Type header
    t.render("{{a : string}}", { 'a': "坊主が屏風に上手に坊主の絵を書いた" })
      .should.equal("坊主が屏風に上手に坊主の絵を書いた");
  });

  it("preserves arrays and objects untouched", function() {
    // Arrays and Objects can't be typed in JS, so they're just preserved.
    t.render("{{a : array}}", { 'a': ["x", 1] }).should.deep.equal(["x", 1]);
    t.render("{{a : obj}}", { 'a': {"x": 1} }).should.deep.equal({"x": 1});
  });

  it("refuses functions", function() {
    (function(){t.render("{{a : obj}}", { 'a': function(a){return a;} });})
      .should.throw(TypeError);
  });

  it("refuses multiple typed objects", function() {
    (function(){t.render("{{a : num}}{{b : num}}", { 'a': 1, 'b': 1 });})
      .should.throw(TypeError);
  });

  it("escapes html", function() {
    t.render("{{a : string -> html}}", { 'a': "<div>" })
      .should.equal("&lt;div&gt;");
    t.render("{{a : string -> html}}", { 'a': '"&"' })
      .should.equal('&quot;&amp;&quot;');
    t.render("{{a : string -> html}}", { 'a': "'/" })
      .should.equal('&#39;&#x2F;');
  });

  it("escapes urls", function() {
    t.render("{{a : string -> url}}", { 'a': "!$&'()*+,/:;=?@[]" })
      .should.equal("%23%24%26%27%28%29%2A%2B%2C%2F%3A%3B%3D%3F%40%5B%5D");
  });

  it("handles nulls", function() {
    assert(t.render("{{a : null}}", { 'a': null }) === null);

    (function(){t.render("{{a : undefined}}", { 'a': null });})
      .should.throw(TypeError);
  });

  it("validates paths", function() {
    (function(){t.render("{{a a : num}}", {"a": 1});}).should.throw(ParseError);
    (function(){t.render("{{a[b] : num}}", {"a": 1});}).should.throw(ParseError);
  });

  describe("support for maybe types", function() {
    it("has maybe types", function() {
      t.render("{{a : string? -> string?}}", { 'a': "kaeru ga kaeru" })
        .should.equal('kaeru ga kaeru');
      t.render("{{a : string? -> html?}}", { 'a': "kaeru ga kaeru>" })
        .should.equal('kaeru ga kaeru&gt;');
    });
    it("maybe types pass on null and undefined", function() {
      assert(t.render("{{a : string? -> string?}}", { 'a': null}) === null);
      assert(t.render("{{a : object? -> object?}}", { 'a': undefined }) === undefined);
    });
    it("requires maybe types to match", function() {
      (function(){t.render("{{a : string? -> string}}",
                          {"a": "drunk stone lions"});})
        .should.throw(TypeError);
    });
  });

});

describe("the public-facing API", function() {
  it("renders a template", function() {
    api.render("{{a: num -> string}}", {'a': 1}).should.equal("1");
  });

  describe("mapping across JSON objects", function() {
    it("renders a JSON object", function() {
      var obj = {
        "a": "{{namamugi : string -> num}}", 
        "b": {
          "d": [
            "{{namagome}}",
            "ordinary string"
          ],
          "c": {
            "e": "{{namatamago : string -> html}}"
          }
        }
      };
      var env = {
        "namamugi": "1",
        "namagome": "rice",
        "namatamago": "<eggs>"
      };
      api.map(obj, env).should.deep.equal({
        "a": 1, 
        "b": {
          "d": [
            "rice",
            "ordinary string"
          ],
          "c": {
            "e": "&lt;eggs&gt;"
          }
        }
      });
    });

    it("refuses non-JSON objects", function() {
      var obj = {
        "a": true, 
        "b": {
          "c": "{{x}}"
        }
      };
      var env = {
        "x": "hello",
      };
      (function(){api.map(obj, env);}).should.throw(TypeError);
    });
  });
});
