import { AbstractRule } from "../rules/abstract.rule";
import { cloneDeep, mergeValidationResults, pathExists } from "../common.utils";
import type { Clonable, Executor, TypeChecker, ValidationResult, WorkingContext } from "../interfaces";
import { WorkingMemory } from "./working.memory";
import { RuleGraph } from "./graph/rule.graph";
import { ReteGraph } from "./graph/rete.graph";
import { CombinationNode, RuleOutputNode, type AbstractNode } from "./graph/nodes";
import { RuleParser } from "../parser/rule.parser";
import { RuleRegistry } from "./rule.registry";
import { WorkspaceTypeChecker } from "./workspace.type.checker";
import { FunctionRegistry } from "./function.registry";
import { FunctionParser } from "../parser/function.parser";
import { TypeRegistry } from "./type.registry";
import { EngineError, EngineException, ParserError, TypeException } from "../rules/exception";
import { RulesEngine } from "./rules.engine";
import * as commonConstants from "./common.constants";
import { withLogger } from "../logging/work.logger";
import { ContextLogger } from "../logging/context.logger";
import { CommandRegistry } from "../commands/command.registry";
import type { FunctionDefinition } from "../types";

/**
 * Options for configuring the behavior of the Workspace, including debugging, conflict resolution, and iteration limits.
 */
export interface WorkspaceOptions {

    /**
     * Enable or disable strict conflict resolution. 
     * When true, the workspace will enforce strict rules for resolving conflicts between competing rules, potentially throwing errors if conflicts are detected.
     */
    strict_conflicts: boolean;

    /**
     * Enable or disable strict syntax validation.
     * When true, the workspace will validate that all rules and expressions conform to expected syntax,
     * potentially throwing errors if syntax is invalid. This can be used to catch issues early in development.
     */
    strict_syntax: boolean;

    /**
     * Enable or disable strict input validation. 
     * When true, the workspace will validate input data against defined types and may reject inputs 
     * that do not conform to expected structures, ensuring that rules are evaluated with correctly typed data.
     */
    strict_inputs: boolean;

    /**
     * Enable or disable strict output validation.
     * When true, the workspace will validate the outputs of rule execution against defined types 
     * and may throw errors if outputs do not conform to expected structures, 
     * ensuring that rule consequences produce correctly typed data.
     */
    strict_outputs: boolean;

    /**
     * The maximum number of iterations the workspace will perform when evaluating rules.
     * This helps prevent infinite loops in rule evaluation.
     */
    max_iterations: number;
}

/**
 * The Workspace class serves as the central hub for managing rules, constants, and their evaluation.
 * It maintains a collection of rules, a graph structure for efficient rule retrieval, and a set of constants that can be used in rule evaluation.
 * The workspace provides methods for adding rules and constants, loading contexts for evaluation, and processing rules against given data.
 */
export class Workspace implements Clonable<Workspace> {

    protected rules: RuleRegistry;

    protected graph: RuleGraph;

    public reteGraph: ReteGraph;

    protected constants: Record<string, any>;

    protected type_checker: WorkspaceTypeChecker;

    protected types: TypeRegistry;

    protected functions: FunctionRegistry;

    protected commands: CommandRegistry;

    protected options: WorkspaceOptions;

    public static default(): Workspace {
        return RulesEngine.defaultSpace();
    }

    /**
     * Create a new Workspace instance, the starting point for managing rules, constants, and their evaluation.
     * @param options Optional configuration settings for the workspace.
     */
    constructor(options?: Partial<WorkspaceOptions>) {
        this.constants = commonConstants;
        this.functions = new FunctionRegistry(options);
        this.types = new TypeRegistry(options);
        this.type_checker = new WorkspaceTypeChecker(this.types, options);
        this.rules = new RuleRegistry(options);
        this.graph = new RuleGraph();
        this.reteGraph = new ReteGraph();
        this.commands = new CommandRegistry({ workspace: this });


        this.options = {
            strict_conflicts: false,
            strict_syntax: true,
            strict_inputs: false,
            strict_outputs: false,
            max_iterations: 100,
            ...options
        };
    }

