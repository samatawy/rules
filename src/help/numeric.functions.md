---
title: Numeric Functions
---

# Numeric Functions

## Numeric Comparison

### `equal(left, right)`
Returns `true` when two numbers are equal.

```
if equals(score, 100) then perfect = true
```

### `closeTo(left, right, difference)`
Returns `true` when two numbers differ by a value smaller than a given difference.

```
if closeTo(temperature, 37, 0.5) then healthy_temperature = true
```

### `greaterThan(left, right)`
Returns `true` when the first number is greater than the second.

```
if greaterThan(balance, limit) then alert = true
```

### `lessThan(left, right)`
Returns `true` when the first number is less than the second.

```
if lessThan(stock, reorderPoint) then reorder = true
```

### `greaterThanOrEqual(left, right)`
Returns `true` when the first number is greater than or equal to the second.

```
if greaterThanOrEqual(score, passingScore) then passed = true
```

### `lessThanOrEqual(left, right)`
Returns `true` when the first number is less than or equal to the second.

```
if lessThanOrEqual(discount, maxDiscount) then approved = true
```

### `between(value, min, max)`
Returns `true` when the value is within the inclusive range.

```
if between(age, 18, 65) then eligible = true
```

## Numeric Manipulation

### `ceil(number)`
Rounds a number up to the next integer.

```
set roundedUp = ceil(price)
```

### `floor(number)`
Rounds a number down to the previous integer.

```
set roundedDown = floor(price)
```

### `round(number)`
Rounds a number to the nearest integer.

```
set rounded = round(price)
```

### `roundTo(number, digits)`
Rounds a number to a fixed number of decimal places.

```
set tax = roundTo(invoiceTotal, 2)
```

### `power(number, exponent)`
Raises a number to the given exponent.

```
set squared = power(value, 2)
```

### `root(number, degree)`
Returns the given root of a number.

```
set cubeRoot = root(value, 3)
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

## Randomization Functions

### `random()`
Returns a pseudo-random value between 0 and 1.

### `randomBetween(min, max)`
Returns a pseudo-random value between min and max arguments.

```
set random_pass_grade = randomBetween(50, 100)
```

### `randomInteger(min, max)`
Returns a pseudo-random integer value between min and max arguments.

```
set random_year = randomInteger(1990, 2026)
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

### `phi()`
Returns the golden ratio.

```
set ratio = phi()
```

### `tau()`
Returns $2\pi$.

```
set turn = tau()
```

### `c()`
Returns the speed of light in meters per second.

```
set lightSpeed = c()
```

### `speedOfLight()`
Alias for `c()`.

```
set lightSpeed = speedOfLight()
```

### `g()`
Returns standard gravity.

```
set gravity = g()
```

### `goldenRatio()`
Alias for `phi()`.

```
set ratio = goldenRatio()
```

### `avogadro()`
Returns Avogadro's constant.

```
set particlesPerMole = avogadro()
```

### `planck()`
Returns Planck's constant.

```
set planckValue = planck()
```

### `electronMass()`
Returns the electron rest mass.

```
set mass = electronMass()
```

### `protonMass()`
Returns the proton rest mass.

```
set mass = protonMass()
```

### `neutronMass()`
Returns the neutron rest mass.

```
set mass = neutronMass()
```

### `boltzmann()`
Returns the Boltzmann constant.

```
set k = boltzmann()
```

### `gasConstant()`
Returns the universal gas constant.

```
set r = gasConstant()
```

### `faraday()`
Returns the Faraday constant.

```
set chargePerMole = faraday()
```

### `gravitationalConstant()`
Returns the gravitational constant.

```
set gConst = gravitationalConstant()
```
