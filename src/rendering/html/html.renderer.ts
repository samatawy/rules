import { Expression } from "../../syntax/expression";
import type { RenderableCSS } from "./css.style";
import type { ElementType, Renderable } from "../render.types";
import { AbstractRule } from "../../rules/abstract.rule";

export class HtmlRenderer {

    private styling: 'inline' | 'class' = 'class';

    private styles: Map<ElementType, RenderableCSS>;

    constructor(styling: 'inline' | 'class' = 'class') {
        this.styling = styling;
        this.styles = new Map<ElementType, RenderableCSS>();
    }

    public setStyle(element: ElementType, style: RenderableCSS): void {
        this.styles.set(element, style);
    }

    public setStyles(styles: Partial<Record<ElementType, RenderableCSS>>): void {
        Object.entries(styles).forEach(([element, style]) => {
            if (style) {
                this.styles.set(element as ElementType, style);
            }
        });
    }

    public render(expression: Expression | AbstractRule): string {
        if (expression instanceof AbstractRule) {
            const html = this.renderRule(expression);
            return this.applyStyles(html);
        }
        if (expression instanceof Expression) {
            const html = this.renderExpression(expression);
            return this.applyStyles(html);
        }
        throw new Error('Unsupported type for rendering');
    }

    private applyStyles(html: string): string {
        if (this.styling === 'inline') {
            // Apply inline styles based on the element type
            this.styles.forEach((style, element) => {
                const styleString = Object.entries(style)
                    .map(([key, value]) => `${key}: ${value};`)
                    .join(' ');
                const regex = new RegExp(`class="${element}"`, 'g');
                html = html.replace(regex, `class="${element}" style="${styleString}"`);
            });
        }
        return html;
    }

