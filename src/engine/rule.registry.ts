import type { AbstractRule } from "../rules/abstract.rule";
import { EngineError } from "../rules/exception";
import type { WorkspaceOptions } from "./workspace";
import type { ILogger } from "../logging/interfaces";

/**
 * RuleRegistry is responsible for storing all rules in the workspace and managing their salience and potential conflicts. 
 * It provides methods to add, retrieve, list, and clear rules, as well as to sort them based on their salience. 
 * If strict conflict resolution is enabled, it also checks for potential conflicts where multiple rules change the same output key 
 * and resolves them by keeping only the rule with the highest salience.
 */
export class RuleRegistry {

    private rules: AbstractRule[];
    private options: Partial<WorkspaceOptions>;

    /**
     * Create a new RuleRegistry instance.
     * You should normally not need to create a RuleRegistry directly, as it is managed by the Workspace.
     * @param options Optional configuration settings for the rule registry.
     */
    constructor(options?: Partial<WorkspaceOptions>) {
        this.rules = [];

        this.options = {
            strict_conflicts: false,
            ...options
        };
    }

    /**
     * Set or update the options for the registry.
     * @param options an object containing the options to set or update.
     */
    public setOptions(options: Partial<WorkspaceOptions>): void {
        this.options = { ...this.options, ...options };
    }

    /**
     * Add a rule to the registry.
     * @param rule the rule to be added to the registry.
     */
    public addRule(rule: AbstractRule): void {
        this.rules.push(rule);
    }

    /**
     * Add multiple rules to the registry.
     * @param rules the rules to be added to the registry.
     */
    public addRules(rules: AbstractRule[]): void {
        for (const rule of rules) {
            this.addRule(rule);
        }
    }

    /**
     * Find a rule by its name.
     * @param name the name of the rule to find.
     * @returns the rule with the given name, or undefined if no such rule exists in the registry.
     */
    public getRule(name: string): AbstractRule | undefined {
        return this.rules.find(r => r.name === name);
    }

    /**
     * List all rules currently stored in the registry.
     * @returns an unsorted array of all rules in the registry.
     */
    public getRules(): AbstractRule[] {
        return this.rules;
    }

    /**
     * Clear all rules from the registry.
     */
    public clear(): void {
        this.rules = [];
    }

    protected preventConflicts(rules: AbstractRule[], logger: ILogger): AbstractRule[] {

        logger.debug(`Checking for potential conflicts among ${rules.length} applicable rules...`);

        // Detect potential conflicts where multiple rules change the same output key
        const effects: any = {};
        const distinctRules: AbstractRule[] = [];

        for (const rule of rules) {
            const changes = rule.typedChanges();
            for (const [key, type] of Object.entries(changes)) {
                if (!effects[key]) {
                    effects[key] = {};
                }
                const salience = rule.getSalience();
                effects[key]['' + salience] = effects[key]['' + salience] || [];
                effects[key]['' + salience].push(rule);
            }
        }
        logger.debug('Effects grouped by changed output key and salience:', effects);

        for (const change in effects) {
            const saliences = Object.keys(effects[change]).map(s => parseInt(s));
            const maxSalience = Math.max(...saliences);
            const effectiveRules = effects[change]['' + maxSalience];
            logger.debug(`For output key "${change}", found ${effectiveRules.length} rules with saliences: ${saliences.join(', ')}. Max salience: ${maxSalience}`);
            // If more than one rule has the highest salience, throw an error to prevent non-deterministic behavior
            if (effectiveRules.length > 1) {
                const conflictingRules = effectiveRules.map((r: AbstractRule) => r.toString()).join(', ');
                throw new EngineError(`Conflict detected: Multiple rules with salience ${maxSalience} change the same output key "${change}". Conflicting rules: ${conflictingRules}`);
            } else {
                distinctRules.push(...effectiveRules);
            }
        }
        logger.debug(`Conflict check completed. ${distinctRules.length} distinct rules after resolving conflicts.`);
        return distinctRules;
    }

    /**
     * Sort the given rules based on their salience.
     * If strict conflict resolution is enabled, conflicts are checked and resolved before sorting.
     * 
     * @param rules an array of rules to be sorted.
     * @returns a sorted array of rules, with higher salience rules appearing first.
     */
    public sortRules(rules: AbstractRule[], logger: ILogger): AbstractRule[] {
        if (this.options.strict_conflicts) {
            return this.preventConflicts(rules, logger);
        } else {
            return rules.sort((a, b) => b.getSalience() - a.getSalience());
        }
    }

}