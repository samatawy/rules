import type { AbstractRule } from "../../rules/abstract.rule";
import { AbstractNode, CombinationNode, DependencyNode, InputNode, RuleOutputNode } from "./dependency.nodes";
import type { WorkingContext } from "../../interfaces";
import type { DependencyChain } from "./dependency.chain";

/**
 * The DependencyGraph class is responsible for organizing rules based on their required inputs and outputs, 
 * allowing for efficient evaluation and execution of rules in the correct order. 
 * It builds a graph structure where nodes represent data keys or rules, and edges represent dependencies between them.
 */
export class DependencyGraph {

    // The root nodes of the graph represent top-level data keys that rules depend on.
    // Only the first level of the graph consists of root nodes, 
    // and all other nodes are connected to these roots based on their dependencies.
    roots: AbstractNode[];

    // The rules of the graph represent all rules that have been added to the graph,
    // these are linked together by their dependencies
    dependants: RuleOutputNode[];

    dependencies: Record<string, DependencyNode>;

    // TODO: Not needed unless function parsing is tolerant of unknown functions
    //
    // The function nodes of the graph represent custom functions defined in the workspace, 
    // along with their dependencies. All functions are stored in this array, even dependent ones,
    // for easy access when adding rules that depend on them.
    // funcs: FunctionNode[];

    /**
     * Create a new DependencyGraph instance.
     * You should normally not need to create a DependencyGraph directly, as it is managed by the Workspace. 
     */
    constructor() {
        this.roots = [];
        this.dependants = [];
        this.dependencies = {};
        // this.funcs = [];
    }

    protected addRoot(node: AbstractNode): void {
        this.roots.push(node);
    }

    // TODO: Not needed unless function parsing is tolerant of unknown functions
    // protected addFunctionNode(node: FunctionNode): void {
    //     this.funcs.push(node);
    // }

    /**
     * Find a root node in the graph by its key. Root nodes represent top-level data keys that rules depend on.
     * @param key the key of the root node to find.
     * @returns the root node with the given key, or undefined if no such node exists.
     */
    public findRoot(key: string): InputNode | undefined {
        return this.roots.find(root => root instanceof InputNode && root.key === key) as InputNode | undefined;
    }

    // protected findFunctionNode(functionName: string): FunctionNode | undefined {
    //     return this.funcs.find(func => func.function.name === functionName);
    // }

    protected findOrCreateRoot(key: string): InputNode {
        let node = this.findRoot(key);
        if (!node) {
            node = new InputNode(key);
            this.addRoot(node);
        }
        return node;
    }

    protected findOrCreateChild(node: AbstractNode, key: string): AbstractNode {
        let childNode = node.findChild(key);
        if (!childNode) {
            childNode = new InputNode(key);
            node.addChild(childNode);
        }
        return childNode;
    }

    // TODO: Not needed unless function parsing is tolerant of unknown functions
    // public addFunction(function_def: FunctionDefinition, registry: FunctionRegistry): FunctionNode {
    //     const invokes: string[] = [];
    //     for (const line of function_def.lines || []) {
    //         invokes.push(...line.invokes());
    //     }
    //     invokes.push(...function_def.expression.invokes());

    //     const invokeSet = new Set(invokes);
    //     const parents: AbstractNode[] = [];

    //     for (const parent_func of invokeSet) {
    //         if (FunctionParser.isReservedName(parent_func)) {
    //             continue;
    //         }
    //         const found_node = this.findFunctionNode(parent_func);
    //         if (found_node) {
    //             parents.push(found_node);
    //         } else {
    //             const found_def = registry.getFunction(parent_func);
    //             if (found_def) {
    //                 const new_node = this.addFunction(found_def, registry);
    //                 parents.push(new_node);
    //             } else {
    //                 throw new Error(`Function ${parent_func} invoked by ${function_def.name} is not defined in the function registry.`);
    //             }
    //         }
    //     }

    //     if (parents.length === 0) {
    //         // Only depended on built-in functions
    //         const funcNode = new FunctionNode(function_def);
    //         this.addFunctionNode(funcNode);
    //         return funcNode;

    //     } else if (parents.length === 1) {
    //         const funcNode = new FunctionNode(function_def);
    //         parents[0]?.addChild(funcNode);
    //         this.addFunctionNode(funcNode);
    //         return funcNode;

    //     } else {
    //         const combinationNode = new CombinationNode();
    //         for (const parent of parents) {
    //             parent.addChild(combinationNode);
    //         }
    //         const funcNode = new FunctionNode(function_def);
    //         combinationNode.addChild(funcNode);
    //         this.addFunctionNode(funcNode);
    //         return funcNode;
    //     }
    // }

