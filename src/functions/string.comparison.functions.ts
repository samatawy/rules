import type { TypedParameter } from "../types";
import type { WorkingContext } from "../interfaces";
import type { Expression, StringExpression } from "../syntax/expression";
import { BooleanFunctionExpression } from "../syntax/function.expression";
import { EvaluationError, TypeCheckError } from "../rules/exception";
import { FunctionCompiler } from "../parser/function.compiler";

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

        if (FunctionCompiler.enabled) {
            const compiled = (globalThis as any)[this.name] as Function;
            if (typeof compiled === 'function') {
                return compiled(leftValue, rightValue, context);
            }
        }

        switch (this.name) {
            case 'equals':
                return leftValue === rightValue;
            case 'includes':
            case 'contains':
                return leftValue.includes(rightValue);
            case 'startsWith':
            case 'starts_with':
                return leftValue.startsWith(rightValue);
            case 'endsWith':
            case 'ends_with':
                return leftValue.endsWith(rightValue);
            case 'matches':
                return new RegExp(rightValue).test(leftValue);
            case 'like':
                // Support wildcards in the right value using % or * as wildcard characters, similar to SQL LIKE operator
                // Wildcard % represents one character, while * represents zero or more characters
                const regexPattern = this.getWildcardRegexPattern(rightValue);
                return new RegExp(`^${regexPattern}$`).test(leftValue);
            case 'likeIgnoreCase':
            case 'like_ignore_case':
                // Support wildcards with case-insensitive matching
                const regexPatternIgnoreCase = this.getWildcardRegexPattern(rightValue);
                return new RegExp(`^${regexPatternIgnoreCase}$`, 'i').test(leftValue);

            case 'equalsIgnoreCase':
            case 'equals_ignore_case':
                return leftValue.toLowerCase() === rightValue.toLowerCase();
            case 'includesIgnoreCase':
            case 'includes_ignore_case':
            case 'containsIgnoreCase':
            case 'contains_ignore_case':
                return leftValue.toLowerCase().includes(rightValue.toLowerCase());
            case 'startsWithIgnoreCase':
            case 'starts_with_ignore_case':
                return leftValue.toLowerCase().startsWith(rightValue.toLowerCase());
            case 'endsWithIgnoreCase':
            case 'ends_with_ignore_case':
                return leftValue.toLowerCase().endsWith(rightValue.toLowerCase());
            case 'matchesIgnoreCase':
            case 'matches_ignore_case':
                return new RegExp(rightValue, 'i').test(leftValue);

            // case 'levenshtein_distance':
            // return this.levenshteinDistance(leftValue, rightValue);
            // case 'damerau_levenshtein_distance':
            // return this.damerauLevenshteinDistance(leftValue, rightValue);
            // case 'jaccard_similarity':
            // return this.jaccardSimilarity(leftValue, rightValue);
            // case 'jaro_winkler_distance':
            // return this.jaroWinklerDistance(leftValue, rightValue);
            // case 'soundex_match':
            // return this.soundexMatch(leftValue, rightValue);
            // case 'metaphone_match':
            // return this.metaphoneMatch(leftValue, rightValue);
            // case 'nysiis_match':
            // return this.nysiisMatch(leftValue, rightValue);
            // case 'caverphone_match':
            // return this.caverphoneMatch(leftValue, rightValue);
            // case 'sorensen_dice_coefficient':
            // return this.sorensenDiceCoefficient(leftValue, rightValue);
            // case 'overlap_coefficient':
            // return this.overlapCoefficient(leftValue, rightValue);
            // case 'cosine_similarity':
            // return this.cosineSimilarity(leftValue, rightValue);

            // case 'porter_stem_match':
            // return this.porterStemMatch(leftValue, rightValue);
            // case 'snowball_stem_match':
            // return this.snowballStemMatch(leftValue, rightValue);
            // case 'double_metaphone_match':
            // return this.doubleMetaphoneMatch(leftValue, rightValue);
            // case 'colloquial_match':
            // return this.colloquialMatch(leftValue, rightValue);
            // case 'abbreviation_match':
            // return this.abbreviationMatch(leftValue, rightValue);
            // case 'acronym_match':
            // return this.acronymMatch(leftValue, rightValue);

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
}

export class StringComparisonFunctionProvider {

