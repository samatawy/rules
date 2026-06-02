import type { TypedParameter } from "../types";
import type { Expression } from "../syntax/expression";
import type { TypeChecker, ValidationResult, WorkingContext } from "../interfaces";
import { DateFunctionExpression, NumericFunctionExpression } from "../syntax/function.expression";
import { EvaluationError, TypeCheckError } from "../rules/exception";

export class ConstantNumbers extends NumericFunctionExpression {

    constructor(name: string) {
        super(name, []);
    }

    public expectsParameters(): TypedParameter[] {
        return [];
    }

    public checkTypes(checker?: TypeChecker): ValidationResult {
        return (this.args.length === 0) ? {
            valid: true,
        } : {
            valid: false,
            errors: [`Constant numbers do not accept arguments, but got ${this.args.length}`],
        };
    }

    public evaluate(context: WorkingContext): number {
        switch (this.name) {
            case 'pi':
                return Math.PI;
            case 'e':
                return Math.E;
            case 'phi':
                return (1 + Math.sqrt(5)) / 2;
            case 'tau':
                return 2 * Math.PI;

            default:
                throw new EvaluationError(`Unknown constant function: ${this.name}`);
        }
    }
}

export class ConstantNumbersProvider {

    private static _names = ['pi', 'e', 'phi', 'tau'];

    public static names(): string[] {
        return this._names;
    }

    public static create(name: string, args: Expression[]): ConstantNumbers | undefined {
        if (!this._names.includes(name)) {
            return undefined;
        }
        if (args.length !== 0) {
            throw new TypeCheckError(`Function ${name} expects no arguments, but got ${args.length}`);
        }
        return new ConstantNumbers(name);
    }

    public static mock(name: string, args: Expression[]): ConstantNumbers | undefined {
        if (!this._names.includes(name)) {
            return undefined;
        }
        return new ConstantNumbers(name);
    }

    public static toJS(name: string): { args: string[], body: string } {
        switch (name) {
            case 'pi':
                return { args: [], body: 'return Math.PI;' };
            case 'e':
                return { args: [], body: 'return Math.E;' };
            case 'phi':
                return { args: [], body: 'return (1 + Math.sqrt(5)) / 2;' };
            case 'tau':
                return { args: [], body: 'return 2 * Math.PI;' };

            default:
                throw new TypeCheckError(`Unknown constant number function: ${name}`);
        }
    }
}
