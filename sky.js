#!/usr/bin/env node
var argv = require('optimist').argv,
    fs = require('fs'),
    util = require('util');

// var grammar_file = argv._[0];
// console.log("> Going to sky " + grammar_file + "...");
//
// var text = fs.readFileSync(grammar_file, "utf8");
// console.log(text);

function out(thing) {
    console.log(util.inspect(thing, false, null));
}

var sky = {
    each: function (obj, func) {
        for (var p in obj) {
            if (obj.hasOwnProperty(p)) {
                func(obj[p], p);
            }
        }
    },
    map: function (obj, func) {
        var result = [];
        for (var p in obj) {
            if (obj.hasOwnProperty(p)) {
                result.push(func(obj[p], p));
            }
        }
        return result;
    },
    flat: function (list) {
        var result = [], chunk;
        for (var i = 0; i < list.length; i++) {
            chunk = list[i];
            if (chunk instanceof Array) {
                result = result.concat(chunk);
            } else if (chunk) {
                result.push(chunk);
            }
        }
        return result;
    },
    flat_map: function (list, func) {
        return sky.flat(list.map(func));
    },
    list_to_hash: function (list) {
        var hash = {};
        for (var i = 0; i < list.length; i++) {
            hash[list[i]] = true;
        }
        return hash;
    },
    child: function (obj, props) {
        var child = Object.create(obj);
        sky.each(props, function (value, prop) {
            child[prop] = value;
        });
        return child;
    },
    inspect: function (obj) {
        var result = {};
        for (var p in obj) {
            result[p] = obj[p];
        }
        return result;
    },
    send: function (message) {
        return function (obj) {
            return obj[message]();
        }
    },

    rules: [],
    rules_by_name: {},
    define_rule: function (matches) {
        this.rules.push(matches);
        if (!this.rules_by_name[matches.name]) {
            this.rules_by_name[matches.name] = [];
        }
        this.rules_by_name[matches.name].push(matches);
    },
    define_rules: function () {
        [].forEach.call(arguments, function (rule) {
            sky.define_rule(rule);
        });
    },

    _start_rules_of: {},
    start_rules_of: function (parent_rule_name) {
        var starts = {}, count;
        starts[parent_rule_name] = true;

        if (!this._start_rules_of[parent_rule_name]) {
            do {
                count = Object.keys(starts).length;
                this.rules.forEach(function (rule) {
                    if (starts[rule.name] && rule.terms[0].rule) {
                        starts[rule.terms[0].rule] = true;
                    }
                })
            } while (count != Object.keys(starts).length);
            this._start_rules_of[parent_rule_name] = starts;
        }
        return this._start_rules_of[parent_rule_name];
    }
};
lang = sky.child(sky, {
    rules: [],
    rules_by_name: {},
    _start_rules_of: {}
});

sky.define_rules(
    {name: "ident", terms: [/^[a-zA-Z][a-zA-Z0-9-]*/]},

    {name: "rule-literal-term", terms: [/^[^@]\S*|\\(.)/]},
    {name: "rule-ref",
     terms: ["<", {name: "name", rule: "ident"}, ":", {name: "rule", rule: "ident"}, ">"]},

    {name: "regex-body", terms: [/^~([^~]+)~/]},
    {name: "regex-def",
     terms: ["regex", {name: "name", rule: "ident"}, {name: "re", rule: "regex-body"}],
     expand: function (matches) { lang.define_rule({
         name: matches.name.expand(),
         terms: [new RegExp('^(' + matches.re.expand() + ')')]
     }) } },
    {name: "rule-maybe",
     terms: ["rule", {name: "name", rule: "ident"}, "maybe",
             {name: "rules", rule: "ident", collect: "array"},
             {repeat: {from: 0, to: Infinity}, terms: [",", {name: "rules", rule: "ident", collect: "array"}]},
             "~"],
     expand: function (matches) {
        matches.rules.forEach(function (rule) {
            sky.rules.push({name: matches.name, terms: [{rule: rule}]});
        });
    }},
    {name: "rule-cond-expr", terms: [{name: "expr", rule: "rule-expr"}, "@?"],
     expand: function (matches) { return sky.child(matches.expr, {repeat: {from: 0, to: 1}}) }},
    {name: "rule-star-expr", terms: [{name: "expr", rule: "rule-expr"}, "@*"],
     expand: function (matches) { return sky.child(matches.expr, {repeat: {from: 0, to: Infinity}, collect: "array"}) }},
    {name: "rule-plus-expr", terms: [{name: "expr", rule: "rule-expr"}, "@+"],
     expand: function (matches) { return sky.child(matches.expr, {repeat: {from: 1, to: Infinity}, collect: "array"}) }}
);
"rule-literal-term rule-ref rule-cond-expr rule-star-expr rule-plus-expr".split(" ").forEach(function (rule) {
    sky.define_rules({name: "rule-expr", terms: [{rule: rule}]});
});
sky.define_rules({
    name: "rule-def",
    terms: ["rule", {name: "name", rule: "ident", repeat: {from: 0, to: 1}},
            "~", {name: "terms", rule: "rule-expr", repeat: {from: 1, to: Infinity}, collect: "array"}, "~",
            "{", {name: "code", rule: "code"}, "}"],
    expand: function (matches) { sky.rules.push(matches); }
});
sky.define_rules(
    {name: "int-literal", terms: [/^0|^[1-9][0-9]*/]},
    {name: "add-expr", terms: [{name: "left", rule: "expr"}, "+", {name: "right", rule: "expr"}],
     expand: function (matches) {
        return "(" + matches.left + " + " + matches.right + ")";
    }},
    {name: "mul-expr", terms: [{name: "left", rule: "expr"}, "*", {name: "right", rule: "expr"}],
     expand: function (matches) {
        return "(" + matches.left + " * " + matches.right + ")";
    }}
);
"int-literal ident add-expr mul-expr".split(" ").forEach(function (rule) {
    sky.define_rules({name: "expr", terms: [{rule: rule}]});
});
sky.define_rules(
    {name: "statement", terms: [{name: "expr", rule: "expr"}, ";"],
     expand: function (matches) { return matches.expr.expand() + ";"; }},
    {name: "statement", terms: [{name: "def", rule: "rule-def"}, ";"]},
    {name: "statement", terms: [{name: "def", rule: "regex-def"}, ";"]}
);

