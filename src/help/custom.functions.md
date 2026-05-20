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

- Each function has a unique name, accepts zero or more arguemnts, and return a single value.

- Basic functions accept arguemnts of an atomic data types (`string`, `number`, `boolean`, or `date`) and return a single atomic value.

- The syntax also supports functions that accept arrays of atomic types (`string[]`, `number[]`, `boolean[]`, or `date[]`), untyped arrays (`array`), as well as complex object types (`{}`, `{ age: 'number' }`, etc.) and functions that return arrays or object values. These are more complex and should best be reserved for actual needs.

- Rules can then use functions in their syntax and pass in the correct parameters to get the return value.

- Functions operate in their own scope, using only the values passed to them. They should not directly access inputs beyond the parameters passed to them although they can use constants and other functions. 

- Functions can set temporary variables in their local scope but can NOT invoke custom commands. Attempting to do so will throw an error.

- In some cases, you might need to set a state/variable to be used by a function. This is supported although it violates scope isolation and can make functions harder to maintain. Just remember that variables named in the local scope will always have precedence (when names clash) and this should not be used unless necessary.

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

Although most functions should only accept and return atomic values to keep everything readable and concise, functions can also accept objects and return objects.

```
discounted_item(item: { sku: 'string', price: 'number' }) {
    item.discount_rate = get_discount(item.sku);
    item.discount = item.price * item.discount_rate;
    return item
}
```

This can be especially useful when you need to manipulate objects before returning them, e.g. when using the `map()` array function. 
It can also make calling a function less verbose (although that should not ideally be the sole motivation).

- Note that objects can be defined with an empty type `{}` when not being strict, but the best practice is to define the shape of the argument object like you would an interface.
This allows a function to accept any argument that satisfies the requirements without being too narrow.
