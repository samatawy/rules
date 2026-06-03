---
title: Numeric Functions
---

# Numeric Functions

Use snake_case names in new rules. Where a camelCase compatibility alias exists, it is listed below the heading.

## Numeric Comparison

### `equal(left, right)`
Returns `true` when two numbers are equal.

```
if score.equal(100) then perfect = true
```

### `close_to(left, right, difference)`
Alternative syntax: `closeTo(left, right, difference)`.

Returns `true` when two numbers differ by a value smaller than a given difference.

```
if temperature.close_to(37, 0.5) then healthy_temperature = true
```

### `greater_than(left, right)`
Alternative syntax: `greaterThan(left, right)`.

Returns `true` when the first number is greater than the second.

```
if balance.greater_than(limit) then alert = true
```

### `less_than(left, right)`
Alternative syntax: `lessThan(left, right)`.

Returns `true` when the first number is less than the second.

```
if stock.less_than(reorder_point) then reorder = true
```

### `greater_than_or_equal(left, right)`
Alternative syntax: `greaterThanOrEqual(left, right)`.

Returns `true` when the first number is greater than or equal to the second.

```
if score.greater_than_or_equal(passing_score) then passed = true
```

### `less_than_or_equal(left, right)`
Alternative syntax: `lessThanOrEqual(left, right)`.

Returns `true` when the first number is less than or equal to the second.

```
if discount.less_than_or_equal(max_discount) then approved = true
```

### `between(value, min, max)`
Returns `true` when the value is within the inclusive range.

```
if age.between(18, 65) then eligible = true
```

## Numeric Manipulation


### `neg(number) | negative(number)`
Returns the additive inverse of the number. A positive value becomes negative.

```
set negative_value = positive_value.negative()
```
- The purpose of this function is to avoid using the minus sign in front of variables to invert them. This common practice make expressions less clear and more error-prone. 

### `ceil(number)`
Rounds a number up to the next integer.

```
set rounded_up = price.ceil()
```

### `floor(number)`
Rounds a number down to the previous integer.

```
set rounded_down = price.floor()
```

### `round(number)`
Rounds a number to the nearest integer.

```
set rounded = price.round()
```

### `round_to(number, digits)`
Alternative syntax: `roundTo(number, digits)`.

Rounds a number to a fixed number of decimal places.

```
set tax = invoice_total.round_to(2)
```

### `pow(number, exponent) | power(number, exponent)`
Raises a number to the given exponent.

```
set squared = value.power(2)
```

### `root(number, degree)`
Returns the given root of a number.

```
set cube_root = value.root(3)
```

### `abs(number)`
Returns the absolute value.

```
set distance = abs(delta)
```

### `sign(number)`
Returns `-1`, `0`, or `1` depending on the sign.

```
set direction = sign(balanceChange)
```

### `sqrt(number)`
Returns the square root.

```
set magnitude = sqrt(area)
```

### `log(number)`
Returns the natural logarithm.

```
set naturalLog = log(value)
```

### `log10(number)`
Returns the base-10 logarithm.

```
set decibelsBase = log10(signal)
```

### `log2(number)`
Returns the base-2 logarithm.

```
set bits = log2(capacity)
```

### `exp(number)`
Returns $e^x$.

```
set growthFactor = exp(rate)
```

## Angle Functions

### `deg_to_rad(number)`
Converts an angle in degrees to radians.

```
set angle_rad = angle_deg.deg_to_rad()
```

### `rad_to_deg(number)`
Converts an angle in radians to degrees.

```
set angle_deg = angle_rad.rad_to_deg()
```

### `normalize_deg(number)`
Normalizes an angle in degrees to the range `[0, 360)`. Any negative angles will be represented in the required range.

```
set heading = raw_heading.normalize_deg()
```

### `normalize_rad(number)`
Normalizes an angle in radians to the range `[0, 2 * pi())`. Any negative angles will be represented in the required range.

```
set phase = raw_phase.normalize_rad()
```

## Randomization Functions

### `random()`
Returns a pseudo-random value between 0 and 1.

### `random_between(min, max)`
Alternative syntax: `randomBetween(min, max)`.

Returns a pseudo-random value between min and max arguments.

```
set random_pass_grade = random_between(50, 100)
```

### `random_integer(min, max)`
Alternative syntax: `randomInteger(min, max)`.

Returns a pseudo-random integer value between min and max arguments.

```
set random_year = random_integer(1990, 2026)
```

## Trigonometric Functions

### `sin(number)`
Returns the sine of the input.

```
set y = sin(angle)
```

### `cos(number)`
Returns the cosine of the input.

```
set x = cos(angle)
```

### `tan(number)`
Returns the tangent of the input.

```
set slope = tan(angle)
```

### `asin(number)`
Returns the inverse sine.

```
set angle = asin(ratio)
```

### `acos(number)`
Returns the inverse cosine.

```
set angle = acos(ratio)
```

### `atan(number)`
Returns the inverse tangent.

```
set angle = atan(ratio)
```

### `atan2(y, x)`
Returns the angle from two coordinates.

```
set angle = atan2(deltaY, deltaX)
```

## Numeric Constants

### `pi()`
Returns the mathematical constant $\pi$.

```
set circumferenceFactor = pi()
```

### `e()`
Returns Euler's number.

```
set naturalBase = e()
```

### `phi() | golden_ratio()`
Returns the golden ratio.

```
set ratio = phi()
```

### `tau()`
Returns $2\pi$.

```
set turn = tau()
```
