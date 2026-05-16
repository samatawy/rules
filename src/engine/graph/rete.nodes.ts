import type { AbstractRule } from "../../rules/abstract.rule";
import type { Expression } from "../../syntax/expression";

/**
 * AbstractNode represents a node in the Rete graph. It can be a DataNode, a DecisionNode, or a RuleNode.
 * Each node can have multiple parents and children, representing the dependencies between rules and data keys.
 */
export abstract class AbstractReteNode {

    public id: string;

    public parents: AbstractReteNode[];

    public children: AbstractReteNode[];

    constructor(id: string) {
        this.id = id;
        this.parents = [];
        this.children = [];
    }

    public addChild(node: AbstractReteNode): void {
        if (!this.children.includes(node)) this.children.push(node);
        if (!node.parents.includes(node)) node.parents.push(this);
    }

    public findChild(id: string): AbstractReteNode | undefined {
        return this.children.find(child => child instanceof AbstractReteNode && child.id === id);
    }
}

/**
 * DataNode represents a node that corresponds to a specific data key in the Rete graph.
 * It holds a key and can have child nodes that represent nested data, rules, or combinations that depend on this data key.
 * Data nodes can be followed if they do not evaluate to `undefined`.
 */
export class DataNode extends AbstractReteNode {

    public expression: Expression;

    constructor(expr: Expression) {
        super(expr.toString());
        this.expression = expr;
    }
}

/**
 * DecisionNode represents a node that corresponds to a decision in the Rete graph.
 * It holds an expression that represents part of he conditions necessary for relevant rules.
 * Decision nodes can be followed if they evaluate to `true`.
 */
export class DecisionNode extends AbstractReteNode {

    public expression: Expression;

    constructor(expr: Expression) {
        super(expr.toString());
        this.expression = expr;
    }
}

/**
 * RuleNode represents a node that is directly associated with a rule.
 * It holds a reference to an AbstractRule and can be evaluated within the context of the rule engine.
 */
export class RuleNode extends AbstractReteNode {

    public rule: AbstractRule;

    constructor(rule: AbstractRule) {
        super(rule.toString());
        this.rule = rule;
    }
}