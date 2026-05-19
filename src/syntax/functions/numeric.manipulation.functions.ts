import type { TypedParameter } from "../../types";
import type { WorkingContext } from "../../interfaces";
import type { Expression, NumericExpression } from "../expression";
import { NumericFunctionExpression } from "../function.expression";
import { EvaluationError, TypeCheckError } from "../../rules/exception";

export class NumericManipulationFunction extends NumericFunctionExpression {

    protected target_arg: NumericExpression;

    protected extra_args: Expression[];

    constructor(name: string, target: NumericExpression, args: Expression[]) {
        super(name, [target, ...args]);
        this.target_arg = target;
        this.extra_args = args;
    }

    public expectsParameters(): TypedParameter[] {
        switch (this.name) {
            case 'abs':
            case 'sign':
            case 'sqrt':
            case 'log':
            case 'log10':
            case 'log2':
            case 'exp':

            case 'neg':
            case 'negative':
            case 'ceil':
            case 'floor':
            case 'round':
                return [{ type: 'number' }];

            case 'roundTo':

            case 'pow':
            case 'power':
            case 'root':
                return [{ type: 'number' }, { type: 'number' }];
            default:
                throw new TypeCheckError(`Unknown numeric manipulation function: ${this.name}`);
        }
    }

    public evaluate(context: WorkingContext): number {
        const cached = context.getCached(this.syntax);
        if (cached !== undefined) return cached;

        const evaluatedArgs = this.extra_args.map(arg => arg.evaluate(context));

        const targetValue = this.target_arg.evaluate(context);
        if (typeof targetValue !== 'number') {
            throw new EvaluationError(`Target argument for function ${this.name} did not evaluate to a number`);
        }

        switch (this.name) {
            case 'neg':
            case 'negative':
                return -targetValue;
            case 'abs':
                return Math.abs(targetValue);
            case 'sign':
                return Math.sign(targetValue);
            case 'sqrt':
                return Math.sqrt(targetValue);
            case 'log':
                return Math.log(targetValue);
            case 'log10':
                return Math.log10(targetValue);
            case 'log2':
                return Math.log2(targetValue);
            case 'exp':
                return Math.exp(targetValue);
            case 'ceil':
                return Math.ceil(targetValue);
            case 'floor':
                return Math.floor(targetValue);
            case 'round':
                return Math.round(targetValue);
            case 'roundTo':
                const factor = Math.pow(10, evaluatedArgs[0]);
                return Math.round(targetValue * factor) / factor;
            case 'pow':
            case 'power':
                return Math.pow(targetValue, evaluatedArgs[0]);
            case 'root':
                return Math.pow(targetValue, 1 / evaluatedArgs[0]);

            default:
                throw new EvaluationError(`Unknown numeric manipulation function: ${this.name}`);
        }
    }

    static names = ['neg', 'negative', 'ceil', 'floor', 'round', 'roundTo', 'pow', 'power', 'root', 'abs', 'sign', 'sqrt', 'log', 'log10', 'log2', 'exp'];
}
