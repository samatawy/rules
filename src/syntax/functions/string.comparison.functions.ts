import type { TypedParameter } from "../../types";
import type { WorkingContext } from "../../interfaces";
import type { StringExpression } from "../expression";
import { BooleanFunctionExpression } from "../function.expression";
import { EvaluationError } from "../../rules/exception";

export class StringComparisonFunction extends BooleanFunctionExpression {

    protected left_arg: StringExpression;

    protected right_arg: StringExpression;

    constructor(name: string, left: StringExpression, right: StringExpression) {
        super(name, [left, right]);
        this.left_arg = left;
        this.right_arg = right;
    }

    public expectsParameters(): TypedParameter[] {
        return [{ type: 'string' }, { type: 'string' }];
    }

    public evaluate(context: WorkingContext): boolean {
        const cached = context.getCached(this.syntax);
        if (cached !== undefined) return cached;

        const leftValue = this.left_arg.evaluate(context);
        const rightValue = this.right_arg.evaluate(context);

        if (typeof leftValue !== 'string' || typeof rightValue !== 'string') {
            throw new EvaluationError(`Arguments for function ${this.name} did not evaluate to strings`);
        }

        switch (this.name) {
            case 'equals':
                return leftValue === rightValue;
            case 'includes':
            case 'contains':
                return leftValue.includes(rightValue);
            case 'startsWith':
                return leftValue.startsWith(rightValue);
            case 'endsWith':
                return leftValue.endsWith(rightValue);
            case 'matches':
                return new RegExp(rightValue).test(leftValue);
            case 'like':
                // Support wildcards in the right value using % or * as wildcard characters, similar to SQL LIKE operator
                // Wildcard % represents one character, while * represents zero or more characters
                const regexPattern = this.getWildcardRegexPattern(rightValue);
                return new RegExp(`^${regexPattern}$`).test(leftValue);
            case 'likeIgnoreCase':
                // Support wildcards with case-insensitive matching
                const regexPatternIgnoreCase = this.getWildcardRegexPattern(rightValue);
                return new RegExp(`^${regexPatternIgnoreCase}$`, 'i').test(leftValue);

            case 'equalsIgnoreCase':
                return leftValue.toLowerCase() === rightValue.toLowerCase();
            case 'includesIgnoreCase':
            case 'containsIgnoreCase':
                return leftValue.toLowerCase().includes(rightValue.toLowerCase());
            case 'startsWithIgnoreCase':
                return leftValue.toLowerCase().startsWith(rightValue.toLowerCase());
            case 'endsWithIgnoreCase':
                return leftValue.toLowerCase().endsWith(rightValue.toLowerCase());
            case 'matchesIgnoreCase':
                return new RegExp(rightValue, 'i').test(leftValue);
            default:
                throw new EvaluationError(`Unknown string comparison function: ${this.name}`);
        }
    }

    private getWildcardRegexPattern(pattern: string): string {
        // Escape regex special characters except for our wildcards
        const escapedPattern = pattern.replace(/([.+?^=!:${}()|[\]\/\\])/g, '\\$1');

        // Replace _ with . to match any single character and % with .* to match zero or more characters
        return escapedPattern
            .replace(/_/g, '.')
            .replace(/\%/g, '.*');
    }

    static names = ['equals', 'equalsIgnoreCase', 'includes', 'includesIgnoreCase', 'contains', 'containsIgnoreCase', 'startsWith', 'startsWithIgnoreCase', 'endsWith', 'endsWithIgnoreCase', 'like', 'likeIgnoreCase', 'matches', 'matchesIgnoreCase'];
}
