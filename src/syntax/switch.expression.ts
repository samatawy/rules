import type { ArrayType, AtomicType } from "../types";
import type { TypeChecker, ValidationResult, WorkingContext } from "../interfaces";
import { getReturnType } from "../type.utils";
import { mergeValidationResults } from "../common.utils";
import { Expression } from "./expression";

export class SwitchExpression extends Expression {

    protected condition: Expression;

    protected caseValues: Expression[];
    protected caseExpressions: Expression[];

    protected defaultExpression?: Expression;

    constructor(condition: Expression, caseValues: Expression[], caseExpressions: Expression[], defaultExpression?: Expression) {
        super();
        this.condition = condition;
        this.caseValues = caseValues;
        this.caseExpressions = caseExpressions;
        this.defaultExpression = defaultExpression;
        if (this.caseValues.length !== this.caseExpressions.length) {
            throw new Error(`Switch expression must have the same number of case values and case expressions, but got ${this.caseValues.length} case values and ${this.caseExpressions.length} case expressions`);
        }
    }

    public required(): Set<string> {
        const conditionRequirements = this.condition.required();
        const caseRequirements = Object.values(this.caseExpressions).flatMap(expr => Array.from(expr.required()));
        const defaultRequirements = this.defaultExpression?.required() ?? [];
        return new Set([...conditionRequirements, ...caseRequirements, ...defaultRequirements]);
    }

    public returnsType(checker?: TypeChecker): AtomicType | ArrayType {
        const caseReturns = Object.values(this.caseExpressions).map(expr => getReturnType(expr, checker));
        const uniqueReturns = new Set(caseReturns);
        if (uniqueReturns.size === 1) {
            return caseReturns[0] as AtomicType | ArrayType;
        }
        throw new Error(`Unable to determine return type of switch expression: multiple return types found ${Array.from(uniqueReturns).join(', ')}`);
    }

    public checkTypes(checker?: TypeChecker): ValidationResult {
        const checks: ValidationResult[] = [];

        if (!checker || checker.strictSyntax()) {
            const conditionType = getReturnType(this.condition, checker);
            if (conditionType !== 'boolean') {
                checks.push({
                    valid: false,
                    errors: [`Switch condition must be of type boolean, but got ${conditionType}`],
                });
            }

            const caseTypes = Object.values(this.caseExpressions).map(expr => getReturnType(expr, checker));
            const uniqueCaseTypes = new Set(caseTypes);

            const ok = (checker?.strictInputs()) ?
                (uniqueCaseTypes.size === 1) :
                (uniqueCaseTypes.size <= 1);

            if (!ok) {
                checks.push({
                    valid: false,
                    errors: [`Switch expressions must return the same type, but got ${Array.from(uniqueCaseTypes).join(', ')}`],
                });
            }
        }

        checks.push(this.condition.checkTypes(checker));
        for (const caseExpr of Object.values(this.caseExpressions)) {
            checks.push(caseExpr.checkTypes(checker));
        }

        return mergeValidationResults(...checks);
    }

    public evaluate(context: WorkingContext): any {
        const conditionValue = this.condition.evaluate(context);
        for (let i = 0; i < this.caseValues.length; i++) {
            const caseValueExpr = this.caseValues[i];
            if (!caseValueExpr) continue;
            const caseValue = caseValueExpr.evaluate(context);
            if (caseValue === conditionValue) {
                const caseExpr = this.caseExpressions[i];
                if (!caseExpr) continue;
                return caseExpr.evaluate(context);
            }
        }
        if (this.defaultExpression) {
            return this.defaultExpression.evaluate(context);
        } else {
            throw new Error(`No matching case found in switch expression for condition value: ${conditionValue} and no default expression provided`);
        }
    }

    public toString(): string {
        let str = `SWITCH(${this.condition.toString()}) `;
        for (const [caseValue, caseExpr] of Object.entries(this.caseExpressions)) {
            str += `CASE ${caseValue}: ${caseExpr.toString()} `;
        }
        return str;
    }
}