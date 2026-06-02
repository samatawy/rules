import type { TypedParameter } from "../types";
import type { Expression } from "../syntax/expression";
import type { TypeChecker, ValidationResult, WorkingContext } from "../interfaces";
import { DateFunctionExpression, NumericFunctionExpression } from "../syntax/function.expression";
import { EvaluationError, TypeCheckError } from "../rules/exception";

export class ConstantDates extends DateFunctionExpression {

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
            errors: [`Constant dates do not accept arguments, but got ${this.args.length}`],
        };
    }

    public evaluate(context: WorkingContext): Date {
        switch (this.name) {
            case 'now':
                return new Date();
            case 'today':
                const now = new Date();
                return new Date(now.getFullYear(), now.getMonth(), now.getDate());
            case 'yearStart':
                const currentYear = new Date().getFullYear();
                return new Date(currentYear, 0, 1);
            case 'yearEnd':
                const currentYearEnd = new Date().getFullYear();
                return new Date(currentYearEnd, 11, 31);
            case 'monthStart':
                const nowMonth = new Date();
                return new Date(nowMonth.getFullYear(), nowMonth.getMonth(), 1);
            case 'monthEnd':
                const nowMonthEnd = new Date();
                return new Date(nowMonthEnd.getFullYear(), nowMonthEnd.getMonth() + 1, 0);

            default:
                throw new EvaluationError(`Unknown constant function: ${this.name}`);
        }
    }
}

export class ConstantDatesProvider {

    private static _names = ['now', 'today', 'yearStart', 'yearEnd', 'monthStart', 'monthEnd'];

    public static names(): string[] {
        return this._names;
    }

    public static create(name: string, args: Expression[]): ConstantDates | undefined {
        if (!this._names.includes(name)) {
            return undefined;
        }
        if (args.length !== 0) {
            throw new TypeCheckError(`Function ${name} expects no arguments, but got ${args.length}`);
        }
        return new ConstantDates(name);
    }

    public static mock(name: string, args: Expression[]): ConstantDates | undefined {
        if (!this._names.includes(name)) {
            return undefined;
        }
        return new ConstantDates(name);
    }

    public static toJS(name: string): { args: string[], body: string } {
        switch (name) {
            case 'now':
                return { args: [], body: 'return new Date();' };
            case 'today':
                return {
                    args: [],
                    body: `
                        const now = new Date();
                        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    `
                };
            case 'yearStart':
                return {
                    args: [],
                    body: `
                        const currentYear = new Date().getFullYear();
                        return new Date(currentYear, 0, 1);
                    `
                };
            case 'yearEnd':
                return {
                    args: [],
                    body: `
                        const currentYearEnd = new Date().getFullYear();
                        return new Date(currentYearEnd, 11, 31);
                    `
                };
            case 'monthStart':
                return {
                    args: [],
                    body: `
                        const nowMonth = new Date();
                        return new Date(nowMonth.getFullYear(), nowMonth.getMonth(), 1);
                    `
                };
            case 'monthEnd':
                return {
                    args: [],
                    body: `
                        const nowMonthEnd = new Date();
                        return new Date(nowMonthEnd.getFullYear(), nowMonthEnd.getMonth() + 1, 0);
                    `
                };
            default:
                throw new TypeCheckError(`Unknown constant date function: ${name}`);
        }
    }
}