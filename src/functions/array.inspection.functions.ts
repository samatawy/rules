import { ArrayExpression } from "../syntax/array.expression";
import type { TypedParameter } from "../types";
import type { WorkingContext } from "../interfaces";
import type { Expression } from "../syntax/expression";
import { FunctionExpression, NumericFunctionExpression } from "../syntax/function.expression";
import { EvaluationError, TypeCheckError } from "../rules/exception";
import { FunctionCompiler } from "../parser/function.compiler";

export class ArrayInspectionFunction extends NumericFunctionExpression {

    protected target_arg: Expression;

    protected extra_args: Expression[];

    constructor(name: string, target: Expression, args: Expression[]) {
        super(name, [target, ...args]);
        this.target_arg = target;
        this.extra_args = args;
    }

    public expectsParameters(): TypedParameter[] {
        switch (this.name) {
            case 'count':
                return [{ type: 'array' }];
            case 'sum':
            case 'total':
            case 'avg':
            case 'average':
            case 'mean':
            case 'median':
            case 'min':
            case 'max':
            case 'range':
                return [{ type: 'number[]' }];
            default:
                throw new TypeCheckError(`Unknown array inspection function: ${this.name}`);
        }
    }

    public expectsParameterArray(): boolean {
        return ['sum', 'total', 'avg', 'average', 'mean', 'median', 'min', 'max', 'range'].includes(this.name);
    }

    public evaluate(context: WorkingContext): number {
        const cached = context.getCached(this.syntax);
        if (cached !== undefined) return cached;

        // If this function expects a parameter array, we need to convert the target argument and extra arguments 
        // into a single array argument for processing, unless the target is already an array.
        if (this.expectsParameterArray()) {
            const firstArg = this.target_arg.evaluate(context);
            const isArray = this.target_arg instanceof ArrayExpression || Array.isArray(firstArg);
            if (isArray && (this.extra_args[-1] as any) === context) {
                // In case context is passed as the last argument
                this.extra_args.pop();
            }

            this.target_arg = isArray ? this.target_arg : new ArrayExpression([this.target_arg, ...this.extra_args]);
            this.extra_args = [];
        }

        const targetValue = this.target_arg.evaluate(context);
        if (!Array.isArray(targetValue)) {
            context.logger().warn('Received argument', targetValue, `for argument ${this.target_arg} in function ${this.name}`);
            throw new EvaluationError(`Target argument for function ${this.name} did not evaluate to an array`);
        }

        if (FunctionCompiler.enabled) {
            const compiled = (globalThis as any)[this.name] as Function;
            if (typeof compiled === 'function') {
                return compiled(targetValue, context);
            }
        }

        switch (this.name) {
            case 'count':
                return targetValue.length;
            case 'sum':
            case 'total':
                return targetValue.reduce((acc, val) => acc + val, 0);
            case 'avg':
            case 'average':
            case 'mean':
                return targetValue.reduce((acc, val) => acc + val, 0) / targetValue.length;
            case 'median':
                if (targetValue.length === 0) return 0;
                const sorted = [...targetValue].sort((a, b) => a - b);
                const mid = Math.floor(sorted.length / 2);
                if (sorted.length % 2 === 0) {
                    return (sorted[mid - 1] + sorted[mid]) / 2;
                } else {
                    return sorted[mid];
                }

            case 'min':
                return Math.min(...targetValue);
            case 'max':
                return Math.max(...targetValue);
            case 'range':
                return Math.max(...targetValue) - Math.min(...targetValue);

            default:
                throw new EvaluationError(`Unknown array inspection function: ${this.name}`);
        }
    }
}

export class ArrayInspectionFunctionProvider {

    private static _names = ['count', 'sum', 'total', 'avg', 'average', 'mean', 'median', 'min', 'max', 'range'];

    public static names(): string[] {
        return this._names;
    }

    public static create(name: string, args: Expression[]): FunctionExpression | undefined {
        if (!this._names.includes(name)) {
            return undefined;
        }
        if (args.length < 1) {
            throw new TypeCheckError(`Function ${name} expects at least 1 argument`);
        }
        return new ArrayInspectionFunction(name, args[0]!, args.slice(1));
    }

    public static mock(name: string, args: Expression[]): FunctionExpression | undefined {
        if (!this._names.includes(name)) {
            return undefined;
        }
        return new ArrayInspectionFunction(name, args[0]!, args.slice(1));
    }

    public static toJS(name: string): { args: string[], body: string } | undefined {
        switch (name) {
            case 'count':
                return { args: ['...arr'], body: 'return arr.length;' };
            case 'sum':
            case 'total':
                return { args: ['...arr'], body: 'return arr.reduce((acc, val) => acc + val, 0);' };
            case 'avg':
            case 'average':
            case 'mean':
                return { args: ['...arr'], body: 'return arr.reduce((acc, val) => acc + val, 0) / arr.length;' };
            case 'median':
                return {
                    args: ['...arr'],
                    body: `
                        if (arr.length === 0) return 0;
                        const sorted = [...arr].sort((a, b) => a - b);
                        const mid = Math.floor(sorted.length / 2);
                        if (sorted.length % 2 === 0) {
                            return (sorted[mid - 1] + sorted[mid]) / 2;
                        } else {
                            return sorted[mid];
                        }`};

            case 'min':
                return { args: ['...arr'], body: 'return Math.min(...arr);' };
            case 'max':
                return { args: ['...arr'], body: 'return Math.max(...arr);' };
            case 'range':
                return { args: ['...arr'], body: 'return Math.max(...arr) - Math.min(...arr);' };

            default:
                throw new EvaluationError(`Unknown array inspection function: ${this.name}`);
        }
    }
}
