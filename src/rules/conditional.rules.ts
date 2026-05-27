import { AbstractRule } from "./abstract.rule";
import { ExceptionThrower, type ExecutableAction } from "./executable";
import type { Expression } from "../syntax/expression";
import type { Executor, WorkingContext, RuleEffect, TypeChecker, ValidationResult } from "../interfaces";
import { RuleParser } from "../parser/rule.parser";
import { mergeValidationResults } from "../common.utils";
import type { Workspace } from "../engine/workspace";
import { EvaluationError, ExecutionError, ParserError } from "./exception";
import type { Renderable } from "../render/render.types";

/**
 * A conditional rule that is executed if a condition is satisified.
 */
export class IfThenRule extends AbstractRule {

    protected condition: Expression;

    protected consequence: ExecutableAction;

    static parse(syntax: string, workspace?: Workspace): IfThenRule {
        const parsed = new RuleParser({ workspace }).parse(syntax);
        if (parsed instanceof IfThenRule) {
            return parsed;
        } else {
            throw new ParserError(`Invalid syntax for IfThenRule: ${syntax}`);
        }
    }

    public getExpression(): Expression {
        return this.condition;
    }

    static parsed(syntax: string, condition: Expression, consequence: ExecutableAction): IfThenRule {
        return new IfThenRule(syntax, condition, consequence);
    }

    protected constructor(syntax: string, condition?: Expression | null, consequence?: ExecutableAction | null) {
        super(syntax);
        this.condition = condition as Expression;
        this.consequence = consequence as ExecutableAction;
        if (!condition || !consequence) {
            const parsed = new RuleParser({}).parse(syntax);
            if (parsed instanceof IfThenRule && parsed.condition && parsed.consequence) {
                this.condition = parsed.condition;
                this.consequence = parsed.consequence;
            } else {
                throw new ParserError(`Invalid syntax for IfThenRule: ${syntax}`);
            }
        }
        this.consequence = this.consequence || new ExceptionThrower(`Condition met: ${syntax} but no consequence provided`);
        this.require(...this.condition.required(), ...this.consequence.required());
        this.willChange(this.consequence.typedChanges());
    }

    public toString(): string {
        return `IF ${this.condition.toString()} THEN ${this.consequence.toString()}`;
    }

    public toJson(): Renderable {
        return {
            type: 'IfThenRule',
            condition: this.condition.toJson(),
            trueExpression: this.consequence.toJson(),
        };
    }

    public checkTypes(checker?: TypeChecker): ValidationResult {
        return mergeValidationResults(
            this.condition.checkTypes(checker),
            this.consequence.checkTypes(checker)
        )
    }

    public evaluate(context: WorkingContext): Executor | null {
        return (this.condition.evaluate(context)) ? this.consequence.prepareEffect({ satisfied: true }) : null;
    }

    public execute(context: WorkingContext): RuleEffect {
        throw new EvaluationError('Direct execution of IfThenRule is not supported. Please evaluate first to get the appropriate executor.');
    }
}

/**
 * A conditional rule that will execute one action if its condition evaluates to true, 
 * and another condition if it evaluates to false.
 */
export class IfThenElseRule extends AbstractRule {

    protected condition: Expression;

    protected consequence: ExecutableAction;

    protected alternative: ExecutableAction;

    public getExpression(): Expression {
        // const trueSyntax = this.condition.toString();
        // const both = new ExpressionParser({}).parse(`${trueSyntax} OR not(${trueSyntax})`);
        // return both;
        return this.condition;
    }

    static parse(syntax: string, workspace?: Workspace): IfThenElseRule {
        const parsed = new RuleParser({ workspace }).parse(syntax);
        if (parsed instanceof IfThenElseRule) {
            return parsed;
        } else {
            throw new ParserError(`Invalid syntax for IfThenElseRule: ${syntax}`);
        }
    }

    static parsed(syntax: string, condition: Expression, consequence: ExecutableAction, alternative: ExecutableAction): IfThenElseRule {
        return new IfThenElseRule(syntax, condition, consequence, alternative);
    }

