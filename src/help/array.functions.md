---
title: Array Functions
---

# Array Functions

## Array Inspection

### `count(array)`
Returns the number of items in an array.

```txt
set childCount = count(Person.children)
```

### `sum(numbers)`
Returns the sum of a numeric array.

```txt
set totalSales = sum(Order.amounts)
```

### `avg(numbers)`
Returns the arithmetic mean of a numeric array.

```txt
set averageAge = avg(Person.ages)
```

### `min(numbers)`
Returns the smallest value in a numeric array.

```txt
set youngestAge = min(Person.ages)
```

### `max(numbers)`
Returns the largest value in a numeric array. It can also be called with multiple numeric arguments.

```txt
set highestScore = max(Exam.scores)
```

### `range(numbers)`
Returns `max - min` for a numeric array. It can also be called with multiple numeric arguments.

```txt
set spread = range(Person.ages)
```

## Array Collection

### `concat(strings)`
Concatenates string items into a single string.

```txt
set fullName = concat(firstName, " ", lastName)
```

### `join(strings, separator)`
Joins string items using the provided separator.

```txt
set csv = join(tags, ", ")
```

## Array Lambda Operations

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

### `filter(array, item : predicate)`
Returns a filtered array containing only matching items.

```txt
set adultFamily = filter(Person.family, member : member.age >= 18)
```

### `map(array, item : expression)`
Projects each item into a new array.

```txt
set familyNames = map(Person.family, member : member.name)
```
