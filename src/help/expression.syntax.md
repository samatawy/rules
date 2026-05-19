---
title: Expression Syntax
---

# Expression Syntax

Expressions are the parts of rule syntax that produce a value.

You use them in conditions:

```
if person.age == 18 then person.is_adult = true
```

and in assignments:

```
set person.label = "adult"
```

This page starts from the simplest forms and builds toward more complex expressions.

## Literals

The engine supports these literal values directly inside expressions:

- numbers such as `5` or `12.75`
- strings in single or double quotes
- booleans: `true` and `false`
- `null`

Examples:

```
set retries = 3

set status = "approved"

set isActive = true

set middleName = null
```

## Variables and Nested Paths

Variables read values from the current input or working state.

Simple variables:

```
if score == 100 then result = "perfect"
```

Nested paths use dot notation:

```
if person.age >= 18 then person.is_adult = true
```

You can also assign into nested output paths:

```
set invoice.summary.total = invoice.amount
```

## Assignment Expressions

Assignments appear in `set`, `then`, and `else` actions.

Simple assignment:

```
set result = "ok"
```

Conditional assignment:

```
if order.total > 0 then order.valid = true else order.valid = false
```

Multiple actions in the same rule can be separated with semicolons:

```
if count(person.children) > 2 then person.child_count = count(person.children); person.is_large_family = true
```

## Equality and Comparison

Comparison expressions return `true` or `false`.

Supported operators are:

- `==`
- `!=`
- `<`
- `>`
- `<=`
- `>=`
- `IN`
- `BEFORE`
- `AFTER`

Examples:

```
if status == "OPEN" then can_edit = true

if attempts != 0 then can_retry = true

if temperature > 38 then fever = true

if age >= 21 then can_buy = true
```

The `IN` operator checks if the left value equals any value from the right side

```
if state IN ['active', 'current'] then allow_login = true
```

Comparisons can use variables, literals, arithmetic, and functions:

```
if x + 5 == y * 2 then balanced = true

if total >= max(100, minimum_due) then cleared = true
```

## Arithmetic

Arithmetic expressions can appear anywhere a numeric value is expected.

Supported arithmetic operators are:

- `+`
- `-`
- `*`
- `/`
- `%`

Examples:

```
set total = subtotal + tax

set discounted = price - 5

set area = width * height

set average = sum(scores) / count(scores)

set remainder = id % 10
```

Use parentheses to control grouping:

```
if (x + 5) * 2 == (y / 2) then result = "match"
```

## Boolean Logic

Logical expressions combine comparisons and other truthy values.

Supported operators are:

- `and` or `&&`
- `or` or `||`

Examples:

```
if age >= 18 and country == "US" then eligible = true

if x > 10 && (y < 5 || z == 0) then match = true
```

You can also use variables directly as conditions:

```
if isActive then status = "active" else status = "inactive"
```

That is useful when the input already contains booleans or when you want presence-like checks on values:

```
if person.age then status = "age_known" else status = "age_unknown"
```

To negate a condition, use the built-in boolean function:

```
if not(score < 50) then passed = true
```

## Function Calls

Function calls look like standard function syntax:

```
name(arg1, arg2)
```

Examples with built-in functions:

```
if x < avogadro() then approx = floor(pi())

if x > max(1, 2, 3) then current_year = year(now())

set account_key = toLowerCase(email)
```

Functions can be nested:

```
set normalized = round(max(total, 10) / count(items))
```

Another supported syntax is chaining functions; A function may follow any expression whereby that expression will be the first argument for the function.

```
circle_area(shape: { radius: number }) = pi() * radius.power(2) 

IF is(shape.radius) THEN shape.area = shape.circle_area().roundTo(4)

// You can use the same syntax for arrays and lambda functions
IF Person.family.count() > 2 THEN Person.average_dependant_age = Person.family.age.filter(age : age < 21).average()

// You can chain functions on literal values
greet(name: string) = "Hello, ".concat(name, "!")

IF Person.name THEN greeting = Person.name.upperCase().greet()
```