    private static _names = [
        'equals', 'equalsIgnoreCase', 'equals_ignore_case',
        'includes', 'includesIgnoreCase', 'includes_ignore_case',
        'contains', 'containsIgnoreCase', 'contains_ignore_case',
        'startsWith', 'startsWithIgnoreCase', 'starts_with', 'starts_with_ignore_case',
        'endsWith', 'endsWithIgnoreCase', 'ends_with', 'ends_with_ignore_case',
        'like', 'likeIgnoreCase', 'like_ignore_case',
        'matches', 'matchesIgnoreCase', 'matches_ignore_case',

        // 'levenshtein_distance', 'damerau_levenshtein_distance', 'jaccard_similarity', 'jaro_winkler_distance', 'soundex_match', 'metaphone_match', 'nysiis_match',
        // 'caverphone_match', 'sorensen_dice_coefficient', 'overlap_coefficient', 'cosine_similarity',
        // 'porter_stem_match', 'snowball_stem_match', 'double_metaphone_match', 'colloquial_match', 'abbreviation_match', 'acronym_match'
    ];

    public static names(): string[] {
        return this._names;
    }

    public static create(name: string, args: Expression[]): StringComparisonFunction | undefined {
        if (!this._names.includes(name)) {
            return undefined;
        }
        if (args.length !== 2) {
            throw new TypeCheckError(`Function ${name} expects exactly 2 arguments, but got ${args.length}`);
        }
        return new StringComparisonFunction(name, args[0] as StringExpression, args[1] as StringExpression);
    }

    public static mock(name: string, args: Expression[]): StringComparisonFunction | undefined {
        if (!this._names.includes(name)) {
            return undefined;
        }
        return new StringComparisonFunction(name, args[0] as StringExpression, args[1] as StringExpression);
    }

    public static toJS(name: string): { args: string[], body: string } {
        switch (name) {
            case 'equals':
                return { args: ['str1', 'str2'], body: 'return str1 === str2;' };
            case 'equalsIgnoreCase':
            case 'equals_ignore_case':
                return { args: ['str1', 'str2'], body: 'return str1.toLowerCase() === str2.toLowerCase();' };
            case 'includes':
            case 'contains':
                return { args: ['str1', 'str2'], body: 'return str1.includes(str2);' };
            case 'includesIgnoreCase':
            case 'includes_ignore_case':
            case 'containsIgnoreCase':
            case 'contains_ignore_case':
                return { args: ['str1', 'str2'], body: 'return str1.toLowerCase().includes(str2.toLowerCase());' };
            case 'startsWith':
            case 'starts_with':
                return { args: ['str1', 'str2'], body: 'return str1.startsWith(str2);' };
            case 'startsWithIgnoreCase':
            case 'starts_with_ignore_case':
                return { args: ['str1', 'str2'], body: 'return str1.toLowerCase().startsWith(str2.toLowerCase());' };
            case 'endsWith':
            case 'ends_with':
                return { args: ['str1', 'str2'], body: 'return str1.endsWith(str2);' };
            case 'endsWithIgnoreCase':
            case 'ends_with_ignore_case':
                return { args: ['str1', 'str2'], body: 'return str1.toLowerCase().endsWith(str2.toLowerCase());' };
            case 'matches':
                return { args: ['str', 'regex'], body: 'return new RegExp(regex).test(str);' };
            case 'matchesIgnoreCase':
            case 'matches_ignore_case':
                return { args: ['str', 'regex'], body: 'return new RegExp(regex, "i").test(str);' };
            case 'like':
                const regex = /([.+?^=!:${}()|[\]\/\\])/g;
                return {
                    args: ['str', 'pattern'],
                    body: `
                        const regexPattern = pattern.replace(${regex}, '\\\\$1')
                            .replace(/_/g, '.')
                            .replace(/\\%/g, '.*');
                        return new RegExp('^' + regexPattern + '$')
                            .test(str);
                    `
                };
            case 'likeIgnoreCase':
            case 'like_ignore_case':
                const regex_i = /([.+?^=!:${}()|[\]\/\\])/g;
                return {
                    args: ['str', 'pattern'],
                    body: `
                        const regexPattern = pattern.replace(${regex_i}, '\\\\$1')
                            .replace(/_/g, '.')
                            .replace(/\\%/g, '.*');
                        return new RegExp('^' + regexPattern + '$', 'i')
                            .test(str);
                    `
                };
            default:
                throw new TypeCheckError(`Unknown string comparison function: ${name}`);
        }
    }
}
