import type { Expression } from "../syntax/expression";
import type { ArrayType, AtomicType, ObjectType } from "../types";
import type { Executor, WorkingContext, RuleEffect, HasValidity, TypeChecker, ValidationResult } from "../interfaces";
import { getReturnType } from "../type.utils";
import { equalsDeep, mergeValidationResults } from "../common.utils";
import { RuleException } from "./exception";
import { isAtomicType } from "../parser/type.parser";
import { withLogger, Logger } from "../logging";
import type { Renderable } from "../rendering/render.types";
import { FunctionCompiler } from "../parser/function.compiler";

/**
 * An executable action represents a specific operation that can be executed in the context of a rule.
 * This can include actions like setting an output value, throwing an exception, or any other operation 
 * that can be performed as a consequence of a rule being satisfied.
 * Each executable action must specify what data keys it requires to be evaluated and what data keys it will change when executed. 
 * This allows the rule engine to manage dependencies between rules and ensure that rules are executed 
 * in the correct order based on their requirements and effects.
 */
export abstract class ExecutableAction implements Executor, HasValidity {

    protected preparedEffect?: Partial<RuleEffect>;

    protected compiled?: Function;

    /**
     * What data keys are required for this action to be evaluated? 
     * @returns a set of data keys required for this action to be evaluated.
     */
    public abstract required(): Set<string>;

    /**
     * What functions are invoked by this action? This information can be used for optimization, caching, or to determine which function nodes in the graph are relevant for this action.
     * @returns a set of function names invoked by this action.
     */
    public abstract invokes(): Set<string>;

    /**
     * What data keys will be changed when this action is executed, along with their expected types?
     * @returns a record mapping data keys to their expected types.
     */
    public abstract typedChanges(checker?: TypeChecker): Record<string, AtomicType | ArrayType | ObjectType>;

    public prepareEffect(partial: Partial<RuleEffect>): this {
        this.preparedEffect = { ...this.preparedEffect, ...partial };
        return this;
    };

    public abstract toString(): string;

    public abstract toJS(): string;

    public abstract toJson(): Renderable;

    public abstract checkTypes(checker?: TypeChecker): ValidationResult;

    public abstract execute(context: WorkingContext): RuleEffect;
}

/**
 * A simple action that sets a specific output key to the value of an expression when executed.
 * This is a common type of action that can be used in many rules to produce an output based on the evaluation of an expression.
 * The action specifies which output key it will set and what expression will be evaluated to determine the value to set.
 */
export class OutputAction extends ExecutableAction {

    private key: string;

    private value: Expression;

    constructor(key: string, value: Expression) {
        super();
        this.key = key;
        this.value = value;

        if (FunctionCompiler.enabled) {
            // Check for missing function dependencies before attempting to compile the expression, and log a warning if any are found. 
            // This helps to avoid runtime errors when executing the compiled function.
            if (FunctionCompiler.missingFunctions(this.value)) {
                Logger.warn(`Cannot compile OutputAction for key '${this.key}' due to missing function dependencies`);
            } else {
                this.compiled = FunctionCompiler.compileFunction([], `return ${this.value.toJS()};`);
            }
        }
    }


    public required(): Set<string> {
        return this.value.required();
    }

    public invokes(): Set<string> {
        return this.value.invokes();
    }

    public typedChanges(checker?: TypeChecker): Record<string, AtomicType | ArrayType | ObjectType> {
        return { [this.key]: getReturnType(this.value, checker) as AtomicType | ArrayType | ObjectType };
    }

    public toString(): string {
        return `SET ${this.key} = ${this.value.toString()}`;
    }

    public toJS(): string {
        return `${this.key} = ${this.value.toJS()}`;
    }

    public toJson(): Renderable {
        return {
            type: 'OutputAction',
            output: this.key,
            expression: this.value.toJson(),
        };
    }

    public checkTypes(checker?: TypeChecker): ValidationResult {
        if (!checker) {
            return { valid: true };
        }

        const checks: ValidationResult[] = [];
        if (checker.strictSyntax() || checker.strictInputs()) {
            checks.push(this.value.checkTypes(checker));
        }
        if (checker.strictOutputs()) {
            if (!checker.hasType(this.key)) {
                checks.push({ valid: false, errors: [`Undefined output variable: ${this.key}`] });
            }
            const keyType = checker.getType(this.key);
            // TODO: Support array types in output validation?
            if (!isAtomicType(keyType!)) {
                checks.push({ valid: false, errors: [`Output key '${this.key}' is not an atomic type`] });
            }
            const returnType = getReturnType(this.value, checker);
            if (keyType && returnType && keyType !== returnType) {
                checks.push({
                    valid: false,
                    errors: [`Type mismatch for output key '${this.key}': expected ${keyType}, but got ${returnType}`]
                });
            }
        }
        return mergeValidationResults(...checks);
    }

