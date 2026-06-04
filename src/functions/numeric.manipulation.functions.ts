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
            case 'truncate':
            case 'factorial':
            case 'deg_to_rad':
            case 'rad_to_deg':
            case 'normalize_deg':
            case 'normalize_rad':
                return [{ type: 'number' }];

            case 'roundTo':
            case 'round_to':
            case 'roundToStep':
            case 'round_to_step':

            case 'mod':
            case 'modulo':
            case 'pow':
            case 'power':
            case 'root':
            case 'npr':
            case 'permutation':
            case 'ncr':
            case 'binomial':
            case 'combination':
                return [{ type: 'number' }, { type: 'number' }];
            case 'clamp':
                return [{ type: 'number' }, { type: 'number' }, { type: 'number' }];

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
            case 'truncate':
                return targetValue < 0 ? Math.ceil(targetValue) : Math.floor(targetValue);
            case 'clamp':
                const min = Math.min(evaluatedArgs[0], evaluatedArgs[1]);
                const max = Math.max(evaluatedArgs[0], evaluatedArgs[1]);
                return Math.min(Math.max(targetValue, min), max);

            case 'round':
                return Math.round(targetValue);
            case 'roundTo':
            case 'round_to':
                const factor = Math.pow(10, evaluatedArgs[0]);
                return Math.round(targetValue * factor) / factor;
            case 'roundToStep':
            case 'round_to_step':
                const step = Math.abs(evaluatedArgs[0]);
                return Math.round(targetValue / step) * step;

            case 'mod':
            case 'modulo':
                const divisor = evaluatedArgs[0];
                if (divisor === 0) {
                    throw new EvaluationError(`Divisor for modulo function cannot be zero`);
                }
                return ((targetValue % divisor) + divisor) % divisor;
            case 'pow':
            case 'power':
                return Math.pow(targetValue, evaluatedArgs[0]);
            case 'root':
                return this.root(targetValue, evaluatedArgs[0]);

            case 'factorial':
                return this.factorial(targetValue);
            case 'npr':
            case 'permutation':
                return this.permutation(targetValue, evaluatedArgs[0]);
            case 'ncr':
            case 'binomial':
            case 'combination':
                return this.combination(targetValue, evaluatedArgs[0]);

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

    private factorial(n: number): number {
        if (n < 0 || !Number.isInteger(n)) {
            throw new EvaluationError(`Factorial is only defined for non-negative integers, but got ${n}`);
        }
        let result = 1;
        for (let i = 2; i <= n; i++) {
            result *= i;
        }
        return result;
    }

    private permutation(n: number, r: number): number {
        if (n < 0 || r < 0 || !Number.isInteger(n) || !Number.isInteger(r) || r > n) {
            throw new EvaluationError(`Permutation is only defined for non-negative integers with r <= n, but got n=${n}, r=${r}`);
        }
        let result = 1;
        for (let i = n; i > n - r; i--) {
            result *= i;
        }
        return result;
    }

    private combination(n: number, r: number): number {
        if (n < 0 || r < 0 || !Number.isInteger(n) || !Number.isInteger(r) || r > n) {
            throw new EvaluationError(`Combination is only defined for non-negative integers with r <= n, but got n=${n}, r=${r}`);
        }
        let result = 1;
        for (let i = 1; i <= r; i++) {
            result *= (n - i + 1) / i;
        }
        return Math.round(result);
    }

    private root(value: number, degree: number): number {
        if (degree === 0) {
            throw new EvaluationError(`Cannot take zeroth root`);
        }
        if (value < 0 && Number.isInteger(degree) && Math.abs(degree % 2) === 1) {
            return -Math.pow(-value, 1 / degree);
        }
        return Math.pow(value, 1 / degree);
    }
}

export class NumericManipulationFunctionProvider {

    private static _names = ['neg', 'negative', 'ceil', 'floor', 'truncate', 'clamp',
        'round', 'roundTo', 'round_to', 'roundToStep', 'round_to_step',
        'mod', 'modulo', 'pow', 'power', 'root', 'abs', 'sign', 'sqrt', 'log', 'log10', 'log2', 'exp',
        'factorial', 'permutation', 'combination', 'npr', 'ncr', 'binomial',
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
            case 'truncate':
                return { args: ['x'], body: 'return x < 0 ? Math.ceil(x) : Math.floor(x);' };
            case 'clamp':
                return {
                    args: ['x', 'min', 'max'],
                    body: `
                        const lowest = Math.min(min, max);
                        const highest = Math.max(min, max);
                        return Math.min(Math.max(x, lowest), highest);
                    `
                };
            case 'round':
                return { args: ['x'], body: 'return Math.round(x);' };
            case 'roundTo':
            case 'round_to':
                return {
                    args: ['x', 'precision'],
                    body: `
                        const factor = Math.pow(10, precision);
                        return Math.round(x * factor) / factor;
                    `};
            case 'roundToStep':
            case 'round_to_step':
                return {
                    args: ['x', 'step'],
                    body: `
                        step = Math.abs(step);
                        return Math.round(x / step) * step;
                    `
                };

            case 'mod':
            case 'modulo':
                return {
                    args: ['x', 'divisor'],
                    body: `
                        if (divisor === 0) {
                            throw new Error('Divisor for modulo function cannot be zero');
                        }
                        return ((x % divisor) + divisor) % divisor;
                    `
                };
            case 'pow':
            case 'power':
                return { args: ['x', 'y'], body: 'return Math.pow(x, y);' };
            case 'root':
                return {
                    args: ['x', 'n'],
                    body: `
                        if (n === 0) {
                            throw new Error('Cannot take zeroth root');
                        }
                        if (x < 0 && Number.isInteger(n) && Math.abs(n % 2) === 1) {
                            return -Math.pow(-x, 1 / n);
                        }
                        return Math.pow(x, 1 / n);
                    `
                };

            case 'factorial':
                return {
                    args: ['n'],
                    body: `
                        if (n < 0 || !Number.isInteger(n)) {
                            throw new Error('Factorial is only defined for non-negative integers, but got ' + n);
                        }
                        let result = 1;
                        for (let i = 2; i <= n; i++) {
                            result *= i;
                        }
                        return result;
                    `
                };
            case 'npr':
            case 'permutation':
                return {
                    args: ['n', 'r'],
                    body: `
                        if (n < 0 || r < 0 || !Number.isInteger(n) || !Number.isInteger(r) || r > n) {
                            throw new Error('Permutation is only defined for non-negative integers with r <= n, but got n=' + n + ', r=' + r);
                        }
                        let result = 1;
                        for (let i = n; i > n - r; i--) {
                            result *= i;
                        }
                        return result;
                    `
                };
            case 'ncr':
            case 'binomial':
            case 'combination':
                return {
                    args: ['n', 'r'],
                    body: `
                        if (n < 0 || r < 0 || !Number.isInteger(n) || !Number.isInteger(r) || r > n) {
                            throw new Error('Combination is only defined for non-negative integers with r <= n, but got n=' + n + ', r=' + r);
                        }
                        let result = 1;
                        for (let i = 1; i <= r; i++) {
                            result *= (n - i + 1) / i;
                        }
                        return Math.round(result);
                    `
                };

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
