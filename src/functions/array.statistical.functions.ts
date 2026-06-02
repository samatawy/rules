import { ArrayExpression } from "../syntax/array.expression";
import type { TypedParameter } from "../types";
import type { WorkingContext } from "../interfaces";
import type { Expression } from "../syntax/expression";
import { FunctionExpression, NumericFunctionExpression } from "../syntax/function.expression";
import { EvaluationError, TypeCheckError } from "../rules/exception";
import { FunctionCompiler } from "../parser/function.compiler";

export class ArrayStatisticalFunction extends NumericFunctionExpression {

    protected target_arg: Expression;

    protected extra_args: Expression[];

    constructor(name: string, target: Expression, args: Expression[]) {
        super(name, [target, ...args]);
        this.target_arg = target;
        this.extra_args = args;
    }

    public expectsParameters(): TypedParameter[] {
        switch (this.name) {
            case 'percentile':
                return [{ type: 'number[]' }, { type: 'number' }];
            case 'stdev':
            case 'stddev':
            case 'standard_deviation':
            case 'variance':
            case 'skewness':
            case 'kurtosis':
            case 'coefficient_of_variation':
            case 'iqr':
            case 'interquartile_range':
            case 'gini_coefficient':
            case 'harmonic_mean':
            case 'geometric_mean':
            case 'root_mean_square':
            case 'mean_absolute_deviation':
            case 'median_absolute_deviation':
                return [{ type: 'number[]' }];

            default:
                throw new TypeCheckError(`Unknown array inspection function: ${this.name}`);
        }
    }

    public evaluate(context: WorkingContext): number {
        const cached = context.getCached(this.syntax);
        if (cached !== undefined) return cached;

        // If this function expects a parameter array, we need to convert the target argument and extra arguments 
        // into a single array argument for processing, unless the target is already an array.
        if (this.expectsParameterArray()) {
            const firstArg = this.target_arg.evaluate(context);
            const isArray = this.target_arg instanceof ArrayExpression || Array.isArray(firstArg);
            if (isArray && (this.extra_args[-1] as any) === context) {
                // In case context is passed as the last argument
                this.extra_args.pop();
            }

            this.target_arg = isArray ? this.target_arg : new ArrayExpression([this.target_arg, ...this.extra_args]);
            this.extra_args = [];
        }

        const targetValue = this.target_arg.evaluate(context);
        if (!Array.isArray(targetValue)) {
            context.logger().warn('Received argument', targetValue, `for argument ${this.target_arg} in function ${this.name}`);
            throw new EvaluationError(`Target argument for function ${this.name} did not evaluate to an array`);
        }

        if (FunctionCompiler.enabled) {
            const compiled = (globalThis as any)[this.name] as Function;
            if (typeof compiled === 'function') {
                return compiled(targetValue, context);
            }
        }

        switch (this.name) {
            case 'percentile':
                if (this.extra_args.length < 1) {
                    throw new EvaluationError(`Function ${this.name} expects a second argument for the percentile value`);
                }
                const percentileValue = this.extra_args[0]!.evaluate(context);
                if (typeof percentileValue !== 'number' || percentileValue < 0 || percentileValue > 100) {
                    throw new EvaluationError(`Percentile value must be a number between 0 and 100`);
                }
                return this.percentile(targetValue, percentileValue);

            case 'stdev':
            case 'stddev':
            case 'standard_deviation':
                const mean = targetValue.reduce((acc, val) => acc + val, 0) / targetValue.length;
                const variance = targetValue.reduce((acc, val) => acc + (val - mean) ** 2, 0) / targetValue.length;
                return Math.sqrt(variance);

            case 'variance':
                const meanVar = targetValue.reduce((acc, val) => acc + val, 0) / targetValue.length;
                return targetValue.reduce((acc, val) => acc + (val - meanVar) ** 2, 0) / targetValue.length;

            case 'skewness':
                const meanSkew = targetValue.reduce((acc, val) => acc + val, 0) / targetValue.length;
                const stdDev = Math.sqrt(targetValue.reduce((acc, val) => acc + (val - meanSkew) ** 2, 0) / targetValue.length);
                return targetValue.reduce((acc, val) => acc + ((val - meanSkew) / stdDev) ** 3, 0) / targetValue.length;

            case 'kurtosis':
                const meanKurt = targetValue.reduce((acc, val) => acc + val, 0) / targetValue.length;
                const stdDevKurt = Math.sqrt(targetValue.reduce((acc, val) => acc + (val - meanKurt) ** 2, 0) / targetValue.length);
                return targetValue.reduce((acc, val) => acc + ((val - meanKurt) / stdDevKurt) ** 4, 0) / targetValue.length - 3;

            case 'coefficient_of_variation':
                const meanCV = targetValue.reduce((acc, val) => acc + val, 0) / targetValue.length;
                const stdDevCV = Math.sqrt(targetValue.reduce((acc, val) => acc + (val - meanCV) ** 2, 0) / targetValue.length);
                return stdDevCV / meanCV;

            case 'iqr':
            case 'interquartile_range':
                return this.interquartileRange(targetValue);

            case 'gini_coefficient':
                return this.giniCoefficient(targetValue);

            case 'harmonic_mean':
                const n = targetValue.length;
                const reciprocalSum = targetValue.reduce((acc, val) => acc + 1 / val, 0);
                return n / reciprocalSum;

            case 'geometric_mean':
                const product = targetValue.reduce((acc, val) => acc * val, 1);
                return Math.pow(product, 1 / targetValue.length);

            case 'root_mean_square':
                const meanSquare = targetValue.reduce((acc, val) => acc + val ** 2, 0) / targetValue.length;
                return Math.sqrt(meanSquare);

            case 'mean_absolute_deviation':
                const meanMAD = targetValue.reduce((acc, val) => acc + val, 0) / targetValue.length;
                return targetValue.reduce((acc, val) => acc + Math.abs(val - meanMAD), 0) / targetValue.length;

            case 'median_absolute_deviation':
                const medianMAD = this.median(targetValue);
                return targetValue.reduce((acc, val) => acc + Math.abs(val - medianMAD), 0) / targetValue.length;

            default:
                throw new EvaluationError(`Unknown array inspection function: ${this.name}`);
        }
    }

