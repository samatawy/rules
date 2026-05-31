import type { TypedParameter } from "../types";
import type { WorkingContext } from "../interfaces";
import type { Expression } from "../syntax/expression";
import { FunctionExpression, NumericFunctionExpression } from "../syntax/function.expression";
import { EvaluationError, TypeCheckError } from "../rules/exception";

export class ArrayComparisonFunction extends NumericFunctionExpression {

    protected target_arg: Expression;

    protected extra_args: Expression[];

    constructor(name: string, target: Expression, args: Expression[]) {
        super(name, [target, ...args]);
        this.target_arg = target;
        this.extra_args = args;
    }

    public expectsParameters(): TypedParameter[] {
        switch (this.name) {
            // case 'identicalTo':
            // case 'sameSet':
            // case 'subsetOf':
            // case 'subArrayOf':
            // case 'matchingElements':

            // Distance metrics - higher means more different
            case 'euclidean_distance':
            case 'manhattan_distance':
            case 'chebyshev_distance':
            case 'minkowski_distance':
            case 'cosine_distance':
            // case 'jaccard_distance':     // allow any array
            // case 'hamming_distance':     // allow any array

            // Correlation metrics - higher means more similar
            case 'pearson_correlation':
            // case 'spearman_rank_correlation':    // allow any array
            case 'cross_correlation':
            case 'kendall_tau_correlation':

            // Distribution comparison metrics - higher means more different
            case 'kolmogorov_smirnov_distance':
            case 'kullback_leibler_divergence':
            case 'earth_movers_distance':
            case 'wasserstein_distance':
            case 'jensen_shannon_divergence':
                return [{ type: 'number[]' }, { type: 'number[]' }];

            case 'jaccard_distance':
            case 'hamming_distance':
            case 'spearman_rank_correlation':
                return [{ type: 'array' }, { type: 'array' }];
            default:
                throw new TypeCheckError(`Unknown array comparison function: ${this.name}`);
        }
    }

    public evaluate(context: WorkingContext): number {
        const cached = context.getCached(this.syntax);
        if (cached !== undefined) return cached;

        if (this.extra_args.length !== 1) {
            const message = `Function ${this.name} expects exactly 2 arguments, but received ${1 + this.extra_args.length}`;
            context.logger().warn(message);
            throw new EvaluationError(message);
        }

        const targetValue = this.target_arg.evaluate(context);
        if (!Array.isArray(targetValue)) {
            context.logger().warn('Received argument', targetValue, `for argument ${this.target_arg} in function ${this.name}`);
            throw new EvaluationError(`Target argument for function ${this.name} did not evaluate to an array`);
        }
        const compareTo = this.extra_args[0]!.evaluate(context);
        if (!Array.isArray(compareTo)) {
            context.logger().warn('Received argument', compareTo, `for argument ${this.extra_args[0]} in function ${this.name}`);
            throw new EvaluationError(`Second argument for function ${this.name} did not evaluate to an array`);
        }
        if (targetValue.length !== compareTo.length) {
            const message = `Function ${this.name} requires arrays of the same length, but received lengths ${targetValue.length} and ${compareTo.length}`;
            context.logger().warn(message);
            throw new EvaluationError(message);
        }

        switch (this.name) {
            // All elements exist in the same order and are strictly equal (===) between the two arrays.
            // case 'identicalTo':
            //     return targetValue.every((val, idx) => val === compareTo[idx]) ? 0 : 1;

            // All elements in both arrays are the same, regardless of order or duplicates (i.e., they contain the same unique values).
            // case 'sameSet':
            //     return targetValue.every(val => compareTo.includes(val))
            //         && compareTo.every(val => targetValue.includes(val)) ? 0 : 1;

            // All elements in the target array appear in the compareTo array, regardless of order or duplicates (i.e., the target is a subset of the compareTo set).
            // case 'subsetOf':
            //     return targetValue.every(val => compareTo.includes(val)) ? 0 : 1;

            // All elements appear adjacent and in order within compareTo, but not necessarily exclusively (i.e., they could be part of a larger array within compareTo)
            // case 'subArrayOf':
            //     for (let i = 0; i <= compareTo.length - targetValue.length; i++) {
            //         if (targetValue.every((val, idx) => val === compareTo[i + idx]!)) {
            //             return 1;
            //         }
            //     }
            //     return 0;

            // Count of elements in target that are strictly equal (===) to any element in compareTo, regardless of order or duplicates.
            // case 'matchingElements':
            //     return targetValue.filter(val => compareTo.includes(val)).length;

            case 'euclidean_distance':
                return this.euclideanDistance(targetValue, compareTo);

            case 'chebyshev_distance':
                return this.chebyshevDistance(targetValue, compareTo);

            case 'manhattan_distance':
                return this.manhattanDistance(targetValue, compareTo);

            case 'minkowski_distance':
                return this.minkowskiDistance(targetValue, compareTo, 3); // default to p=3 for Minkowski distance

            case 'cosine_distance':
                return this.cosineDistance(targetValue, compareTo);

            case 'jaccard_distance':
                return this.jaccardDistance(targetValue, compareTo);

            case 'hamming_distance':
                return this.hammingDistance(targetValue, compareTo);

            case 'pearson_correlation':
                return this.pearsonCorrelation(targetValue, compareTo);

            case 'spearman_rank_correlation':
                return this.spearmanRankCorrelation(targetValue, compareTo);

            case 'cross_correlation':
                return this.crossCorrelation(targetValue, compareTo, 0); // default to lag=0 for cross-correlation

            case 'kendall_tau_correlation':
                return this.kendallTauCorrelation(targetValue, compareTo);

            case 'kolmogorov_smirnov_distance':
                return this.kolmogorovSmirnovDistance(targetValue, compareTo);

            case 'kullback_leibler_divergence':
                return this.kullbackLeiblerDivergence(targetValue, compareTo);

            case 'earth_movers_distance':
            case 'wasserstein_distance':
                return this.wassersteinDistance(targetValue, compareTo);

            case 'jensen_shannon_divergence':
                return this.jensenShannonDivergence(targetValue, compareTo);

            default:
                throw new EvaluationError(`Unknown array comparison function: ${this.name}`);
        }
    }