    protected constructor(syntax: string, condition?: Expression | null, consequence?: ExecutableAction | null, alternative?: ExecutableAction | null) {
        super(syntax);
        this.condition = condition as Expression;
        this.consequence = consequence as ExecutableAction;
        this.alternative = alternative as ExecutableAction;
        if (!condition || !consequence || !alternative) {
            const parsed = new RuleParser({}).parse(syntax);
            if (parsed instanceof IfThenElseRule && parsed.condition && parsed.consequence && parsed.alternative) {
                this.condition = parsed.condition;
                this.consequence = parsed.consequence;
                this.alternative = parsed.alternative;
            } else {
                throw new ParserError(`Invalid syntax for IfThenElseRule: ${syntax}`);
            }
        }

        this.consequence = this.consequence || new ExceptionThrower(`Condition met: ${syntax} but no consequence provided`);
        this.alternative = this.alternative || new ExceptionThrower(`Condition failed: ${syntax} but no alternative provided`);
        this.require(...this.condition.required(), ...this.consequence.required(), ...this.alternative.required());
        this.willChange({ ...this.consequence.typedChanges(), ...this.alternative.typedChanges() });
    }

    public toString(): string {
        return `IF ${this.condition.toString()} THEN ${this.consequence.toString()} ELSE ${this.alternative.toString()}`;
    }

    public toJson(): Renderable {
        return {
            type: 'IfThenElseRule',
            condition: this.condition.toJson(),
            trueExpression: this.consequence.toJson(),
            falseExpression: this.alternative.toJson(),
        };
    }

    public checkTypes(checker?: TypeChecker): ValidationResult {
        return mergeValidationResults(
            this.condition.checkTypes(checker),
            this.consequence.checkTypes(checker),
            this.alternative.checkTypes(checker)
        );
    }

    public evaluate(context: WorkingContext): Executor | null {
        return (this.condition.evaluate(context)) ?
            this.consequence.prepareEffect({ satisfied: true }) :
            this.alternative.prepareEffect({ satisfied: false });
    }

    public execute(context: WorkingContext): RuleEffect {
        throw new ExecutionError('Direct execution of IfThenElseRule is not supported. Please evaluate first to get the appropriate executor.');
    }
}

/**
 * A condition rule that throws an exception if its condition evaluates to true.
 */
export class IfThrowRule extends AbstractRule {

    protected condition: Expression;

    protected consequence: ExceptionThrower;

    public getExpression(): Expression {
        return this.condition;
    }

    static parse(syntax: string, workspace?: Workspace): IfThrowRule {
        const parsed = new RuleParser({ workspace }).parse(syntax);
        if (parsed instanceof IfThrowRule) {
            return parsed;
        } else {
            throw new ParserError(`Invalid syntax for IfThrowRule: ${syntax}`);
        }
    }

    static parsed(syntax: string, condition: Expression, error: ExceptionThrower | string): IfThrowRule {
        return new IfThrowRule(syntax, condition, error);
    }

    protected constructor(syntax: string, condition?: Expression | null, error?: ExceptionThrower | string) {
        super(syntax);
        this.condition = condition as Expression;
        this.consequence = error instanceof ExceptionThrower ?
            error :
            new ExceptionThrower(error || `Condition met: ${syntax} but no error message provided`);

        if (!condition) {
            const parsed = new RuleParser({}).parse(syntax);
            if (parsed instanceof IfThrowRule && parsed.condition && parsed.consequence) {
                this.condition = parsed.condition;
                this.consequence = parsed.consequence;
            } else {
                throw new ParserError(`Invalid syntax for IfThrowRule: ${syntax}`);
            }
        }
        this.require(...this.condition.required(), ...this.consequence.required());
    }

    public toString(): string {
        return `IF ${this.condition.toString()} ${this.consequence.toString()}`;
    }

    public toJson(): Renderable {
        return {
            type: 'IfThrowRule',
            condition: this.condition.toJson(),
            trueExpression: this.consequence.toJson(),
        };
    }

    public checkTypes(checker?: TypeChecker): ValidationResult {
        return mergeValidationResults(
            this.condition.checkTypes(checker),
            this.consequence.checkTypes(checker)
        );
    }

    public evaluate(context: WorkingContext): Executor | null {
        return (this.condition.evaluate(context)) ? this.consequence.prepareEffect({ satisfied: true }) : null;
    }

    public execute(context: WorkingContext): RuleEffect {
        throw new ExecutionError('Direct execution of IfThrowRule is not supported. Please evaluate first to get the appropriate executor.');
    }
}

export type ExceptionRule = IfThrowRule;