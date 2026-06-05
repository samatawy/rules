import type { TypedParameter } from "../types";
import type { WorkingContext } from "../interfaces";
import type { Expression } from "../syntax/expression";
import { BooleanFunctionExpression, FunctionExpression } from "../syntax/function.expression";
import { EvaluationError, TypeCheckError } from "../rules/exception";

export class ArrayComparisonFunction extends BooleanFunctionExpression {

    protected target_arg: Expression;

    protected extra_args: Expression[];

    constructor(name: string, target: Expression, args: Expression[]) {
        super(name, [target, ...args]);
        this.target_arg = target;
        this.extra_args = args;
    }

    public expectsParameters(): TypedParameter[] {
        switch (this.name) {
            case 'sameArray':
            case 'same_array':
            case 'sameSet':
            case 'same_set':
            case 'subsetOf':
            case 'subset_of':
            case 'subArrayOf':
            case 'sub_array_of':
            case 'supersetOf':
            case 'superset_of':
            case 'superArrayOf':
            case 'super_array_of':
            case 'containsAll':
            case 'contains_all':
            case 'overlapsWith':
            case 'overlaps_with':
            case 'disjointFrom':
            case 'disjoint_from':
                return [{ type: 'array' }, { type: 'array' }];
            default:
                throw new TypeCheckError(`Unknown array comparison function: ${this.name}`);
        }
    }

    public evaluate(context: WorkingContext): boolean {
        const cached = context.getCached(this.syntax);
        if (cached !== undefined) return cached;

        if (this.extra_args.length !== 1) {
            const message = `Function ${this.name} expects exactly 2 arguments, but received ${1 + this.extra_args.length}`;
            context.logger().warn(message);
            throw new EvaluationError(message);
        }

        const targetValue = this.target_arg.evaluate(context);
        if (!Array.isArray(targetValue)) {
            context.logger().warn('Received argument', targetValue, `for argument ${this.target_arg} in function ${this.name}`);
            throw new EvaluationError(`Target argument for function ${this.name} did not evaluate to an array`);
        }
        const compareTo = this.extra_args[0]!.evaluate(context);
        if (!Array.isArray(compareTo)) {
            context.logger().warn('Received argument', compareTo, `for argument ${this.extra_args[0]} in function ${this.name}`);
            throw new EvaluationError(`Second argument for function ${this.name} did not evaluate to an array`);
        }

        switch (this.name) {
            // All elements exist in the same order and are strictly equal (===) between the two arrays.
            case 'sameArray':
                if (targetValue.length !== compareTo.length) return false;
                return targetValue.every((val, idx) => val === compareTo[idx]);

            // All elements in both arrays are the same, regardless of order or duplicates (i.e., they contain the same unique values).
            case 'sameSet':
                return targetValue.every(val => compareTo.includes(val))
                    && compareTo.every(val => targetValue.includes(val));

            // All elements in the target array appear in the compareTo array, regardless of order or duplicates (i.e., the target is a subset of the compareTo set).
            case 'subsetOf':
                return targetValue.every(val => compareTo.includes(val));

            // All elements appear adjacent and in order within compareTo, but not necessarily exclusively (i.e., they could be part of a larger array within compareTo)
            case 'subArrayOf':
                if (targetValue.length > compareTo.length) return false;
                for (let i = 0; i <= compareTo.length - targetValue.length; i++) {
                    if (targetValue.every((val, idx) => val === compareTo[i + idx]!)) {
                        return true;
                    }
                }
                return false;

            case 'supersetOf':
                return compareTo.every(val => targetValue.includes(val));

            case 'superArrayOf':
                if (compareTo.length > targetValue.length) return false;
                for (let i = 0; i <= targetValue.length - compareTo.length; i++) {
                    if (compareTo.every((val, idx) => val === targetValue[i + idx]!)) {
                        return true;
                    }
                }
                return false;

            case 'overlapsWith':
                return targetValue.some(val => compareTo.includes(val));

            case 'disjointFrom':
                return !targetValue.some(val => compareTo.includes(val));

            default:
                throw new EvaluationError(`Unknown array comparison function: ${this.name}`);
        }
    }
}

export class ArrayComparisonFunctionProvider {

    private static _names = ['sameArray', 'sameSet', 'subsetOf', 'subArrayOf', 'supersetOf', 'superArrayOf', 'overlapsWith', 'disjointFrom',
        'same_array', 'same_set', 'subset_of', 'sub_array_of', 'superset_of', 'super_array_of', 'overlaps_with', 'disjoint_from'];

    public static names(): string[] {
        return this._names;
    }

    public static create(name: string, args: Expression[]): FunctionExpression | undefined {
        if (!this._names.includes(name)) {
            return undefined;
        }
        if (args.length != 2) {
            throw new TypeCheckError(`Function ${name} expects exactly 2 arguments`);
        }
        return new ArrayComparisonFunction(name, args[0]!, args.slice(1));
    }

    public static mock(name: string, args: Expression[]): FunctionExpression | undefined {
        if (!this._names.includes(name)) {
            return undefined;
        }
        return new ArrayComparisonFunction(name, args[0]!, args.slice(1));
    }

    public static toJS(name: string): { args: string[], body: string } {
        // TODO: Implement if necessary
        // return { args: [], body: '' }

        switch (name) {
            case 'sameArray':
            case 'same_array':
                return {
                    args: ['arr1', 'arr2'],
                    body: `
                        if (arr1.length !== arr2.length) return false;
                        return arr1.every((val, idx) => val === arr2[idx]);
                    `
                };
            case 'sameSet':
            case 'same_set':
                return {
                    args: ['arr1', 'arr2'],
                    body: `
                        return arr1.every(val => arr2.includes(val))
                            && arr2.every(val => arr1.includes(val));
                    `
                };
            case 'subsetOf':
            case 'subset_of':
                return {
                    args: ['subset', 'superset'],
                    body: `
                        return subset.every(val => superset.includes(val));
                    `
                };
            case 'subArrayOf':
            case 'sub_array_of':
                return {
                    args: ['subArr', 'mainArr'],
                    body: `
                        if (subArr.length > mainArr.length) return false;
                        for (let i = 0; i <= mainArr.length - subArr.length; i++) {
                            if (subArr.every((val, idx) => val === mainArr[i + idx])) {
                                return true;
                            }
                        }
                        return false;
                    `
                };
            case 'supersetOf':
            case 'superset_of':
                return {
                    args: ['superset', 'subset'],
                    body: `
                        return subset.every(val => superset.includes(val));
                    `
                };
            case 'superArrayOf':
            case 'super_array_of':
                return {
                    args: ['mainArr', 'subArr'],
                    body: `
                        if (subArr.length > mainArr.length) return false;
                        for (let i = 0; i <= mainArr.length - subArr.length; i++) {
                            if (subArr.every((val, idx) => val === mainArr[i + idx])) {
                                return true;
                            }
                        }
                        return false;
                    `
                };
            case 'overlapsWith':
            case 'overlaps_with':
                return {
                    args: ['arr1', 'arr2'],
                    body: `
                        return arr1.some(val => arr2.includes(val));
                    `
                };
            case 'disjointFrom':
            case 'disjoint_from':
                return {
                    args: ['arr1', 'arr2'],
                    body: `
                        return !arr1.some(val => arr2.includes(val));
                    `
                };
            default:
                throw new Error(`Unknown array comparison function: ${name}`);
        }
    }
}