    // Euclidean distance is the square root of the sum of the squared differences between corresponding elements of the two arrays.
    // This is typically used for arrays of numerical values, and measures the straight-line distance between two points in a multi-dimensional space. 
    // A distance of 0 means the arrays are identical, while a larger distance indicates greater dissimilarity.
    private euclideanDistance(arrA: number[], arrB: number[]): number {
        const sumOfSquares = arrA.reduce((sum, val, idx) => sum + Math.pow(val - arrB[idx]!, 2), 0);
        return Math.sqrt(sumOfSquares);
    }

    // Manhattan distance is the sum of the absolute differences of the corresponding elements of the two arrays.
    // This is typically used for arrays of numerical values, and measures the total distance along all coordinate dimensions. 
    // A distance of 0 means the arrays are identical, while a larger distance indicates greater dissimilarity.
    private manhattanDistance(arrA: number[], arrB: number[]): number {
        return arrA.reduce((sum, val, idx) => sum + Math.abs(val - arrB[idx]!), 0);
    }

    // Chebyshev distance is the maximum absolute difference between corresponding elements of the two arrays.
    // This is typically used for arrays of numerical values, and measures the greatest distance along any coordinate dimension. 
    // A distance of 0 means the arrays are identical, while a larger distance indicates greater dissimilarity along at least one dimension.
    private chebyshevDistance(arrA: number[], arrB: number[]): number {
        return arrA.reduce((max, val, idx) => Math.max(max, Math.abs(val - arrB[idx]!)), 0);
    }

    // Minkowski distance is a generalization of both Euclidean and Manhattan distance, 
    // defined as the p-th root of the sum of the absolute differences raised to the power of p. 
    // When p=1, it is equivalent to Manhattan distance, and when p=2, it is equivalent to Euclidean distance.
    private minkowskiDistance(arrA: number[], arrB: number[], p: number): number {
        const sumOfPowers = arrA.reduce((sum, val, idx) => sum + Math.pow(Math.abs(val - arrB[idx]!), p), 0);
        return Math.pow(sumOfPowers, 1 / p);
    }

