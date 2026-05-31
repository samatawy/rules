import type { TypedParameter } from "../types";
import type { WorkingContext } from "../interfaces";
import type { Expression, NumericExpression } from "../syntax/expression";
import { NumericFunctionExpression } from "../syntax/function.expression";
import { EvaluationError, TypeCheckError } from "../rules/exception";
import { FunctionCompiler } from "../parser/function.compiler";

export class TrigonomicFunction extends NumericFunctionExpression {

    protected target_arg: NumericExpression;

    protected extra_args: Expression[];

    constructor(name: string, target: NumericExpression, args: Expression[]) {
        super(name, [target, ...args]);
        this.target_arg = target;
        this.extra_args = args;
    }

    public expectsParameters(): TypedParameter[] {
        switch (this.name) {
            case 'sin':
            case 'cos':
            case 'tan':
            case 'asin':
            case 'acos':
            case 'atan':
                return [{ type: 'number' }];
            case 'atan2':
                return [{ type: 'number' }, { type: 'number' }];
            default:
                throw new TypeCheckError(`Unknown trigonometric function: ${this.name}`);
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
            case 'sin':
                return Math.sin(targetValue);
            case 'cos':
                return Math.cos(targetValue);
            case 'tan':
                return Math.tan(targetValue);
            case 'asin':
                return Math.asin(targetValue);
            case 'acos':
                return Math.acos(targetValue);
            case 'atan':
                return Math.atan(targetValue);
            case 'atan2':
                return Math.atan2(targetValue, evaluatedArgs[0]);
            default:
                throw new EvaluationError(`Unknown trigonometric function: ${this.name}`);
        }
    }
}

export class TrigonometricFunctionProvider {

    private static _names = ['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2'];

    public static names(): string[] {
        return this._names;
    }

    public static create(name: string, args: Expression[]): TrigonomicFunction | undefined {
        if (!this._names.includes(name)) {
            return undefined;
        }
        if (name === 'atan2' && args.length !== 2) {
            throw new TypeCheckError(`Function ${name} expects exactly 2 arguments, but got ${args.length}`);
        } else if (name !== 'atan2' && args.length !== 1) {
            throw new TypeCheckError(`Function ${name} expects exactly 1 argument, but got ${args.length}`);
        }
        return new TrigonomicFunction(name, args[0] as NumericExpression, args.slice(1));
    }

    public static mock(name: string, args: Expression[]): TrigonomicFunction | undefined {
        if (!this._names.includes(name)) {
            return undefined;
        }
        return new TrigonomicFunction(name, args[0] as NumericExpression, args.slice(1));
    }

    public static toJS(name: string): { args: string[], body: string } {
        switch (name) {
            case 'sin':
            case 'cos':
            case 'tan':
            case 'asin':
            case 'acos':
            case 'atan':
                return { args: ['x'], body: `return Math.${name}(x);` };
            case 'atan2':
                return { args: ['y', 'x'], body: `return Math.atan2(y, x);` };
            default:
                throw new TypeCheckError(`Unknown trigonometric function: ${name}`);
        }
    }
}