import type { TypedParameter } from "../../types";
import type { WorkingContext } from "../../interfaces";
import type { BooleanExpression } from "../expression";
import { BooleanFunctionExpression } from "../function.expression";
import { EvaluationError, TypeCheckError } from "../../rules/exception";

export class BooleanFunction extends BooleanFunctionExpression {

    protected target: BooleanExpression;

    constructor(name: string, target: BooleanExpression) {
        super(name, [target]);
        this.target = target;
    }

    public expectsParameters(): TypedParameter[] {
        switch (this.name.toLowerCase()) {
            case 'if':
            case 'is':
                return [{ type: 'any' }];
            case 'not':
                return [{ type: 'any' }];
            default:
                throw new TypeCheckError(`Unknown boolean function: ${this.name}`);
        }
    }

    public evaluate(context: WorkingContext): boolean {
        const targetValue = this.target.evaluate(context);
        if (typeof targetValue !== 'boolean') {
            throw new EvaluationError(`Target argument for function ${this.name} did not evaluate to a boolean`);
        }

        switch (this.name.toLowerCase()) {
            case 'if':
            case 'is':
                return !!targetValue;
            case 'not':
                return !targetValue;
            default:
                throw new EvaluationError(`Unknown boolean function: ${this.name}`);
        }
    }

    static names = ['if', 'is', 'not'];
}
