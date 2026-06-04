import type { TypedParameter } from "../types";
import type { WorkingContext } from "../interfaces";
import type { Expression, NumericExpression } from "../syntax/expression";
import { BooleanFunctionExpression } from "../syntax/function.expression";
import { EvaluationError, TypeCheckError } from "../rules/exception";
import { FunctionCompiler } from "../parser/function.compiler";

export class NumericComparisonFunction extends BooleanFunctionExpression {

    protected target: NumericExpression;

    protected extra_args: Expression[];

    constructor(name: string, target: NumericExpression, args: Expression[]) {
        super(name, [target, ...args]);
        this.target = target;
        this.extra_args = args;
    }

    public expectsParameters(): TypedParameter[] {
        switch (this.name) {
            case 'equal':
            case 'closeTo':
            case 'close_to':
            case 'greaterThan':
            case 'greater_than':
            case 'lessThan':
            case 'less_than':
            case 'greaterThanOrEqual':
            case 'greater_than_or_equal':
            case 'lessThanOrEqual':
            case 'less_than_or_equal':
                return [{ type: 'number' }, { type: 'number' }];
            case 'between':
                return [{ type: 'number' }, { type: 'number' }, { type: 'number' }];

            case 'multipleOf':
            case 'multiple_of':
            case 'divisibleBy':
            case 'divisible_by':
            case 'factorOf':
            case 'factor_of':
                return [{ type: 'number' }, { type: 'number' }];

            case 'isPositive':
            case 'is_positive':
            case 'isNegative':
            case 'is_negative':
            case 'isEven':
            case 'is_even':
            case 'isOdd':
            case 'is_odd':
            case 'isPrime':
            case 'is_prime':
            case 'isInteger':
            case 'is_integer':
            case 'isNaN':
            case 'is_nan':
            case 'isFinite':
            case 'is_finite':
                return [{ type: 'number' }];

            default:
                throw new TypeCheckError(`Unknown numeric comparison function: ${this.name}`);
        }
    }

    public evaluate(context: WorkingContext): boolean {
        const cached = context.getCached(this.syntax);
        if (cached !== undefined) return cached;

        const targetValue = this.target.evaluate(context);
        if (typeof targetValue !== 'number') {
            throw new EvaluationError(`Target argument for function ${this.name} did not evaluate to a number`);
        }
        const evaluatedArgs = this.extra_args.map(arg => arg.evaluate(context));
        for (const arg of evaluatedArgs) {
            if (typeof arg !== 'number') {
                throw new EvaluationError(`Arguments for function ${this.name} did not evaluate to numbers`);
            }
        }

        if (FunctionCompiler.enabled) {
            const compiled = (globalThis as any)[this.name] as Function;
            if (typeof compiled === 'function') {
                return compiled(targetValue, ...evaluatedArgs, context);
            }
        }

        switch (this.name) {
            case 'equal':
                return targetValue === evaluatedArgs[0];
            case 'closeTo':
            case 'close_to':
                if (evaluatedArgs.length < 2) {
                    throw new EvaluationError(`Function ${this.name} requires two arguments for the target value and tolerance`);
                }
                return Math.abs(targetValue - evaluatedArgs[0]) <= Math.abs(evaluatedArgs[1]);
            case 'greaterThan':
            case 'greater_than':
                return targetValue > evaluatedArgs[0];
            case 'lessThan':
            case 'less_than':
                return targetValue < evaluatedArgs[0];
            case 'greaterThanOrEqual':
            case 'greater_than_or_equal':
                return targetValue >= evaluatedArgs[0];
            case 'lessThanOrEqual':
            case 'less_than_or_equal':
                return targetValue <= evaluatedArgs[0];
            case 'between':
                if (evaluatedArgs.length < 2) {
                    throw new EvaluationError(`Function ${this.name} requires two arguments for the bounds`);
                }
                if (typeof evaluatedArgs[0] !== 'number' || typeof evaluatedArgs[1] !== 'number') {
                    throw new EvaluationError(`Bounds arguments for function ${this.name} did not evaluate to numbers`);
                }
                return targetValue >= evaluatedArgs[0] && targetValue <= evaluatedArgs[1];

            case 'multipleOf':
            case 'multiple_of':
            case 'divisibleBy':
            case 'divisible_by':
                return targetValue % evaluatedArgs[0] === 0;
            case 'factorOf':
            case 'factor_of':
                return evaluatedArgs[0] % targetValue === 0;

            case 'isPositive':
            case 'is_positive':
                return targetValue > 0;
            case 'isNegative':
            case 'is_negative':
                return targetValue < 0;
            case 'isEven':
            case 'is_even':
                return targetValue % 2 === 0;
            case 'isOdd':
            case 'is_odd':
                return targetValue % 2 !== 0;
            case 'isPrime':
            case 'is_prime':
                if (targetValue <= 1) return false;
                for (let i = 2; i <= Math.sqrt(targetValue); i++) {
                    if (targetValue % i === 0) return false;
                }
                return true;
            case 'isInteger':
            case 'is_integer':
                return Number.isInteger(targetValue);
            case 'isNaN':
            case 'is_nan':
                return Number.isNaN(targetValue);
            case 'isFinite':
            case 'is_finite':
                return Number.isFinite(targetValue);

            default:
                throw new EvaluationError(`Unknown numeric comparison function: ${this.name}`);
        }
    }
}

