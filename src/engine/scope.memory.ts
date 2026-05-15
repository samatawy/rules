import { EvaluationError, type AbstractException } from "../rules/exception";
import type { ArrayType, AtomicType, ObjectArrayType, ObjectType } from "../types";
import type { TypeChecker, ValidationResult, WorkingContext } from "../interfaces";
import { getPathValue, pathExists, setPathValue } from "../common.utils";

export class ScopeContext implements WorkingContext {

    private parent: WorkingContext | null;

    private variables: Record<string, any>;

    private exceptions: AbstractException[];

    constructor(parent: WorkingContext | null = null) {
        this.parent = parent;
        this.variables = {};
        this.exceptions = [];
    }

    public setData(key: string, value: any): void {
        setPathValue(this.variables, key, value);
    }

    public getData(key: string): any {
        const value = getPathValue(this.variables, key);
        if (value !== undefined) {
            return value;
        } else if (this.parent) {
            return this.parent.getConstant(key);
        } else {
            throw new EvaluationError(`Undefined variable: ${key}`);
        }
    }

    public hasData(key: string): boolean {
        if (key in this.variables) {
            return true;
        } else if (this.parent) {
            return this.parent.hasConstant(key);
        } else {
            return false;
        }
    }

    public getConstant(key: string): any {
        return this.parent ? this.parent.getConstant(key) : this.getData(key);
    }

    public hasConstant(key: string): boolean {
        return this.parent ? this.parent.hasConstant(key) : this.hasData(key);
    }

    public rootKeys(): string[] {
        const keys = new Set<string>(Object.keys(this.variables));
        if (this.parent) {
            for (const key of this.parent.rootKeys()) {
                keys.add(key);
            }
        }
        return Array.from(keys);
    }

    protected cacheMetrics: { sets: number, hits: number, misses: number } = {
        sets: 0,
        hits: 0,
        misses: 0,
    };

    public getCached(id: string) {
        this.cacheMetrics.misses += 1;
        return undefined;
    }

    public setCache(id: string, value: any): void {
    }

    public clearCache(id?: string): void {
    }

    public getCacheMetrics(): { sets: number; hits: number; misses: number; } {
        return this.cacheMetrics;
    }

    public addException(exception: AbstractException): void {
        this.exceptions.push(exception);
    }

    public getExceptions(): AbstractException[] {
        return [...this.exceptions];
    }

    public setOutput(key: string, value: any): void {
        setPathValue(this.variables, key, value);
    }

    public getOutput(key?: string): any {
        if (key) {
            return this.getData(key);
        } else {
            return { ...this.variables };
        }
    }
}

export class ScopeTypeChecker implements TypeChecker {

    private parent: TypeChecker | null;

    private types: Record<string, AtomicType | ArrayType | ObjectType>;

    constructor(parent: TypeChecker | null = null) {
        this.parent = parent;
        this.types = {};
    }

    public setType(key: string, type: AtomicType | ArrayType | ObjectType): void {
        if (typeof type === 'object') type = { ...type };

        setPathValue(this.types, key, type);
    }

    public hasType(key: string): boolean {
        const found = pathExists(this.types, key);
        if (found) {
            return true;
        } else if (this.parent) {
            return this.parent.hasType(key);
        } else {
            return false;
        }
    }

    public getType(key: string): AtomicType | ArrayType | ObjectArrayType | ObjectType | undefined {
        const found = getPathValue(this.types, key);
        if (found) {
            return found;
        } else if (this.parent) {
            return this.parent.getType(key) as AtomicType | ArrayType | ObjectArrayType | ObjectType | undefined;
        } else {
            return undefined;
        }
    }

    public checkTypes(target: any): ValidationResult {
        return { valid: true };
    }

    public strictSyntax(): boolean {
        return this.parent ? this.parent.strictSyntax() : true;
    }

    public strictInputs(): boolean {
        return this.parent ? this.parent.strictInputs() : true;
    }

    public strictOutputs(): boolean {
        return this.parent ? this.parent.strictOutputs() : true;
    }
}