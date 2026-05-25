import type { TypedParameter } from "../../types";
import type { WorkingContext } from "../../interfaces";
import type { DateExpression, Expression } from "../expression";
import { NumericFunctionExpression } from "../function.expression";
import { EvaluationError, TypeCheckError } from "../../rules/exception";

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
}