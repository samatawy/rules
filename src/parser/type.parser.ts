import type { ArrayType, AtomicType, ComplexType, ObjectArrayType, ObjectType, PropertyType, RootType } from "../types";
import JSON5 from "json5";
import { isArrayType, isAtomicType } from "../utils";
import type { ParserOptions } from "./rule.parser";

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
                throw new Error(`Invalid JSON syntax for type definition: ${syntax}`);
            }
            if (!json.hasOwnProperty('key') || typeof json.key !== 'string') {
                throw new Error(`Type definition must have a "key" property of type string: ${syntax}`);
            }
            if (!json.hasOwnProperty('type') && !json.hasOwnProperty('properties')) {
                throw new Error(`Type definition must have either a "type" or "properties" property: ${syntax}`);
            }
            if (json.hasOwnProperty('type') && !this.isValidTypeDefinition(json.type)) {
                throw new Error(`If "type" is defined, it must be a valid type definition: ${syntax}`);
            }
            if (json.hasOwnProperty('properties') && !TypeParser.isValidObjectType(json.properties)) {
                throw new Error(`If "properties" is defined, it must be an valid object type: ${syntax}`);
            }
            return {
                key: json.key,
                type: json.type,
                properties: json.properties
            }
        } catch (e) {
            throw new Error(`Invalid JSON syntax for type definition: ${syntax}. Error: ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    public isValidTypeDefinition(json: any): boolean {
        return isAtomicType(json) || isArrayType(json) || TypeParser.isValidComplexType(json);
    }

    public static isValidAtomicType(type: any): type is AtomicType {
        return isAtomicType(type);
    }

    public static isValidArrayType(type: any): type is ArrayType {
        return isArrayType(type);
    }

    public static isValidComplexType(type: PropertyType | unknown): type is ComplexType {
        return type === 'object' || TypeParser.isValidObjectType(type);
    }

    public static isValidObjectType(type: PropertyType | unknown): type is ObjectType {
        if ((typeof type !== 'object' || type === null) || Array.isArray(type)) {
            return false;
        }
        for (const [key, entry] of Object.entries(type)) {
            const isType = isAtomicType(entry) || isArrayType(entry) || TypeParser.isValidComplexType(entry);
            if (!isType) {
                return false;
            }
        }
        return true;
    }

    public static isValidObjectArrayType(type: PropertyType | unknown): type is ObjectArrayType {
        if (typeof type !== 'object' || type === null || Array.isArray(type)) {
            return false;
        }
        if ((type as ObjectArrayType).type !== 'array' || !(type as ObjectArrayType).items) {
            return false;
        }
        for (const [key, entry] of Object.entries((type as ObjectArrayType).items)) {
            if (!TypeParser.isValidPropertyType(entry)) {
                return false;
            }
        }
        return true;
    }

    public static isValidPropertyType(type: any): type is PropertyType {
        return isAtomicType(type) || isArrayType(type) || TypeParser.isValidComplexType(type) || TypeParser.isValidObjectArrayType(type);
    }
}