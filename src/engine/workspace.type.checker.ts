import type { AtomicType, PropertyType, RootType, ComplexType, ArrayType, ObjectArrayType } from "../types";
import type { TypeChecker, ValidationResult } from "../interfaces";
import type { WorkSpaceOptions } from "./workspace";
import { isArrayType, isAtomicType, makeItemType } from "../type.utils";
import type { AbstractRule } from "../rules/abstract.rule";
import { TypeRegistry } from "./type.registry";

export class WorkspaceTypeChecker implements TypeChecker {

    protected types: TypeRegistry;

    protected options: Partial<WorkSpaceOptions>;

    constructor(registry: TypeRegistry, options?: Partial<WorkSpaceOptions>) {
        this.types = registry || new TypeRegistry(options);

        this.options = {
            debugging: false,
            strict_syntax: true,
            strict_inputs: false,
            strict_outputs: false,
            ...options
        };
    }
    /**
     * Set or update the options for the type checker. This allows you to configure the behavior of the type checker, 
     * such as debugging and validation strictness.
     * @param options an object containing the options to set or update.
     */
    public setOptions(options: Partial<WorkSpaceOptions>): void {
        this.options = { ...this.options, ...options };
    }

    public strictSyntax(): boolean {
        return this.options.strict_syntax ?? true;
    }

    public strictInputs(): boolean {
        return this.options.strict_inputs ?? false;
    }

    public strictOutputs(): boolean {
        return this.options.strict_outputs ?? false;
    }

    public typeRegistry(): TypeRegistry {
        return this.types;
    }

    public hasType(key: string): boolean {
        return this.types.hasType(key);
    }

    public getType(key: string): AtomicType | ArrayType | ComplexType | ObjectArrayType | undefined {
        return this.types.getType(key);
    }

    public checkTypes(rule: AbstractRule): ValidationResult {
        if (!this.options.strict_inputs && !this.options.strict_outputs) {
            return { valid: true };
        }

        return rule.checkTypes(this);
    }

    public validateData(input: any): ValidationResult {

        this.debug(`Validating input: ${JSON.stringify(input)} against type definitions.`, this.types);
        const errors: string[] = [];

        for (const [rootKey, data] of Object.entries(input)) {
            if (this.types.hasRootType(rootKey)) {
                this.debug(`Validating key: ${rootKey} with value: ${JSON.stringify(data)} against type definition.`);

                const expectedType = this.types.getRootType(rootKey);
                if (expectedType) {
                    const result = this.validateType(rootKey, data, expectedType);
                    if (!result.valid) {
                        // One of the properties did not match the expected type
                        errors.push(...(result.errors || []));
                    }
                }
            } else {
                // No type definition found for this key, skipping validation
                this.debug(`No type definition found for key: ${rootKey}.`);
                errors.push(`No type definition found for key: ${rootKey}.`);
            }
        }
        // All properties matched the expected types
        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined
        };
    }

    protected validateType(key: string, value: any, expectedType: RootType | PropertyType | any): ValidationResult {
        if (value === undefined) {
            return { valid: true };
            // If the value is undefined, we consider it valid here. The presence of required fields should be checked separately.
        }
        // If we want to enforce that all fields must be defined when strict_inputs is true, 
        // we could return an error here instead. 
        // However, this would mean that any missing field would cause the entire validation to fail, 
        // which might not be desirable in all cases. 
        // It might be better to handle required fields separately and allow optional fields to be undefined 
        // without causing a validation failure.
        // if (value === undefined) {
        //     return { valid: false, errors: [`${key} is undefined, expected type ${JSON.stringify(expectedType)}.`] };
        // }

        this.debug(`Validating value: ${value} against expected type: ${JSON.stringify(expectedType)}.`);
        const expected: any = expectedType as any;
        const errors: string[] = [];

        if (isAtomicType(expectedType)) {
            // A leaf node with an atomic type
            const actualType = typeof value;
            this.debug(`Actual type: ${actualType}, Expected Atomic type: ${expectedType}.`);
            if (actualType === expectedType) {
                return { valid: true };
            } else {
                return { valid: false, errors: [`${key} has value ${value} of type ${actualType}, expected ${expectedType}.`] };
            }
        }
        else if (isArrayType(expectedType)) {
            // An array type
            return this.validateArray(key, value, expectedType);
        }
        else if (expected.hasOwnProperty('type') && isAtomicType(expected.type)) {
            // A leaf node with an atomic type defined in a RootType
            const actualType = typeof value;
            this.debug(`Actual type: ${actualType}, Expected Property type: ${expected.type}.`);
            if (actualType === expected.type) {
                return { valid: true };
            } else {
                return { valid: false, errors: [`${key} has value ${value} of type ${actualType}, expected ${expected.type}.`] };
            }
        }
        else if (expected.hasOwnProperty('type') && isArrayType(expected.type)) {
            // A leaf node with an array type defined in a RootType
            return this.validateArray(key, value, expected.type);
        }
        // else if (expectedType === 'object') {
        //     // An object type with no defined properties, we can only check that the value is an object
        // }

        else if (expected.hasOwnProperty('properties')) {
            // An object type with nested properties
            for (const [key, propertyType] of Object.entries(expected.properties!)) {
                this.debug(`Validating property: ${key} with value: ${value[key]} against property type definition.`);
                const result = this.validateType(key, value[key], propertyType);
                if (!result.valid) {
                    // One of the properties did not match the expected type
                    errors.push(...(result.errors || []));
                }
            }
            return {
                valid: errors.length === 0,
                errors: errors.length > 0 ? errors : undefined
            };

        }

        else if (typeof expected === 'object' && Object.keys(expected).length > 0) {
            // A record type with dynamic keys
            for (const [key, propertyType] of Object.entries(expected)) {
                this.debug(`Validating property: ${key} with value: ${value[key]} against property type definition.`);
                const result = this.validateType(key, value[key], propertyType);
                if (!result.valid) {
                    // One of the properties did not match the expected type
                    errors.push(...(result.errors || []));
                }
            }
            return {
                valid: errors.length === 0,
                errors: errors.length > 0 ? errors : undefined
            };

        } else {
            this.debug(`Unsupported type definition: ${JSON.stringify(expectedType)}.`);
            throw new Error(`Unsupported type definition: ${JSON.stringify(expectedType)}.`);
        }
    }

    private validateArray(key: string, value: unknown, expectedType: ArrayType): ValidationResult {
        this.debug(`Validating array value: ${value} against expected array type: ${expectedType}.`);
        if (!Array.isArray(value)) {
            const actualType = typeof value;
            this.debug(`Actual type: ${actualType}, Expected Array type: ${expectedType}.`);
            return { valid: false, errors: [`${key} has value ${value} of type ${actualType}, expected ${expectedType}.`] };
        }

        const errors: string[] = [];
        const elementType = makeItemType(expectedType);
        // const elementType = expectedType === 'array' ? 'object' : expectedType.replace('[]', '') as AtomicType;
        for (let i = 0; i < value.length; i++) {
            const element = value[i];
            this.debug(`Validating array element at index ${i}: ${element} against expected array type: ${expectedType}.`);
            const result = this.validateType(`${key}[${i}]`, element, elementType);
            if (!result.valid) {
                errors.push(...(result.errors || []));
            }
        }
        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined
        };
    }

    private debug(...args: any[]): void {
        if (this.options.debugging) {
            console.debug('[WorkspaceTypeChecker DEBUG]', ...args);
        }
    }
}