import { EvaluationError, type AbstractException } from "../rules/exception";
import type { ArrayType, AtomicType, ObjectArrayType, ObjectType } from "../types";
import type { TypeChecker, ValidationResult, WorkingContext } from "../interfaces";
import { getPathValue, pathExists, setPathValue } from "../common.utils";
import type { ILogger } from "../logging/interfaces";
import type { CommandHandler } from "../commands/command.handler";
import { getContextLogger } from "../logging";

/**
 * A context implementation internally used by functions (including lambda functions).
 * This isolates changes made while the function is being executed, keeping the parent context clean.
 * It does not cache values or return logs.
 * You should not need to use this class directly.
 */
export class ScopeContext implements WorkingContext {

    private parent: WorkingContext | null;

    private variables: Record<string, any>;

    private exceptions: AbstractException[];

    private logImpl?: ILogger;

    constructor(parent: WorkingContext | null = null) {
        this.parent = parent;
        this.variables = {};
        this.exceptions = [];

        this.logImpl = parent ? parent.logger() : undefined;
    }

    public setData(key: string, value: any): void {
        setPathValue(this.variables, key, value);
    }

    public get(key: string): any {
        if (key === undefined) {
            return this.variables;
        }
        const value = getPathValue(this.variables, key);
        if (value !== undefined) {
            return value;
        } else if (this.parent) {
            return this.parent.getConstant(key) || this.parent.get(key);
        } else {
            throw new EvaluationError(`Undefined variable: ${key}`);
        }
    }

    public getData(): any {
        return this.variables;
    }

    public hasData(key: string): boolean {
        const local = pathExists(this.variables, key);
        if (local) {
            return true;
        } else if (this.parent) {
            return this.parent.hasConstant(key) || this.parent.hasData(key);
        } else {
            return false;
        }
    }

    public getConstant(key: string): any {
        return this.parent ? this.parent.getConstant(key) : undefined;
    }

    public hasConstant(key: string): boolean {
        return this.parent ? this.parent.hasConstant(key) : false;
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
        this.parent?.addException(exception);
    }

    public getExceptions(): AbstractException[] {
        return [...this.exceptions];
    }

    public setOutput(key: string, value: any): void {
        setPathValue(this.variables, key, value);
    }

    public getOutput(key?: string): any {
        if (key) {
            return getPathValue(this.variables, key);
        } else {
            return { ...this.variables };
        }
    }

    public logger(): ILogger {
        if (!this.logImpl) {
            this.logImpl = getContextLogger(this);
        }
        return this.logImpl!;
    }

    public commandHandler(): CommandHandler | undefined {
        return undefined;
    }
}

/**
 * An implementation of TypeChecker used within a scope context.
 * It holds the data types of custom function arguments for internal type checking.
 * You should not need to use this class directly.
 */
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

    public checkData(input: any): any {
        return input;
    }

    public coerceData(input: any) {
        return input;
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