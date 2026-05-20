import { EngineError } from "../browser";
import type { ICommand, CommandRegistryOptions } from "./types";

/**
 * Registry for managing commands in the rules engine. This class allows for registering, unregistering, and retrieving commands by their unique keywords.
 * Each command must have a unique keyword that identifies it. The registry ensures that no two commands with the same keyword can be registered at the same time.
 * One registry should be created for each workspace, and the commands registered in the registry can then be used by the CommandHandler to execute command actions.
 */
export class CommandRegistry {

    protected commands: Map<string, ICommand> = new Map<string, ICommand>();

    protected options: CommandRegistryOptions;

    constructor(options: CommandRegistryOptions) {
        this.options = options;
    }

    /**
     * Add a command to the registry. 
     * Each command must have a unique keyword that identifies it. If a command with the same keyword is already registered, an error will be thrown.
     * @param command the command to register.
     * @returns true if the command was successfully registered.
     * @throws an error if a command with the same keyword is already registered - or if the command is invalid.
     */
    public register(command: ICommand): boolean {
        if (this.commands.has(command.keyword)) {
            throw new EngineError(`Command with keyword ${command.keyword} is already registered.`);
        }
        if (command.execute === undefined && command.executeAsync === undefined) {
            throw new EngineError(`Command with keyword ${command.keyword} must have at least one of execute or executeAsync defined.`);
        }
        if (command.execute !== undefined && command.executeAsync !== undefined) {
            throw new EngineError(`Command with keyword ${command.keyword} cannot have both execute and executeAsync defined. Use only one of them.`);
        }
        if (command.immediate && command.executeAsync) {
            throw new EngineError(`Immediate command with keyword ${command.keyword} cannot have an asynchronous executeAsync function. Immediate commands must only have an execute function.`);
        }

        this.commands.set(command.keyword, command);
        return true;
    }

    /**
     * Remove a command from the registry by its keyword.
     * @param keyword the keyword of the command to unregister.
     * @returns true if the command was successfully unregistered, false if no command with the given keyword was found.
     */
    public unregister(keyword: string): boolean {
        return this.commands.delete(keyword);
    }

    /**
     * Check if a command with the given keyword is registered in the registry.
     * @param keyword the keyword of the command to check.
     * @returns true if a command with the given keyword is registered, false otherwise.
     */
    public hasCommand(keyword: string): boolean {
        return this.commands.has(keyword);
    }

    /**
     * Get a command from the registry by its keyword.
     * @param keyword the keyword of the command to retrieve.
     * @returns the command with the given keyword, or undefined if no command with the given keyword is found.
     */
    public getCommand(keyword: string): ICommand | undefined {
        return this.commands.get(keyword);
    }

    /**
     * Remove all commands from the registry.
     */
    public clear(): void {
        this.commands.clear();
    }

    /**
     * Get all commands registered in the registry.
     * @returns An object containing all registered commands, keyed by their keywords.
     */
    public getCommands(): Record<string, ICommand> {
        const commands: Record<string, ICommand> = {};
        for (const [keyword, command] of this.commands.entries()) {
            commands[keyword] = command;
        }
        return commands;
    }

}