    // Median is the middle value in a sorted list, or the average of the two middle values if the list has an even number of elements
    private median(arr: number[]): number {
        if (arr.length === 0) return 0;
        const sorted = [...arr].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        if (sorted.length % 2 === 0) {
            return (sorted[mid - 1]! + sorted[mid]!) / 2;
        } else {
            return sorted[mid]!;
        }
    }

    // Percentile is the value below which a given percentage of observations in a group of observations falls.
    // Median is the 50th percentile, for example. The 25th percentile is the value below which 25% of the observations may be found.
    private percentile(arr: number[], p: number): number {
        if (arr.length === 0) return 0;
        const sorted = [...arr].sort((a, b) => a - b);
        const index = (p / 100) * (sorted.length - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        if (lower === upper) {
            return sorted[lower]!;
        } else {
            return sorted[lower]! * (upper - index) + sorted[upper]! * (index - lower);
        }
    }

    // Interquartile range (IQR) is a measure of statistical dispersion, or how spread out the values in a dataset are. 
    // It is calculated as the difference between the 75th percentile (Q3) and the 25th percentile (Q1) of the data. 
    // The IQR is often used to identify outliers in a dataset, as values that fall below Q1 - 1.5 * IQR or above Q3 + 1.5 * IQR are typically considered outliers.
    private interquartileRange(arr: number[]): number {
        if (arr.length === 0) return 0;
        const sorted = [...arr].sort((a, b) => a - b);
        const q1 = this.percentile(sorted, 25);
        const q3 = this.percentile(sorted, 75);
        return q3 - q1;
    }

    // Gini coefficient is a measure of statistical dispersion intended to represent the income or wealth distribution of a nation's residents.
    // A Gini coefficient of 0 expresses perfect equality, where all values are the same, while a Gini coefficient of 1 expresses maximal inequality.
    private giniCoefficient(arr: number[]): number {
        const sorted = [...arr].sort((a, b) => a - b);
        const n = sorted.length;
        const cumulative = sorted.reduce((acc, val) => {
            const last = acc.length > 0 ? acc[acc.length - 1] : 0;
            acc.push(last! + val);
            return acc;
        }, [] as number[]);
        const total = cumulative[cumulative.length - 1]!;
        if (total === 0) return 0;
        const giniSum = cumulative.reduce((acc, val, i) => acc + val * (i + 1), 0);
        return (n + 1 - 2 * giniSum / total) / n;
    }
}

export class ArrayStatisticalFunctionProvider {

    private static _names = ['percentile', 'stdev', 'standard_deviation', 'variance', 'gini_coefficient', 'harmonic_mean', 'geometric_mean'];

    public static names(): string[] {
        return this._names;
    }

    public static create(name: string, args: Expression[]): FunctionExpression | undefined {
        if (!this._names.includes(name)) {
            return undefined;
        }
        if (args.length < 1) {
            throw new TypeCheckError(`Function ${name} expects at least 1 argument`);
        }
        if (name === 'percentile' && args.length < 2) {
            throw new TypeCheckError(`Function ${name} expects 2 arguments`);
        }
        return new ArrayStatisticalFunction(name, args[0]!, args.slice(1));
    }

    public static mock(name: string, args: Expression[]): FunctionExpression | undefined {
        if (!this._names.includes(name)) {
            return undefined;
        }
        return new ArrayStatisticalFunction(name, args[0]!, args.slice(1));
    }

    public static toJS(name: string): { args: string[], body: string } {
        // TODO: Implement if necessary
        return { args: [], body: '' }
    }
}
