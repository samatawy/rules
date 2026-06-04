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

### Numeric Inspection

### `multiple_of(value, divisor) | divisible_by(value, divisor)`
Alternative syntax: `multipleOf(value, divisor)` or `divisibleBy(value, divisor)`.

Returns `true` when the value is exactly divisible by the divisor.

```
if invoice_count.multiple_of(5) then bulk_batch = true
```

### `factor_of(value, target)`
Alternative syntax: `factorOf(value, target)`.

Returns `true` when the value is a factor of the target number.

```
if installment.factor_of(total_amount) then clean_split = true
```

### `is_positive(value)`
Alternative syntax: `isPositive(value)`.

Returns `true` when the value is greater than zero.

```
if balance.is_positive() then in_credit = true
```

### `is_negative(value)`
Alternative syntax: `isNegative(value)`.

Returns `true` when the value is less than zero.

```
if delta.is_negative() then decreased = true
```

### `is_even(value)`
Alternative syntax: `isEven(value)`.

Returns `true` when the value is an even integer.

```
if invoice_number.is_even() then even_batch = true
```

### `is_odd(value)`
Alternative syntax: `isOdd(value)`.

Returns `true` when the value is an odd integer.

```
if invoice_number.is_odd() then odd_batch = true
```

### `is_prime(value)`
Alternative syntax: `isPrime(value)`.

Returns `true` when the value is a prime integer greater than 1.

```
if candidate.is_prime() then prime_candidate = true
```

### `is_integer(value)`
Alternative syntax: `isInteger(value)`.

Returns `true` when the value has no fractional part.

```
if quantity.is_integer() then whole_units = true
```

### `is_nan(value)`
Alternative syntax: `isNaN(value)`.

Returns `true` when the value is `NaN`.

```
if measurement.is_nan() then invalid_measurement = true
```

### `is_finite(value)`
Alternative syntax: `isFinite(value)`.

Returns `true` when the value is a finite number.

```
if reading.is_finite() then usable_reading = true
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

### `truncate(number)`
Removes the fractional part without rounding. This is equivalent to floor if the number is positive, and ceil if the number is negative.

```
set truncated = balance_change.truncate()
```

### `round(number)`
Rounds a number to the nearest integer.

```
set rounded = price.round()
```

### `clamp(number, min, max)`
Constrains a number to the inclusive range between `min` and `max`. Bound order does not matter.

```
set normalized_score = score.clamp(100, 0)
```

### `mod(number, divisor) | modulo(number, divisor)`
Returns the positive modulo result for the given divisor.

```
set weekday_slot = offset.modulo(7)
```

### `round_to(number, digits)`
Alternative syntax: `roundTo(number, digits)`.

Rounds a number to a fixed number of decimal places.

```
set tax = invoice_total.round_to(2)
```

### `round_to_step(number, digits)`
Alternative syntax: `roundToStep(number, digits)`.

Rounds a number to the nearest value divisible by the step.

```
set tax = invoice_total.round_to_step(0.25)
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

### `factorial(number)`
Returns the factorial of a non-negative integer.

```
set arrangements = count.factorial()
```

### `permutation(number, r) | npr(number, r)`
Returns the number of ordered selections of `r` items from `number` items.

```
set ordered_codes = total_codes.npr(2)
```

### `combination(number, r) | ncr(number, r) | binomial(number, r)`
Returns the number of unordered selections of `r` items from `number` items.

```
set unordered_codes = total_codes.ncr(2)
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
