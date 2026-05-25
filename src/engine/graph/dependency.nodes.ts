import type { AbstractRule } from "../../rules/abstract.rule";
import type { FunctionDefinition } from "../../types";

/**
 * AbstractNode represents a node in the requirement graph. It can be a DataNode, a CombinationNode, or a RuleNode.
 * Each node can have multiple parents and children, representing the dependencies between rules and data keys.
 */
export abstract class AbstractNode {

    public parents: AbstractNode[];

    public children: AbstractNode[];

    constructor() {
        this.parents = [];
        this.children = [];
    }

    public addChild(node: AbstractNode): void {
        this.children.push(node);
        node.parents.push(this);
    }

    public findChild(key: string): AbstractNode | undefined {
        return this.children.find(child => child instanceof InputNode && child.key === key);
    }
}

/**
 * DataNode represents a node that corresponds to a specific data key in the requirement graph.
 * It holds a key and can have child nodes that represent nested data, rules, or combinations that depend on this data key.
 */
export class InputNode extends AbstractNode {

    public key: string;

    constructor(key: string) {
        super();
        this.key = key;
    }
}

/**
 * FunctionNode represents a node that corresponds to a specific function in the requirement graph.
 * It holds a reference to a FunctionDefinition and can have child nodes 
 * that represent rules, functions, or combinations that depend on the output of this function.
 */
export class FunctionNode extends AbstractNode {

    public function: FunctionDefinition;

    constructor(function_def: FunctionDefinition) {
        super();
        this.function = function_def;
    }
}

/**
 * CombinationNode represents a logical combination of parents into one branch, using AND. 
 * It does not have a key but can hold child rules or functions that have multiple requirements.
 */
export class CombinationNode extends AbstractNode {

    constructor() {
        super();
    }
}

/**
 * RuleNode represents a node that is directly associated with a rule.
 * It holds a reference to an AbstractRule and can be evaluated within the context of the rule engine.
 */
export class RuleOutputNode extends AbstractNode {

    public rule: AbstractRule;

    constructor(rule: AbstractRule) {
        super();
        this.rule = rule;
    }
}

export class DependencyNode extends AbstractNode {

    public variable: string;

    constructor(variable: string) {
        super();
        this.variable = variable;
    }
}