import type { WorkingContext, Evaluator, HasValidity, ValidationResult, TypeChecker } from "../interfaces";
import type { Renderable } from "../rendering/render.types";

/**
 * Represents an expression that can be evaluated in a given context to produce a value. 
 * Expressions can be used in conditions, assignments, and other parts of the rule syntax 
 * to compute values based on the current state of the working context. 
 * Each expression must implement the required() method to specify which data keys it depends on, 
 * and the evaluate() method to compute its value based on the context.
 */
export abstract class Expression implements Evaluator, HasValidity {

    protected syntax: string;

    constructor() {
        // Syntax should be provided by implementing classes
        this.syntax = '';
    }

    /**
     * Get the original syntax string that was used to create this expression. This can be useful for debugging, logging, or error messages to provide context about where the expression came from.
     * @returns the original syntax string of the expression.
     */
    public getSyntax(): string {
        return this.syntax;
    }

    /**
     * What data keys are required for this expression to be evaluated? This information is used by the rule engine to determine the dependencies between expressions and rules, and to ensure that all necessary data is available before evaluating the expression.
     * @returns a set of data keys required for this expression to be evaluated.
     */
    public abstract required(): Set<string>;

    /**
     * What functions are invoked by this expression? This information can be used for optimization, caching, or to determine which function nodes in the graph are relevant for this expression.
     * @returns a set of function names invoked by this expression.
     */
    public abstract invokes(): Set<string>;

    /**
     * What expressions comprise the expression for use in caching/memoization.
     * @returns an array of expressions that can be cached/memoized.
     */
    public abstract getParts(): Expression[];

    /**
     * Evaluate the expression in the given context to compute its value. 
     * The implementation of this method will depend on the specific type of expression 
     * and how it computes its value based on the data in the context.
     * @param context the current working context containing data and constants.
     * @returns the computed value of the expression.
     */
    public abstract evaluate(context: WorkingContext): any;

    /**
     * Check the types of the expression using the provided type checker.
     * @param checker the type checker to use for validating the expression's types.
     * @returns the result of the type check.
     */
    public abstract checkTypes(checker?: TypeChecker): ValidationResult;

    /**
     * Get a string representation of the expression, which can be used for debugging, logging, or error messages.
     * @returns a string representation of the expression.
     */
    public abstract toString(): string;

    public abstract toJS(): string;

    /**
     * Get a JSON representation of the expression, which can be used for serialization, logging, 
     * or visualization.
     * @returns a JSON representation of the expression.
     */
    public abstract toJson(): Renderable;
}

export abstract class BooleanExpression extends Expression {

    public abstract evaluate(context: WorkingContext): boolean;
}

export abstract class NumericExpression extends Expression {

    public abstract evaluate(context: WorkingContext): number;
}

export abstract class StringExpression extends Expression {

    public abstract evaluate(context: WorkingContext): string;
}

export abstract class DateExpression extends Expression {

    public abstract evaluate(context: WorkingContext): Date;
}