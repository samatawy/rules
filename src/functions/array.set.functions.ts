import type { ArrayType, AtomicType, ObjectArrayType, ObjectType, TypedParameter } from "../types";
import type { WorkingContext } from "../interfaces";
import type { Expression } from "../syntax/expression";
import { FunctionExpression } from "../syntax/function.expression";
import { EvaluationError, TypeCheckError } from "../rules/exception";
import { FunctionCompiler } from "../parser/function.compiler";

export class ArraySetFunction extends FunctionExpression {

    protected target_arg: Expression;

    protected extra_args: Expression[];

    constructor(name: string, target: Expression, args: Expression[]) {
        super(name, [target, ...args]);
        this.target_arg = target;
        this.extra_args = args;
    }

    public expectsParameters(): TypedParameter[] {
        switch (this.name) {
            case 'union':
            case 'intersect':
            case 'intersection':
            case 'difference':
            case 'symmetricDifference':
                return [{ type: 'array' }, { type: 'string' }];
            default:
                throw new TypeCheckError(`Unknown array set function: ${this.name}`);
        }
    }

    public returnsType(): AtomicType | ArrayType | ObjectType | ObjectArrayType {
        return 'array';
    }

    public evaluate(context: WorkingContext): any[] {
        const cached = context.getCached(this.syntax);
        if (cached !== undefined) return cached;

        const targetValue = this.target_arg.evaluate(context);
        if (!Array.isArray(targetValue)) {
            context.logger().warn('Received argument', targetValue, `for argument ${this.target_arg} in function ${this.name}`);
            throw new EvaluationError(`Target argument for function ${this.name} did not evaluate to an array`);
        }
        const secondArray = this.extra_args[0]!.evaluate(context);
        if (!Array.isArray(secondArray)) {
            context.logger().warn('Received argument', secondArray, `for argument ${this.extra_args[0]} in function ${this.name}`);
            throw new EvaluationError(`Second argument for function ${this.name} did not evaluate to an array`);
        }

        if (FunctionCompiler.enabled) {
            const compiled = (globalThis as any)[this.name] as Function;
            if (typeof compiled === 'function') {
                return compiled(targetValue, context);
            }
        }

        switch (this.name) {
            case 'union':
                const combined = new Set();
                for (const item of targetValue) {
                    combined.add(item);
                }
                for (const item of secondArray) {
                    combined.add(item);
                }
                return Array.from(combined);

            case 'intersect':
            case 'intersection':
                return targetValue.filter((item: any) => secondArray.includes(item));

            case 'difference':
                return targetValue.filter((item: any) => !secondArray.includes(item));

            case 'symmetricDifference':
                const leftOnly = targetValue.filter((item: any) => !secondArray.includes(item));
                const rightOnly = secondArray.filter((item: any) => !targetValue.includes(item));
                const result = new Array<any>(leftOnly.length + rightOnly.length);
                for (const item of leftOnly) {
                    result.push(item);
                }
                for (const item of rightOnly) {
                    result.push(item);
                }
                return result;

            default:
                throw new EvaluationError(`Unknown array set function: ${this.name}`);
        }
    }
}

export class ArraySetFunctionProvider {

    private static _names = ['union', 'intersect', 'intersection', 'difference', 'symmetricDifference'];

    public static names(): string[] {
        return this._names;
    }

    public static create(name: string, args: Expression[]): FunctionExpression | undefined {
        if (!this.names().includes(name)) {
            return undefined;
        }
        if (args.length !== 2) {
            throw new TypeCheckError(`Function ${name} expects 2 arguments, but got ${args.length}`);
        }
        return new ArraySetFunction(name, args[0]!, args.slice(1));
    }

    public static mock(name: string, args: Expression[]): FunctionExpression | undefined {
        if (!this.names().includes(name)) {
            return undefined;
        }
        return new ArraySetFunction(name, args[0]!, args.slice(1));
    }

    public static toJS(name: string): { args: string[], body: string } | undefined {
        switch (name) {
            case 'union':
                return {
                    args: ['arr1', 'arr2'],
                    body: 'const combined = new Set(); arr1.forEach(item => combined.add(item)); arr2.forEach(item => combined.add(item)); return Array.from(combined);'
                };
            case 'intersect':
            case 'intersection':
                return {
                    args: ['arr1', 'arr2'],
                    body: 'return arr1.filter(item => arr2.includes(item));'
                };
            case 'difference':
                return {
                    args: ['arr1', 'arr2'],
                    body: 'return arr1.filter(item => !arr2.includes(item));'
                };
            case 'symmetricDifference':
                return {
                    args: ['arr1', 'arr2'],
                    body: 'const allValues = [arr1, arr2]; const flatValues = allValues.flat(); return flatValues.filter(item => flatValues.filter(i => i === item).length === 1);'
                };

            default:
                throw new TypeCheckError(`Unknown array set function: ${name}`);
        }
    }
}
