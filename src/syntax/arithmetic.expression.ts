import type { TypeChecker, ValidationResult, WorkingContext } from "../interfaces";
import { getReturnType } from "../type.utils";
import { mergeValidationResults } from "../common.utils";
import { Expression, NumericExpression } from "./expression";
import { EvaluationError } from "../rules/exception";
import type { Renderable } from "../rendering/render.types";

export class ArithmeticExpression extends NumericExpression {

    protected operator: string;

    protected left: Expression;

    protected right: Expression;

    constructor(operator: string, left: Expression, right: Expression) {
        super();
        this.operator = operator;
        this.left = left;
        this.right = right;

        this.syntax = this.toString();
    }

    public getParts(): Expression[] {
        return (this.left) ? [this.left, this.right] : [this.right];
    }

    public required(): Set<string> {
        const leftRequirements = this.left?.required() || [];
        const rightRequirements = this.right.required();
        return new Set([...leftRequirements, ...rightRequirements]);
    }

    public invokes(): Set<string> {
        const leftInvokes = this.left?.invokes() || [];
        const rightInvokes = this.right.invokes();
        return new Set([...leftInvokes, ...rightInvokes]);
    }

    public checkTypes(checker?: TypeChecker): ValidationResult {
        const checks: ValidationResult[] = [];

        if (!checker || checker.strictSyntax()) {
            const leftType = getReturnType(this.left, checker);
            const rightType = getReturnType(this.right, checker);

            const ok = (checker?.strictInputs()) ?
                (leftType && rightType && leftType === rightType) :
                (!leftType || !rightType || leftType === rightType);

            if (!ok) {
                checks.push({
                    valid: false,
                    errors: [`Arithmetic operator ${this.operator} requires operands of the same type, but got ${leftType} and ${rightType}`],
                });
            }
        }

        return mergeValidationResults(
            this.left.checkTypes(checker),
            this.right.checkTypes(checker),
            ...checks,
        );
    }

    public evaluate(context: WorkingContext): number {
        const cached = context.getCached(this.syntax);
        if (cached !== undefined) return cached;

        const leftValue = this.left.evaluate(context);
        const rightValue = this.right.evaluate(context);

        switch (this.operator) {
            case '+':
                return leftValue + rightValue;
            case '-':
                return leftValue - rightValue;
            case '*':
                return leftValue * rightValue;
            case '/':
                if (rightValue === 0) {
                    throw new EvaluationError("Division by zero");
                }
                return leftValue / rightValue;
            case '%':
                if (rightValue === 0) {
                    throw new EvaluationError("Division by zero");
                }
                return leftValue % rightValue;
            default:
                throw new EvaluationError(`Unsupported arithmetic operator: ${this.operator}`);
        }
    }

    public toString(): string {
        return `(${this.left.toString()} ${this.operator} ${this.right.toString()})`;
    }

    public toJS(): string {
        return `(${this.left.toJS()} ${this.operator} ${this.right.toJS()})`;
    }

    public toJson(): Renderable {
        return {
            type: 'ArithmeticExpression',
            operator: this.operator === '*' ? 'x' : this.operator,
            left: this.left.toJson(),
            right: this.right.toJson(),
        };
    }
}