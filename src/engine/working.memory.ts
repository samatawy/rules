import { AbstractException } from "../rules/exception";
import { getPathValue, pathExists, setPathValue } from "../common.utils";
import type { RuleEffect, WorkingContext } from "../interfaces";
import type { Workspace } from "./workspace";
import type { AbstractRule } from "../rules/abstract.rule";

/**
 * An invoked rule and its effect on the context.
 */
export interface LoggedRule {

    rule: AbstractRule;

    effect: RuleEffect;
}

/**
 * A context implementation that should be used whenever input data needs to be processed.
 */
export class WorkingMemory implements WorkingContext {

    private workspace: Workspace;

    private input: any;

    private exceptions: AbstractException[];

    private output: any;

    private logged: LoggedRule[];

    constructor(data: any, workspace: Workspace) {
        this.input = data === undefined ? {} : data;
        this.workspace = workspace;

        this.exceptions = [];
        // TODO: maybe we should check if strict_inputs are enforced
        // to decide which path to take
        // this.output = cloneDeep(this.input);
        this.output = workspace.typeChecker().coerceData(this.input);
        console.debug(this.input, this.output);
        this.logged = [];
    }

    public hasConstant(key: string): boolean {
        return this.workspace.hasConstant(key);
    }

    public getConstant(key: string) {
        return this.workspace.getConstant(key);
    }

    public hasData(key: string): boolean {
        return pathExists(this.output, key);
    }

    public getData(key: string): any {
        return getPathValue(this.output, key);
    }

    public rootKeys(): string[] {
        const keys = new Set<string>();
        for (const key of Object.keys(this.output)) {
            keys.add(key);
        }
        return Array.from(keys);
    }

    protected cache: Map<string, any> = new Map<string, any>();

    protected cacheMetrics: { sets: number, hits: number, misses: number } = {
        sets: 0,
        hits: 0,
        misses: 0,
    };

    public getCached(id: string) {
        const found = this.cache.get(id);
        if (found === undefined) {
            this.cacheMetrics.misses += 1;
        } else {
            this.cacheMetrics.hits += 1;
        }
        return found;
    }

    public setCache(id: string, value: any): void {
        this.cache.set(id, value);
        this.cacheMetrics.sets += 1;
    }

    public clearCache(id?: string): void {
        if (id === undefined) {
            this.cache.clear();
        } else {
            this.cache.delete(id);
        }
    }

    public getCacheMetrics(): { sets: number; hits: number; misses: number; } {
        return this.cacheMetrics;
    }

    public addException(exception: AbstractException): void {
        this.exceptions.push(exception);
    }

    /**
     * List all exceptions raised in this context.
     * @returns an array of exceptions.
     */
    public getExceptions(): AbstractException[] {
        return this.exceptions;
    }

    /**
     * Add an invoked rule and its effect to the audit trail (log) of this context.
     * @param rule the rule that was satisified.
     * @param effect the effect it had on this context.
     */
    public addToLog(rule: AbstractRule, effect: RuleEffect): void {
        this.logged.push({ rule, effect });
    }

    /**
     * Delete all rules and effects from the current audit trail (log).
     */
    public clearLog(): void {
        this.logged = [];
    }

    /**
     * List all rules and their effects collected in this context.
     * @returns an array of logged rules and effects.
     */
    public getLog(): LoggedRule[] {
        return new Array(...this.logged);
    }

    public setOutput(key: string, value: any): void {
        setPathValue(this.output, key, value);
    }

    public getOutput(key?: string): any {
        if (key === undefined) {
            return this.output;
        }
        return getPathValue(this.output, key);
    }
}