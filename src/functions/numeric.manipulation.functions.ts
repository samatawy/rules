import type { TypedParameter } from "../types";
import type { WorkingContext } from "../interfaces";
import type { Expression, NumericExpression } from "../syntax/expression";
import { NumericFunctionExpression } from "../syntax/function.expression";
import { EvaluationError, TypeCheckError } from "../rules/exception";
import { FunctionCompiler } from "../parser/function.compiler";

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
            case 'deg_to_rad':
            case 'rad_to_deg':
            case 'normalize_deg':
            case 'normalize_rad':
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

        if (FunctionCompiler.enabled) {
            const compiled = (globalThis as any)[this.name] as Function;
            if (typeof compiled === 'function') {
                return compiled(targetValue, ...evaluatedArgs, context);
            }
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

            case 'deg_to_rad':
                return targetValue * (Math.PI / 180);
            case 'rad_to_deg':
                return targetValue * (180 / Math.PI);
            case 'normalize_deg':
                return ((targetValue % 360) + 360) % 360;
            case 'normalize_rad':
                const twoPi = 2 * Math.PI;
                return ((targetValue % twoPi) + twoPi) % twoPi;

            default:
                throw new EvaluationError(`Unknown numeric manipulation function: ${this.name}`);
        }
    }
}

export class NumericManipulationFunctionProvider {

    private static _names = ['neg', 'negative', 'ceil', 'floor', 'round', 'roundTo', 'pow', 'power', 'root', 'abs', 'sign', 'sqrt', 'log', 'log10', 'log2', 'exp',
        'deg_to_rad', 'rad_to_deg', 'normalize_deg', 'normalize_rad'];

    public static names(): string[] {
        return this._names;
    }

    public static create(name: string, args: Expression[]): NumericManipulationFunction | undefined {
        if (!this._names.includes(name)) {
            return undefined;
        }
        if (args.length < 1) {
            throw new TypeCheckError(`Function ${name} expects at least 1 argument, but got ${args.length}`);
        }
        return new NumericManipulationFunction(name, args[0] as NumericExpression, args.slice(1));
    }

    public static mock(name: string, args: Expression[]): NumericManipulationFunction | undefined {
        if (!this._names.includes(name)) {
            return undefined;
        }
        return new NumericManipulationFunction(name, args[0] as NumericExpression, args.slice(1));
    }

    public static toJS(name: string): { args: string[], body: string } {
        switch (name) {
            case 'neg':
            case 'negative':
                return { args: ['x'], body: 'return -x;' };
            case 'abs':
                return { args: ['x'], body: 'return Math.abs(x);' };
            case 'sign':
                return { args: ['x'], body: 'return Math.sign(x);' };
            case 'sqrt':
                return { args: ['x'], body: 'return Math.sqrt(x);' };
            case 'log':
                return { args: ['x'], body: 'return Math.log(x);' };
            case 'log10':
                return { args: ['x'], body: 'return Math.log10(x);' };
            case 'log2':
                return { args: ['x'], body: 'return Math.log2(x);' };
            case 'exp':
                return { args: ['x'], body: 'return Math.exp(x);' };
            case 'ceil':
                return { args: ['x'], body: 'return Math.ceil(x);' };
            case 'floor':
                return { args: ['x'], body: 'return Math.floor(x);' };
            case 'round':
                return { args: ['x'], body: 'return Math.round(x);' };
            case 'roundTo':
                return {
                    args: ['x', 'precision'],
                    body: `
                        const factor = Math.pow(10, precision);
                        return Math.round(x * factor) / factor;
                    `};
            case 'pow':
            case 'power':
                return { args: ['x', 'y'], body: 'return Math.pow(x, y);' };
            case 'root':
                return { args: ['x', 'n'], body: 'return Math.pow(x, 1 / n);' };

            case 'deg_to_rad':
                return { args: ['x'], body: 'return x * (Math.PI / 180);' };
            case 'rad_to_deg':
                return { args: ['x'], body: 'return x * (180 / Math.PI);' };
            case 'normalize_deg':
                return { args: ['x'], body: 'return ((x % 360) + 360) % 360;' };
            case 'normalize_rad':
                return {
                    args: ['x'],
                    body: `
                        const twoPi = 2 * Math.PI;
                        return ((x % twoPi) + twoPi) % twoPi;
                    `};

            default:
                throw new TypeCheckError(`Unknown numeric manipulation function: ${name}`);
        }
    }
}
