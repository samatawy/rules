---
title: Boolean Functions
---

# Boolean Functions

### `not(value)`
Returns the inverse of the argument, so `not(true)` returns `false` and `not(false)` returns `true`.

```txt
set isAdult = not(isMinor)
```

### `every(array, item : predicate)`
Returns `true` when every array item satisfies the lambda condition.

```txt
if every(Person.family, member : member.age >= 18) then Person.allAdults = true
```

### `any(array, item : predicate)`
Returns `true` when at least one item satisfies the lambda condition.

```txt
if any(Person.family, member : member.age < 18) then Person.hasMinor = true
```

N.B. See similar [Array Functions](array.functions.md).