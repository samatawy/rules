import { AbstractRule } from "./abstract.rule";
import type { Expression } from "../syntax/expression";
import type { ArrayType, AtomicType } from "../types";
import type { Executor, WorkingContext, RuleEffect, TypeChecker, ValidationResult } from "../interfaces";
import { RuleParser } from "../parser/rule.parser";
import { getReturnType, isAtomicType } from "../type.utils";
import { equalsDeep, mergeValidationResults } from "../common.utils";
import type { Workspace } from "../engine/workspace";
import { OutputAction } from "./executable";
import { ParserError } from "./exception";

export class OutputRule extends AbstractRule {

    protected outputKey: string;

    protected expression: Expression;

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

    static parsed(syntax: string, key: string, expression: Expression): OutputRule {
        return new OutputRule(syntax, key, expression);
    }

    protected constructor(syntax: string, key: string, expression: Expression | null) {
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
        this.willChange({ [this.outputKey]: getReturnType(this.expression) as AtomicType | ArrayType });
    }

    public toString(): string {
        return `SET ${this.outputKey} = ${this.expression.toString()}`;
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

    public evaluate(context: WorkingContext): Executor | null {
        const oldValue = context.getOutput(this.outputKey);
        const newValue = this.expression.evaluate(context);

        if (equalsDeep(oldValue, newValue)) {
            // if (oldValue === newValue) {
            return null;
        } else {
            return new OutputAction(this.outputKey, this.expression);
        }
    }

    public execute(context: WorkingContext): RuleEffect {
        const oldValue = context.getOutput(this.outputKey);
        const newValue = this.expression.evaluate(context);

        if (equalsDeep(oldValue, newValue)) {
            // if (oldValue === newValue) {
            return {};
        } else {
            context.setOutput(this.outputKey, newValue);
            return { changed: this.outputKey };
        }
    }
}

export type StateRule = OutputRule;