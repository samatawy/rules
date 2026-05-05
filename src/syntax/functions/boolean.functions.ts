import type { TypedParameter, WorkingContext } from "../../types";
import type { BooleanExpression } from "../expression";
import { BooleanFunctionExpression } from "../function.expression";

export class BooleanFunction extends BooleanFunctionExpression {

    protected name: string;

    protected target: BooleanExpression;

    constructor(name: string, target: BooleanExpression) {
        super(name, [target]);
        this.name = name;
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
                throw new Error(`Unknown boolean function: ${this.name}`);
        }
    }

    public evaluate(context: WorkingContext): boolean {
        const targetValue = this.target.evaluate(context);
        if (typeof targetValue !== 'boolean') {
            throw new Error(`Target argument for function ${this.name} did not evaluate to a boolean`);
        }

        switch (this.name.toLowerCase()) {
            case 'if':
            case 'is':
                return !!targetValue;
            case 'not':
                return !targetValue;
            default:
                throw new Error(`Unknown boolean function: ${this.name}`);
        }
    }

    static names = ['if', 'is', 'not'];
}
