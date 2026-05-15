---
title: Custom Functions
---

# Custom Functions

You can declare your own functions if the built-in ones do not make your rules expressive enough. 

You are encouraged to wrap complex calculations into functions, especially if you want to: 
- May use a formula in more than one rule.
- Want to calculate intermediate values and maybe use ternary operators.
- Want to hide intermediate values from the output.

## How they work

- Each function has a unique name, accepts atomic data types (`string`, `number`, `boolean`, or `date`) and returns a single atomic value.

- Experimentally, the syntax will support functions that  accept arrays of atomic types (`string[]`, `number[]`, `boolean[]`, or `date[]`), untyped arrays (`array`), as well as complex object types (`{}`, `{ age: number }`, etc.) and functions that return arrays or object values. These have still not been fully tested.

- Rules can then use functions in their syntax and pass in the correct parameters to get the return value.

- Functions operate in their own scope, using only the values passed to them. They cannot directly access inputs beyond the parameters passed to them although they can use constants and other functions. 

- They also cannot directly change of affect output.

- The engine already provides many built-in functions for common tasks. A custom function cannot override a built-in function to avoid unexpected behaviour from arising.

## Declaring Custom Functions

You can declare simple functions:

```
greeting(name: string) = concat('Hello ', name)
```

- Note that we give the function a meaningful and unique name, the declare the arguments (parameters) it should receive and their types.

- The right side of the equal sign will provide the value returned by the function.

For more involved functions, use this syntax:

```
sales_tax(total: number) {
    // Intermediate values are local, and do not show up in the engine output.
    tax_rate = (total < 100)? 0.12 : 0.14;
    tax = total * tax_rate;
    return max(1, tax)      // return must start the last line (and only the last line)
}
```

- Note that comments can be used, starting with # or //.

- Note that any empty lines inside a function declaration will lead to parsing errors. Empty lines must be used to separate declared components.