    // Cosine distance is 1 minus the cosine similarity, which is the dot product of the two vectors divided by the product of their magnitudes.
    // This is typically used for arrays of numerical values, and measures the angle between two vectors in a multi-dimensional space. 
    // A distance of 0 means the vectors are identical in direction, while a distance of 1 means they are orthogonal (i.e., have no similarity in direction).
    private cosineDistance(arrA: number[], arrB: number[]): number {
        const dotProduct = arrA.reduce((sum, val, idx) => sum + val * arrB[idx]!, 0);
        const magnitudeA = Math.sqrt(arrA.reduce((sum, val) => sum + val * val, 0));
        const magnitudeB = Math.sqrt(arrB.reduce((sum, val) => sum + val * val, 0));
        if (magnitudeA === 0 || magnitudeB === 0) {
            return 1; // define cosine distance as 1 if either vector has zero magnitude
        }
        return 1 - dotProduct / (magnitudeA * magnitudeB);
    }

    // Jaccard distance is 1 minus the size of the intersection divided by the size of the union of the two sets
    // This is typically used for arrays of categorical values, and measures how dissimilar two sets are. 
    // A distance of 0 means the sets are identical, while a distance of 1 means they have no elements in common.
    private jaccardDistance(arrA: any[], arrB: any[]): number {
        const setA = new Set(arrA);
        const setB = new Set(arrB);
        const intersectionSize = arrA.reduce((count, val) => count + (setB.has(val) ? 1 : 0), 0);
        const unionSize = setA.size + setB.size - intersectionSize;
        return unionSize === 0 ? 0 : 1 - intersectionSize / unionSize;
    }

    // Hamming distance is the count of positions where the two arrays differ
    // This is typically used for arrays of equal length, and counts the number of positions at which the corresponding elements are different.
    // A distance of 0 means the arrays are identical, while a larger distance indicates greater dissimilarity.
    private hammingDistance(arrA: any[], arrB: any[]): number {
        return arrA.reduce((count, val, idx) => count + (val !== arrB[idx]! ? 1 : 0), 0);
    }

    // Pearson correlation is the covariance of the two variables divided by the product of their standard deviations, which measures the linear relationship between two arrays.
    // This is typically used for arrays of numerical values, and measures the strength and direction of the linear relationship between two variables. 
    // A distance of 0 means the arrays are perfectly positively correlated, a distance of 2 means they are perfectly negatively correlated, and a distance of 1 means they are uncorrelated.
    private pearsonCorrelation(arrA: number[], arrB: number[]): number {
        const meanA = arrA.reduce((sum, val) => sum + val, 0) / arrA.length;
        const meanB = arrB.reduce((sum, val) => sum + val, 0) / arrB.length;
        const numerator = arrA.reduce((sum, val, idx) => sum + (val - meanA) * (arrB[idx]! - meanB), 0);
        const denominatorA = Math.sqrt(arrA.reduce((sum, val) => sum + Math.pow(val - meanA, 2), 0));
        const denominatorB = Math.sqrt(arrB.reduce((sum, val) => sum + Math.pow(val - meanB, 2), 0));
        if (denominatorA === 0 || denominatorB === 0) {
            return 0; // define Pearson correlation as 0 if either vector has zero variance
        }
        return numerator / (denominatorA * denominatorB);
    }

    // Spearman's rank correlation is the Pearson correlation of the ranked variables, which measures the monotonic relationship between two arrays.
    // This is typically used for arrays of numerical values, and measures how well the relationship between two variables can be described using a monotonic function. 
    // A distance of 1 means the arrays are in perfect agreement in terms of their rank order, -1 means they are in perfect disagreement, and 0 means they are uncorrelated.
    private spearmanRankCorrelation(arrA: number[], arrB: number[]): number {
        const rank = (arr: number[]) => {
            const sorted = arr.map((val, idx) => ({ val, idx })).sort((a, b) => a.val - b.val);
            const ranks = new Array(arr.length);
            let currentRank = 1;
            for (let i = 0; i < sorted.length; i++) {
                if (i > 0 && sorted[i]!.val !== sorted[i - 1]!.val) {
                    currentRank = i + 1;
                }
                ranks[sorted[i]!.idx] = currentRank;
            }
            return ranks;
        };
        const rankA = rank(arrA);
        const rankB = rank(arrB);
        return this.pearsonCorrelation(rankA, rankB);
    }

