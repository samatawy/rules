import { Expression } from "../syntax/expression";
import { CommandExecutable } from "../commands/command.executable";
import { ParserError } from "../rules/exception";
import { CompositeAction, OutputAction, type ExecutableAction } from "../rules/executable";
import { ExpressionParser } from "./expression.parser";
import type { ParserOptions } from "./rule.parser";
import { parseTypeJson, stringifyTypeJson } from "../common.utils";
import { assignableTo, getReturnType } from "../type.utils";

/**
 * Parser class for parsing executable actions from rule syntax. 
 * You should normally not need to use this parser directly, as it is primarily used internally 
 * by the RuleParser when parsing consequences from rule syntax.
 * This includes parsing state assignments (e.g. "SET x = 10") and simple assignments (e.g. "x = 10") 
 * into OutputAction instances that can be executed within the rule engine.
 */
export class ExecutableParser {

    private options: ParserOptions;

    private expressionParser: ExpressionParser;

    constructor(options: ParserOptions) {
        this.options = options;
        this.expressionParser = new ExpressionParser(this.options);
    }

    /**
     * Parse a string representing an executable action into an ExecutableAction object.
     * @param syntax The string representation of the executable action to parse.
     * @returns An ExecutableAction object representing the parsed action if successful.
     * @throws An error if the syntax is unrecognized or invalid.
     */
    public parse(syntax: string): ExecutableAction | null {

        if (syntax.includes(';')) {
            // This allows for multiple actions separated by semicolons, like "SET x = 10; y = 20"
            const actionSyntaxes = syntax.split(';').map(s => s.trim());

            // Parse each action syntax into an ExecutableAction
            const actions = actionSyntaxes.map(s => this.parse(s))
                .filter(a => a !== null) as ExecutableAction[];

            // and combine them into a CompositeAction that executes all of them together
            if (actions.length === actionSyntaxes.length) {
                return new CompositeAction(actions);
            } else {
                throw new ParserError(`Failed to parse one or more actions in composite syntax: ${syntax}`);
            }
        }

        let action: ExecutableAction | null = null;

        if (syntax.match(/^SET\s+/i)) {
            // If this is an assignment with SET, parse it as such
            // This allows for syntax like "SET x.y = 10"
            action = this.parseStateAssignment(syntax);
        }
        else if (syntax.match(/^RUN\s+(\w+)\s*({.*})$/i)) {
            // This allows for syntax like "RUN cmd { arg1: 10, arg2: x }" for executing a command action
            action = this.parseCommandAction(syntax);
        }
        else if (syntax.match(/^\w+(\.\w+)*\s*=\s*.+$/i)) {
            // otherwise handle a simple assignment without SET, like "x.y = 10"
            action = this.parseAssignment(syntax);
        }
        if (action) {
            return action;
        } else {
            throw new ParserError(`Unrecognized executable syntax: ${syntax}`);
        }
    }

    protected parseStateAssignment(syntax: string): ExecutableAction | null {
        // This accepts a state assignment like "SET x = 10"
        const match = syntax.match(/^SET\s+(\w+(\.\w+)*)\s*=\s*(.+)$/i);
        if (match) {
            const variableName = match[1]!;
            const valueSyntax = match[3]!;
            const valueExpr = this.expressionParser.parse(valueSyntax);

            return new OutputAction(variableName, valueExpr);
        }
        return null;
    }

    protected parseAssignment(syntax: string): ExecutableAction | null {
        // This accepts a simple assignment without SET, like "x.y = 10"
        const match = syntax.match(/^(\w+(\.\w+)*)\s*=\s*(.+)$/i);
        if (match) {
            const variableName = match[1]!;
            const valueSyntax = match[3]!;
            const valueExpr = this.expressionParser.parse(valueSyntax);

            return new OutputAction(variableName, valueExpr);
        }
        return null;
    }

    protected parseCommandAction(syntax: string): ExecutableAction | null {
        const match = syntax.match(/^RUN\s+(\w+)\s*({.*})$/i);
        if (match) {
            const commandKey = match[1]!;
            const argsSyntax = match[2]!;

            // Parse the argsSyntax as JSON to get the argument expressions
            let args: Record<string, Expression> = {};
            try {
                const argsObj = parseTypeJson(argsSyntax);
                for (const [key, valueSyntax] of Object.entries(argsObj)) {
                    args[key] = this.expressionParser.parse(valueSyntax + '');
                }
            } catch (e) {
                throw new ParserError(`Failed to parse command arguments as JSON: ${argsSyntax}`, { originalError: e });
            }

            // Validate command key and argument types if workspace context is available
            if (this.options.workspace) {
                const command = this.options.workspace.commandRegistry().getCommand(commandKey);
                const checker = this.options.workspace.typeChecker();
                if (!command) {
                    throw new ParserError(`No command registered with keyword: ${commandKey}`);
                }

                for (const [expectedKey, expectedType] of Object.entries(command.arguments)) {
                    if (!(expectedKey in args)) {
                        throw new ParserError(`Missing required argument '${expectedKey}' for command '${commandKey}'`);
                    }
                    const argType = getReturnType(args[expectedKey]!, checker);
                    if (!argType || !assignableTo(argType, expectedType)) {
                        throw new ParserError(`Type mismatch for argument '${expectedKey}' in command '${commandKey}': expected ${stringifyTypeJson(expectedType)}, got ${stringifyTypeJson(argType)}`);
                    }
                }
                return new CommandExecutable(command, args);

            } else {
                throw new ParserError(`Cannot parse command action without a workspace to validate command key: ${commandKey}`);
            }
        }
        return null;
    }
}