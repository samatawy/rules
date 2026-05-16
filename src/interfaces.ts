import type { AbstractException } from "./rules/exception";
import type { ArrayType, AtomicType, ObjectType, PropertyType } from "./types";

export interface Cache {

    /**
     * Keep a value under a given identifier.
     * @param id the identifier to set,
     * @param value the value to keep for the identifier.
     */
    setCache(id: string, value: any): void;

    /**
     * Get the value kept under a given identifer.
     * @param id the identifer to look for.
     * @returns the value kept under that identifer, or undefined if the id was not found.
     */
    getCached(id: string): any;

    /**
     * Delete a single identifier and its value, or entirely delete all values.
     * @param id the identifier to delete. If not provided, the entire cache will be cleared.
     */
    clearCache(id?: string): void;

    /**
     * Retrieve metrics for this cache instance.
     * This is mainly a debugging/monitoring method.
     * @returns a metrics object containing sets, hits, and misses.
     */
    getCacheMetrics(): { sets: number, hits: number, misses: number };
}

export interface WorkingContext extends Cache {

    /**
     * Read data from the context using the given key or path. 
     * Nested keys can be accessed using dot notation (e.g., "user.name").
     * @param key the key to look up in the context.
     * @returns the value associated with the key, or undefined if the key is not found.
     */
    getData(key: string): any;

    /**
     * Check if the context contains data for the given key or path.
     * Nested keys can be accessed using dot notation (e.g., "user.name").
     * @param key the key to check in the context.
     * @returns true if the key exists in the context, false otherwise.
     */
    hasData(key: string): boolean;

    /**
     * Get a constant value from the context using the given key.
     * Nested keys are not allowed.
     * @param key the key to look up in the constants.
     * @returns the constant value associated with the key, or undefined if the key is not found.
     */
    getConstant(key: string): any;

    /**
     * Check if the context contains a constant for the given key.
     * Nested keys are not allowed.
     * @param key the key to check in the constants.
     * @returns true if the constant exists, false otherwise.
     */
    hasConstant(key: string): boolean;

    /**
     * Get the root-level keys of the context.
     * This can be useful for determining what data is available in the context and for debugging purposes.
     * @returns an array of root-level keys in the context.
     */
    rootKeys(): string[];

    /**
     * Add a created exception to the context
     * @param exception the exception to add to the context.
     */
    addException(exception: AbstractException): void;

    /**
     * Set an output value in the context with the given key.
     * @param key the key to associate with the output value.
     * @param value the value to set for the given key.
     */
    setOutput(key: string, value: any): void;

    /**
     * Get an output value from the context using the given key.
     * @param key the key to look up in the outputs.
     * @returns the output value associated with the key, or undefined if the key is not found.
     */
    getOutput(key?: string): any;
}

export interface RuleEffect {

    /**
     * Indicates whether the rule was satisfied when evaluated. 
     * This can be used by the rule engine to determine if the rule should be executed or not.
     */
    satisfied?: boolean;

    /**
     * Indicates which data key was changed as a result of executing the rule. 
     * This can be used by the rule engine to track changes and manage dependencies between rules.
     */
    changed?: string;

    /**
     * Indicates an exception that was thrown during the execution of the rule. 
     * This can be used by the rule engine to handle errors and take appropriate actions.
     */
    exception?: string;
}

export interface Evaluator {

    /**
     * Evaluate the rule or expression in the given context.
     * Implementations differ in what they perform and return.
     * @param context the current working context containing data and constants.
     * @returns an executor to execute, or the value of the expression based on the context.
     */
    evaluate(context: WorkingContext): Executor | any | null;
}

export interface Executor {

    /**
     * Get the data keys that this executor will change when executed, along with their expected types.
     * @returns a record mapping data keys to their expected types.
     */
    typedChanges(): Record<string, AtomicType | ArrayType | ObjectType>;

    /**
     * Execute the required action in the given context and return the effects of the execution.
     * @param context the current working context containing data and constants.
     * @returns the effects of executing the action, including any changes or exceptions.
     */
    execute(context: WorkingContext): RuleEffect;
}

export interface ValidationResult {

    valid: boolean;

    errors?: string[];
}

export interface TypeChecker {
    /**
     * Check if the type checker knows the type of the given key.
     * Nested keys can be checked using dot notation (e.g., "user.name").
     * @param key the key to check.
     * @returns true if the type is known, false otherwise.
     */
    hasType(key: string): boolean;

    /**
     * Get the type of the given key from the type checker.
     * Nested keys can be accessed using dot notation (e.g., "user.name").
     * @param key the key to look up in the type checker.
     * @returns the type associated with the key, or undefined if the type is not known.
     */
    getType(key: string): PropertyType | undefined;

    /**
     * Perform type checking on the given target, which can be a rule, expression, or any other component 
     * that requires type validation.
     * @param target the target to check types for, which must implement the HasValidity interface.
     * @returns the result of the type check, indicating whether the target is valid and any errors if it is not.
     */
    checkTypes(target: HasValidity): ValidationResult;

    /**
     * Perform type checking on the given data, which can be any json object or array.
     * Can be used to validate input to a context (e.g. from an HTTP request body).
     * @param target the target to check types for.
     * @returns the result of the type check, indicating whether the target is valid and any errors if it is not.
     */
    checkData(target: any): ValidationResult;

    /**
     * Coerce input data into types acceptable to the known types (as far as possible). 
     * Input data can only be a json object but can contain arrays.
     * Can be used to coerce input to a context (e.g. from an HTTP request body).
     * N.B. Unknown keys (i.e. wihout registyered type definitions) will be passed on without coercion.
     * N.B. Recommended to use ONLY after validating input.
     * @param target the input data to coerce.
     * @returns a deep clone of the input data, with values mutated as necessary to suite declared types.
     */
    coerceData(input: any): any;

    /**
     * Indicates whether the type checker should enforce strict syntax validation.
     * When true, the type checker will validate that all rules and expressions conform to expected syntax, 
     * potentially throwing errors if syntax is invalid. This can be used to catch issues early in development.
     */
    strictSyntax(): boolean;

    /**
     * Indicates whether the type checker should enforce strict input validation. 
     * When true, the type checker will validate that all required input data for rules and expressions 
     * are defined and conform to expected types, potentially throwing errors if inputs are missing or incorrectly typed. 
     */
    strictInputs(): boolean;

    /**
     * Indicates whether the type checker should enforce strict output validation. 
     * When true, the type checker will validate that all output data for rules and expressions 
     * are defined and conform to expected types, potentially throwing errors if outputs are missing or incorrectly typed.
     */
    strictOutputs(): boolean;
}

export interface HasValidity {

    /**
     * Perform type checking using the given type checker on this object.
     * 
     * @param checker the type checker to use for validating the target.
     * @returns the result of the type check, indicating whether the target is valid and any errors if it is not.
     */
    checkTypes(checker?: TypeChecker): ValidationResult;
}

export interface Clonable<T> {

    /**
     * Create a deep clone of this object, ensuring that all nested properties are also cloned to prevent shared references.
     * @returns a new instance of the object that is a deep clone of the original.
     */
    clone(): T;
}
