import type { TypedParameter } from "../types";
import type { WorkingContext } from "../interfaces";
import type { DateExpression, Expression } from "../syntax/expression";
import { BooleanFunctionExpression } from "../syntax/function.expression";
import { EvaluationError, TypeCheckError } from "../rules/exception";
import { FunctionCompiler } from "../parser/function.compiler";

export class DateTimeComparisonFunction extends BooleanFunctionExpression {

    protected left_arg: DateExpression;

    protected right_arg: DateExpression;

    constructor(name: string, left: DateExpression, right: DateExpression) {
        super(name, [left, right]);
        this.left_arg = left;
        this.right_arg = right;
    }

    public expectsParameters(): TypedParameter[] {
        switch (this.name) {
            case 'before':
            case 'after':
            case 'sameYear':
            case 'same_year':
            case 'sameMonth':
            case 'same_month':
            case 'sameWeek':
            case 'same_week':
            case 'sameDay':
            case 'same_day':
            case 'sameHour':
            case 'same_hour':
            case 'sameMinute':
            case 'same_minute':
            case 'sameSecond':
            case 'same_second':
            case 'sameInstant':
            case 'same_instant':
                return [{ type: 'date' }, { type: 'date' }];
            default:
                throw new TypeCheckError(`Unknown date/time comparison function: ${this.name}`);
        }
    }

    public evaluate(context: WorkingContext): boolean {
        const cached = context.getCached(this.syntax);
        if (cached !== undefined) return cached;

        const leftValue = this.left_arg.evaluate(context);
        const rightValue = this.right_arg.evaluate(context);

        if (FunctionCompiler.enabled) {
            const compiled = (globalThis as any)[this.name] as Function;
            if (typeof compiled === 'function') {
                return compiled(leftValue, rightValue, context);
            }
        }

        if (!(leftValue instanceof Date) || !(rightValue instanceof Date)) {
            throw new EvaluationError(`Arguments for function ${this.name} did not evaluate to dates`);
        }

        switch (this.name) {
            case 'before':
                return leftValue.getTime() < rightValue.getTime();
            case 'after':
                return leftValue.getTime() > rightValue.getTime();
            case 'sameYear':
            case 'same_year':
                return leftValue.getFullYear() === rightValue.getFullYear();
            case 'sameMonth':
            case 'same_month':
                return leftValue.getFullYear() === rightValue.getFullYear() && leftValue.getMonth() === rightValue.getMonth();
            case 'sameWeek':
            case 'same_week':
                const leftWeekStart = new Date(leftValue);
                leftWeekStart.setDate(leftWeekStart.getDate() - leftWeekStart.getDay());
                leftWeekStart.setHours(0, 0, 0, 0);

                const rightWeekStart = new Date(rightValue);
                rightWeekStart.setDate(rightWeekStart.getDate() - rightWeekStart.getDay());
                rightWeekStart.setHours(0, 0, 0, 0);

                return leftWeekStart.getTime() === rightWeekStart.getTime();
            case 'sameDay':
            case 'same_day':
                return leftValue.getFullYear() === rightValue.getFullYear() && leftValue.getMonth() === rightValue.getMonth() && leftValue.getDate() === rightValue.getDate();
            case 'sameHour':
            case 'same_hour':
                return leftValue.getFullYear() === rightValue.getFullYear() && leftValue.getMonth() === rightValue.getMonth() && leftValue.getDate() === rightValue.getDate() && leftValue.getHours() === rightValue.getHours();
            case 'sameMinute':
            case 'same_minute':
                return leftValue.getFullYear() === rightValue.getFullYear() && leftValue.getMonth() === rightValue.getMonth() && leftValue.getDate() === rightValue.getDate() && leftValue.getHours() === rightValue.getHours() && leftValue.getMinutes() === rightValue.getMinutes();
            case 'sameSecond':
            case 'same_second':
                return leftValue.getFullYear() === rightValue.getFullYear() && leftValue.getMonth() === rightValue.getMonth() && leftValue.getDate() === rightValue.getDate() && leftValue.getHours() === rightValue.getHours() && leftValue.getMinutes() === rightValue.getMinutes() && leftValue.getSeconds() === rightValue.getSeconds();
            case 'sameInstant':
            case 'same_instant':
                return leftValue.getTime() === rightValue.getTime();

            default:
                throw new EvaluationError(`Unknown date/time comparison function: ${this.name}`);
        }
    }
}

export class DateTimeComparisonFunctionProvider {

    private static _names = ['before', 'after',
        'sameYear', 'sameMonth', 'sameWeek', 'sameDay', 'sameHour', 'sameMinute', 'sameSecond', 'sameInstant',
        'same_year', 'same_month', 'same_week', 'same_day', 'same_hour', 'same_minute', 'same_second', 'same_instant'];

    public static names(): string[] {
        return this._names;
    }

    public static create(name: string, args: Expression[]): DateTimeComparisonFunction | undefined {
        if (!this._names.includes(name)) {
            return undefined;
        }
        if (args.length !== 2) {
            throw new TypeCheckError(`Function ${name} expects exactly 2 arguments, but got ${args.length}`);
        }
        return new DateTimeComparisonFunction(name, args[0] as DateExpression, args[1] as DateExpression);
    }

    public static mock(name: string, args: Expression[]): DateTimeComparisonFunction | undefined {
        if (!this._names.includes(name)) {
            return undefined;
        }
        return new DateTimeComparisonFunction(name, args[0] as DateExpression, args[1] as DateExpression);
    }

    public static toJS(name: string): { args: string[], body: string } {
        switch (name) {
            case 'before':
                return { args: ['date1', 'date2'], body: 'return date1.getTime() < date2.getTime();' };
            case 'after':
                return { args: ['date1', 'date2'], body: 'return date1.getTime() > date2.getTime();' };
            case 'sameYear':
            case 'same_year':
                return { args: ['date1', 'date2'], body: 'return date1.getFullYear() === date2.getFullYear();' };
            case 'sameMonth':
            case 'same_month':
                return { args: ['date1', 'date2'], body: 'return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth();' };
            case 'sameWeek':
            case 'same_week':
                return {
                    args: ['date1', 'date2'],
                    body: `
                            const getWeekStart = (date) => {
                                const weekStart = new Date(date);
                                weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                                weekStart.setHours(0, 0, 0, 0);
                                return weekStart;
                            };
                            const date1WeekStart = getWeekStart(date1);
                            const date2WeekStart = getWeekStart(date2);
                            return date1WeekStart.getTime() === date2WeekStart.getTime();
                        `
                };
            case 'sameDay':
            case 'same_day':
                return { args: ['date1', 'date2'], body: 'return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth() && date1.getDate() === date2.getDate();' };
            case 'sameHour':
            case 'same_hour':
                return {
                    args: ['date1', 'date2'],
                    body: 'return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth() && date1.getDate() === date2.getDate() && date1.getHours() === date2.getHours();'
                };
            case 'sameMinute':
            case 'same_minute':
                return {
                    args: ['date1', 'date2'],
                    body: 'const diff = Math.abs(date1.getTime() - date2.getTime()); return diff < 60 * 1000'
                };
            case 'sameSecond':
            case 'same_second':
                return {
                    args: ['date1', 'date2'],
                    body: 'const diff = Math.abs(date1.getTime() - date2.getTime()); return diff < 1000'
                };
            case 'sameInstant':
            case 'same_instant':
                return {
                    args: ['date1', 'date2'],
                    body: 'return date1.getTime() === date2.getTime();'
                };
            default:
                throw new TypeCheckError(`Unknown date/time comparison function: ${name}`);
        }
    }

}
