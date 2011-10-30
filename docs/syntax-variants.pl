
data = [1,2,3,4,5,6]

names = map(sub f: f.name, fields)
names = [f.name for f in fields]
start = grep(sub num: num < 4, data)
start = [num for num in data if num < 4]

# Порядок
names = map($.name, fields)
names = map(fields, $.name)
names = fields.map($.name)

start = grep($ < 4, data)
start = grep(data, $ < 4)
start = data.grep($ < 4)

# То же без скобок
names = map $.name, fields
names = map fields, $.name
names = fields.map $.name

start = grep $ < 4, data
start = grep data, $ < 4
start = data.grep $ < 4

# Без запятых
names = map $.name fields
names = map fields $.name
names = fields.map $.name

start = grep ($ < 4) data
start = grep data ($ < 4)
start = data.grep ($ < 4)

# Внещние скобки
names = (map $.name fields)
names = (map fields $.name)
names = (fields map $.name) # mapwith? morph?

start = (grep ($ < 4) data)
start = (grep data ($ < 4))
start = (data grep ($ < 4))

# Прочее
start = [data if $ < 4]
names = [$.name for fields]
names = [for fields $.name]
names = [fields with $.name]
names = map fields with $.name

# Сложная лямбда
names = map(fields, sub f: f.name)
start = grep(fields, sub num: num < 4)
names = (map fields (sub f: f.name))
start = (grep fields (sub num: num < 4))

# Сущность, окружённая скобками, уменьшает необходимость в окружающей пунктуации
names = map fields {f: f.name}
names = (map fields {f: f.name})

# Многострочная лямбда
names = map(fields, sub (a, b) {
            a + b
        })
names = map fields sub (a, b) {
            a + b
        }

names = map { |a,b|
            a + b
        } fields
names = map(fields, { |a,b|
            a + b
        })
names = fields.map({ |a,b|
            a + b
        })

names = (map fields { |a,b|
            a + b
        })

names = fields.map { |a,b|
            a + b
        }
names = map fields { |a,b|
            a + b
        }


# Разные варианты биндинга аргументов для анонимных функций
# С ключевым словом или внешней спецконструкцией
names = map(fields, sub (a, b) {
            a + b
        })
names = map(fields, (a, b) -> {
            a + b
        })
names = map fields (a, b -> {
            a + b
        })
# Внутри блока, вариации на тему ruby и smalltalk
names = map fields  { |a,b|
            a + b
        }
names = map fields {:a, :b |
            a + b
        }
names = map fields {a, b:
            a + b
        }
# автобиндинг в алфавитном порядке в стиле perl 6
# Ограничения: - нужен спец. символ или последовательность в начале переменных
#              - алфавитные имена вместо осмысленных
#              - никаких значений по умолчанию
names = map fields {
            $a + $b
        }