    /**
     * Add a rule to the graph based on its required inputs. 
     * The rule is represented as a RuleNode, and it is connected to the nodes representing its required data keys. 
     * If multiple rules require the same data key, they are connected to a common CombinationNode to represent the dependency.
     * @param rule the rule to be added to the graph.
     * @returns void
     */
    public addRule(rule: AbstractRule): void {
        const required = rule.required();
        if (required.size === 0) {
            const root = new RuleOutputNode(rule);
            this.addRoot(root);
            this.dependants.push(root);
            return;
        }

        const parents: AbstractNode[] = [];

        for (const requirement of required) {
            const path = requirement.split(".");
            if (path.length === 0) {
                continue;
            } else if (path.length === 1) {
                const rootNode = this.findOrCreateRoot(requirement);
                parents.push(rootNode);
            } else {
                const rootKey = path[0]!;
                const rootNode = this.findOrCreateRoot(rootKey);
                let remaining = path.slice(1);
                let currentNode: AbstractNode = rootNode;

                for (const key of remaining) {
                    let childNode = this.findOrCreateChild(currentNode, key);
                    currentNode = childNode;
                }
                parents.push(currentNode);
            }
        }

        if (parents.length === 1) {
            const ruleNode = new RuleOutputNode(rule);
            parents[0]?.addChild(ruleNode);
            this.dependants.push(ruleNode);

        } else {
            const combinationNode = new CombinationNode();
            for (const parent of parents) {
                parent.addChild(combinationNode);
            }
            const ruleNode = new RuleOutputNode(rule);
            combinationNode.addChild(ruleNode);
            this.dependants.push(ruleNode);
        }
    }

    private buildRuleDependencies(): void {
        for (const ruleNode of this.dependants) {
            ruleNode.children = [];
            ruleNode.parents = [];

            const rule = ruleNode.rule;
            if (!rule) {
                continue;
            }
            const required = rule.required();
            for (const requirement of required) {
                let dependencyNode = this.dependencies[requirement];
                if (!dependencyNode) {
                    dependencyNode = new DependencyNode(requirement);
                    this.dependencies[requirement] = dependencyNode;
                }
                dependencyNode.addChild(ruleNode);
            }
            const changes = rule.typedChanges();
            for (const change of Object.keys(changes)) {
                let dependencyNode = this.dependencies[change];
                if (!dependencyNode) {
                    dependencyNode = new DependencyNode(change);
                    this.dependencies[change] = dependencyNode;
                }
                ruleNode.addChild(dependencyNode);
            }
        }
    }

    public circularDependencies(): DependencyChain[] {
        const chains: DependencyChain[] = [];

        this.buildRuleDependencies();

        for (const node of this.dependants) {
            const visited = new Set<AbstractNode>();
            const stack = new Set<AbstractNode>();

            if (this.depthFirstCircular(node, visited, stack)) {
                const rules = Array.from(stack)
                    .filter(node => node instanceof RuleOutputNode && node.rule !== undefined)
                    .map(node => (node as RuleOutputNode).rule!);
                chains.push({
                    circular: true,
                    stack: rules,
                })
            }
        }
        return chains;
    }

    private depthFirstCircular(node: AbstractNode, visited: Set<AbstractNode>, stack: Set<AbstractNode>): boolean {
        if (stack.has(node)) {
            return true; // Cycle detected
        }
        if (visited.has(node)) {
            return false;   // Already processed
        }
        visited.add(node);
        stack.add(node);

        for (const child of node.children) {
            if (this.depthFirstCircular(child, visited, stack)) {
                return true;
            }
        }

        stack.delete(node);
        return false;
    }

    /**
     * Get all rules that are applicable to the given context.
     * This is primarily an explanatory feature, and does NOT return the rules that will be executed. 
     * This is done by traversing the requirement graph starting from the root nodes that match the keys in the context, 
     * and collecting all rules that are reachable and applicable based on their requirements.
     * 
     * N.B. Applicable rules are not necessarily executable, since they may require certain conditions to be met that are not currently satisfied in the context.
     * Disabled rules are returned as applicable if their requirements are met, but they will not be executed when processing the context.
     * 
     * @param context the working memory context that contains the current state of data.
     * @returns an array of applicable rules that can be evaluated against the given context.
     */
    public applicableRules(context: WorkingContext): AbstractRule[] {

        const applicable = new Set<AbstractRule>();
        const logger = context.logger();

        for (const key of context.rootKeys()) {
            const root = this.findRoot(key);
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

}