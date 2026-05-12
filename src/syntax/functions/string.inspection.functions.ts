import type { TypedParameter } from "../../types";
import type { WorkingContext } from "../../interfaces";
import type { Expression, StringExpression } from "../expression";
import { NumericFunctionExpression } from "../function.expression";
import { EvaluationError, TypeCheckError } from "../../rules/exception";

export class StringInspectionFunction extends NumericFunctionExpression {

    protected target_arg: StringExpression;

    protected extra_args: Expression[];

    constructor(name: string, target: StringExpression, args: Expression[]) {
        super(name, [target, ...args]);
        this.target_arg = target;
        this.extra_args = args;
    }

    public expectsParameters(): TypedParameter[] {
        switch (this.name) {
            case 'length':
                return [{ type: 'string' }];
            case 'countOf':
            case 'indexOf':
            case 'lastIndexOf':
                return [{ type: 'string' }, { type: 'string' }];
            default:
                throw new TypeCheckError(`Unknown string inspection function: ${this.name}`);
        }
    }

    public evaluate(context: WorkingContext): number {
        const cached = context.getCached(this.syntax);
        if (cached !== undefined) return cached;

        const targetValue = this.target_arg.evaluate(context);
        if (typeof targetValue !== 'string') {
            throw new EvaluationError(`Target argument for function ${this.name} did not evaluate to a string`);
        }
        const evaluatedArgs = this.extra_args.map(arg => arg.evaluate(context));

        switch (this.name) {
            case 'length':
                return targetValue.length;
            case 'countOf':
                return targetValue.split(evaluatedArgs[0]).length - 1;
            case 'indexOf':
                return targetValue.indexOf(evaluatedArgs[0]);
            case 'lastIndexOf':
                return targetValue.lastIndexOf(evaluatedArgs[0]);
            default:
                throw new EvaluationError(`Unknown string inspection function: ${this.name}`);
        }
    }

    static names = ['length', 'countOf', 'indexOf', 'lastIndexOf'];
}