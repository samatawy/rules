import type { TypedParameter } from "../types";
import type { WorkingContext } from "../interfaces";
import type { DateExpression, Expression } from "../syntax/expression";
import { DateFunctionExpression } from "../syntax/function.expression";
import { EvaluationError, TypeCheckError } from "../rules/exception";
import { FunctionCompiler } from "../parser/function.compiler";

export class DateTimeManipulationFunction extends DateFunctionExpression {

    protected target_arg: DateExpression;

    protected extra_args: Expression[];

    constructor(name: string, target: DateExpression, args: Expression[]) {
        super(name, [target, ...args]);
        this.target_arg = target;
        this.extra_args = args;
    }

    public expectsParameters(): TypedParameter[] {
        switch (this.name) {
            case 'addYears':
            case 'add_years':
            case 'addMonths':
            case 'add_months':
            case 'addWeeks':
            case 'add_weeks':
            case 'addDays':
            case 'add_days':
            case 'addHours':
            case 'add_hours':
            case 'addMinutes':
            case 'add_minutes':
            case 'addSeconds':
            case 'add_seconds':
            case 'subtractYears':
            case 'subtract_years':
            case 'subtractMonths':
            case 'subtract_months':
            case 'subtractWeeks':
            case 'subtract_weeks':
            case 'subtractDays':
            case 'subtract_days':
            case 'subtractHours':
            case 'subtract_hours':
            case 'subtractMinutes':
            case 'subtract_minutes':
            case 'subtractSeconds':
            case 'subtract_seconds':
                return [{ type: 'date' }, { type: 'number' }];
            default:
                throw new TypeCheckError(`Unknown date/time manipulation function: ${this.name}`);
        }
    }

    public evaluate(context: WorkingContext): Date {
        const cached = context.getCached(this.syntax);
        if (cached !== undefined) return cached;

        const evaluatedArgs = this.extra_args.map(arg => arg.evaluate(context));

        const targetValue = this.target_arg.evaluate(context);
        if (!(targetValue instanceof Date)) {
            throw new EvaluationError(`Target argument for function ${this.name} did not evaluate to a Date`);
        }

        if (FunctionCompiler.enabled) {
            const compiled = (globalThis as any)[this.name] as Function;
            if (typeof compiled === 'function') {
                return compiled(targetValue, ...evaluatedArgs, context);
            }
        }

        switch (this.name) {
            case 'addYears':
            case 'add_years':
                return new Date(targetValue.getFullYear() + evaluatedArgs[0], targetValue.getMonth(), targetValue.getDate(), targetValue.getHours(), targetValue.getMinutes(), targetValue.getSeconds(), targetValue.getMilliseconds());
            case 'addMonths':
            case 'add_months':
                return new Date(targetValue.getFullYear(), targetValue.getMonth() + evaluatedArgs[0], targetValue.getDate(), targetValue.getHours(), targetValue.getMinutes(), targetValue.getSeconds(), targetValue.getMilliseconds());
            case 'addWeeks':
            case 'add_weeks':
                return new Date(targetValue.getTime() + evaluatedArgs[0] * 7 * 24 * 60 * 60 * 1000);
            case 'addDays':
            case 'add_days':
                return new Date(targetValue.getTime() + evaluatedArgs[0] * 24 * 60 * 60 * 1000);
            case 'addHours':
            case 'add_hours':
                return new Date(targetValue.getTime() + evaluatedArgs[0] * 60 * 60 * 1000);
            case 'addMinutes':
            case 'add_minutes':
                return new Date(targetValue.getTime() + evaluatedArgs[0] * 60 * 1000);
            case 'addSeconds':
            case 'add_seconds':
                return new Date(targetValue.getTime() + evaluatedArgs[0] * 1000);

            case 'subtractYears':
            case 'subtract_years':
                return new Date(targetValue.getFullYear() - evaluatedArgs[0], targetValue.getMonth(), targetValue.getDate(), targetValue.getHours(), targetValue.getMinutes(), targetValue.getSeconds(), targetValue.getMilliseconds());
            case 'subtractMonths':
            case 'subtract_months':
                return new Date(targetValue.getFullYear(), targetValue.getMonth() - evaluatedArgs[0], targetValue.getDate(), targetValue.getHours(), targetValue.getMinutes(), targetValue.getSeconds(), targetValue.getMilliseconds());
            case 'subtractWeeks':
            case 'subtract_weeks':
                return new Date(targetValue.getTime() - evaluatedArgs[0] * 7 * 24 * 60 * 60 * 1000);
            case 'subtractDays':
            case 'subtract_days':
                return new Date(targetValue.getTime() - evaluatedArgs[0] * 24 * 60 * 60 * 1000);
            case 'subtractHours':
            case 'subtract_hours':
                return new Date(targetValue.getTime() - evaluatedArgs[0] * 60 * 60 * 1000);
            case 'subtractMinutes':
            case 'subtract_minutes':
                return new Date(targetValue.getTime() - evaluatedArgs[0] * 60 * 1000);
            case 'subtractSeconds':
            case 'subtract_seconds':
                return new Date(targetValue.getTime() - evaluatedArgs[0] * 1000);
            default:
                throw new EvaluationError(`Unknown date/time manipulation function: ${this.name}`);
        }
    }
}

