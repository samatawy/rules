import type { Expression } from "../syntax/expression";
import type { ArrayType, AtomicType, ObjectType } from "../types";
import type { WorkingContext, RuleEffect, TypeChecker, ValidationResult } from "../interfaces";
import { assignableTo, getReturnType } from "../type.utils";
import { mergeValidationResults, stringifyTypeJson } from "../common.utils";
import { ExecutableAction } from "../rules/executable";
import { TypeCheckError } from "../rules/exception";
import type { ICommand } from "./types";


/**
 * A command action allows for external actions to be executed within the rule engine.
 * This can be useful for rules that need to perform operations that are not natively supported by the engine,
 * such as interacting with external systems or non-native software.
 */
export class CommandExecutable extends ExecutableAction {

    private command: ICommand;

    private arguments: Record<string, Expression>;

    constructor(command: ICommand, args: Record<string, Expression>) {
        super();
        this.command = command;
        this.arguments = args;
    }

    public required(): Set<string> {
        const requirements = new Set<string>();
        Object.values(this.arguments).forEach(arg => {
            arg.required().forEach(req => requirements.add(req));
        });
        return requirements;
    }

    public typedChanges(): Record<string, AtomicType | ArrayType | ObjectType> {
        return {};
    }

    public toString(): string {
        return `${this.command.keyword} (${stringifyTypeJson(this.arguments)})`;
    }

    public checkTypes(checker?: TypeChecker): ValidationResult {
        if (!checker || !checker?.strictSyntax() && !checker?.strictInputs()) {
            return { valid: true };
        }

        const checks: ValidationResult[] = [];
        checks.push(...Object.values(this.arguments).map(arg => arg.checkTypes(checker)));

        if (checker) {
            for (const [expectedKey, expectedType] of Object.entries(this.command.arguments)) {
                if (!(expectedKey in this.arguments)) {
                    checks.push({
                        valid: false,
                        errors: [`Missing required argument '${expectedKey}' for command '${this.command.keyword}'`]
                    });
                }
                const argType = getReturnType(this.arguments[expectedKey]!, checker);
                if (!argType) {
                    if (checker.strictInputs()) {
                        checks.push({
                            valid: false,
                            errors: [`Unable to determine type for argument '${expectedKey}' in command '${this.command.keyword}'`]
                        });
                    }
                } else if (!assignableTo(argType, expectedType)) {
                    checks.push({
                        valid: false,
                        errors: [`Type mismatch for argument '${expectedKey}' in command '${this.command.keyword}': expected ${stringifyTypeJson(expectedType)}, got ${stringifyTypeJson(argType)}`]
                    });
                }
            }

        } else {
            // TODO: This is never thrown due the check above, 
            // but we should consider if we want to allow type checking of commands without a TypeChecker, 
            // or if we should require it for any command type checks
            throw new TypeCheckError(`Cannot check command: ${this.command.name} without a TypeChecker`);
        }
        return mergeValidationResults(...checks);
    }

    public execute(context: WorkingContext): RuleEffect {
        const parsedArgs = Object.fromEntries(
            Object.entries(this.arguments).map(([key, expr]) => [key, expr.evaluate(context)])
        );
        const handler = context.commandHandler();
        if (!handler) {
            return { ...this.preparedEffect, exception: `No plugin handler available in context for executing command action '${this.command.keyword}'` };
        }
        const result = handler.addAction({
            hash: `${this.command.keyword}-${stringifyTypeJson(parsedArgs)}`,
            keyword: this.command.keyword,
            arguments: parsedArgs,
            immediate: this.command.immediate,
        });

        if (result !== undefined) {
            // This was immediately executed, so we can set the output right away
            context.setOutput(this.command.keyword, result);
        }

        return { ...this.preparedEffect, changed: this.command.immediate ? this.command.keyword : undefined };
    }
}    