    // Cross-correlation at a given lag is the sum of the products of corresponding elements of the two arrays, where one array is shifted by the lag.
    // This is typically used for arrays of numerical values, and measures the similarity of two sequences as a function of the lag of one relative to the other. 
    // A higher cross-correlation at a particular lag indicates greater similarity between the sequences at that lag.
    private crossCorrelation(arrA: number[], arrB: number[], lag: number): number {
        const meanA = arrA.reduce((sum, val) => sum + val, 0) / arrA.length;
        const meanB = arrB.reduce((sum, val) => sum + val, 0) / arrB.length;
        const numerator = arrA.reduce((sum, val, idx) => {
            const shiftedIdx = idx + lag;
            if (shiftedIdx < 0 || shiftedIdx >= arrB.length) {
                return sum;
            }
            return sum + (val - meanA) * (arrB[shiftedIdx]! - meanB);
        }, 0);
        const denominatorA = Math.sqrt(arrA.reduce((sum, val) => sum + Math.pow(val - meanA, 2), 0));
        const denominatorB = Math.sqrt(arrB.reduce((sum, val) => sum + Math.pow(val - meanB, 2), 0));
        if (denominatorA === 0 || denominatorB === 0) {
            return 0; // define cross-correlation as 0 if either vector has zero variance
        }
        return numerator / (denominatorA * denominatorB);
    }

    // Kendall's Tau is a measure of rank correlation, defined as the difference between the number of concordant and discordant pairs divided by the total number of pairs.
    // This is typically used for arrays of numerical values, and measures the similarity of the orderings of the data when ranked by each of the quantities. 
    // A distance of 1 means the arrays are in perfect agreement, -1 means they are in perfect disagreement, and 0 means they are uncorrelated.
    private kendallTauCorrelation(arrA: number[], arrB: number[]): number {
        let concordant = 0;
        let discordant = 0;
        for (let i = 0; i < arrA.length; i++) {
            for (let j = i + 1; j < arrA.length; j++) {
                const aDiff = arrA[i]! - arrA[j]!;
                const bDiff = arrB[i]! - arrB[j]!;
                if (aDiff * bDiff > 0) {
                    concordant++;
                } else if (aDiff * bDiff < 0) {
                    discordant++;
                }
            }
        }
        const n = arrA.length;
        return (concordant - discordant) / (0.5 * n * (n - 1));
    }

    // Kolmogorov-Smirnov distance is the maximum absolute difference between the empirical cumulative distribution functions (CDFs) of the two arrays.
    // This is typically used for arrays of numerical values, and measures the distance between the distributions of the two samples. 
    // A distance of 0 means the distributions are identical, while a larger distance indicates greater dissimilarity between the distributions.
    private kolmogorovSmirnovDistance(arrA: number[], arrB: number[]): number {
        const sortedA = [...arrA].sort((a, b) => a - b);
        const sortedB = [...arrB].sort((a, b) => a - b);

        let i = 0;
        let j = 0;
        let cdfA = 0;
        let cdfB = 0;
        let maxDiff = 0;

        // Continue until BOTH arrays are fully processed
        while (i < sortedA.length || j < sortedB.length) {
            // Advance the pointer pointing to the smaller (or equal) value
            if (j === sortedB.length || (i < sortedA.length && sortedA[i]! <= sortedB[j]!)) {
                i++;
                cdfA = i / sortedA.length;
            } else {
                j++;
                cdfB = j / sortedB.length;
            }
            // Compare independent CDF states at each step
            maxDiff = Math.max(maxDiff, Math.abs(cdfA - cdfB));
        }

        return maxDiff;
    }

