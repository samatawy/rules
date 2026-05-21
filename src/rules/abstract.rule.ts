import type { ArrayType, AtomicType, ObjectType } from "../types";
import type { WorkingContext, Evaluator, RuleEffect, Executor, HasValidity, ValidationResult, TypeChecker } from "../interfaces";
import type { Expression } from "../syntax/expression";

/**
 * Abstract base class for all rules in the system, providing common properties and methods for evaluating and executing rules. 
 * Each specific rule type (e.g. conditional rules, assignment rules) should extend this class 
 * and implement the abstract methods for evaluation and execution.
 */
export abstract class AbstractRule implements Evaluator, Executor, HasValidity {

    /**
     * Optional name for the rule, which can be used for identification and debugging purposes.
     */
    public name?: string;

    /**
     * An optional hint or description for the rule, which can provide additional information about its purpose or usage. 
     * This is primarily for documentation and user guidance when working with the rule.
     */
    public hint?: string;

    private syntax: string;

    private disabled?: boolean;

    private salience?: number;

    private requirements: Set<string>;

    private changeTargets: Record<string, AtomicType | ArrayType | ObjectType>;

    constructor(syntax: string, salience?: number) {
        this.syntax = syntax;
        this.requirements = new Set<string>();
        this.changeTargets = {};
        this.salience = salience;
    }

    /**
     * Get the original syntax string from which this rule was created. This can be useful for debugging and error reporting, as it allows you to see the exact rule definition that led to a particular rule instance.
     * @returns the original syntax string of the rule.
     */
    public getSyntax(): string {
        return this.syntax;
    }

    /**
     * Get the salience (priority) of the rule, which determines the order in which rules are evaluated and executed when multiple rules are applicable. Higher salience means higher priority. If salience is not set, it defaults to 0.
     * @returns the salience (priority) of the rule where 0 is default and 10 is the highest.
     */
    public getSalience(): number {
        return this.salience ?? 0;
    }

    /**
     * Set the salience (priority) of the rule, which determines the order in which rules are evaluated and executed when multiple rules are applicable. Higher salience means higher priority. If salience is not set, it defaults to 0.
     * @param salience the salience (priority) of the rule where 0 is default and 10 is the highest.
     */
    public setSalience(salience: number): void {
        this.salience = salience;
    }

    /**
     * Check whether the rule is currently disabled. A disabled rule will not be evaluated or executed by the engine.
     * @returns true if the rule is disabled, false otherwise.
     */
    public isDisabled(): boolean {
        return this.disabled ?? false;
    }

    /**
     * Disable the rule, preventing it from being evaluated or executed by the engine. 
     * This can be useful for temporarily turning off rules without removing them from the system, such as during testing.
     * Optionally, a reason can be provided for why the rule is being disabled, which will be included in the hint if no hint is already set for the rule.
     * @param reason a hint or reason for why the rule is being disabled.
     */
    public disable(reason?: string): void {
        this.disabled = true;
        if (reason && !this.hint) {
            this.hint = `Disabled: ${reason}`;
        }
    }

    /**
     * Enable the rule, allowing it to be evaluated and executed by the engine if it is applicable. 
     * This can be used to re-enable a rule that was previously disabled.
     */
    public enable(): void {
        this.disabled = false;
    }

    /**
     * The condition to be evaluated and satisified.
     * @returns the expression to be evaluated in this rule.
     */
    public abstract getExpression(): Expression;

    protected require(...requirements: string[]): void {
        for (const requirement of requirements) {
            this.requirements.add(requirement);
        }
    }

    /**
     * What data keys are required for this rule to be applicable? 
     * This is determined by the specific implementation of the rule and should be set during the construction of the instance. 
     * The rule engine uses this information to determine which rules are applicable based on the current context.
     * @returns a set of data keys required for this rule to be applicable.
     */
    public required(): Set<string> {
        return new Set(this.requirements);
    }

    /**
     * Declare what keys (and their types) that are expected in the relevant context when this rule is executed.
     * @param changes a record mapping changed data keys to their expected types.
     */
    protected willChange(changes: Record<string, AtomicType | ArrayType | ObjectType>): void {
        for (const target of Object.keys(changes)) {
            if (changes[target]) {
                this.changeTargets[target] = changes[target];
            }
        }
    }

    public typedChanges(): Record<string, AtomicType | ArrayType | ObjectType> {
        const typedChanges: Record<string, AtomicType | ArrayType | ObjectType> = {};
        for (const [key, type] of Object.entries(this.changeTargets)) {
            typedChanges[key] = type;
        }
        return typedChanges;
    }

    /**
     * Whether this rule is applicable in the given context, 
     * based on whether all of its required data keys are present in the context.
     * @param context the current working context containing data and constants.
     * @returns true if the rule is applicable, false otherwise.
     */
    public applicable(context: WorkingContext): boolean {
        const required = this.required();
        if (required.size === 0) {
            return true;
        }
        for (const requirement of required) {
            if (!context.hasData(requirement) && !context.hasConstant(requirement)) {
                return false;
            }
        }
        return true;
    }

    public abstract toString(): string;

    /**
     * Check the types of the rule using the provided type checker. 
     * This method should validate that all expressions and components of the rule are type-correct 
     * according to the types known to the checker instance.
     * @param checker the type checker to use for validating the rule.
     * @returns the result of the type check, indicating whether the rule is valid.
     */
    public abstract checkTypes(checker?: TypeChecker): ValidationResult;

    /**
     * Evaluate the rule in the given context to determine if it is satisfied and should be executed.
     * @param context the current working context containing data and constants.
     * @returns an executor if the rule is satisfied, null otherwise.
     */
    public abstract evaluate(context: WorkingContext): Executor | null;

    /**
     * Execute the rule in the given context and return the effect of the execution.
     * This method should only be called if the rule has been evaluated and found to be satisfied.
     * @param context the current working context containing data and constants.
     * @returns the effect of executing the rule.
     */
    public abstract execute(context: WorkingContext): RuleEffect;
}
