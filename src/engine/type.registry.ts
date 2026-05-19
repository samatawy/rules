import type { AtomicType, RootType, ComplexType, ArrayType, ObjectArrayType, ObjectType, PropertyType } from "../types";
import type { WorkspaceOptions } from "./workspace";
import { getDefinedType, hasDefinedType } from "../type.utils";
import { ParserError } from "../rules/exception";
import { isArrayType, isAtomicType } from "../parser/type.parser";

/**
 * TypeRegistry is responsible for storing and managing type definitions within the working context. 
 * It allows adding, retrieving, and checking for the existence of type definitions. 
 * This registry is used during rule evaluation to resolve type references and validate their usage 
 * against defined type structures.
 */
export class TypeRegistry {

    private types: Map<string, RootType>;

    protected options: Partial<WorkspaceOptions>;

    constructor(options?: Partial<WorkspaceOptions>) {
        this.types = new Map<string, RootType>();

        this.options = {
            ...options
        };
    }

    /**
     * Set or update the options for the registry.
     * @param options an object containing the options to set or update.
     */
    public setOptions(options: Partial<WorkspaceOptions>): void {
        this.options = { ...this.options, ...options };
    }

    /**
     * Check whether a root type is identified by the given key.
     * @param key the key to look for. If a nested key is given only the first token is considered.
     * @returns true if a root type exists for the given key, otherwise false.
     */
    public hasRootType(key: string): boolean {
        if (key.includes('.')) {
            key = key.split('.')[0] || '';
        }
        return this.types.has(key);
    }

    /**
     * Get the root type identified by the given key.
     * @param key the key to look for. If a nested key is given only the first token is considered.
     * @returns the root type identified by the given key, or undefined if no type is found.
     */
    public getRootType(key: string): RootType | undefined {
        if (key.includes('.')) {
            key = key.split('.')[0] || '';
        }
        return this.types.get(key);
    }

    /**
     * Add a root type.
     * @param type the type to add.
     */
    public addRootType(type: RootType): void {
        type = this.replaceCustomTypes(type);
        this.types.set(type.key, type);
    }

    /**
     * Add a collection of root types.
     * @param types the types to add, represented as a map, record, or array.
     */
    public addRootTypes(types: Map<string, RootType> | Record<string, RootType> | RootType[]): void {
        if (types instanceof Map) {
            for (const type of types.values()) {
                this.addRootType(type);
            }
        } else if (Array.isArray(types)) {
            for (const type of types) {
                this.addRootType(type);
            }
        } else {
            for (const type of Object.values(types)) {
                this.addRootType(type);
            }
        }
    }

    /**
     * List all registered root types.
     * @returns a record mapping root keys to their known types.
     */
    public getRootTypes(): Record<string, RootType> {
        const result: Record<string, RootType> = {};
        for (const [key, value] of this.types.entries()) {
            result[key] = value;
        }
        return result;
    }

    /**
     * Delete all registered types.
     */
    public clear(): void {
        this.types.clear();
    }

    /**
     * Check if the type checker knows the type of the given key.
     * Nested keys can be checked using dot notation (e.g., "user.name").
     * @param key the key to check.
     * @returns true if the type is known, false otherwise.
     */
    public hasType(key: string): boolean {
        const root = this.getRootType(key);
        if (key.includes('.')) {
            const remainingKey = key.split('.').slice(1).join('.');
            return root ? hasDefinedType(root, remainingKey) : false;

        } else {
            return root !== undefined;
        }
    }

    /**
     * Get the type of the given key from the type checker.
     * Nested keys can be accessed using dot notation (e.g., "user.name").
     * @param key the key to look up in the type checker.
     * @returns the type associated with the key, or undefined if the type is not known.
     */
    public getType(key: string): AtomicType | ArrayType | ComplexType | ObjectArrayType | undefined {
        const root = this.getRootType(key);
        if (key.includes('.')) {
            const remainingKey = key.split('.').slice(1).join('.');
            const array_path = root?.type === 'array';
            return root ? getDefinedType(root, remainingKey, array_path) : undefined;

        } else if (root && root.type === 'array') {
            return 'array';
        } else if (root && root.type) {
            return root.type as AtomicType | ArrayType | ComplexType;
        } else if (root) {
            return root.properties as ObjectType || undefined;
        } else {
            return undefined;
        }
    }

    protected replaceCustomTypes(root: RootType): RootType {
        if (root.inherits) {
            const custom = this.getRootType(root.inherits);
            if (!custom) {
                throw new ParserError(`Type ${root.inherits} not found for root type ${root.key}`);
            }
            root.properties = { ...root.properties || [], ...custom.properties || [] } as ObjectType;
        }

        if (root.properties) {
            // loop over properties and replace any custom types with their definitions
            for (const [key, prop] of Object.entries(root.properties)) {
                root.properties[key] = this.replaceNestedCustomTypes(prop);
            }
        }
        return root;
    }

    private replaceNestedCustomTypes(type: PropertyType): PropertyType {
        if (isAtomicType(type) || isArrayType(type)) {
            return type;
        } else if (type === 'object') {
            return type;
        } else if ((type as ObjectArrayType).type === 'array') {
            const arrayType = type as ObjectArrayType;
            if (arrayType.inherits) {
                const custom = this.getRootType(arrayType.inherits);
                if (!custom) {
                    throw new ParserError(`Type ${arrayType.inherits} not found for array type`);
                }
                arrayType.items = { ...arrayType.items || [], ...custom.properties || [] } as ObjectType;
            }
            if (arrayType.items) {
                for (const [key, prop] of Object.entries(arrayType.items)) {
                    arrayType.items[key] = this.replaceNestedCustomTypes(prop);
                }
            }
            return arrayType;

        } else {
            throw new ParserError(`Invalid type definition: ${type}`);
        }
    }
}