Sky
===

A javascript based morph.


What is morph?
--------------

Morph is a language and an idea of building language bottom-up with
specially designed bottom-up extensible grammar. In other words it's
a generalization of Lisps macros and
`Perl 6 mutable grammar <http://perlgeek.de/en/article/mutable-grammar-for-perl-6>`_.


Why Javascript?
---------------

- it's high level
- it's popular
- it has good implenetation
- it has obvious language flaws


Example
-------

Javascripts for-in loop has a well-known flaw - it can iterate by ad-hoc inherited properties.
The usual solution is wrapping loop body with ``obj.hasOwnProperty(key)`` which is annoying.
How cool would be writing it like::

    for (own key in obj) {
        // do something with own properties of obj
    }

And you can do it in sky, by just adding a rule like::

    rule ~ for (own <key:ident> in <object:expr>) <code-block> ~ {
        var temp = uniq_ident();
        return ~
            var <temp> = <object>;
            for (<key> in <temp>) {
                if (<temp>.hasOwnProperty(<key>))
                    <code-block>
            }
        ~;
    }

Rules can help fix language flaws, avoid design pattern copy-paste, make DSLs. You can even morph one language into another and use them together.


TODO
----

Lots of things, actually. Most urgent are:

- rules priority
- file scope for rules
- lexical scope for rules
- make it usable

More distant ones:

- morph Javascript into Javascript
- fix well-known language flaws
- morph CoffeeScript into Javascript
- enable in-browser usage