export class DateTimeManipulationFunctionProvider {

    private static _names = ['addYears', 'addMonths', 'addWeeks', 'addDays', 'addHours', 'addMinutes', 'addSeconds',
        'subtractYears', 'subtractMonths', 'subtractWeeks', 'subtractDays', 'subtractHours', 'subtractMinutes', 'subtractSeconds',
        'add_years', 'add_months', 'add_weeks', 'add_days', 'add_hours', 'add_minutes', 'add_seconds',
        'subtract_years', 'subtract_months', 'subtract_weeks', 'subtract_days', 'subtract_hours', 'subtract_minutes', 'subtract_seconds',
    ];

    public static names(): string[] {
        return this._names;
    }

    public static create(name: string, args: Expression[]): DateTimeManipulationFunction | undefined {
        if (!this._names.includes(name)) {
            return undefined;
        }
        if (args.length < 1) {
            throw new TypeCheckError(`Function ${name} expects at least 1 argument, but got ${args.length}`);
        }
        return new DateTimeManipulationFunction(name, args[0] as DateExpression, args.slice(1));
    }

    public static mock(name: string, args: Expression[]): DateTimeManipulationFunction | undefined {
        if (!this._names.includes(name)) {
            return undefined;
        }
        return new DateTimeManipulationFunction(name, args[0] as DateExpression, args.slice(1));
    }

    public static toJS(name: string): { args: string[], body: string } {
        switch (name) {
            case 'addYears':
            case 'add_years':
                return { args: ['date', 'n'], body: 'return new Date(date.getFullYear() + n, date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());' };
            case 'addMonths':
            case 'add_months':
                return { args: ['date', 'n'], body: 'return new Date(date.getFullYear(), date.getMonth() + n, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());' };
            case 'addWeeks':
            case 'add_weeks':
                return { args: ['date', 'n'], body: 'return new Date(date.getTime() + n * 7 * 24 * 60 * 60 * 1000);' };
            case 'addDays':
            case 'add_days':
                return { args: ['date', 'n'], body: 'return new Date(date.getTime() + n * 24 * 60 * 60 * 1000);' };
            case 'addHours':
            case 'add_hours':
                return { args: ['date', 'n'], body: 'return new Date(date.getTime() + n * 60 * 60 * 1000);' };
            case 'addMinutes':
            case 'add_minutes':
                return { args: ['date', 'n'], body: 'return new Date(date.getTime() + n * 60 * 1000);' };
            case 'addSeconds':
            case 'add_seconds':
                return { args: ['date', 'n'], body: 'return new Date(date.getTime() + n * 1000);' };

            case 'subtractYears':
            case 'subtract_years':
                return { args: ['date', 'n'], body: 'return new Date(date.getFullYear() - n, date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());' };
            case 'subtractMonths':
            case 'subtract_months':
                return { args: ['date', 'n'], body: 'return new Date(date.getFullYear(), date.getMonth() - n, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());' };
            case 'subtractWeeks':
            case 'subtract_weeks':
                return { args: ['date', 'n'], body: 'return new Date(date.getTime() - n * 7 * 24 * 60 * 60 * 1000);' };
            case 'subtractDays':
            case 'subtract_days':
                return { args: ['date', 'n'], body: 'return new Date(date.getTime() - n * 24 * 60 * 60 * 1000);' };
            case 'subtractHours':
            case 'subtract_hours':
                return { args: ['date', 'n'], body: 'return new Date(date.getTime() - n * 60 * 60 * 1000);' };
            case 'subtractMinutes':
            case 'subtract_minutes':
                return { args: ['date', 'n'], body: 'return new Date(date.getTime() - n * 60 * 1000);' };
            case 'subtractSeconds':
            case 'subtract_seconds':
                return { args: ['date', 'n'], body: 'return new Date(date.getTime() - n * 1000);' };
            default:
                throw new TypeCheckError(`Unknown date/time manipulation function: ${name}`);
        }
    }
}
