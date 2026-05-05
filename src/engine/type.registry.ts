import type { AtomicType, RootType, ComplexType, ArrayType, ObjectArrayType, ObjectType } from "../types";
import type { WorkSpaceOptions } from "./work.space";
import { getDefinedType, hasDefinedType } from "../utils";

export class TypeRegistry {

    private types: Map<string, RootType>;

    protected options: Partial<WorkSpaceOptions>;

    constructor(options?: Partial<WorkSpaceOptions>) {
        this.types = new Map<string, RootType>();

        this.options = {
            ...options
        };
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
}