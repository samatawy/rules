import type { TypeChecker, ValidationResult, WorkingContext } from "../types";
import { getReturnType, isArrayType, makeItemType, mergeValidationResults } from "../utils";
import { BooleanExpression, Expression } from "./expression";

export class ComparisonExpression extends BooleanExpression {

    protected operator: string;

    protected left: Expression;

    protected right: Expression;

    constructor(operator: string, left: Expression, right: Expression) {
        super();
        this.operator = operator;
        this.left = left;
        this.right = right;
    }

    public required(): Set<string> {
        const leftRequirements = this.left.required();
        const rightRequirements = this.right.required();
        return new Set([...leftRequirements, ...rightRequirements]);
    }

    public checkTypes(checker?: TypeChecker): ValidationResult {
        const checks: ValidationResult[] = [];

        if (!checker || checker.strictSyntax()) {
            const leftType = getReturnType(this.left, checker);
            const rightType = getReturnType(this.right, checker);

            if (this.operator === 'IN') {
                // IN requires special checking: the right operand must be an array type, 
                // and the left operand must be of the same type as the items in the right operand array 
                // (or any type if strict inputs is not enabled)
                if (!isArrayType(rightType)) {
                    checks.push({
                        valid: false,
                        errors: [`Right operand of 'IN' operator must be an array type, but got ${rightType}`],
                    });
                }

                if (checker?.strictInputs()) {
                    const itemType = leftType;
                    const expectedItemType = makeItemType(rightType);
                    if (itemType && expectedItemType && itemType !== expectedItemType) {
                        checks.push({
                            valid: false,
                            errors: [`Left operand of 'IN' operator must be of the same type as the items in the right operand array, but got ${itemType} and ${expectedItemType}`],
                        });
                    }
                }

            } else {
                // For other comparison operators, we require that both operands are of the same type 
                // (or any type if strict inputs is not enabled)
                const ok = (checker?.strictInputs()) ?
                    (leftType && rightType && leftType === rightType) :
                    (!leftType || !rightType || leftType === rightType);

                if (!ok) {
                    checks.push({
                        valid: false,
                        errors: [`Comparison operator ${this.operator} requires operands of the same type, but got ${leftType} and ${rightType}`],
                    });
                }
            }
        }

        return mergeValidationResults(
            this.left.checkTypes(checker),
            this.right.checkTypes(checker),
            ...checks,
        );
    }

    public evaluate(context: WorkingContext): boolean {
        const leftValue = this.left.evaluate(context);
        const rightValue = this.right.evaluate(context);

        switch (this.operator) {
            case '==':
                return leftValue == rightValue;
            case '!=':
                return leftValue != rightValue;
            case '>':
                return leftValue > rightValue;
            case '<':
                return leftValue < rightValue;
            case '>=':
                return leftValue >= rightValue;
            case '<=':
                return leftValue <= rightValue;
            case 'IN':
                if (Array.isArray(rightValue)) {
                    return rightValue.includes(leftValue);
                }
                throw new Error(`Right operand of 'IN' operator must be an array, but got ${typeof rightValue}`);

            default:
                throw new Error(`Unknown operator: ${this.operator}`);
        }
    }

    public toString(): string {
        return `(${this.left.toString()} ${this.operator} ${this.right.toString()})`;
    }
}