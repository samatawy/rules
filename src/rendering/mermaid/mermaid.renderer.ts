import { AbstractRule } from "../../rules/abstract.rule";
import { Expression } from "../../syntax/expression";
import type { MermaidStyle } from "./mermaid.style";
import type { ElementType, Renderable } from "../render.types";

export class MermaidRenderer {

    private styles: Map<ElementType, MermaidStyle>;

    private layout: 'TD' | 'BT' | 'LR' | 'RL' = 'LR';

    private nodeMap: Map<Renderable, string>;

    constructor() {
        this.styles = new Map<ElementType, MermaidStyle>();
        this.nodeMap = new Map<Renderable, string>();
    }

    public setStyle(element: ElementType, style: MermaidStyle): void {
        this.styles.set(element, style);
    }

    public setStyles(styles: Partial<Record<ElementType, MermaidStyle>>): void {
        Object.entries(styles).forEach(([element, style]) => {
            if (style) {
                this.styles.set(element as ElementType, style);
            }
        });
    }

    public setLayout(layout: 'TD' | 'BT' | 'LR' | 'RL'): void {
        this.layout = layout;
    }

    public render(expression: Expression | AbstractRule): string {
        if (expression instanceof AbstractRule) {
            const text = this.renderRule(expression);
            const classDefs = this.getClassDefs();
            const graph = `flowchart ${this.layout}\n${classDefs}\n\n${text}`;
            return graph;
        }

        if (expression instanceof Expression) {
            const text = this.renderExpression(expression);
            const classDefs = this.getClassDefs();
            const graph = `graph ${this.layout}\n${classDefs}\n\n${text}`;
            return graph;
        }

        throw new Error(`Cannot render: ${typeof expression}`);
    }

    private renderRule(rule: AbstractRule): string {
        const json = rule.toJson();

        const blockStyle = this.styles.get('block') ? this.styleToString(this.styles.get('block')) : undefined;

        let text = ``;
        // render conditions and consequences in subgraphs
        if (json.condition) {
            text += `subgraph IF["IF"]\n`;
            text += 'direction LR\n';
            text += this.renderExpression(json.condition);
            text += `end\n`;
            if (blockStyle) {
                text += `style IF ${blockStyle}\n`;
            }

            if (json.trueExpression) {
                text += `subgraph THEN["THEN"]\n`;
                text += 'direction LR\n';
                text += this.renderExpression(json.trueExpression);
                text += `end\n`;

                if (blockStyle) {
                    text += `style THEN ${blockStyle}\n`;
                }
                text += `IF -- true --> THEN\n`;
            }
            if (json.falseExpression) {
                text += `subgraph ELSE["ELSE"]\n`;
                text += 'direction LR\n';
                text += this.renderExpression(json.falseExpression);
                text += `end\n`;

                if (blockStyle) {
                    text += `style ELSE ${blockStyle}\n`;
                }
                text += `IF -- false --> ELSE\n`;
            }
        }

        // render setters without conditions
        if (json.output) {
            text += `subgraph SET["SET"]\n`;
            text += 'direction LR\n';

            text += this.renderOutputAction(json);
            text += `end\n`;

            // const expr: Renderable = { type: 'VariableExpression', name: json.output };
            // text += this.renderExpression(expr);
            // text += `end\n`;
            // if (blockStyle) {
            //     text += `style SET ${blockStyle}\n`;
            // }

            // if (json.expression) {
            //     text += `subgraph EXPRESSION[&nbsp;]\n`;
            //     text += 'direction LR\n';

            //     text += this.renderExpression(json.expression);
            //     text += `end\n`;

            //     if (blockStyle) {
            //         text += `style EXPRESSION ${blockStyle}\n`;
            //     }
            //     text += 'SET --> EXPRESSION\n';
            // }
        }

        return text;
    }

    private renderExpression(expression: Expression | Renderable | undefined): string {
        if (!expression) return '';
        const json = expression instanceof Expression ? expression.toJson() : expression;

        switch (json.type) {
            case 'LiteralExpression':
                return this.renderLiteralExpression(json);
            case 'VariableExpression':
                return this.renderVariableExpression(json);
            case 'ArrayExpression':
                return this.renderArrayExpression(json);
            case 'ArithmeticExpression':
                return this.renderArithmeticExpression(json);
            case 'ComparisonExpression':
                return this.renderComparisonExpression(json);
            case 'LogicalExpression':
                return this.renderLogicalExpression(json);
            case 'TernaryExpression':
                return this.renderTernaryExpression(json);
            case 'SwitchExpression':
                return this.renderSwitchExpression(json);
            case 'FunctionExpression':
                return this.renderFunctionExpression(json);
            case 'VariableExpression':
                return this.renderVariableExpression(json);
            case 'LambdaExpression':
                return this.renderLambdaExpression(json);

            case 'OutputAction':
                return this.renderOutputAction(json);
            case 'CompositeAction':
                return this.renderCompositeAction(json);
            case 'CommandExecutable':
                return this.renderCommandExecutable(json);

            default:
                // return expression.toString();
                throw new Error(`Unsupported expression type: ${json.type}`);
        }
        // return expression.toString();
    }

    private nodeId(json: Renderable): string {
        let id = this.nodeMap.get(json);
        if (!id) {
            id = `node${this.nodeMap.size + 1}`;
            this.nodeMap.set(json, id);
        }
        return id;
    }

    private getClassDefs(): string {
        let classDefs = '';
        for (const [element, style] of this.styles.entries()) {
            classDefs += `classDef ${element} ${this.styleToString(style)}\n`;
        }
        return classDefs;
    }

    private styleToString(style: any): string {
        return Object.entries(style)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ')
            .concat(';');
    }

