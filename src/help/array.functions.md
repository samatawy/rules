---
title: Array Functions
---

# Array Functions

## Array Inspection

### `count(array)`
Returns the number of items in an array.

```
set childCount = count(Person.children)
```

### `sum(numbers)`
Returns the sum of a numeric array.

```
set totalSales = sum(Order.amounts)
```

### `avg(numbers)` or `mean(numbers)`
Returns the arithmetic mean of a numeric array.

```
set averageAge = avg(Students.age)
```

### `median(numbers)`
Returns the median value from a numeric array, i.e. the number in the middle.

```
set median = median(Exam.scores)
```

### `min(numbers)`
Returns the smallest value in a numeric array.

```
set youngestAge = min(Family.ages)
```

### `max(numbers)`
Returns the largest value in a numeric array. It can also be called with multiple numeric arguments.

```
set highestScore = max(Exam.scores)
```

### `range(numbers)`
Returns `max - min` for a numeric array. It can also be called with multiple numeric arguments.

```
set spread = range(Person.ages)
```

## Array Collection

### `concat(strings)`
Concatenates string items into a single string.

```
set fullName = concat(firstName, " ", lastName)
```

### `join(strings, separator)`
Joins string items using the provided separator.

```
set csv = join(tags, ", ")
```

## Array Lambda Operations

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

### `sort(array, item : predicate)`
Returns a sorted array sorted by the expression returned by each item.

```
set youngest_to_oldest = sort(Person.family, member : member.age)

set mostExpensive = sort(Store.products, product: product.price * -1);
```

### `filter(array, item : predicate)`
Returns a filtered array containing only matching items.

```
set adultFamily = filter(Person.family, member : member.age >= 18)
```

### `map(array, item : expression)`
Projects each item into a new array.

```
set familyNames = map(Person.family, member : member.name)
```
