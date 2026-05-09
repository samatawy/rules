import type { AtomicType, RootType, ComplexType, ArrayType, ObjectArrayType, ObjectType, PropertyType } from "../types";
import type { WorkSpaceOptions } from "./workspace";
import { getDefinedType, hasDefinedType, isArrayType, isAtomicType } from "../type.utils";
import { ParserError } from "../rules/exception";

/**
 * TypeRegistry is responsible for storing and managing type definitions within the working context. 
 * It allows adding, retrieving, and checking for the existence of type definitions. 
 * This registry is used during rule evaluation to resolve type references and validate their usage 
 * against defined type structures.
 */
export class TypeRegistry {

    private types: Map<string, RootType>;

    protected options: Partial<WorkSpaceOptions>;

    constructor(options?: Partial<WorkSpaceOptions>) {
        this.types = new Map<string, RootType>();

        this.options = {
            ...options
        };
    }
    /**
     * Set or update the options for the registry.
     * @param options an object containing the options to set or update.
     */
    public setOptions(options: Partial<WorkSpaceOptions>): void {
        this.options = { ...this.options, ...options };
    }


    public hasRootType(key: string): boolean {
        if (key.includes('.')) {
            key = key.split('.')[0] || '';
        }
        return this.types.has(key);
    }

    public getRootType(key: string): RootType | undefined {
        if (key.includes('.')) {
            key = key.split('.')[0] || '';
        }
        return this.types.get(key);
    }

    public addRootType(type: RootType): void {
        type = this.replaceCustomTypes(type);
        this.types.set(type.key, type);
    }

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

    public getRootTypes(): Record<string, RootType> {
        const result: Record<string, RootType> = {};
        for (const [key, value] of this.types.entries()) {
            result[key] = value;
        }
        return result;
    }

    public clear(): void {
        this.types.clear();
    }

    public hasType(key: string): boolean {
        const root = this.getRootType(key);
        if (key.includes('.')) {
            const remainingKey = key.split('.').slice(1).join('.');
            return root ? hasDefinedType(root, remainingKey) : false;
        } else {
            return root !== undefined;
        }
    }

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