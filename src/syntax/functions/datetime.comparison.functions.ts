import type { TypedParameter } from "../../types";
import type { WorkingContext } from "../../interfaces";
import type { DateExpression } from "../expression";
import { BooleanFunctionExpression } from "../function.expression";
import { EvaluationError, TypeCheckError } from "../../rules/exception";

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
            case 'sameMonth':
            case 'sameWeek':
            case 'sameDay':
            case 'sameHour':
            case 'sameMinute':
            case 'sameSecond':
            case 'sameInstant':
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

        if (!(leftValue instanceof Date) || !(rightValue instanceof Date)) {
            throw new EvaluationError(`Arguments for function ${this.name} did not evaluate to dates`);
        }

        switch (this.name) {
            case 'before':
                return leftValue.getTime() < rightValue.getTime();
            case 'after':
                return leftValue.getTime() > rightValue.getTime();
            case 'sameYear':
                return leftValue.getFullYear() === rightValue.getFullYear();
            case 'sameMonth':
                return leftValue.getFullYear() === rightValue.getFullYear() && leftValue.getMonth() === rightValue.getMonth();
            case 'sameWeek':
                const leftWeekStart = new Date(leftValue);
                leftWeekStart.setDate(leftWeekStart.getDate() - leftWeekStart.getDay());
                leftWeekStart.setHours(0, 0, 0, 0);

                const rightWeekStart = new Date(rightValue);
                rightWeekStart.setDate(rightWeekStart.getDate() - rightWeekStart.getDay());
                rightWeekStart.setHours(0, 0, 0, 0);

                return leftWeekStart.getTime() === rightWeekStart.getTime();
            case 'sameDay':
                return leftValue.getFullYear() === rightValue.getFullYear() && leftValue.getMonth() === rightValue.getMonth() && leftValue.getDate() === rightValue.getDate();
            case 'sameHour':
                return leftValue.getFullYear() === rightValue.getFullYear() && leftValue.getMonth() === rightValue.getMonth() && leftValue.getDate() === rightValue.getDate() && leftValue.getHours() === rightValue.getHours();
            case 'sameMinute':
                return leftValue.getFullYear() === rightValue.getFullYear() && leftValue.getMonth() === rightValue.getMonth() && leftValue.getDate() === rightValue.getDate() && leftValue.getHours() === rightValue.getHours() && leftValue.getMinutes() === rightValue.getMinutes();
            case 'sameSecond':
                return leftValue.getFullYear() === rightValue.getFullYear() && leftValue.getMonth() === rightValue.getMonth() && leftValue.getDate() === rightValue.getDate() && leftValue.getHours() === rightValue.getHours() && leftValue.getMinutes() === rightValue.getMinutes() && leftValue.getSeconds() === rightValue.getSeconds();
            case 'sameInstant':
                return leftValue.getTime() === rightValue.getTime();

            default:
                throw new EvaluationError(`Unknown date/time comparison function: ${this.name}`);
        }
    }

    static names = ['before', 'after', 'sameYear', 'sameMonth', 'sameWeek', 'sameDay', 'sameHour', 'sameMinute', 'sameSecond', 'sameInstant'];
}
