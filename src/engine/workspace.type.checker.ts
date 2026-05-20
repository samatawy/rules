import type { AtomicType, PropertyType, RootType, ComplexType, ArrayType, ObjectArrayType } from "../types";
import type { TypeChecker, ValidationResult } from "../interfaces";
import type { WorkspaceOptions } from "./workspace";
import { makeAtomic, makeItemType } from "../type.utils";
import type { AbstractRule } from "../rules/abstract.rule";
import { TypeRegistry } from "./type.registry";
import { ParserError } from "../rules/exception";
import { cloneDeep } from "../common.utils";
import { isArrayType, isAtomicType } from "../parser/type.parser";
import { WorkLogger } from "../logging/work.logger";

/**
 * An implementation of TypeChecker that provides top-level type checks for a workspace.
 * It holds the types of all known root types in the workspace.
 * You should not need to use this class directly.
 */
export class WorkspaceTypeChecker implements TypeChecker {

    protected types: TypeRegistry;

    protected options: Partial<WorkspaceOptions>;

    constructor(registry: TypeRegistry, options?: Partial<WorkspaceOptions>) {
        this.types = registry || new TypeRegistry(options);

        this.options = {
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
    public setOptions(options: Partial<WorkspaceOptions>): void {
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

    /**
     * Get the type registry that holds root types known to this checker.
     * Use this method to get an entry point to register new types when necessary.
     * @returns the type registry associated with this instance.
     */
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

    public checkData(input: any): ValidationResult {

        WorkLogger.debug(`Validating input: ${JSON.stringify(input)} against type definitions.`, this.types);
        const errors: string[] = [];

        for (const [rootKey, data] of Object.entries(input)) {
            if (this.types.hasRootType(rootKey)) {
                WorkLogger.debug(`Validating key: ${rootKey} with value: ${JSON.stringify(data)} against type definition.`);

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
                WorkLogger.warn(`No type definition found for key: ${rootKey}.`);
                errors.push(`No type definition found for key: ${rootKey}.`);
            }
        }
        // All properties matched the expected types
        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined
        };
    }

    private validateType(key: string, value: any, expectedType: RootType | PropertyType | any): ValidationResult {
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

        WorkLogger.debug(`Validating value: ${value} against expected type: ${JSON.stringify(expectedType)}.`);
        const expected: any = expectedType as any;
        const errors: string[] = [];

        if (isAtomicType(expectedType)) {
            // A leaf node with an atomic type
            return this.validateAtomic(key, value, expectedType);
        }
        else if (isArrayType(expectedType)) {
            // An array type
            return this.validateArray(key, value, expectedType);
        }
        else if (expected.hasOwnProperty('type') && isAtomicType(expected.type)) {
            // A leaf node with an atomic type defined in a RootType
            const actualType = typeof value;
            if (actualType === expected.type) {
                return { valid: true };
            } else {
                WorkLogger.warn(`${key} has value ${value} of type ${actualType}, expected atomic type ${expected.type}.`);
                return { valid: false, errors: [`${key} has value ${value} of type ${actualType}, expected ${expected.type}.`] };
            }
        }
        else if (expected.hasOwnProperty('type') && isArrayType(expected.type)) {
            // A leaf node with an array type defined in a RootType
            return this.validateArray(key, value, expected.type);
        }

        else if (expected.hasOwnProperty('properties')) {
            // An object type with nested properties
            for (const [key, propertyType] of Object.entries(expected.properties!)) {
                WorkLogger.debug(`Validating property: ${key} with value: ${value[key]} against property type definition.`);
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
                WorkLogger.debug(`Validating property: ${key} with value: ${value[key]} against property type definition.`);
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
            WorkLogger.warn(`Unsupported type definition: ${JSON.stringify(expectedType)}.`);
            throw new ParserError(`Unsupported type definition: ${JSON.stringify(expectedType)}.`);
        }
    }

    private validateAtomic(key: string, value: unknown, expectedType: AtomicType): ValidationResult {
        if (this.options.strict_inputs) {
            WorkLogger.debug(`Validating ${value} as ${expectedType} with strict_inputs`);
            // Except the exact types
            const actualType = typeof value;
            if (actualType === expectedType) {
                return { valid: true };

            } else {
                WorkLogger.warn(`${key} has value ${value} of type ${actualType}, expected atomic type ${expectedType}.`);
                return { valid: false, errors: [`${key} has value ${value} of type ${actualType}, expected ${expectedType}.`] };
            }
        } else {
            WorkLogger.debug(`Validating ${value} as ${expectedType} without strict_inputs`);
            // Allow coerced types
            try {
                const coerced = makeAtomic(value, expectedType);
                if (coerced === undefined) throw new Error('');
                return { valid: true };

            } catch (e) {
                const msg = (e instanceof Error) ? e.message : e + '';
                WorkLogger.warn(`Invalid type: ${msg}`);
                return { valid: false, errors: [`${key} has value ${value}, expected ${expectedType}.`] };
            }
        }
    }

    private validateArray(key: string, value: unknown, expectedType: ArrayType): ValidationResult {
        WorkLogger.debug(`Validating array value: ${value} against expected array type: ${expectedType}.`);
        if (!Array.isArray(value)) {
            const actualType = typeof value;
            WorkLogger.warn(`${key} has value ${value} of type ${actualType}, expected array type ${expectedType}.`);
            return { valid: false, errors: [`${key} has value ${value} of type ${actualType}, expected ${expectedType}.`] };
        }

        const errors: string[] = [];
        const elementType = makeItemType(expectedType);

        for (let i = 0; i < value.length; i++) {
            const element = value[i];
            WorkLogger.debug(`Validating array element at index ${i}: ${element} against expected array type: ${expectedType}.`);
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

    public coerceData(input: any): any {

        WorkLogger.debug(`Coercing input: ${JSON.stringify(input)} against type definitions.`, this.types);
        if (typeof input !== 'object') {
            return undefined;
        }
        const output: any = {};

        for (const [rootKey, data] of Object.entries(input)) {
            if (this.types.hasRootType(rootKey)) {
                WorkLogger.debug(`Coercing key: ${rootKey} with value: ${JSON.stringify(data)} against type definition.`);

                const expectedType = this.types.getRootType(rootKey);
                if (expectedType) {
                    output[rootKey] = this.coerceType(data, expectedType);
                } else {
                    output[rootKey] = cloneDeep(data);
                }
            } else {
                // No type definition found for this key, skipping validation
                WorkLogger.warn(`No type definition found for key: ${rootKey}.`);
                output[rootKey] = cloneDeep(data);
            }
        }
        return output;
    }

    private coerceType(value: any, expectedType: RootType | PropertyType | any): any {
        if (value === undefined) {
            return undefined;
        }

        WorkLogger.debug(`Coercing value: ${value} against expected type: ${JSON.stringify(expectedType)}.`);
        const expected: any = expectedType as any;

        if (isAtomicType(expectedType)) {
            // A leaf node with an atomic type
            return makeAtomic(value, expectedType) || value;
        }
        else if (isArrayType(expectedType)) {
            // An array type
            const itemType = makeItemType(expectedType);
            const clonedArray = value.map((item: any) => this.coerceType(item, itemType) || item);
            return clonedArray;
        }
        else if (expected.hasOwnProperty('type') && isAtomicType(expected.type)) {
            // A leaf node with an atomic type defined in a RootType
            return makeAtomic(value, expected.type) || value;
        }
        else if (expected.hasOwnProperty('type') && isArrayType(expected.type)) {
            // A leaf node with an array type defined in a RootType
            const itemType = makeItemType(expectedType);
            const clonedArray = value.map((item: any) => this.coerceType(item, itemType) || item);
            return clonedArray;
        }

        else if (expected.hasOwnProperty('properties')) {
            // An object type with nested properties
            const clonedObject: any = {};
            for (const [key, propertyType] of Object.entries(expected.properties!)) {
                if (value[key] === undefined) continue;
                clonedObject[key] = this.coerceType(value[key], propertyType) || value[key];
            }
            return clonedObject;
        }

        else if (typeof expected === 'object' && Object.keys(expected).length > 0) {
            // A record type with dynamic keys
            const clonedObject: any = {};
            for (const [key, propertyType] of Object.entries(expected)) {
                if (value[key] === undefined) continue;
                clonedObject[key] = this.coerceType(value[key], propertyType) || value[key];
            }
            return clonedObject;

        } else {
            return cloneDeep(value);
        }
    }

}