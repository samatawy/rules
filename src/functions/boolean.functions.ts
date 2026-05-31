import type { TypedParameter } from "../types";
import type { WorkingContext } from "../interfaces";
import type { BooleanExpression } from "../syntax/expression";
import { BooleanFunctionExpression } from "../syntax/function.expression";
import { EvaluationError, TypeCheckError } from "../rules/exception";

export class BooleanFunction extends BooleanFunctionExpression {

    protected target: BooleanExpression;

    constructor(name: string, target: BooleanExpression) {
        super(name, [target]);
        this.target = target;
    }

    public expectsParameters(): TypedParameter[] {
        switch (this.name.toLowerCase()) {
            case 'if':
            case 'is':
                return [{ type: 'any' }];
            case 'not':
                return [{ type: 'any' }];
            default:
                throw new TypeCheckError(`Unknown boolean function: ${this.name}`);
        }
    }

    public evaluate(context: WorkingContext): boolean {
        const targetValue = this.target.evaluate(context);

        switch (this.name.toLowerCase()) {
            case 'if':
            case 'is':
                return !!targetValue;
            case 'not':
                return !targetValue;
            default:
                throw new EvaluationError(`Unknown boolean function: ${this.name}`);
        }
    }
}

export class BooleanFunctionProvider {

    private static _names = ['if', 'is', 'not'];

    public static names(): string[] {
        return this._names;
    }

    public static create(name: string, args: BooleanExpression[]): BooleanFunction | undefined {
        if (!this._names.includes(name.toLowerCase())) {
            return undefined;
        }
        if (args.length !== 1) {
            throw new TypeCheckError(`Function ${name} expects exactly 1 argument, but got ${args.length}`);
        }
        return new BooleanFunction(name, args[0]!);
    }

    public static mock(name: string, args: BooleanExpression[]): BooleanFunction | undefined {
        if (!this._names.includes(name.toLowerCase())) {
            return undefined;
        }
        return new BooleanFunction(name, args[0]!);
    }

    public static toJS(name: string): { args: string[], body: string } {
        switch (name.toLowerCase()) {
            case 'if':
            case 'is':
                return { args: ['value'], body: 'return !!value;' };
            case 'not':
                return { args: ['value'], body: 'return !value;' };
            default:
                throw new TypeCheckError(`Unknown boolean function: ${name}`);
        }
    }
}
