import { AbstractException } from "../rules/exception";
import { cloneDeep, getPathValue, pathExists, setPathValue } from "../common.utils";
import type { RuleEffect, WorkingContext } from "../interfaces";
import type { Workspace } from "./workspace";
import type { AbstractRule } from "../rules/abstract.rule";
import type { ILogger } from "../logging/interfaces";
import { withLogger, WorkLogger } from "../logging/work.logger";
import { CommandHandler } from "../commands/command.handler";

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

    private shared_data: any;

    private data: any;

    private exceptions: AbstractException[];

    private command_handler: CommandHandler;

    private auditLog: LoggedRule[];

    private logImpl?: ILogger;

    /**
     * Create a new instance implementing WorkingContext.
     * @param data Any input data that needs to be evaluated.
     * @param workspace the current workspace, used to access rules, constants, and other shared data.
     * @param sharedData optional additional data that should be accessible to the output but not altered.
     * @param logger optional logger instance to use for this context. If not provided, a default logger will be created.
     */
    constructor(data: any, workspace: Workspace, sharedData?: any, logger?: ILogger) {
        this.input = data === undefined ? {} : data;
        this.workspace = workspace;
        this.command_handler = new CommandHandler({ context: this, commands: workspace.commandRegistry().getCommands() });
        this.logImpl = logger || this.logger();

        // TODO: maybe we should check if strict_inputs are enforced
        // to decide which path to take
        // this.output = cloneDeep(this.input);
        const typeChecker = workspace.typeChecker();
        const coerceDataLogged = withLogger(this.logImpl, typeChecker.coerceData.bind(typeChecker));
        this.data = coerceDataLogged(this.input);

        this.shared_data = sharedData;
        if (sharedData) {
            for (const key of Object.keys(sharedData)) {
                this.data[key] = sharedData[key];
            }
        }

        this.exceptions = [];
        this.auditLog = [];
    }

    public hasConstant(key: string): boolean {
        return this.workspace.hasConstant(key);
    }

    public getConstant(key: string) {
        return this.workspace.getConstant(key);
    }

    public hasData(key: string): boolean {
        return pathExists(this.data, key);
    }

    public getData(): any {
        return this.data;
    }

    public get(key: string): any {
        const dataValue = getPathValue(this.data, key);
        if (dataValue === undefined) {
            return this.getConstant(key);
        } else {
            return dataValue;
        }
    }

    public rootKeys(): string[] {
        const keys = new Set<string>();
        for (const key of Object.keys(this.data)) {
            keys.add(key);
        }
        return Array.from(keys);
    }

    public setOutput(key: string, value: any): void {
        setPathValue(this.data, key, value);
    }

    public getOutput(key?: string): any {
        if (key === undefined) {
            return this.getCleanOutput();
        }
        return getPathValue(this.data, key);
    }

    private getCleanOutput(): any {
        if (this.shared_data) {
            const shared_keys = Object.keys(this.shared_data);
            if (shared_keys.length === 0) {
                return this.data;
            }
            const result: any = {};
            for (const key of Object.keys(this.data)) {
                if (!shared_keys.includes(key)) {
                    result[key] = this.data[key];
                }
            }
            return result;
        } else {
            return this.data;
        }
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
        this.auditLog.push({ rule, effect });
    }

    /**
     * Delete all rules and effects from the current audit trail (log).
     */
    public clearLog(): void {
        this.auditLog = [];
    }

    /**
     * List all rules and their effects collected in this context.
     * @returns an array of logged rules and effects.
     */
    public getLog(): LoggedRule[] {
        return new Array(...this.auditLog);
    }

    public logger(): ILogger {
        if (!this.logImpl) {
            this.logImpl = WorkLogger.forContext(this);
        }
        return this.logImpl;
    }

    public commandHandler(): CommandHandler {
        return this.command_handler;
    }

}