import { AbstractRule } from "./abstract.rule";
import type { Expression } from "../syntax/expression";
import type { ArrayType, AtomicType, ObjectType } from "../types";
import type { Executor, WorkingContext, RuleEffect, TypeChecker, ValidationResult } from "../interfaces";
import { RuleParser } from "../parser/rule.parser";
import { getReturnType } from "../type.utils";
import { equalsDeep, mergeValidationResults } from "../common.utils";
import type { Workspace } from "../engine/workspace";
import { OutputAction } from "./executable";
import { ExecutionError, ParserError } from "./exception";
import { isAtomicType } from "../parser/type.parser";
import { WorkLogger } from "../logging/work.logger";
import type { Renderable } from "../rendering/render.types";
import { FunctionCompiler } from "../parser/function.compiler";

/**
 * A rule that assigns a value to a key whenever the requirements are provided.
 * No condition is needed other than knowledge of the required inputs.
 */
export class OutputRule extends AbstractRule {

    protected outputKey: string;

    protected expression: Expression;

    protected compiled_exec?: Function;

    /**
     * Get the expression that will return a value to be set.
     * @returns the expression returning the required value.
     */
    public getExpression(): Expression {
        return this.expression;
    }

    static parse(syntax: string, workspace?: Workspace): OutputRule {
        const parsed = new RuleParser({ workspace }).parse(syntax);
        if (parsed instanceof OutputRule) {
            return parsed;
        } else {
            throw new ParserError(`Invalid syntax for OutputRule: ${syntax}`);
        }
    }

    static parsed(syntax: string, key: string, expression: Expression, checker?: TypeChecker): OutputRule {
        return new OutputRule(syntax, key, expression, checker);
    }

    protected constructor(syntax: string, key: string, expression: Expression | null, checker?: TypeChecker) {
        super(syntax);
        this.outputKey = key;
        if (expression) {
            this.expression = expression;
        }
        else {
            const parsed = new RuleParser({}).parse(syntax);
            if (parsed instanceof OutputRule && parsed.expression) {
                this.outputKey = parsed.outputKey;
                this.expression = parsed.expression;
            } else {
                throw new ParserError(`Invalid syntax for OutputRule: ${syntax}`);
            }
        }
        this.require(...this.expression.required());
        this.willChange({ [this.outputKey]: getReturnType(this.expression, checker) as AtomicType | ArrayType });

        if (FunctionCompiler.enabled) {
            // Check for missing function dependencies before attempting to compile the expression, and log a warning if any are found. 
            // This helps to avoid runtime errors when executing the compiled function.
            if (FunctionCompiler.missingFunctions(this.expression)) {
                WorkLogger.warn(`Cannot compile OutputRule for key '${this.outputKey}' due to missing function dependencies in the expression`);
            } else {
                this.compiled_exec = FunctionCompiler.compileFunction([], `return ${this.expression.toJS()};`);
            }
        }
    }

    public toString(): string {
        return `SET ${this.outputKey} = ${this.expression.toString()}`;
    }

    public toJson(): Renderable {
        return {
            type: 'OutputRule',
            output: this.outputKey,
            expression: this.expression.toJson(),
        };
    }

    public checkTypes(checker?: TypeChecker): ValidationResult {
        const checks: ValidationResult[] = [];
        if (checker?.strictSyntax() || checker?.strictInputs()) {
            checks.push(this.expression.checkTypes(checker));
        }

        if (checker?.strictOutputs()) {
            if (!checker.hasType(this.outputKey)) {
                checks.push({ valid: false, errors: [`Undefined output variable: ${this.outputKey}`] });
            }
            const keyType = checker.getType(this.outputKey);
            // TODO: Support array types in output validation?
            if (!isAtomicType(keyType!)) {
                checks.push({ valid: false, errors: [`Output key '${this.outputKey}' is not an atomic type`] });
            }
            const returnType = getReturnType(this.expression, checker);
            if (keyType && returnType && keyType !== returnType) {
                checks.push({
                    valid: false,
                    errors: [`Type mismatch for output key '${this.outputKey}': expected ${keyType}, but got ${returnType}`]
                });
            }
        }
        return mergeValidationResults(...checks);
    }

    public typedChanges(checker?: TypeChecker): Record<string, AtomicType | ArrayType | ObjectType> {
        if (Object.keys(this.changeTargets).length === 0) {
            this.changeTargets = { [this.outputKey]: getReturnType(this.expression, checker) as AtomicType | ArrayType | ObjectType };
        }
        return this.changeTargets;
    }

    public evaluate(context: WorkingContext): Executor | null {
        const oldValue = context.get(this.outputKey);
        const newValue = this.compiled_exec && FunctionCompiler.enabled
            ? this.compiled_exec(context)
            : this.expression.evaluate(context);

        if (equalsDeep(oldValue, newValue)) {
            return null;
        } else {
            return new OutputAction(this.outputKey, this.expression);
        }
    }

    public execute(context: WorkingContext): RuleEffect {
        const oldValue = context.get(this.outputKey);
        const newValue = this.compiled_exec && FunctionCompiler.enabled
            ? this.compiled_exec(context)
            : this.expression.evaluate(context);

        if (oldValue && typeof oldValue === 'object') {
            throw new ExecutionError('Should not override an "object" in an assignment');
        }

        if (equalsDeep(oldValue, newValue)) {
            return {};
        } else {
            context.setOutput(this.outputKey, newValue);
            return { changed: this.outputKey };
        }
    }
}

export type StateRule = OutputRule;