This may be cleaner if you want to avoid multiple nested parentheses or if you prefer a more method-like syntax.

## Array Literals and Array-Aware Paths

Array literals use square brackets:

```
set weights = [1, 3, 5]
```

This is useful when calling array functions:

```
set highest = max([5, 10, 15])

set csv = join(["A", "B", "C"], ",")
```

When a path traverses an array of objects, the engine can project a field across items:

```
set family_age_range = range(person.family.age)
```

In that example, `person.family.age` behaves like an array of the `age` values from all objects in `person.family`.

## Lambda Expressions

Lambda expressions are mainly used with array functions such as `every`, `any`, `filter`, and `map`.

They use this shape:

```
item : expression
```

Examples:

```
if every(person.family, member : member.age >= 18) then person.all_adults = true

set adult_children = filter(person.family, member : member.age >= 18)

set child_names = map(person.family, member : member.name)
```

## Ternary Expressions

Ternary expressions let you choose between two values inline.

Syntax:

```
condition ? true_value : false_value
```

Examples:

```
set band = age >= 18 ? "adult" : "minor"

if x then result = x ? "greater" : "lesser"

if x then result = not(x < 10) ? "greater" : "lesser"
```

Ternaries are useful when you want one assignment expression instead of a full `if ... then ... else` rule.

## Switch Expressions

For multi-branch value selection, use `SWITCH`.

Syntax:

```
SWITCH(value) CASE case1: expr1, CASE case2: expr2, DEFAULT: fallback
```

Example:

```
if status == "A" or status == "B" or status == "C" 
then result = SWITCH(status) CASE "A": "one", CASE "B": "two", DEFAULT: "other" 
else result = "unknown"
```

This is often clearer than chaining nested ternaries.

## Simple to Complex Examples

### 1. Simple equality

```
if customer.type == "gold" then discount = 10
```

### 2. Simple assignment

```
set status = "new"
```

### 3. Arithmetic with comparison

```
if order.total + order.tax >= 100 then free_shipping = true
```

### 4. Nested path condition

```
if person.address.country == "CA" then person.region = "domestic"
```

### 5. Function call inside a rule

```
if score >= max(60, passing_score) then passed = true
```

### 6. Multiple assignments in one rule

```
if count(person.children) > 2 then person.child_count = count(person.children); person.family_size = "large"
```

### 7. Ternary assignment

```
set risk = balance > 1000 ? "high" : "normal"
```

### 8. Lambda over an array

```
if any(person.family, member : member.age < 18) then person.has_minor_children = true
```

### 9. Switch result selection

```
set label = SWITCH(priority) CASE 1: "urgent", CASE 2: "normal", DEFAULT: "low"
```

### 10. A more complete expression-driven rule

```
if count(person.children) > 2 && range(person.children.age) >= 10 
then person.summary = concat("Family size: ", count(person.children), ", spread: ", range(person.children.age)) 
else person.summary = "No summary"
```

## Comments Around Expressions

Expressions themselves do not contain a separate comment operator inside the expression grammar, but expressions are commonly written inside rules and files that do support comments.

Line comments with `//`:

```
// Calculate a simple label from age
if person.age >= 18 then person.band = "adult"
```

Line comments with `#`:

```
# Use a ternary to keep the assignment compact
set person.band = person.age >= 18 ? "adult" : "minor"
```

Inline comments after an expression:

```
if score >= max(60, passing_score) then passed = true // apply the higher threshold
```

Comments are useful for explaining why an expression exists, what a threshold means, or why a function call is written a certain way.

## Practical Notes

- Parentheses help avoid ambiguity in arithmetic and logical expressions.
- Function arguments can themselves be full expressions.
- Dot notation is the normal way to read nested data.
- Array functions and lambda expressions are the main way to express collection logic.
- Ternary and `SWITCH` are expression forms, so they are most useful on the right-hand side of assignments.
