import JSON5 from "json5";
import type { ArrayType, AtomicType, ComplexType, ObjectArrayType, ObjectType, PropertyType, RootType } from "../types";
// import { isArrayType, isAtomicType } from "../type.utils";
import type { ParserOptions } from "./rule.parser";
import { ParserError } from "../rules/exception";

/**
 * Parser class for parsing type definitions from JSON syntax into RootType objects.
 * This parser is designed to handle type definitions that can include atomic types, array types, complex types (objects), and object array types.
 * The expected syntax for type definitions is JSON-based, where a RootType must have a "key" property and either a "type" or "properties" property.
 * The parser includes validation to ensure that the provided JSON syntax conforms to the expected structure for type definitions. 
 * You can use static methods to validate specific type structures (like atomic types, array types, complex types, etc.).
 * This parser is primarily used internally when creating types from syntax, and you should not need to instantiate it directly.
 */
export class TypeParser {

    private options: ParserOptions;

    constructor(options: ParserOptions) {
        this.options = options;
    }

    /**
     * Parse a root type from its JSON syntax string and return the corresponding RootType object.
     * Should be able to read strict and relaxed JSON syntax for type definitions, such as:
     * { "key": "Person", "type": "object", "properties": { "name": "string", "age": "number" } }
     * or with relaxed JSON syntax like:
     * { key: 'Person', type: 'object', properties: { name: 'string', age: 'number' } }
     * 
     * @param syntax The JSON syntax string of the root type to parse.
     * @returns The parsed RootType object if successful.
     * @throws An error if the syntax is invalid or if parsing fails for any reason.
     */
    public parseRootType(syntax: string): RootType {
        try {
            const json = JSON5.parse(syntax);
            if (typeof json !== 'object' || json === null || Array.isArray(json)) {
                throw new ParserError(`Invalid JSON syntax for type definition: ${syntax}`);
            }
            if (!json.hasOwnProperty('key') || typeof json.key !== 'string') {
                throw new ParserError(`Type definition must have a "key" property of type string: ${syntax}`);
            }
            if (!json.hasOwnProperty('type') && !json.hasOwnProperty('properties')) {
                throw new ParserError(`Type definition must have either a "type" or "properties" property: ${syntax}`);
            }
            if (json.hasOwnProperty('type') && !this.isValidTypeDefinition(json.type)) {
                throw new ParserError(`If "type" is defined, it must be a valid type definition: ${syntax}`);
            }
            if (json.hasOwnProperty('properties') && !TypeParser.isTypedObjectType(json.properties)) {
                throw new ParserError(`If "properties" is defined, it must be an valid object type: ${syntax}`);
            }
            // If propertes, exist, they become the object type..
            json.type = json.properties || json.type;

            return {
                key: json.key,
                type: json.type,
                properties: json.properties
            }
        } catch (e) {
            throw new ParserError(`Invalid JSON syntax for type definition: ${syntax}. Error: ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    public isValidTypeDefinition(json: any): boolean {
        return TypeParser.isAtomicType(json) || TypeParser.isArrayType(json) || TypeParser.isComplexType(json);
    }

    /**
     * Check if a given type is an atomic type (string, number, boolean, or date).
     * 
     * @param type the type to check.
     * @returns true if the type is an atomic type, otherwise false.
     */
    public static isAtomicType(type: unknown): type is AtomicType {
        return type === 'string' || type === 'number' || type === 'boolean' || type === 'date';
    }

    /**
     * Check if a given type is an array type (string[], number[], boolean[], or date[]),
     * knowing that Array Object types are also accepted as array types.
     * The loosely typed 'array' is also accepted by this function.
     * 
     * @param type the type to check.
     * @returns true if the type is an array type, otherwise false.
     */
    public static isArrayType(type: unknown): type is ArrayType {
        if ((type as ObjectArrayType)?.items !== undefined) {
            return true;
        }
        return type === 'array' || type === 'string[]' || type === 'number[]' || type === 'boolean[]' || type === 'date[]';
    }

    /**
     * Check if a given type is an object type or the unspecified type 'object'.
     * 
     * @param type the type to check.
     * @returns true if the type is an object type, otherwise false.
     */
    public static isComplexType(type: unknown): type is ComplexType {
        return type === 'object' || TypeParser.isTypedObjectType(type);
    }

    /**
     * Check if a given type is a stringly-typed Object type.
     * The type 'object' is not accepted by this function.
     * 
     * @param type the type to check.
     * @returns true if the type is a stringly-typed object, otherwise false.
     */
    public static isTypedObjectType(type: PropertyType | unknown): type is ObjectType {
        if ((typeof type !== 'object' || type === null) || Array.isArray(type)) {
            return false;
        }
        for (const [key, entry] of Object.entries(type)) {
            const isType = TypeParser.isAtomicType(entry) || TypeParser.isArrayType(entry) || TypeParser.isComplexType(entry);
            if (!isType) {
                return false;
            }
        }
        return true;
    }

    /**
     * Check if a given type is a stringly-type Array of Objects type.
     * The loose type 'array' is not accepted by this function.
     * 
     * @param type the type to check.
     * @returns true if the type is a stringly-typed Array type, otherwise false.
     */
    public static isObjectArrayType(type: PropertyType | unknown): type is ObjectArrayType {
        if (typeof type !== 'object' || type === null || Array.isArray(type)) {
            return false;
        }
        if ((type as ObjectArrayType).type !== 'array' || !(type as ObjectArrayType).items) {
            return false;
        }
        for (const [key, entry] of Object.entries((type as ObjectArrayType).items!)) {
            if (!TypeParser.isPropertyType(entry)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Check if a given type can be used in type definitions as a PropertyType.
     * Any Property type can be used in the type registry.
     * 
     * @param type the type to check.
     * @returns true if the type can be used in the type regitsyr, otherwise false.
     */
    public static isPropertyType(type: unknown): type is PropertyType {
        return TypeParser.isAtomicType(type) || TypeParser.isArrayType(type) || TypeParser.isComplexType(type) || TypeParser.isObjectArrayType(type);
    }
}

/** 
 * @function
 */
export const isAtomicType = TypeParser.isAtomicType;

/** 
 * @function
 */
export const isArrayType = TypeParser.isArrayType;

/** 
 * @function
 */
export const isComplexType = TypeParser.isComplexType;

/**
 * @function
 */
export const isTypedObjectType = TypeParser.isTypedObjectType;

/** 
 * @function
 */
export const isObjectArrayType = TypeParser.isObjectArrayType;