    private renderRule(rule: AbstractRule): string {
        const json = rule.toJson();

        let html = ``;
        // render conditions and consequences in subgraphs
        if (json.condition) {
            html += `<div class="block if">`;
            html += '<span class="keyword">IF&nbsp;</span>';
            html += this.renderExpression(json.condition);
            html += `</div>`;

            if (json.trueExpression) {
                html += `<div class="block then">`;
                html += '<span class="keyword"> THEN&nbsp;</span>';
                html += this.renderExpression(json.trueExpression);
                html += `</div>`;
            }
            if (json.falseExpression) {
                html += `<div class="block else">`;
                html += '<span class="keyword"> ELSE&nbsp;</span>';
                html += this.renderExpression(json.falseExpression);
                html += `</div>`;
            }
        }

        // render setters without conditions
        if (json.output) {
            html += `<div class="block set">`;
            html = this.renderOutputAction(json);
            html += `</div>`;
        }

        return html;
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
            case 'LambdaExpression':
                return this.renderLambdaExpression(json);

            case 'OutputAction':
                return this.renderOutputAction(json);
            case 'CompositeAction':
                return this.renderCompositeAction(json);
            case 'CommandExecutable':
                return this.renderCommandExecutable(json);

            default:
                throw new Error(`Unsupported expression type: ${json.type}`);
        }
    }

    private operator(op: string | undefined): string {
        if (!op) return '';
        return `<span class="operator"> ${op} </span>`;
    }

    private openParen(): string {
        return `<span class="parenthesis">(</span>`;
    }

    private closeParen(): string {
        return `<span class="parenthesis">)</span>`;
    }

    private openBrace(): string {
        return `<span class="brace">{</span>`;
    }

    private closeBrace(): string {
        return `<span class="brace">}</span>`;
    }

    private renderLiteralExpression(json: Renderable): string {
        return `<span class="literal">${json.value}</span>`;
    }

    private renderVariableExpression(json: Renderable): string {
        const parts = json.name!.split('.');
        const partsHtml = parts.map((part: string) => `<span class="variable">${part}</span>`)
            .join('<span class="dot">.</span>');
        return partsHtml;
    }

    private renderArrayExpression(json: Renderable): string {
        const elementsHtml = (json.elements || [])
            .map((elem: Renderable) => this.renderExpression(elem))
            .join(', ');
        return `<span class="array">[${elementsHtml}]</span>`;
    }

    private renderArithmeticExpression(json: Renderable, nested: boolean = false): string {
        let html = nested ? this.openParen() : '';
        html += this.renderExpression(json.left!);
        html += this.operator(json.operator);
        html += this.renderExpression(json.right!);
        html += nested ? this.closeParen() : '';
        return `<span class="arithmetic">${html}</span>`;
    }

    private renderComparisonExpression(json: Renderable, nested: boolean = false): string {
        let html = nested ? this.openParen() : '';
        html += this.renderExpression(json.left);
        html += this.operator(json.operator);
        html += this.renderExpression(json.right);
        html += nested ? this.closeParen() : '';
        return `<span class="comparison">${html}</span>`;
    }

    private renderLogicalExpression(json: Renderable, nested: boolean = false): string {
        let html = nested ? this.openParen() : '';
        html += this.renderExpression(json.left);
        html += this.operator(json.operator);
        html += this.renderExpression(json.right);
        html += nested ? this.closeParen() : '';
        return `<span class="logical">${html}</span>`;
    }

    private renderTernaryExpression(json: Renderable, nested: boolean = false): string {
        let html = nested ? this.openParen() : '';
        html += this.renderExpression(json.condition || json.expression);
        html += this.operator('?');
        html += this.renderExpression(json.trueExpression);
        html += this.operator(':');
        html += this.renderExpression(json.falseExpression);
        html += nested ? this.closeParen() : '';
        return `<span class="ternary">${html}</span>`;
    }

    private renderSwitchExpression(json: Renderable): string {
        const expressionHtml = this.renderExpression(json.condition || json.expression);
        const casesHtml = (json.cases || []).map((c: any) => {
            const caseValueHtml = this.renderExpression(c.value);
            const caseResultHtml = this.renderExpression(c.expression);
            return `<span class="switch-case">case ${caseValueHtml}: ${caseResultHtml}</span>`;
        }).join(', ');
        const defaultHtml = this.renderExpression(json.defaultCase);

        let html = '<span class="switch-expression">switch';
        html += this.openParen();
        html += expressionHtml;
        html += this.closeParen();
        html += `{ ${casesHtml} default: ${defaultHtml} }</span>`;
        return `<span class="switch">${html}</span>`;
    }

    private renderFunctionExpression(json: Renderable): string {
        let html = `<span class="function">${json.name}</span>`;
        html += this.openParen();
        const argsHtml = (json.arguments || [])
            .map((arg: Renderable) => this.renderExpression(arg))
            .join('<span class="comma">, </span>');
        html += argsHtml;
        html += this.closeParen();
        return `<span class="function">${html}</span>`;
    }

    private renderLambdaExpression(json: Renderable): string {
        let html = `<span class="variable">${json.name}</span>`;
        html += ' <span class="operator">:</span> ';
        html += this.renderExpression(json.expression);
        return `<span class="lambda">${html}</span>`;
    }

    private renderOutputAction(json: Renderable): string {
        let html = `<span class="keyword">SET </span>`;
        html += this.renderExpression({ type: 'VariableExpression', name: json.output });
        html += this.operator('=');
        html += this.renderExpression(json.expression);
        return `<span class="output">${html}</span>`;
    }

    private renderCompositeAction(json: Renderable): string {
        const actionsHtml = (json.elements || [])
            .map((action: Renderable) => this.renderExpression(action))
            .join('<span class="comma">; </span>');
        return `<span class="composite-action">{ ${actionsHtml} }</span>`;
    }

    private renderCommandExecutable(json: Renderable): string {
        let html = '<span class="keyword"> RUN&nbsp;</keyword>';
        html += `<span class="command">${json.name}</span> `;
        html += this.openBrace();
        let sep = '';
        for (const arg of json.arguments || []) {
            html += sep;
            html += `<span class="variable">${arg.name}</span>`;
            html += this.operator(':');
            html += this.renderExpression(arg.expression);
            sep = '<span class="comma">, </span>';
        }
        html += this.closeBrace();
        return `<span class="command-executable">${html}</span>`;
    }
}