sky.assoc = {"add-expr": "left", "mul-expr": "left"};
sky.priority = {"add-expr": 1, "mul-expr": 2};

sky.tighter = function (rule) {
    return Object.keys(sky.priority).filter(function (x) {
        return sky.priority[x] > sky.priority[rule];
    });
};
sky.looser = function (rule) {
    return Object.keys(sky.priority).filter(function (x) {
        return sky.priority[x] < sky.priority[rule];
    });
};

sky.base_rule_name = "statement";


function RuleState(rule) {
    return sky.child(RuleState.prototype, {
        rule: rule,
        pos: 0,
        matched: [],
        matches: {}
    });
}

// TODO: rename rules to folds where appropriate

RuleState.prototype = {
    toString: function () {
        var repr = this.rule.name;
        if (this.pos != this.rule.terms.length) {
            repr += ':' + this.pos
        }
        repr += '(' + this.matched.join(',') + ')';
        return repr;
    },

    child: function () {
        var child = Object.create(this);
        child.matched = [].concat(this.matched);
        return child;
    },

    moved: function(term) {
        var child = this.child(),
            term_def = child.rule.terms[child.pos];
        
        if (term_def.name)
            child.matches[term_def.name] = term;
        child.pos += 1;
        child.matched.push(term)
        return child;
    },

    assoc: function () {
        return sky.assoc[this.assoc_rule()];
    },
    assoc_rule: function () {
        if (sky.assoc[this.rule.name]) {
            return this.rule.name;
        } else if (this.rule.terms.length === 1 && this.rule.terms[0].rule) {
            return this.matched[0].assoc_rule()
        } else {
            return null;
        }
    },

    priority: function () {
        return sky.priority[this.priority_rule()];
    },
    priority_rule: function () {
        if (sky.priority[this.rule.name]) {
            return this.rule.name;
        } else if (this.rule.terms.length === 1 && this.rule.terms[0].rule) {
            return this.matched[0].priority_rule()
        } else {
            return null;
        }
    },

    default_expand: function () {
        return sky.map(this.matched, function (match) {
            return typeof match === 'string' ? match : match.expand();
        }).join(' ');
    },
    expand: function () {
        console.log('expand', this.rule);
        var exp = this.rule.expand ? this.rule.expand(this.matches) : this.default_expand();
        console.log('to', exp);
        return exp;
    }
};


function State(text) {
    return sky.child(State.prototype, {
        rest: text, done: '',
        pos: 0, line: 1, col: 0,
        parts: [],
        full: []
    });
}

