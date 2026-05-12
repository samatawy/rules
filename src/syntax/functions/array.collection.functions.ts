import { ArrayExpression } from "../array.expression";
import type { TypedParameter } from "../../types";
import type { WorkingContext } from "../../interfaces";
import type { Expression } from "../expression";
import { StringFunctionExpression } from "../function.expression";
import { EvaluationError, TypeCheckError } from "../../rules/exception";
import { WorkLogger } from "../../log/work.logger";

export class ArrayCollectionFunction extends StringFunctionExpression {

    protected target_arg: Expression;

    protected extra_args: Expression[];

    constructor(name: string, target: Expression, args: Expression[]) {
        super(name, [target, ...args]);
        // this.name = name;
        this.target_arg = target;
        this.extra_args = args;
    }

    public expectsParameters(): TypedParameter[] {
        switch (this.name) {
            case 'concat':
                return [{ type: 'string[]' }];
            case 'join':
                return [{ type: 'string[]' }, { type: 'string' }];
            default:
                throw new TypeCheckError(`Unknown array collection function: ${this.name}`);
        }
    }

    public expectsParameterArray(): boolean {
        return this.name === 'concat';
    }

    public evaluate(context: WorkingContext): string {
        const cached = context.getCached(this.syntax);
        if (cached !== undefined) return cached;

        // If this function expects a parameter array, we need to convert the target argument and extra arguments 
        // into a single array argument for processing, unless the target is already an array.
        if (this.expectsParameterArray()) {
            const firstArg = this.target_arg.evaluate(context);
            const isArray = this.target_arg instanceof ArrayExpression || Array.isArray(firstArg);
            this.target_arg = isArray ? this.target_arg : new ArrayExpression([this.target_arg, ...this.extra_args]);
            this.extra_args = [];
        }

        const targetValue = this.target_arg.evaluate(context);
        if (!Array.isArray(targetValue)) {
            WorkLogger.debug('Received argument', targetValue, `for argument ${this.target_arg} in function ${this.name}`);
            throw new EvaluationError(`Target argument for function ${this.name} did not evaluate to an array`);
        }

        switch (this.name) {
            case 'concat':
                return targetValue.join('');
            case 'join':
                const separator = this.extra_args[0] ? this.extra_args[0].evaluate(context) : '';
                return targetValue.join(separator);
            default:
                throw new EvaluationError(`Unknown array collection function: ${this.name}`);
        }
    }

    static names = ['concat', 'join'];
}
