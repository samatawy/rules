---
title: Rules Syntax
---

# Rules Syntax

Rules are the executable declarations in the engine. They read input data, evaluate conditions, and either write output or raise exceptions.

At the simplest level, a rule looks like this:

```
if <condition> then <action>
```

_N.B. Please note that all identifiers (constants, variable names, functions, command keywords, etc.) and operators are case-sensitive._

_Positional keywords however (CONST, IF, THEN, SET, THROW, and RUN) are case-insensitive for convenience._

This page shows the main rule forms, how comments and annotations work, and a few practical writing tips.

## Rule Shapes

### State Rules

State rules calculate values without a condition.

```
set person.is_adult = person.age >= 18
```

This is useful for derived state that other rules can reference later.

Example:

```
set vip_customer = customer.total_sales > 10000

set invoice.total_due = invoice.subtotal + invoice.tax
```

### If-Then Rules

These run an action only when the condition is satisfied.

```
if person.age >= 18 then person.is_adult = true

if order.total > 100 then order.free_shipping = true
```

### If-Then-Else Rules

These choose between two actions.

```
if isActive then status = "active" else status = "inactive"

if x > 10 then nested.value = 10 + 5 / 2 else nested.value = (10 + 5) / 2
```

### Exception Rules

These stop normal processing by raising an exception when the condition is met.

```
if buyer.age < 21 throw 'Only adults can buy tickets'

if invoice.total <= 0 throw "Invalid invoice amount"
```

## Conditions

Conditions are expressions that evaluate to true or false.

Simple comparison:

```
if status == "OPEN" then editable = true
```

Logical combination:

```
if age >= 18 and country == "US" then eligible = true
```

Nested expression:

```
if x > 10 and (y < 5 or z == 0) then match = true
```

Function-driven condition:

```
if count(person.children) > 2 then person.has_many_children = true
```

Array lambda condition:

```
if every(person.family, member : member.age > 10) 
then person.has_old_children = true 
else person.has_old_children = false
```

For the full expression language, see [expression.syntax.md](expression.syntax.md).

## Actions

An action is what the rule does after `then`, `else`, or `set`.

### Single Assignment

```
if score >= 60 then passed = true
```

### Multiple Assignments

Use semicolons to chain actions in the same consequence.

```
if count(person.children) > 2 then person.child_count = count(person.children); person.family_size = "large"
```

## Comments

Rules files support comments starting with `//` or `#`.

### Full-line Comments

Use these to explain intent, thresholds, or business context.

```
// Customers above this threshold are considered premium
if customer.spend >= 1000 then customer.segment = "premium"
```

```
# Reject impossible invoice totals
if invoice.total <= 0 throw 'Invalid invoice amount'
```

### Inline Comments

Inline comments can be placed after a line or a rule.

```
if x > 10 then result = triple(x) // equivalent to x * 3 in this business context
```

### Practical Advice for Comments

- Comment the business reason, not the obvious syntax.
- Prefer comments for thresholds, exceptions, legal requirements, or non-obvious formulas.
- Keep comments close to the rule they explain.

## Annotations

Rules can be prefixed with annotations for metadata.

Supported annotations are:

- `@name(...)`
- `@description(...)`
- `@salience(...)`

### `@name(...)`

Use a short readable name for logs, debugging, and audits.

```
@name(Adult Status)
if person.age >= 18 then person.is_adult = true
```

### `@description(...)`

Use a longer explanation when the rule intent is not obvious from the syntax alone.

```
@description(Flag invoices that qualify for free shipping)
if order.total > 100 then order.free_shipping = true
```

### `@salience(...)`

Use salience to prioritize rules when several could apply.

```
@salience(7)
if x > 30 then y = 30
```

Higher salience means higher priority.

### Multiple Annotations

Annotations can be combined:

```
@salience(7) @name(Highest Priority)
if x > 30 then y = 30
```

They can also be split over lines:

```
@name(Split over lines)
@description(A named rule with separate metadata lines)
if x > 10 then result = 10 + 5 / 2
```

## Formatting Patterns

### Single-line Rule

Good for short rules.

```
if person.age >= 18 then person.is_adult = true
```

### Split Across Lines

Better when the condition or action is long.

```
if order.total > 100
then order.shipping = 0
else order.shipping = 15
```

### Expression-Heavy Rule

```
if count(person.children) > 2 && range(person.children.age) >= 10
then person.summary = concat("Family size: ", count(person.children), ", spread: ", range(person.children.age))
else person.summary = "No summary"
```

## Common Rule Types by Intent

### Eligibility Rules

```
if applicant.age >= 18 and applicant.country == "CA" then applicant.eligible = true
```

### Classification Rules

```
if order.total >= 1000 then order.band = "enterprise" else order.band = "standard"
```

### Validation Rules

```
if not(email contains "@") then throw "Invalid email"
```

### Derived State Rules

```
set person.age_band = person.age >= 18 ? "adult" : "minor"
```

## Tips

- Prefer `set` rules for derived values that should always be calculated when inputs exist.
- Prefer `if ... then ... else` when the output should explicitly branch.
- Use annotations on business-critical rules so audit logs stay readable.
- Use comments to explain why a rule exists, not to repeat the syntax.
- Split long rules across lines when the condition and action no longer scan quickly.
- Keep each rule focused on one business decision even if it writes more than one related output.
- Use salience only when you need explicit priority between overlapping rules.

## Examples from Simple to Richer Rules

### 1. Basic state assignment

```
set status = "new"
```

### 2. Simple conditional rule

```
if person.age >= 18 then person.is_adult = true
```

### 3. Conditional with else

```
if isActive then status = "active" else status = "inactive"
```

### 4. Multiple actions

```
if count(person.children) > 2 then person.child_count = count(person.children); person.age_range = range(person.children)
```

### 5. Annotated rule

```
@salience(7) @name(Highest Priority)
if x > 30 then y = 30
```

### 6. Commented rule block

```
// Premium customers get a manual review flag
@name(Premium Review)
if customer.spend >= 1000 then customer.review_required = true
```

### 7. Rule using array logic

```
if every(person.family, member : member.age > 10) 
then person.has_old_children = true 
else person.has_old_children = false
```