---
title: Boolean Functions
---

# Boolean Functions

### `is(value)` or `if(value)`
Returns the boolean equivalent of the argument, so `is(1 == 1)` returns `true` and `is(1 == 0)` returns `false`.

When passed a variable or a non-boolean argument, it checks if the argument has a non-false value, so:
- `is(5)` return `true` while `is(0)` returns `false`.
- `is("contents")` return `true` while `is("")` returns `false`.
- `is(person)` return `true` if the person was any object and `false` if the person was `null` or `undefined`.

```
set roomReady = is(roomClean AND roomEmpty)
```

### `not(value)`
Returns the inverse of the argument, so `not(true)` returns `false` and `not(false)` returns `true`.

When passed a variable or a non-boolean argument, the behaviour is the inverse of `is` or `if`.

```
set isAdult = not(isMinor)
```

### `every(array, item : predicate)`
Returns `true` when every array item satisfies the lambda condition.

```
if every(Person.family, member : member.age >= 18) then Person.allAdults = true
```

### `any(array, item : predicate)`
Returns `true` when at least one item satisfies the lambda condition.

```
if any(Person.family, member : member.age < 18) then Person.hasMinor = true
```

N.B. See similar [Array Functions](array.functions.md).