State.prototype = {
    partsString: function () {
        return this.parts.map(function (state) {return state.toString()}).join(", ");
    },

    toString: function () {
        return {
            rest: this.rest,
            parts: this.partsString(),
            full: this.full.map(function (state) {return state.toString()}).join(", "),
        };
    },

    child: function () {
        var child = Object.create(this);
        child.parts = [].concat(this.parts);
        child.full = [].concat(this.full);
        return child;
    },

    next_is: function (match) {
        return this.rest.substr(0, match.length) === match;
    },

    eat: function (match) {
        var len = match.length;
        if (!this.next_is(match)) {
            throw Error("non-match in eat(), eating '" + match + "', rest: '" + this.rest + "'");
        }

        this.done += match;
        this.rest = this.rest.substr(len);
        this.pos += len;

        var lines = match.replace(/\r/, '').split(/\n/);
        this.line += lines.length - 1;
        var last_len = lines[lines.length - 1].length;
        this.col = lines.length === 1 ? this.col + last_len : last_len;
    },

    eat_space: function () {
        if (this.rest.match(/^(\s+)/)) {
            this.eat(RegExp.$1);
        }
    },

    expected_rules: function (folded) {
        var last_partial, next_term_rule;
        if (this.parts.length) {
            last_partial = this.parts[this.parts.length-1];
            next_term_rule = last_partial.rule.terms[last_partial.pos].rule;
        } else {
            next_term_rule = sky.base_rule_name;
        }
        var expected_rule_names = sky.child(sky.start_rules_of(next_term_rule));

        if (last_partial
                && last_partial.pos === last_partial.rule.terms.length - 1
                && sky.assoc[last_partial.rule.name] === "left")
        {
            expected_rule_names[last_partial.rule.name] = false;
        }

        if (last_partial
            && last_partial.pos === last_partial.rule.terms.length - 1
            && last_partial.priority())
        {
            var looser = sky.looser(last_partial.priority_rule());
/*            console.log('--priority', this.toString());
            console.log(last_partial.toString(), looser);*/
            looser.forEach(function (rule_name) {
                expected_rule_names[rule_name] = false;
            });
/*            console.log(sky.inspect(expected_rule_names));*/
        }

        if (folded && folded.assoc() === "right") {
            expected_rule_names[folded.assoc_rule()] = false;
        }

        if (folded && folded.priority()) {
            var tighter = sky.tighter(folded.priority_rule());
/*            console.log('--priority', this.toString());
            console.log(folded.toString(), tighter);*/
            tighter.forEach(function (rule_name) {
                expected_rule_names[rule_name] = false;
            });
/*            console.log(sky.inspect(expected_rule_names));*/
        }

        return sky.rules.filter(function (rule) { return expected_rule_names[rule.name] });
    },

    moved_by_folded: function (folded) {
        var state = this,
            moved = [], with_full;

        if (folded.rule.name === sky.base_rule_name && this.parts.length === 0) {
            var expanded = folded.expand();
            with_full = this.child();
            if (expanded)
                with_full.full.push(expanded);
            moved.push(with_full);
        }

/*        console.log(this.toString(), folded.toString());*/
        var start = sky.flat_map(this.expected_rules(folded), function (rule) {
            var term = rule.terms[0];
            if (term.rule && term.rule === folded.rule.name) {
                var partial = RuleState(rule);
/*                console.log('fold', folded.toString(), 'into', partial.toString());*/
                return state.moved_by_partial(partial.moved(folded));
            }
        });

        var continues = [];
        if (this.parts.length) {
            var i = this.parts.length - 1;
            var part = this.parts[i];

            var term = part.rule.terms[part.pos];
            if (term.rule && term.rule === folded.rule.name) {
                continues = state.moved_by_partial(part.moved(folded), i) || [];
            }
        }

        return moved.concat(start).concat(continues);
    },

    // undefined index means new partial
    moved_by_partial: function (partial, index) {
        var child = this.child();

        // update rule state
        if (index === undefined) index = this.parts.length;
        child.parts[index] = partial;

        // fold rule
        if (partial.pos === partial.rule.terms.length) {
            // После сворачивания нужно попытаться свернуть те, которые содержат свёрнутое
            child.parts.splice(index, 1);
            return child.moved_by_folded(partial);
        }

        return child;
    },

    moved_by_term: function (eat, value, rule, pos, partial, partial_index) {
        if (!partial) {
            partial = RuleState(rule);
        }

        var child = this.child();
        child.eat(eat);

        return child.moved_by_partial(partial.moved(value), partial_index);
    },

    moved_in_rule: function (rule, pos, partial, partial_index) {
        var term = rule.terms[pos];

        if (typeof term === "string") {
            if (this.next_is(term)) {
                return this.moved_by_term(term, term, rule, pos, partial, partial_index);
            }
        } else if (term instanceof RegExp) {
            var m = this.rest.match(term);
            if (m) {
                return this.moved_by_term(m[0], m[2] || m[0], rule, pos, partial, partial_index);
            }
        }
    },

    moved: function () {
        var state = this;
        state.eat_space();

        var start = sky.flat_map(this.expected_rules(), function (rule) {
            return state.moved_in_rule(rule, 0);
        });

        var continues = [];
        if (this.parts.length) {
            var index = this.parts.length - 1;
            var last_partial = this.parts[index];
            continues = state.moved_in_rule(last_partial.rule, last_partial.pos, last_partial, index) || [];
        }

        return start.concat(continues);
    },
}

var send = {};
['toString', 'moved'].forEach(function (message) {
    send[message] = sky.send(message);
});

function morph(text) {
    var states = [State(text)], prev = [];

    while (states.length) {
        console.log("");
        prev = states;
        states = sky.flat_map(states, send.moved);
        out(states.map(send.toString));
    }
    return prev[0];
}

out(morph('\
regex int-literal ~0|[1-9][0-9]+~;\
regex ident ~[a-zA-Z][a-zA-Z0-9-]*~;\
\
rule add-expr ~ <left:expr> + <right:expr> ~ {\
    return ~ (<left>) + (<right>) ~;\
}\
'));
out(['rules', lang.rules]);
