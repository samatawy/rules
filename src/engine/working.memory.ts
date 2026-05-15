import { AbstractException } from "../rules/exception";
import { cloneDeep, getPathValue, pathExists, setPathValue } from "../common.utils";
import type { RuleEffect, WorkingContext } from "../interfaces";
import type { Workspace } from "./workspace";
import type { AbstractRule } from "../rules/abstract.rule";

export interface LoggedRule {
    rule: AbstractRule;
    effect: RuleEffect;
}

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
        this.output = cloneDeep(this.input);
        this.logged = [];
    }

    public hasConstant(key: string): boolean {
        return this.workspace.hasConstant(key);
    }

    public getConstant(key: string) {
        return this.workspace.getConstant(key);
    }

    private hasInput(key: string): boolean {
        return pathExists(this.input, key);
    }

    private getInput(key: string): any {
        return getPathValue(this.input, key);
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

    public getExceptions(): AbstractException[] {
        return this.exceptions;
    }

    public addToLog(rule: AbstractRule, effect: RuleEffect): void {
        this.logged.push({ rule, effect });
    }

    public clearLog(): void {
        this.logged = [];
    }

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