    public execute(context: WorkingContext): RuleEffect {
        const oldValue = context.get(this.key);
        const newValue = (this.compiled && FunctionCompiler.enabled)
            ? this.compiled(context)
            : this.value.evaluate(context);

        if (withLogger(context.logger(), equalsDeep)(oldValue, newValue)) {
            return {};
        } else {
            context.setOutput(this.key, newValue);
            return { ...this.preparedEffect, changed: this.key };
        }
    }
}


/**
 * A composite action allows for combining multiple executable actions into a single action that executes all of them together. 
 * This can be useful for rules that need to perform multiple operations as a consequence of being satisfied, 
 * such as setting multiple output values or performing a series of operations in sequence.
 */
export class CompositeAction extends ExecutableAction {

    private actions: ExecutableAction[];

    constructor(actions: ExecutableAction[]) {
        super();
        this.actions = actions;
    }

    public required(): Set<string> {
        const requirements = new Set<string>();
        for (const action of this.actions) {
            for (const req of action.required()) {
                requirements.add(req);
            }
        }
        return requirements;
    }

    public invokes(): Set<string> {
        const all = this.actions.flatMap(action => Array.from(action.invokes()));
        return new Set(all);
    }

    public typedChanges(checker?: TypeChecker): Record<string, AtomicType | ArrayType | ObjectType> {
        let changes: Record<string, AtomicType | ArrayType | ObjectType> = {};
        for (const action of this.actions) {
            changes = { ...changes, ...action.typedChanges(checker) };
        }
        return changes;
    }

    public toString(): string {
        return this.actions.map(action => action.toString()).join('; ');
    }

    public toJS(): string {
        return this.actions.map(action => action.toJS()).join(';\n');
    }

    public toJson(): Renderable {
        return {
            type: 'CompositeAction',
            elements: this.actions.map(action => action.toJson()),
        };
    }

    public checkTypes(checker?: TypeChecker): ValidationResult {
        const checks: ValidationResult[] = [];
        for (const action of this.actions) {
            checks.push(action.checkTypes(checker));
        }
        return mergeValidationResults(...checks);
    }

    public execute(context: WorkingContext): RuleEffect {
        const effects: RuleEffect[] = [];
        for (const action of this.actions) {
            const effect = action.execute(context);
            effects.push(effect);
            if (effect.exception) {
                break;
            }
        }
        // Merge effects
        const mergedEffect: RuleEffect = {};
        for (const effect of effects) {
            if (effect.exception) {
                mergedEffect.exception = effect.exception;
                break;
            }
            if (effect.changed) {
                let changes = mergedEffect.changed ? mergedEffect.changed + ', ' : '';
                mergedEffect.changed = changes + effect.changed;
            }
        }
        return { ...this.preparedEffect, ...mergedEffect };
    }
}

/**
 * An action that throws an exception when executed. 
 * This can be used in rules that need to indicate an error condition.
 */
export class ExceptionThrower extends ExecutableAction {

    private errorMessage: string;

    constructor(errorMessage: string) {
        super();
        this.errorMessage = errorMessage;
    }

    public required(): Set<string> {
        return new Set();
    }

    public invokes(): Set<string> {
        return new Set();
    }

    public typedChanges(checker?: TypeChecker): Record<string, AtomicType | ArrayType | ObjectType> {
        return {}
    }

    public toString(): string {
        return `THROW ${this.errorMessage}`;
    }

    public toJS(): string {
        return `throw new Error("${this.errorMessage}")`;
    }

    public toJson(): Renderable {
        return {
            type: 'ExceptionThrower',
            value: this.errorMessage,
        };
    }

    public checkTypes(checker?: TypeChecker): ValidationResult {
        return { valid: true };
    }

    public execute(context: WorkingContext): RuleEffect {
        context.addException(new RuleException(this.errorMessage, context));
        return { ...this.preparedEffect, exception: this.errorMessage };
    }
}    