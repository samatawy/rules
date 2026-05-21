import type { ExecutableAction } from "./rules/executable";
import type { Expression } from "./syntax/expression";

export type AtomicType = 'string' | 'number' | 'boolean' | 'date';

export type ArrayType = 'array' | 'string[]' | 'number[]' | 'boolean[]' | 'date[]';

export type CustomType = string;

export type ComplexType = 'object' | ObjectType;

// TODO: Should this have ObjectType instead of Record<string, ObjectType>?
export type PropertyType = AtomicType | ArrayType | ObjectArrayType | ComplexType;

/** A defined object type with properties */
export interface ObjectType {
    [key: string]: PropertyType;
}

/** A defined array type that can contain objects */
export interface ObjectArrayType {
    type: 'array';

    /**
     * The key of another root type to inherit properties from, if any. This allows for type reuse and extension in array item definitions.
     */
    inherits?: CustomType;

    /**
     * The properties of the array items, if they are objects. This allows for defining the structure of objects within arrays and supports nested types.
     */
    items?: ObjectType;
}

/** A defined root type that can contain nested properties*/
export interface RootType {
    /**
     * The key that identifies this root type. This is the top-level identifier for the type and can be used to reference it in rules and expressions.
     */
    key: string;

    /**
     * The atomic type of the root type, if applicable. Needed only for root types that are not objects.
     */
    type?: AtomicType | ArrayType | ComplexType;

    /**
     * The key of another root type to inherit properties from, if any. This allows for type reuse and extension.
     */
    inherits?: CustomType;

    /**
     * The properties of the root type, if it is an object. This allows for nested structures and detailed type definitions.
     */
    properties?: ObjectType;
}

export type ArgumentType = AtomicType | ArrayType | ObjectType | 'lambda' | 'any';

/**
 * A typed parameter definition to specify the expected type of each parameter in a built-in (or custom) function.
 * This is used for type checking and validation of function arguments when the function is called in rules and expressions.
 */
export interface TypedParameter {
    /**
     * The type of the parameter, which can be an atomic type, an array type, a lambda type, or any type. 
     * This defines the expected type of the parameter value when the function is called.
     */
    type: ArgumentType;
    // TODO: May we revert to this?
    // type: AtomicType | ArrayType | 'lambda' | 'any';

    optional?: boolean;
}

/**
 * A named and typed parameter that can be passed to a function.
 */
export interface NamedParameter extends TypedParameter {
    /**
     * The name of the parameter, which is used to identify it in function definitions and calls. 
     */
    name: string;
}

/**
 * Definition of a custom function that can be used in rules and expressions. 
 */
export interface FunctionDefinition {
    /**
     * The name of the function, which is used to identify it in expressions and function calls. 
     * This should be unique across all defined functions in a workspace to avoid conflicts.
     */
    name: string;

    /**
     * An optional hint or description for the function, which can provide additional information about its purpose or usage. 
     * This is primarily for documentation and user guidance when working with the function in rules and expressions.
     */
    hint?: string;

    /**
     * Indicates whether the function is disabled. Disabled functions are not executable and cannot be called in rules or expressions.
     * This allows users to define functions that are still being developed or debugged without causing execution failures in the workspace.
     */
    disabled?: boolean;

    /**
     * The expected parameters for the function, defined as an array of named parameters. Each parameter includes its expected type and whether it is optional.
     * This is used for type checking and validation of function arguments when the function is called in rules and expressions.
     * Functions that expect a parameter array (e.g., sum, avg, concat) can indicate this in their definition and will have their parameters validated accordingly.
     * For functions that expect a parameter array, the parameters defined here represent the expected type of each element in the array.
     * For example, a function that expects an array of numbers would have a single parameter with type 'number' and expectsParameterArray() returning true.    
     */
    parameters: NamedParameter[];

    /**
     * If defined in a block, the lines of the function represent the sequence of executable actions that define the function's behavior.
     * This allows for complex function definitions that involve multiple steps and operations, rather than just a single expression.
     */
    lines?: ExecutableAction[];

    /**
     * The return expression of the function, which defines how the return value is computed based on the input parameters.
     * This can be the body of the function or the last line if defined in a block.
     */
    expression: Expression;
}
