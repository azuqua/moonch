Moonch
======

Moonch is a templating engine for Javascript that preserves types.

    "{{a : num}}" where {'a': 1}
    => 1

The types supported are:
- string
- num
- bool
- array
- obj
- null
- html
- url

Also, some types can be coerced to other types.

    "{{a : num -> string}}" where {'a': 1}
    => "1"

 - num -> string
 - string (of digits) -> num
 - string -> html
 - string -> html


HTML and URL Escaping
---------------------

For escaping HTML or URL special characters, Moonch provides `html` and 
`url` types!

    "{{title : string -> html}}

Use
---

    moonch.render(templateString, environment);
    
    e.g.

    moonch.render("{{a : num}}", {a: 2});
    => 2

If only strings are being rendered, multiple substitutions can be made:

    moonch.render("{{myNumber : string -> num}} {{adjective}} elephants.", 
    {myNumber: 77, "adjective": "benevolent"});

    => "77 benevolent elephants."


Also, a dot-delimited path can be used to access properties 
of the environment object:

    jsonObject = {
        "a" : {
            "b": 1
        }
    }

    moonch.render("{{a.b : num}}", jsonObject);