    /**
     * Create a clone of the current Workspace instance, including all rules, constants, types, and functions.
     * This is useful for creating isolated copies of the workspace for testing, experimentation, or parallel processing 
     * without affecting the original workspace.
     * You can safely mutate a cloned workspace without affecting the source, since no references are shared.
     * 
     * @returns a new Workspace instance that is a deep clone of the current workspace.
     */
    public clone(): Workspace {
        const cloned = new Workspace(this.options);

        // Clone constants
        // Create a new object to ensure that the constants in the cloned workspace are not the same reference 
        // as those in the original workspace, preventing unintended side effects from mutations.
        cloned.addConstants({ ...this.constants });

        // Clone types
        // Create new RootType objects to ensure they are not the same reference 
        // as those in the original workspace, preventing unintended side effects from mutations.
        const clonedTypes = cloned.typeRegistry();
        clonedTypes.addRootTypes(cloneDeep(this.types.getRootTypes()));

        // Clone functions
        // Create new FunctionDefinition objects to ensure they are not the same reference 
        // as those in the original workspace, preventing unintended side effects from mutations.
        const clonedFunctions = cloned.functionRegistry();
        const functionParser = new FunctionParser({ workspace: this });
        for (const value of Object.values(this.functions.getFunctions())) try {
            const clonedFunction = functionParser.clone(value);
            clonedFunctions.addFunction(clonedFunction);
        } catch (e) {
            throw new EngineError(`Failed to clone function: ${value.name}. Error: ${e instanceof Error ? e.message : String(e)}`);
        }

        // Clone rules
        // Create new rule objects to ensure they are not the same reference
        // as those in the original workspace, preventing unintended side effects from mutations.
        const ruleParser = new RuleParser({ workspace: this });
        for (const rule of this.rules.getRules()) try {
            const clonedRule = ruleParser.clone(rule);
            cloned.addRule(clonedRule);
        } catch (e) {
            throw new EngineError(`Failed to clone rule: ${rule.getSyntax()}. Error: ${e instanceof Error ? e.message : String(e)}`);
        }

        return cloned;
    }

