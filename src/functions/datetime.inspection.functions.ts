import type { TypedParameter } from "../types";
import type { WorkingContext } from "../interfaces";
import type { DateExpression, Expression } from "../syntax/expression";
import { NumericFunctionExpression } from "../syntax/function.expression";
import { EvaluationError, TypeCheckError } from "../rules/exception";
import { FunctionCompiler } from "../parser/function.compiler";

export class DateTimeInspectionFunction extends NumericFunctionExpression {

    protected target_arg: DateExpression;

    protected extra_args: Expression[];

    constructor(name: string, target: DateExpression, args: Expression[]) {
        super(name, [target, ...args]);
        this.target_arg = target;
        this.extra_args = args;
    }

    public expectsParameters(): TypedParameter[] {
        switch (this.name) {
            case 'year':
            case 'month':
            case 'week':
            case 'day':
            case 'weekday':
            case 'hour':
            case 'minute':
            case 'second':
            case 'instant':
            case 'timestamp':
                return [{ type: 'date' }];
            default:
                throw new TypeCheckError(`Unknown date/time inspection function: ${this.name}`);
        }
    }

    public evaluate(context: WorkingContext): number {
        const cached = context.getCached(this.syntax);
        if (cached !== undefined) return cached;

        const targetValue = this.target_arg.evaluate(context);
        if (!(targetValue instanceof Date)) {
            throw new EvaluationError(`Target argument for function ${this.name} did not evaluate to a date`);
        }

        if (FunctionCompiler.enabled) {
            const compiled = (globalThis as any)[this.name] as Function;
            if (typeof compiled === 'function') {
                return compiled(targetValue, context);
            }
        }

        switch (this.name) {
            case 'year':
                return targetValue.getFullYear();
            case 'month':
                return targetValue.getMonth() + 1; // Months are zero-indexed in JavaScript
            case 'week':
                const firstDayOfYear = new Date(targetValue.getFullYear(), 0, 1);
                const pastDaysOfYear = (targetValue.getTime() - firstDayOfYear.getTime()) / (24 * 60 * 60 * 1000);
                return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
            case 'day':
                return targetValue.getDate();
            case 'weekday':
                return targetValue.getDay() === 0 ? 7 : targetValue.getDay(); // Convert Sunday from 0 to 7
            case 'hour':
                return targetValue.getHours();
            case 'minute':
                return targetValue.getMinutes();
            case 'second':
                return targetValue.getSeconds();
            case 'instant':
            case 'timestamp':
                return targetValue.getTime();
            default:
                throw new EvaluationError(`Unknown date/time inspection function: ${this.name}`);
        }
    }
}

export class DateTimeInspectionFunctionProvider {

    private static _names = ['year', 'month', 'week', 'day', 'weekday', 'hour', 'minute', 'second', 'instant', 'timestamp'];

    public static names(): string[] {
        return this._names;
    }

    public static create(name: string, args: Expression[]): DateTimeInspectionFunction | undefined {
        if (!this._names.includes(name)) {
            return undefined;
        }
        if (args.length < 1) {
            throw new TypeCheckError(`Function ${name} expects at least 1 argument, but got ${args.length}`);
        }
        return new DateTimeInspectionFunction(name, args[0] as DateExpression, args.slice(1));
    }

    public static mock(name: string, args: Expression[]): DateTimeInspectionFunction | undefined {
        if (!this._names.includes(name)) {
            return undefined;
        }
        return new DateTimeInspectionFunction(name, args[0] as DateExpression, args.slice(1));
    }

    public static toJS(name: string): { args: string[], body: string } {
        switch (name) {
            case 'year':
                return { args: ['date'], body: 'return date.getFullYear();' };
            case 'month':
                return { args: ['date'], body: 'return date.getMonth() + 1;' };
            case 'week':
                return {
                    args: ['date'],
                    body: `
                        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
                        const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / (24 * 60 * 60 * 1000);
                        return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
                    `
                };
            case 'day':
                return { args: ['date'], body: 'return date.getDate();' };
            case 'weekday':
                return { args: ['date'], body: 'return date.getDay() === 0 ? 7 : date.getDay();' };
            case 'hour':
                return { args: ['date'], body: 'return date.getHours();' };
            case 'minute':
                return { args: ['date'], body: 'return date.getMinutes();' };
            case 'second':
                return { args: ['date'], body: 'return date.getSeconds();' };
            case 'instant':
            case 'timestamp':
                return { args: ['date'], body: 'return date.getTime();' };
            default:
                throw new TypeCheckError(`Unknown date/time inspection function: ${name}`);
        }
    }
}