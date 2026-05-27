import { EngineError, RuleException } from "../rules/exception";
import { WorkLogger } from "../logging/work.logger";
import type { ICommandAction, ICommandHandler, CommandHandlerOptions } from "./types";

/**
 * The CommandHandler is responsible for managing the execution of command actions, both immediate and deferred. 
 * One handler should be created for each context, using the commands registered in the CommandRegistry.
 */
export class CommandHandler implements ICommandHandler {

    protected immediateMap: Map<string, ICommandAction> = new Map<string, ICommandAction>();

    protected deferredMap: Map<string, ICommandAction> = new Map<string, ICommandAction>();

    protected workingMap: Map<string, ICommandAction> = new Map<string, ICommandAction>();

    protected completedMap: Map<string, ICommandAction> = new Map<string, ICommandAction>();

    protected options: CommandHandlerOptions;

    constructor(options: CommandHandlerOptions) {
        this.options = options;
    }

    public addAction(action: ICommandAction): any | boolean {
        if (action.immediate) {
            if (this.immediateMap.has(action.hash)) {
                throw new EngineError(`Immediate action with hash ${action.hash} is already registered.`);
            }

            const cmd = this.options.commands[action.keyword];
            if (!cmd) {
                throw new EngineError(`Command with keyword ${action.keyword} not found.`);
            }

            this.immediateMap.set(action.hash, action);
            if (cmd.execute) {
                return cmd.execute(action.arguments);
            } else if (cmd.executeAsync) {
                throw new EngineError(`Command with keyword ${action.keyword} only supports asynchronous execution. Use addAsyncAction() instead.`);
            }
        }

        if (this.deferredMap.has(action.hash)) {
            throw new EngineError(`Deferred action with hash ${action.hash} is already registered.`);
        }
        this.deferredMap.set(action.hash, action);
        return true;
    }

    public async executeDeferred(): Promise<any> {
        const results: Record<string, any> = {};
        for (const [hash, action] of this.deferredMap.entries()) {

            // Find the plugin associated with this action's keyword
            const plugin = this.options.commands[action.keyword];
            if (!plugin) {
                throw new EngineError(`Plugin with keyword ${action.keyword} not found.`);
            }

            this.workingMap.set(hash, action);
            this.deferredMap.delete(hash);

            // Attempt to execute the plugin and capture the result or error
            try {
                if (plugin.execute) {
                    results[hash] = plugin.execute(action.arguments);
                } else if (plugin.executeAsync) {
                    results[hash] = await plugin.executeAsync(action.arguments);
                }

                this.options.context.setOutput(action.keyword, results[hash]);
            } catch (error) {
                results[hash] = error instanceof Error ? error : new EngineError(`Unknown error executing plugin with keyword ${action.keyword}.`, { originalError: error });
                this.options.context.addException(new RuleException(`Error executing plugin ${action.keyword}: ${results[hash].message}`, { originalError: results[hash] }));
            }

            if (results[hash] instanceof Error) {
                // If there was an error, move the action to the deferred map for retrying later
                action.error = results[hash];
                this.workingMap.delete(hash);
                this.deferredMap.set(hash, action);
                WorkLogger.error(`Error executing plugin action with keyword ${action.keyword}:`, results[hash]);

            } else {
                // If execution was successful, move the action to the completed map
                action.result = results[hash];
                this.workingMap.delete(hash);
                this.completedMap.set(hash, action);
                WorkLogger.debug(`Successfully executed plugin action with keyword ${action.keyword}. Result:`, results[hash]);
            }
        }
        return results;
    }

    public getImmediateActions(): ICommandAction[] {
        return Array.from(this.immediateMap.values());
    }

    public getDeferredActions(): ICommandAction[] {
        return Array.from(this.deferredMap.values());
    }

    public getWorkingActions(): ICommandAction[] {
        return Array.from(this.workingMap.values());
    }

    public getCompletedActions(): ICommandAction[] {
        return Array.from(this.completedMap.values());
    }

}