    public import(source: Workspace): void {

        // Clone constants
        // Create a new object to ensure that the constants in the cloned workspace are not the same reference 
        // as those in the original workspace, preventing unintended side effects from mutations.
        this.addConstants({ ...source.constants });

        // Clone types
        // Create new RootType objects to ensure they are not the same reference 
        // as those in the original workspace, preventing unintended side effects from mutations.
        this.types.addRootTypes(cloneDeep(source.types.getRootTypes()));

        // Clone functions
        // Create new FunctionDefinition objects to ensure they are not the same reference 
        // as those in the original workspace, preventing unintended side effects from mutations.
        const functionParser = new FunctionParser({ workspace: this });
        for (const value of Object.values(source.functions.getFunctions())) try {
            const clonedFunction = functionParser.clone(value);
            this.functions.addFunction(clonedFunction);
        } catch (e) {
            throw new EngineError(`Failed to clone function: ${value.name}. Error: ${e instanceof Error ? e.message : String(e)}`);
        }

        // Clone rules
        // Create new rule objects to ensure they are not the same reference
        // as those in the original workspace, preventing unintended side effects from mutations.
        const ruleParser = new RuleParser({ workspace: this });
        for (const rule of source.rules.getRules()) try {
            const clonedRule = ruleParser.clone(rule);
            this.addRule(clonedRule);
        } catch (e) {
            throw new EngineError(`Failed to clone rule: ${rule.getSyntax()}. Error: ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    /**
     * Get the options currently set for the workspace, which control various aspects of its behavior 
     * such as debugging, conflict resolution, and validation strictness.
     * @returns an object containing the current workspace options.
     */
    public getOptions(): WorkspaceOptions {
        return { ...this.options };
    }

    /**
     * Set or update the options for the workspace. This allows you to configure the behavior of the workspace,
     * such as debugging, conflict resolution, and validation strictness.
     * @param options an object containing the options to set or update.
     */
    public setOptions(options: Partial<WorkspaceOptions>): void {
        this.options = { ...this.options, ...options };

        this.functions.setOptions(options);
        this.types.setOptions(options);
        this.type_checker.setOptions(options);
        this.rules.setOptions(options);
    }

    /**
     * Add multiple constants to the workspace. 
     * Constants are key-value pairs that can be used in rule evaluation and are accessible across all rules.
     * @param constants a json object containing constant names as keys and their corresponding values.
     */
    public addConstants(constants: Record<string, any>): void {
        this.constants = { ...this.constants, ...constants };
    }

    /**
     * Add a single constant to the workspace.
     * @param key the name of the constant.
     * @param value the value of the constant.
     */
    public addConstant(key: string, value: any): void {
        this.constants[key] = value;
    }

    /**
     * Check if a constant exists in the workspace.
     * @param key the name of the constant.
     * @returns true if the constant exists, false otherwise.
     */
    public hasConstant(key: string): boolean {
        return pathExists(this.constants, key);
    }

    /**
     * Get the value of a constant by its name.
     * @param key the name of the constant.
     * @returns the value of the constant, or undefined if the constant does not exist.
     */
    public getConstant(key: string): any {
        return this.constants[key];
    }

    /**
     * Get all constants currently stored in the workspace as a key-value object.
     * @returns an object containing all constants in the workspace, where keys are constant names and values are their corresponding values.
     */
    public getConstants(): Record<string, any> {
        return { ...this.constants };
    }

    /**
     * Clear all constants from the workspace. 
     * This will remove all existing constants and their values, effectively resetting the constants to an empty state.
     */
    public clearConstants(): void {
        this.constants = {};
    }

    /**
     * Add a rule to the workspace. 
     * The rule can be provided as a string containing the rule syntax, or as an already created AbstractRule instance.
     * If a string is provided, it will be parsed into an AbstractRule using the RuleParser.
     * @param rule a created rule, or rule syntax containing annotations
     * @param salience the optional priority of the rule, higher values indicate higher priority. Defaults to 0.
     */
    public addRule(rule: string | AbstractRule, salience?: number): void {
        if (typeof rule === 'string') try {
            rule = new RuleParser({ workspace: this }).parse(rule) as AbstractRule;
        } catch (e) {
            throw new ParserError(`Failed to parse rule: ${rule}. Error: ${e instanceof Error ? e.message : String(e)}`);
        }
        if (salience !== undefined) {
            rule.setSalience(salience);
        }
        this.rules.addRule(rule);
        this.graph.addRule(rule);
        this.reteGraph.addRule(rule);
    }

    /**
     * Find a rule by its name.
     * @param name the name of the rule to find.
     * @returns the rule with the given name, or undefined if no such rule exists in the workspace.
     */
    public getRule(name: string): AbstractRule | undefined {
        return this.rules.getRule(name);
    }

    /**
     * List all rules currently stored in the workspace.
     * @returns an unsorted array of all rules in the workspace.
     */
    public getRules(): AbstractRule[] {
        return this.rules.getRules();
    }

    /**
     * Clear all rules from the workspace.
     * This will effectively create a new rule graph and remove all existing rules.
     */
    public clearRules(): void {
        this.rules.clear();
        this.graph = new RuleGraph();
    }

    /**
     * Debugging method to get the current rule graph.
     * @returns the current RuleGraph instance representing rules and their dependencies in the workspace.
     */
    public getRuleGraph(): RuleGraph {
        return this.graph;
    }

    /**
     * Add a function to the workspace. 
     * The function can be provided as a string containing the function syntax, or as an already created FunctionDefinition instance.
     * If a string is provided, it will be parsed into a FunctionDefinition using the FunctionParser.
     * @param func a created function, or function syntax containing annotations
     */
    public addFunction(func: string | FunctionDefinition): void {
        if (typeof func === 'string') try {
            func = new FunctionParser({ workspace: this }).parse(func) as FunctionDefinition;
        } catch (e) {
            throw new ParserError(`Failed to parse function: ${func}. Error: ${e instanceof Error ? e.message : String(e)}`);
        }
        this.functions.addFunction(func);
    }

    /**
     * Debugging method to get the type checker of the workspace, responsible for managing type definitions 
     * and performing type checks during rule evaluation.
     * @returns the TypeChecker instance used by the workspace.
     */
    public typeChecker(): TypeChecker {
        return this.type_checker;
    }

    public typeRegistry(): TypeRegistry {
        return this.types;
    }

    public functionRegistry(): FunctionRegistry {
        return this.functions;
    }

    public commandRegistry(): CommandRegistry {
        return this.commands;
    }

    public clearSpace(): void {
        this.clearRules();
        this.clearConstants();
        this.typeRegistry().clear();
        this.functionRegistry().clear();
        this.commandRegistry().clear();
    }

    public checkTypes(): ValidationResult {
        const checks: ValidationResult[] = [];

        checks.push(...this.functions.checkTypes(this.type_checker));

        for (const rule of this.rules.getRules()) {
            const check = rule.checkTypes(this.type_checker);
            if (!check.valid) {
                // TODO: Should add each error separately to get more detailed error messages 
                // or merge them into one message per rule?
                // checks.push({ valid: false, errors: [`Type check failed for rule ${rule.toString()}: ${check.errors?.join('; ')}`] });
                for (const error of check.errors || []) {
                    checks.push({ valid: false, errors: [`Type check failed for rule ${rule.toString()}: ${error}`] });
                }
            }
        }
        return mergeValidationResults(...checks);
    }

    /**
     * Create a working memory to wrap input data and hold outputs and exceptions during rule evaluation. 
     * The working memory serves as the context in which rules are evaluated and executed.
     * @param data Any input data that needs to be evaluated.
     * @returns a new instance of WorkingMemory initialized with the given data and the current workspace.
     */
    public loadContext(data: any): WorkingMemory {
        return new WorkingMemory(data, this);
    }

    /**
     * Get all rules that are applicable to the given context.
     * This is primarily an explanatory feature, and does NOT return the rules that will be executed. 
     * This is done by traversing the rule graph starting from the root nodes that match the keys in the context, 
     * and collecting all rules that are reachable and applicable based on their requirements.
     * @param context the working memory context that contains the current state of data.
     * @returns an array of applicable rules that can be evaluated against the given context.
     */
    public applicableRules(context: WorkingContext): AbstractRule[] {

        const applicable = new Set<AbstractRule>();
        const logger = context.logger();

        for (const key of context.rootKeys()) {
            const root = this.graph.findRoot(key);
            if (!root) {
                logger.warn('No root found for key:', key);
                continue;
            }
            if (root) {
                let currentContext = context.getData(key);
                let currentNode: AbstractNode = root;
                const found = this.readRulesFromNode(currentNode, currentContext);
                for (const rule of found) {
                    applicable.add(rule);
                }
            }
        }

        return Array.from(applicable);
    }

    private readRulesFromNode(currentNode: AbstractNode, currentContext: any): Set<AbstractRule> {
        const found: Set<AbstractRule> = new Set();
        if (currentNode instanceof RuleOutputNode) {
            found.add(currentNode.rule);
            return found;
        }
        for (const child of currentNode.children) {
            if (child instanceof RuleOutputNode) {
                found.add(child.rule);
            }
            if (child instanceof CombinationNode) {
                const childRules = this.readRulesFromNode(child, currentContext);
                for (const rule of childRules) {
                    found.add(rule);
                }
            }
        }
        if (Array.isArray(currentContext)) {
            // Iterate over child items of array context
            for (let itemContext of currentContext) {
                const itemNodes = this.readRulesFromNode(currentNode, itemContext);
                for (const rule of itemNodes) {
                    found.add(rule);
                }
            }

        } else if (typeof currentContext === 'object' && currentContext !== null) {
            // Iterate over child keys of object context
            const childKeys = Object.keys(currentContext);

            if (childKeys.length === 0) {
                return found;
            } else {
                for (const childKey of childKeys) {
                    const childNode = currentNode.findChild(childKey);
                    if (childNode) {
                        const childRules = this.readRulesFromNode(childNode, currentContext[childKey]);
                        for (const rule of childRules) {
                            found.add(rule);
                        }
                    }
                }
            }
        }
        return found;
    }

    private flattenKeys(data: any, prefix: string = ''): Set<string> {
        const paths = new Set<string>();
        const valueMap = new Map<string, any>();

        if (data === null || data === undefined) return paths;

        for (const [key, value] of Object.entries(data)) {
            if (value === undefined) {
                continue;
            } else {
                valueMap.set(prefix + key, value);
            }
        }

        for (const [path, value] of valueMap.entries()) {
            paths.add(path);

            if (Array.isArray(value)) {
                for (const item of value) {
                    const nestedPaths = this.flattenKeys(item, path + '.');
                    for (const nested of nestedPaths) {
                        paths.add(nested);
                    }
                }
            } else if (typeof value === 'object' && value !== null) {
                const nestedPaths = this.flattenKeys(value, path + '.');
                for (const nested of nestedPaths) {
                    paths.add(nested);
                }
            }
        }
        return paths;
    }

    /**
     * Use the rete graph to find rules relevant to a given array of input keys.
     * @param data_ids an array of flattened data keys from a context.
     * @param context the context to use while traversing the graph.
     * @returns a set of rules relevant to the given data keys.
     */
    protected findReteRules(data_ids: string[], context: WorkingContext): Set<AbstractRule> {
        const foundRules: Set<AbstractRule> = new Set<AbstractRule>();

        for (const id of data_ids) {
            const rules = this.reteGraph.getRulesFrom(id, context);
            for (const rule of rules) {
                foundRules.add(rule);
            }
        }
        return foundRules;
    }

    /**
     * Get all rules that should be executed on the given context. 
     * This is done by traversing the rete graph starting from the data nodes that match the keys in the context, 
     * and collecting all rules that are reachable and executable based on decision expressions.
     * @param context the working memory context that contains the current state of data.
     * @returns an array of applicable rules that can be evaluated against the given context.
     */
    public executableRules(context: WorkingContext): AbstractRule[] {
        const keyset = this.flattenKeys(context.getOutput());
        const ruleset = this.findReteRules(Array.from(keyset), context);
        return Array.from(ruleset);
    }

    /**
     * Evaluate relevant rules against the given context, and execute their consequences. 
     * This process is iterative and continues until no new rules become applicable 
     * or a maximum iteration limit is reached to prevent infinite loops.
     * In each iteration, all currently applicable rules are evaluated and their executors are collected.
     * Then, all executors are executed in a batch.
     * @param context the working memory context that contains the current state of data.
     * @returns the final output after processing all applicable rules.
     */
    public process(context: WorkingMemory): boolean {

        context.clearLog();
        const logger = context.logger();

        const checkDataLogged = withLogger(logger, this.type_checker.checkData.bind(this.type_checker));
        const typeCheck = checkDataLogged(context.getOutput());

        if (typeCheck.valid) {
            logger.debug('Input data passed type validation.');
        } else {
            const errorMessage = `Input data failed type validation with errors: ${typeCheck.errors?.join('; ')}`;
            logger.warn(errorMessage);
            if (this.options.strict_inputs) {
                for (const error of typeCheck.errors || []) {
                    logger.error('Type validation error:', error);
                    context.addException(new TypeException(error));
                }
                return false;

            } else {
                logger.warn('Proceeding with rule evaluation despite type validation errors due to non-strict input settings.');
            }
        }

        let satisfied: AbstractRule[] = [];
        let rootKeys = this.flattenKeys(context.getOutput());
        let applicable = this.findReteRules(Array.from(rootKeys), context);
        let iterate = (applicable.size > 0), iteration = 0;
        let executors: Executor[] = [];
        let changes: string[];
        const maxIterations = this.options.max_iterations;

        while (iterate && iteration < maxIterations) {
            logger.debug(`Iteration ${iteration + 1}: Applicable rules:`, applicable.size);

            iteration++;
            iterate = false;
            satisfied = [];
            executors = [];
            changes = [];

            // Evaluate all applicable rules and collect their executors
            const sorted = this.rules.sortRules(Array.from(applicable), logger);
            for (const rule of sorted) try {
                logger.debug('Evaluating rule:', rule.toString());

                const evaluateLogged = withLogger(logger, rule.evaluate.bind(rule));
                const executor = evaluateLogged(context);

                if (executor) {
                    satisfied.push(rule);
                    executors.push(executor);
                }
            } catch (e) {
                const errorMessage = `Error evaluating rule: ${e instanceof Error ? e.message : String(e)}`;
                logger.warn(errorMessage, { rule: rule.getSyntax() });
                context.addException(new EngineException(errorMessage, { rule: rule.getSyntax() }));
                return false;
            }

            // Execute all collected executors and track if any outputs were changed
            for (const executor of executors) try {
                const idx = executors.indexOf(executor);

                const executeLogged = withLogger(logger, executor.execute.bind(executor));
                const effect = executeLogged(context);

                // Log the rule being executed
                if (satisfied[idx]) context.addToLog(satisfied[idx], effect);

                if (effect.exception) {
                    logger.warn('Executor threw an exception:', effect.exception);
                    iterate = false;
                    break;
                }
                if (effect.changed) {
                    changes.push(effect.changed);
                    logger.debug(`Executor changed output key: ${effect.changed} to value: ${context.getOutput(effect.changed)}`);
                    iterate = true;
                }
            } catch (e) {
                const errorMessage = `Error executing rule: ${e instanceof Error ? e.message : String(e)}`;
                logger.warn(errorMessage, { executor: executor });
                context.addException(new EngineException(errorMessage, { executor: executor }));
                return false;
            }

            // If any executors changed outputs, we need to check if new rules have become applicable
            if (iterate) {
                const nextApplicable = this.findReteRules(changes, context);
                iterate = nextApplicable.size > 0;
                logger.debug(iterate ? 'Iterating since changes' : 'Not iterating despite changes', changes);

                if (iterate) {
                    // Clean the cache to re-evaluate nodes (recursively)
                    for (const id of changes) {
                        this.reteGraph.clearCache(id, context);
                    }

                    applicable = nextApplicable;
                }
            }
        }

        // Maybe we should call this here?
        // context.commandHandler().executeDeferred();
        // or return it to the caller to execute after processing?

        // After processing, optionally log results
        if (iteration === maxIterations) {
            logger.warn(`Reached maximum iterations (${maxIterations}) while evaluating rules. There may be a cycle in the rules.`);
        } else if (iteration > 1) {
            logger.info(`Evaluation completed in ${iteration} iterations.`);
        } else {
            logger.info(`Evaluation completed in a single iteration.`);
        }
        logger.info('Final output after evaluation:', JSON.stringify(context.getOutput()));
        logger.info('Cache metrics', context.getCacheMetrics());

        if (logger instanceof ContextLogger) logger.flush();

        return context.getExceptions().length === 0;
    }

}