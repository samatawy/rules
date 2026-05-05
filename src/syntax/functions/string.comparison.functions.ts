import type { TypedParameter, WorkingContext } from "../../types";
import type { StringExpression } from "../expression";
import { BooleanFunctionExpression } from "../function.expression";

export class StringComparisonFunction extends BooleanFunctionExpression {

    protected name: string;

    protected left_arg: StringExpression;

    protected right_arg: StringExpression;

    constructor(name: string, left: StringExpression, right: StringExpression) {
        super(name, [left, right]);
        this.name = name;
        this.left_arg = left;
        this.right_arg = right;
    }

    public expectsParameters(): TypedParameter[] {
        return [{ type: 'string' }, { type: 'string' }];
    }

    public evaluate(context: WorkingContext): boolean {
        const leftValue = this.left_arg.evaluate(context);
        const rightValue = this.right_arg.evaluate(context);

        if (typeof leftValue !== 'string' || typeof rightValue !== 'string') {
            throw new Error(`Arguments for function ${this.name} did not evaluate to strings`);
        }

        switch (this.name) {
            case 'equals':
                return leftValue === rightValue;
            // case 'notEquals':
            //     return leftValue !== rightValue;
            case 'contains':
                return leftValue.includes(rightValue);
            case 'startsWith':
                return leftValue.startsWith(rightValue);
            case 'endsWith':
                return leftValue.endsWith(rightValue);
            case 'matches':
                return new RegExp(rightValue).test(leftValue);

            case 'equalsIgnoreCase':
                return leftValue.toLowerCase() === rightValue.toLowerCase();
            case 'containsIgnoreCase':
                return leftValue.toLowerCase().includes(rightValue.toLowerCase());
            case 'startsWithIgnoreCase':
                return leftValue.toLowerCase().startsWith(rightValue.toLowerCase());
            case 'endsWithIgnoreCase':
                return leftValue.toLowerCase().endsWith(rightValue.toLowerCase());
            case 'matchesIgnoreCase':
                return new RegExp(rightValue, 'i').test(leftValue);
            default:
                throw new Error(`Unknown string comparison function: ${this.name}`);
        }
    }

    static names = ['equals', 'equalsIgnoreCase', 'contains', 'containsIgnoreCase', 'startsWith', 'startsWithIgnoreCase', 'endsWith', 'endsWithIgnoreCase', 'matches', 'matchesIgnoreCase'];
}
