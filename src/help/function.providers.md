---
title: Function Providers
---

# Function Providers

Function providers allow you you code functions in native Typescript and call any external classes you may need to evaluate arguments. You are not limited to DSL syntax.

A provider may register one or more functions to be invoked within rules and orther functions. 

All functions must evaluate synchronously and be able to accept parameters typed as atomic, object, or arrays. 

Each function must return a value that is either atomic, an object, or an array. There can be no side effects (the engine will treat them as pure functions).

To develop your own function provider, write a class that implements the following static methods:

```
/**
* Get the names of the functions provided by this provider. 
* This is used by the function factory to determine which provider can create 
* a function expression for a given function name.
* @return an array of function names provided by this provider.
*/
names(): string[];

/**
* Create a valid function expression for the given function name and arguments.
* The function factory will call this method when it needs to create 
* a function expression for a function name that this provider supports.
* 
* Ideally, arguments should be checked for validity (e.g., correct number and types) 
* before creating the function expression, and an error should be thrown if the arguments are invalid.
* 
* @param name the name of the function to create.
* @param args the arguments to pass to the function.
* @throws an error if the arguments are invalid for the given function name.
*/
create(name: string, args: Expression[]): FunctionExpression | undefined;

/**
* Create a mock function expression for the given function name and arguments.
* This is used by the autocomplete feature to provide suggestions for function names and arguments.
* Arguments are not checked for validity.
* 
* @param name the name of the function to create a mock for.
* @param args the arguments to pass to the mock function.
* @returns a mock function expression, or undefined if the function name is not supported.
*/
mock(name: string, args: Expression[]): FunctionExpression | undefined;
```

## Using Providers

- Once this class has been imported, it must be registered for use with the `FunctionFactory` before use (generally on startup):

```
import { StatFunctions } from '@myself/mypackage';

FunctionFactory.registerProvider(StatFunctions);
```

- Now all your functions can be used in rules and other functions across all workspaces. These functions will be globally available and cannot be applied to only selected workspaces.

- N.B. Since function providers are global, any settings you may need should be provided with static properties or methods. You do not instantiate function providers.

## Coding Functions

- Each function expression returned by the create/mock functions must implement a lot of methods. For convenience, we strongly recommend you extend `FunctionExpression` which is an abstract class that covers a lot of required code for you:

```
// Call super(name, args) when extending FunctionExpression
constructor(name: string, args: Expression[]);

// Define what arguments your function expects
// The type of each argument (in order) is important
expectsParameters(): TypedParameter[];

// If true, then your function accepts just one array argument
// Any passed arguments will be passed to you as an array
expectsParameterArray(): boolean;

// Define what your function will return
returnsType(checker?: TypeChecker): AtomicType | ArrayType | ObjectType | ObjectArrayType;

// Here is where you actually use the arguments and return the result of your function
// The context will provide you with access to global constants
// You can use the context for temporary variable storage if necessary
evaluate(context: WorkingContext): any;
```

- `FunctionExpression` will take care of the following methods:

```
getName(): string;

getParts(): Expression[];

required(): Set<string>;

invokes(): Set<string>;

checkTypes(checker?: TypeChecker): ValidationResult;

toString(): string;
```

N.B. Again, all functions must evaluate synchronously and be able to accept parameters typed as atomic, object, or arrays.
