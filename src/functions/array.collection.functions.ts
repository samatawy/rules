import { ArrayExpression } from "../syntax/array.expression";
import type { TypedParameter } from "../types";
import type { WorkingContext } from "../interfaces";
import type { Expression } from "../syntax/expression";
import { FunctionExpression, StringFunctionExpression } from "../syntax/function.expression";
import { EvaluationError, TypeCheckError } from "../rules/exception";
import { FunctionCompiler } from "../parser/function.compiler";

export class ArrayCollectionFunction extends StringFunctionExpression {

    protected target_arg: Expression;

    protected extra_args: Expression[];

    constructor(name: string, target: Expression, args: Expression[]) {
        super(name, [target, ...args]);
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
            if (isArray && (this.extra_args[-1] as any) === context) {
                // In case context is passed as the last argument
                this.extra_args.pop();
            }

            this.target_arg = isArray ? this.target_arg : new ArrayExpression([this.target_arg, ...this.extra_args]);
            this.extra_args = [];
        }

        const targetValue = this.target_arg.evaluate(context);
        if (!Array.isArray(targetValue)) {
            context.logger().debug('Received argument', targetValue, `for argument ${this.target_arg} in function ${this.name}`);
            throw new EvaluationError(`Target argument for function ${this.name} did not evaluate to an array`);
        }

        if (FunctionCompiler.enabled) {
            const compiled = (globalThis as any)[this.name] as Function;
            if (typeof compiled === 'function') {
                return compiled(targetValue, context);
            }
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
}

export class ArrayCollectionFunctionProvider {

    private static _names = ['concat', 'join'];

    public static names(): string[] {
        return this._names;
    }

    public static create(name: string, args: Expression[]): FunctionExpression | undefined {
        if (!this.names().includes(name)) {
            return undefined;
        }
        if (args.length < 1) {
            throw new TypeCheckError(`Function ${name} expects at least 1 argument, but got ${args.length}`);
        }
        return new ArrayCollectionFunction(name, args[0]!, args.slice(1));
    }

    public static mock(name: string, args: Expression[]): FunctionExpression | undefined {
        if (!this.names().includes(name)) {
            return undefined;
        }
        return new ArrayCollectionFunction(name, args[0]!, args.slice(1));
    }

    public static toJS(name: string): { args: string[], body: string } | undefined {
        switch (name) {
            case 'concat':
                return { args: ['...arr'], body: 'return arr.join("");' };
            case 'join':
                return { args: ['arr', 'separator'], body: 'return arr.join(separator || "");' };
            default:
                throw new TypeCheckError(`Unknown array collection function: ${name}`);
        }
    }
}
