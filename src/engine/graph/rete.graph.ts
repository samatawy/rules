import type { WorkingContext } from "../../interfaces";
import { AbstractRule } from "../../rules/abstract.rule";
import { EngineError } from "../../rules/exception";
import type { Expression } from "../../syntax/expression";
import { LiteralExpression } from "../../syntax/literal.expression";
import { VariableExpression } from "../../syntax/variable.expression";
import { AbstractReteNode, DataNode, DecisionNode, RuleNode } from "./rete.nodes";

/**
 * The ReteGraph class is responsible for providing an efficient way to find rules relevant to a context. 
 * It builds a graph similar to a Rete algorithm (with modifications) and uses it to find nodes relevant to context data.
 * 
 * TODO: Currently expressions are evaluated at every level. The nodes do not use parent nodes as already-calculated values
 * since that would require a complete repition of all expression evaluation logic.
 */
export class ReteGraph {

    dataMap: Map<string, DataNode>;

    decisionMap: Map<string, DecisionNode>;

    independentRules: RuleNode[] = [];

    /**
     * Create a new ReeteGraph instance.
     * You should normally not need to create a ReteGraph directly, as it is managed by the Workspace. 
     */
    constructor() {
        this.dataMap = new Map<string, DataNode>();
        this.decisionMap = new Map<string, DecisionNode>();
    }

    /**
     * Find a data node in the graph by its key. Data nodes represent top-level facts that rules depend on.
     * @param expr the expression of the data node to find or create.
     * @returns the data node with the given expression.
     * @throws an error if the expression is n ot a variable expression.
     */
    protected findOrCreateDataNode(expr: Expression): DataNode {
        const id = expr.toString();
        // If a node already exists, refer to it.
        if (this.dataMap.has(id)) return this.dataMap.get(id)!;

        if (!(expr instanceof VariableExpression)) {
            throw new EngineError('Only a variable expression can be held in a data node');
        }

        const node = new DataNode(expr);
        this.dataMap.set(id, node);
        return node;
    }

    /**
     * Find a decision node in the graph by its expression. Decision nodes represent 
     * expressions that can be evaluated to find related rules.
     * @param expr the expression of the decision node to find or create.
     * @returns the decision node with the given expression.
     * @throws an error if the expression is a variable or literal expression.
     */
    protected findOrCreateDecisionNode(expr: Expression): DecisionNode {
        const id = expr.toString();
        // If a node already exists, refer to it.
        if (this.decisionMap.has(id)) return this.decisionMap.get(id)!;

        if (expr instanceof VariableExpression || expr instanceof LiteralExpression) {
            throw new EngineError('Data expression cannot be forced into Decision node');
        }

        const node = new DecisionNode(expr);
        this.decisionMap.set(id, node);

        for (const part of expr.getParts()) {
            const partNode = this.findOrCreateNode(part);
            partNode?.addChild(node);
        }

        const parts = expr.getParts();
        if (parts.length === 0) {
            return node as DecisionNode;
        }

        for (const part of parts) {
            // Avoid parts who are just their parent
            if (part === undefined || part === expr) {
                continue;
            }
            const partNode = this.findOrCreateNode(part);
            partNode?.addChild(node);
        }
        return node as DecisionNode;
    }

    /**
     * Find or create a suitable node for the given expression.
     * @param expr the expression to find or create a node for.
     * @returns the suitable node, unless none is necessary (literal expressions).
     */
    protected findOrCreateNode(expr: Expression): AbstractReteNode | undefined {
        if (expr instanceof LiteralExpression) {
            return undefined;
        } else if (expr instanceof VariableExpression) {
            const partNode = this.findOrCreateDataNode(expr);
            return partNode;
        } else {
            const partNode = this.findOrCreateDecisionNode(expr);
            return partNode;
        }
    }

    /**
     * Add a rule to the graph based on its expression. 
     * The rule is represented as a RuleNode, and it is connected to the nodes representing its required decisions
     * and eventuall to top-level data nodes. 
     * @param rule the rule to be added to the graph.
     */
    public addRule(rule: AbstractRule): void {
        const required = rule.required();
        if (required.size === 0) {
            const root = new RuleNode(rule);
            this.independentRules.push(root);
            return;
        }

        const ruleNode = new RuleNode(rule);
        const decisionNode = this.findOrCreateNode(rule.getExpression());
        decisionNode?.addChild(ruleNode);
    }

    /**
     * Find rules relevant to any given node.
     * Data nodes only return relevant rules if they are defined.
     * Decision rules only return relevant rules if they evaluate to a truthy value.
     * @param start the node to start from.
     * @param context the working context to use when evaluating.
     * @returns a set of rules relevant to the given start node.
     */
    public getRulesFrom(start: AbstractReteNode | string, context: WorkingContext): Set<AbstractRule> {
        const foundRules: Set<AbstractRule> = new Set<AbstractRule>();

        const node = (typeof start === 'string') ?
            this.dataMap.get(start) || this.decisionMap.get(start)
            : start;
        if (!node) return foundRules;

        if (node instanceof RuleNode) {
            foundRules.add(node.rule);

        } else if (node instanceof DataNode) {
            let value = context.getCached(node.id);
            if (value === undefined) {
                value = node.expression.evaluate(context);
                context.setCache(node.id, value);
            }
            if (value !== undefined) {  // only follow if value is known
                for (const child of node.children) {
                    const childRules = this.getRulesFrom(child, context);
                    for (const rule of childRules) {
                        foundRules.add(rule);
                    }
                }
            }

        } else if (node instanceof DecisionNode) {
            let value = context.getCached(node.id);
            if (value === undefined) {
                value = node.expression.evaluate(context);
                context.setCache(node.id, value);
            }
            if (!!value) {   // only follow if truthy value
                for (const child of node.children) {
                    const childRules = this.getRulesFrom(child, context);
                    for (const rule of childRules) {
                        foundRules.add(rule);
                    }
                }
            }
        }

        return foundRules;
    }

    public clearCache(id: string, context: WorkingContext): void {
        context.clearCache(id);
        let node = this.dataMap.get(id);
        if (!node) node = this.decisionMap.get(id);
        if (!node) return;

        // recursively clear dependent values cached in the context
        for (const child of node.children) {
            if (child instanceof DataNode || child instanceof DecisionNode) {
                this.clearCache(child.id, context);
            }
        }
    }
}