    // Kullback-Leibler divergence is the sum of the products of the probabilities of each element in the first array 
    // and the logarithm of the ratio of the probabilities of that element in the first array to the second array.
    // This is typically used for arrays of numerical values representing probability distributions, 
    // and measures how one probability distribution diverges from a second, expected probability distribution. 
    // A distance of 0 means the distributions are identical, while a larger distance indicates greater divergence between the distributions.
    private kullbackLeiblerDivergence(arrA: number[], arrB: number[]): number {
        const sumA = arrA.reduce((sum, val) => sum + val, 0);
        const sumB = arrB.reduce((sum, val) => sum + val, 0);
        if (sumA === 0 || sumB === 0) {
            return Infinity; // define KL divergence as infinity if either distribution is zero
        }
        return arrA.reduce((sum, val, idx) => {
            const p = val / sumA;
            const q = arrB[idx]! / sumB;
            return sum + (p === 0 ? 0 : p * Math.log(p / q));
        }, 0);
    }

    // Wasserstein distance (Earth Mover's Distance) is the minimum amount of "work" required to transform one distribution into another, 
    // where "work" is defined as the amount of distribution weight that must be moved multiplied by the distance it has to be moved.
    // This is typically used for arrays of numerical values representing probability distributions, 
    // and measures the distance between two probability distributions over a given metric space. 
    // A distance of 0 means the distributions are identical, while a larger distance indicates greater dissimilarity between the distributions.
    private wassersteinDistance(arrA: number[], arrB: number[]): number {
        const sortedA = [...arrA].sort((a, b) => a - b);
        const sortedB = [...arrB].sort((a, b) => a - b);
        const n = sortedA.length;
        const m = sortedB.length;
        const maxLength = Math.max(n, m);
        let distance = 0;
        for (let i = 0; i < maxLength; i++) {
            const valA = i < n ? sortedA[i]! : sortedA[n - 1]!;
            const valB = i < m ? sortedB[i]! : sortedB[m - 1]!;
            distance += Math.abs(valA - valB);
        }
        return distance / maxLength;
    }

    // Jensen-Shannon divergence is the average of the Kullback-Leibler divergences between each distribution and the average distribution.
    // This is typically used for arrays of numerical values representing probability distributions, 
    // and measures the similarity between two probability distributions. 
    // A distance of 0 means the distributions are identical, while a larger distance indicates greater dissimilarity between the distributions.
    private jensenShannonDivergence(arrA: number[], arrB: number[]): number {
        const sumA = arrA.reduce((sum, val) => sum + val, 0);
        const sumB = arrB.reduce((sum, val) => sum + val, 0);
        if (sumA === 0 || sumB === 0) {
            return Infinity; // define JS divergence as infinity if either distribution is zero
        }
        const avg = arrA.map((val, idx) => (val / sumA + arrB[idx]! / sumB) / 2);
        return (this.kullbackLeiblerDivergence(arrA, avg) + this.kullbackLeiblerDivergence(arrB, avg)) / 2;
    }
}

export class ArrayComparisonFunctionProvider {

    private static _names = [   //'identicalTo', 'sameSet', 'subsetOf', 'subArrayOf', 'matchingElements',
        'euclidean_distance', 'manhattan_distance', 'chebyshev_distance', 'minkowski_distance', 'cosine_distance', 'jaccard_distance', 'hamming_distance',
        'pearson_correlation', 'spearman_rank_correlation', 'cross_correlation', 'kendall_tau_correlation',
        'kolmogorov_smirnov_distance', 'kullback_leibler_divergence', 'earth_movers_distance', 'wasserstein_distance', 'jensen_shannon_divergence'
    ];

    public static names(): string[] {
        return this._names;
    }

    public static create(name: string, args: Expression[]): FunctionExpression | undefined {
        if (!this._names.includes(name)) {
            return undefined;
        }
        if (args.length != 2) {
            throw new TypeCheckError(`Function ${name} expects exactly 2 arguments`);
        }
        return new ArrayComparisonFunction(name, args[0]!, args.slice(1));
    }

    public static mock(name: string, args: Expression[]): FunctionExpression | undefined {
        if (!this._names.includes(name)) {
            return undefined;
        }
        return new ArrayComparisonFunction(name, args[0]!, args.slice(1));
    }

    public static toJS(name: string): { args: string[], body: string } {
        // TODO: Implement if necessary
        return { args: [], body: '' }
    }
}
