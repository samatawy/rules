import type { Workspace } from "../engine/workspace";
import type { WorkingContext } from "../interfaces";
import type { AtomicType } from "../types";

/**
 * Interface representing a command that can be registered in the CommandRegistry and executed within the rules engine. 
 * Commands are reusable actions that can be invoked from rules using the "RUN" syntax.
 * Implement this interface to provide custom code to extend the capabilities of the rules engine beyond what is possible with built-in syntax and functions.
 * Immediate commands must only implement the execute method, and cannot have an executeAsync function. 
 * Deferred commands can implement either execute or executeAsync, but not both.
 */
export interface ICommand {
    /**
     * A unique name for the command, used for identification and debugging purposes. 
     * This is not necessarily the same as the keyword used to invoke the command in rules, but it should be descriptive of the command's purpose.
     */
    name: string;

    /**
     * Indicates whether the command should be executed immediately when invoked.
     * Immediate commands are executed synchronously and cannot have an asynchronous executeAsync function.
     */
    immediate: boolean;

    /**
     * The keyword used to invoke the command in rules. 
     * This must be unique across all registered commands, and should ideally be expressive but short.
     * No spaces or special characters are allowed in the keyword - only letters, numbers, and underscores.
     */
    keyword: string;

    /**
     * A record of argument names and their expected types for this command. 
     * This is used for validating command invocations and providing better error messages when arguments are missing or of the wrong type.
     * The types should be defined using the AtomicType interface from the rules engine's type system.
     */
    arguments: Record<string, AtomicType>;

    /**
     * The function to execute when the command is invoked. 
     * This function is called with the arguments specified in the command's arguments property.
     * @param args The arguments passed to the command when it is invoked.
     * @returns The result of the command execution.
     */
    execute?(...args: any[]): any;

    /**
     * The asynchronous function to execute when the command is invoked. 
     * This function is called with the arguments specified in the command's arguments property.
     * @param args The arguments passed to the command when it is invoked.
     * @returns A promise that resolves with the result of the command execution.
     */
    executeAsync?(...args: any[]): Promise<any>;
}

/**
 * Interface representing an action to execute a command, which is created when a rule with a command action is parsed.
 * The CommandHandler is responsible for managing the execution of these command actions, both immediate and deferred.
 */
export interface ICommandAction {
    /**
     * A unique hash for this action, used for tracking and ensuring that the same action is not executed multiple times.
     * This can be generated based on the command keyword and arguments, or using any other method that guarantees uniqueness for each distinct action.
     */
    hash: string;

    /**
     * The keyword of the command to execute.
     */
    keyword: string;

    /**
     * The parsed arguments to pass to the command when executing it.
     */
    arguments: Record<string, any>;

    /**
     * Indicates whether the command should be executed immediately.
     */
    immediate: boolean;

    /**
     * The result of the command execution, if any.
     */
    result?: any;

    /**
     * The error encountered during command execution, if any.
     */
    error?: any;
}

export interface ICommandHandler {
    /**
     * Add an action to the handler. 
     * Each action must have a unique hash that identifies it. If an action with the same hash is already registered, an error will be thrown.
     * If the action is marked as immediate, it will be executed immediately using the associated plugin. 
     * If the action is deferred, it will be stored for later execution when executeDeferred() is called.
     * 
     * @param action the action to register.
     * @returns the result of the action if it is immediate, or true if it is deferred.
     * @throws an error if an action with the same hash is already registered.
     */
    addAction(action: ICommandAction): any | boolean;

    /**
     * Execute all deferred actions that have been added to the handler. This should be called after processing rules to ensure that all deferred command actions are executed.
     * @returns A promise that resolves when all deferred actions have been executed.
     */
    executeDeferred(): Promise<any>;
}

export interface CommandRegistryOptions {

    /**
     * The workspace, which must be provided to validate commands and their arguments against the workspace's type system and registered commands.
     */
    workspace: Workspace;
}

export interface CommandHandlerOptions {

    /**
     * The working context, which provides the environment and state for executing commands.
     */
    context: WorkingContext;

    /**
     * A record of commands available to the handler, keyed by their keywords.
     */
    commands: Record<string, ICommand>;
}