export class NumericComparisonFunctionProvider {

    private static _names = ['equal', 'closeTo', 'close_to',
        'greaterThan', 'greater_than', 'lessThan', 'less_than',
        'greaterThanOrEqual', 'greater_than_or_equal', 'lessThanOrEqual', 'less_than_or_equal',
        'between',
        'multipleOf', 'multiple_of', 'divisibleBy', 'divisible_by', 'factorOf', 'factor_of',
        'isPositive', 'is_positive', 'isNegative', 'is_negative', 'isEven', 'is_even', 'isOdd', 'is_odd', 'isPrime', 'is_prime', 'isInteger', 'is_integer',
        'isNaN', 'is_nan', 'isFinite', 'is_finite'
    ];

    public static names(): string[] {
        return this._names;
    }

    public static create(name: string, args: Expression[]): NumericComparisonFunction | undefined {
        if (!this._names.includes(name)) {
            return undefined;
        }
        if (args.length < 2) {
            throw new TypeCheckError(`Function ${name} expects at least 2 arguments, but got ${args.length}`);
        }
        return new NumericComparisonFunction(name, args[0] as NumericExpression, args.slice(1));
    }

    public static mock(name: string, args: Expression[]): NumericComparisonFunction | undefined {
        if (!this._names.includes(name)) {
            return undefined;
        }
        return new NumericComparisonFunction(name, args[0] as NumericExpression, args.slice(1));
    }

    public static toJS(name: string): { args: string[], body: string } {
        switch (name) {
            case 'equal':
                return { args: ['x', 'y'], body: 'return x === y;' };
            case 'closeTo':
            case 'close_to':
                return { args: ['x', 'target', 'tolerance'], body: 'return Math.abs(x - target) <= Math.abs(tolerance);' };
            case 'greaterThan':
            case 'greater_than':
                return { args: ['x', 'y'], body: 'return x > y;' };
            case 'lessThan':
            case 'less_than':
                return { args: ['x', 'y'], body: 'return x < y;' };
            case 'greaterThanOrEqual':
            case 'greater_than_or_equal':
                return { args: ['x', 'y'], body: 'return x >= y;' };
            case 'lessThanOrEqual':
            case 'less_than_or_equal':
                return { args: ['x', 'y'], body: 'return x <= y;' };
            case 'between':
                return { args: ['x', 'lower', 'upper'], body: 'return x >= lower && x <= upper;' };

            case 'multipleOf':
            case 'multiple_of':
            case 'divisibleBy':
            case 'divisible_by':
                return { args: ['x', 'y'], body: 'return x % y === 0;' };
            case 'factorOf':
            case 'factor_of':
                return { args: ['x', 'y'], body: 'return y % x === 0;' };

            case 'isPositive':
            case 'is_positive':
                return { args: ['x'], body: 'return x > 0;' };
            case 'isNegative':
            case 'is_negative':
                return { args: ['x'], body: 'return x < 0;' };
            case 'isEven':
            case 'is_even':
                return { args: ['x'], body: 'return x % 2 === 0;' };
            case 'isOdd':
            case 'is_odd':
                return { args: ['x'], body: 'return x % 2 !== 0;' };
            case 'isPrime':
            case 'is_prime':
                return {
                    args: ['x'],
                    body: `
                        if (x <= 1) return false;
                        for (let i = 2; i <= Math.sqrt(x); i++) {
                            if (x % i === 0) return false;
                        }
                        return true;`
                };
            case 'isInteger':
            case 'is_integer':
                return { args: ['x'], body: 'return Number.isInteger(x);' };
            case 'isNaN':
            case 'is_nan':
                return { args: ['x'], body: 'return Number.isNaN(x);' };
            case 'isFinite':
            case 'is_finite':
                return { args: ['x'], body: 'return Number.isFinite(x);' };

            default:
                throw new TypeCheckError(`Unknown numeric comparison function: ${name}`);
        }
    }
}
