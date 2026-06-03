---
title: Functions
children:
  - ./numeric.functions.md
  - ./string.functions.md
  - ./date.functions.md
  - ./boolean.functions.md
  - ./array.functions.md
  - ./conversion.functions.md
  - ./science.functions.md
  - ./world.functions.md
  - ./custom.functions.md
---

# Functions

Built-in functions are grouped below by what they operate on. 

You can always declare your own functions if these lack what you need. 

Please note that there is no overloading of functions, so no two functions can have the same name.

Use snake_case names whenever possible. Many functions may offer a camelCase alternative name to suit common styles, but snake_case allows more clarity in longer names so it is recommended as the default.

## Numeric Functions

These compare, inspect, and manipulate numbers. They include functions commonly used in algebra and trigonometry.

[Full list](numeric.functions.md)

## String Functions

These compare, inspect, and manipulate strings. They all work with UTF strings so any language can be handled.

[Full list](string.functions.md)

## Date/Time Functions

These compare, inspect, and manipulate date/time values.

[Full list](date.functions.md)

## Boolean Functions

These make using conditions more expressive in your syntax.

[Full list](boolean.functions.md)

## Array Functions

These enable working with arrays, whether literals or variables. You can inspect or manipulate arrays. Lambda functions provide a way to apply logic to each element of an array.

[Full list](array.functions.md)

## Conversion Functions

These convert numeric values from one unit to another. When there is no direct function for a specific pair, conversions can be chained through a shared unit.

[Full list](conversion.functions.md)

## Science Functions

Physics and chemistry functions are available from the separate `@samatawy/rules-science` package rather than the core package.

[Full list](science.functions.md)

## World Functions

Geography and country-data functions are available from the separate `@samatawy/rules-world` package rather than the core package.

[Full list](world.functions.md)

## Custom Functions

You can declare your own functions if the built-in ones do not make your rules expressive enough. 

[Declaring Custom Functions](custom.functions.md)
