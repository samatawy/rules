---
title: Numeric Functions
---

# Numeric Functions

## Numeric Comparison

### `equal(left, right)`
Returns `true` when two numbers are equal.

```txt
if equals(score, 100) then perfect = true
```

### `closeTo(left, right, difference)`
Returns `true` when two numbers differ by a value smaller than a given difference.

```txt
if closeTo(temperature, 37, 0.5) then healthy_temperature = true
```

### `greaterThan(left, right)`
Returns `true` when the first number is greater than the second.

```txt
if greaterThan(balance, limit) then alert = true
```

### `lessThan(left, right)`
Returns `true` when the first number is less than the second.

```txt
if lessThan(stock, reorderPoint) then reorder = true
```

### `greaterThanOrEqual(left, right)`
Returns `true` when the first number is greater than or equal to the second.

```txt
if greaterThanOrEqual(score, passingScore) then passed = true
```

### `lessThanOrEqual(left, right)`
Returns `true` when the first number is less than or equal to the second.

```txt
if lessThanOrEqual(discount, maxDiscount) then approved = true
```

### `between(value, min, max)`
Returns `true` when the value is within the inclusive range.

```txt
if between(age, 18, 65) then eligible = true
```

## Numeric Manipulation

### `ceil(number)`
Rounds a number up to the next integer.

```txt
set roundedUp = ceil(price)
```

### `floor(number)`
Rounds a number down to the previous integer.

```txt
set roundedDown = floor(price)
```

### `round(number)`
Rounds a number to the nearest integer.

```txt
set rounded = round(price)
```

### `roundTo(number, digits)`
Rounds a number to a fixed number of decimal places.

```txt
set tax = roundTo(invoiceTotal, 2)
```

### `power(number, exponent)`
Raises a number to the given exponent.

```txt
set squared = power(value, 2)
```

### `root(number, degree)`
Returns the given root of a number.

```txt
set cubeRoot = root(value, 3)
```

### `abs(number)`
Returns the absolute value.

```txt
set distance = abs(delta)
```

### `sign(number)`
Returns `-1`, `0`, or `1` depending on the sign.

```txt
set direction = sign(balanceChange)
```

### `sqrt(number)`
Returns the square root.

```txt
set magnitude = sqrt(area)
```

### `log(number)`
Returns the natural logarithm.

```txt
set naturalLog = log(value)
```

### `log10(number)`
Returns the base-10 logarithm.

```txt
set decibelsBase = log10(signal)
```

### `log2(number)`
Returns the base-2 logarithm.

```txt
set bits = log2(capacity)
```

### `exp(number)`
Returns $e^x$.

```txt
set growthFactor = exp(rate)
```

## Trigonometric Functions

### `sin(number)`
Returns the sine of the input.

```txt
set y = sin(angle)
```

### `cos(number)`
Returns the cosine of the input.

```txt
set x = cos(angle)
```

### `tan(number)`
Returns the tangent of the input.

```txt
set slope = tan(angle)
```

### `asin(number)`
Returns the inverse sine.

```txt
set angle = asin(ratio)
```

### `acos(number)`
Returns the inverse cosine.

```txt
set angle = acos(ratio)
```

### `atan(number)`
Returns the inverse tangent.

```txt
set angle = atan(ratio)
```

### `atan2(y, x)`
Returns the angle from two coordinates.

```txt
set angle = atan2(deltaY, deltaX)
```

## Numeric Constants

### `pi()`
Returns the mathematical constant $\pi$.

```txt
set circumferenceFactor = pi()
```

### `e()`
Returns Euler's number.

```txt
set naturalBase = e()
```

### `phi()`
Returns the golden ratio.

```txt
set ratio = phi()
```

### `tau()`
Returns $2\pi$.

```txt
set turn = tau()
```

### `c()`
Returns the speed of light in meters per second.

```txt
set lightSpeed = c()
```

### `speedOfLight()`
Alias for `c()`.

```txt
set lightSpeed = speedOfLight()
```

### `g()`
Returns standard gravity.

```txt
set gravity = g()
```

### `goldenRatio()`
Alias for `phi()`.

```txt
set ratio = goldenRatio()
```

### `avogadro()`
Returns Avogadro's constant.

```txt
set particlesPerMole = avogadro()
```

### `planck()`
Returns Planck's constant.

```txt
set planckValue = planck()
```

### `electronMass()`
Returns the electron rest mass.

```txt
set mass = electronMass()
```

### `protonMass()`
Returns the proton rest mass.

```txt
set mass = protonMass()
```

### `neutronMass()`
Returns the neutron rest mass.

```txt
set mass = neutronMass()
```

### `boltzmann()`
Returns the Boltzmann constant.

```txt
set k = boltzmann()
```

### `gasConstant()`
Returns the universal gas constant.

```txt
set r = gasConstant()
```

### `faraday()`
Returns the Faraday constant.

```txt
set chargePerMole = faraday()
```

### `gravitationalConstant()`
Returns the gravitational constant.

```txt
set gConst = gravitationalConstant()
```