    private renderLiteralExpression(json: Renderable): string {
        let id = this.nodeId(json);
        return `${id}[${json.value}]:::literal\n`;
    }

    private renderVariableExpression(json: Renderable): string {
        let id = this.nodeId(json);
        return `${id}["${json.name}"]:::variable\n`;
    }

    private renderArrayExpression(json: Renderable): string {
        let id = this.nodeId(json);
        if (!json.elements?.length) {
            return `${id}["[]"]:::array\n`;
        }

        let text = `subgraph ${id}[&nbsp;]\n`;
        text += json.elements.map(el => `${this.renderExpression(el)}`).join('');
        text += json.elements.map(el => `${this.nodeId(el)}`).join(' ~~~ ');
        text += '\nend\n';

        return text;
    }

    private renderArithmeticExpression(json: Renderable): string {
        let id = this.nodeId(json);
        let text = `${id}["${json.operator}"]:::operator\n`;

        let leftId = this.nodeId(json.left!);
        text += this.renderExpression(json.left!);

        let rightId = this.nodeId(json.right!);
        text += this.renderExpression(json.right!);

        text += `${leftId} --> ${id}\n`;
        text += `${rightId} --> ${id}\n`;
        return text;
    }

    private renderComparisonExpression(json: Renderable): string {
        let id = this.nodeId(json);
        let text = `${id}["${json.operator}"]:::operator\n`;

        let leftId = this.nodeId(json.left!);
        text += this.renderExpression(json.left!);

        let rightId = this.nodeId(json.right!);
        text += this.renderExpression(json.right!);

        text += `${leftId} --> ${id}\n`;
        text += `${rightId} --> ${id}\n`;
        return text;
    }

    private renderLogicalExpression(json: Renderable): string {
        let id = this.nodeId(json);
        let text = `${id}["${json.operator}"]:::operator\n`;

        let leftId = this.nodeId(json.left!);
        text += this.renderExpression(json.left!);

        let rightId = this.nodeId(json.right!);
        text += this.renderExpression(json.right!);

        text += `${leftId} --> ${id}\n`;
        text += `${rightId} --> ${id}\n`;
        return text;
    }

    private renderTernaryExpression(json: Renderable): string {
        let blockId = this.nodeId(json!);
        let text = `subgraph ${blockId}[&nbsp;]\n`;
        text += this.renderExpression(json.condition!);
        text += `style ${blockId} ${this.styleToString(this.styles.get('block') || {})}\n`;
        text += '\nend\n';

        let trueId = this.nodeId(json.trueExpression!);
        text += this.renderExpression(json.trueExpression!);
        text += `${trueId} -- true --> ${blockId}\n`;

        let falseId = this.nodeId(json.falseExpression!);
        text += this.renderExpression(json.falseExpression!);
        text += `${falseId} -- false --> ${blockId}\n`;

        return text;
    }

    private renderSwitchExpression(json: Renderable): string {
        let id = this.nodeId(json);
        let text = "";

        text += `subgraph ${id}["switch"]\n`;
        text += this.renderExpression(json.condition!);
        text += '\nend\n';
        text += `style ${id} ${this.styleToString(this.styles.get('block') || {})}\n`;

        (json.cases || []).forEach((c: any) => {
            let caseId = this.nodeId(c.value!);
            text += this.renderExpression(c.value!);
            text += `${caseId} --> ${id}\n`;

            let resultId = this.nodeId(c.expression!);
            text += this.renderExpression(c.expression!);
            text += `${resultId} --> ${caseId}\n`;
        });

        let defaultId = this.nodeId(json.defaultCase!);
        text += this.renderExpression(json.defaultCase!);
        text += `${defaultId} -- default --> ${id}\n`;

        return text;
    }

    private renderFunctionExpression(json: Renderable): string {
        let id = this.nodeId(json);
        let text = `${id}["${json.name}"]:::function\n`;

        if (json.arguments?.length === 2 && json.arguments[1]!.type === 'LambdaExpression') {
            // special handling for binary operators with lambda as second argument (e.g. every, some)
            let arrayId = this.nodeId(json.arguments[0]!);
            let lambdaId = this.nodeId(json.arguments[1]!);

            text += this.renderExpression(json.arguments[0]);
            text += this.renderExpression(json.arguments[1]!);
            // the arrow should point from the array to the function
            text += `${arrayId} --> ${id}\n`;
            text += `${lambdaId} --> ${arrayId}\n`;

            return text;
        }

        (json.arguments || []).forEach((arg: Renderable) => {
            let argId = this.nodeId(arg);
            text += this.renderExpression(arg);
            text += `${argId} --> ${id}\n`;
        });

        return text;
    }

    private renderLambdaExpression(json: Renderable): string {
        let id = this.nodeId(json);
        let text = `${id}["${json.name}"]:::lambda\n`;

        let expressionId = this.nodeId(json.expression!);
        text += this.renderExpression(json.expression!);
        text += `${expressionId} --> ${id}\n`;

        return text;
    }

    private renderOutputAction(json: Renderable): string {
        let text = '';
        if (json.output) {
            let outputId = this.nodeId(json);
            text += `${outputId}["${json.output}"]:::variable\n`;

            if (json.expression) {
                let exprId = this.nodeId(json.expression);
                text += this.renderExpression(json.expression);
                text += `${exprId} --> ${outputId}\n`;
            }
        }
        return text;
    }

    private renderCompositeAction(json: Renderable): string {
        let text = '';
        for (const action of json.elements || []) {
            text += this.renderExpression(action);
            text += '\n';
        }
        return text;
    }

    private renderCommandExecutable(json: Renderable): string {
        // TODO
        return '';
    }
}
