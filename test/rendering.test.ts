import { describe, it } from "vitest";
import { Workspace } from "../src/engine/workspace";
import { RuleParser } from "../src/parser/rule.parser";
import { HtmlRenderer } from "../src/rendering/html/html.renderer";
import { MermaidRenderer } from "../src/rendering/mermaid/mermaid.renderer";
import { DefaultMermaidTheme } from "../src/rendering/mermaid/mermaid.themes";
import { DefaultHtmlTheme } from "../src/rendering";

describe('Rendering tests', () => {

    it('render using json', async () => {

        const space = new Workspace();
        const parser = new RuleParser({ workspace: space });

        const r1 = parser.parse('if x then y = true');
        const r2 = parser.parse('if a + b > 10 then b = max(10, a)');
        const r3 = parser.parse('if max(x.floor(), y.ceil()) > 10 then y = true else z = false');

        console.debug('Rule 1 JSON:', JSON.stringify(r1?.getExpression().toJson(), null, 2));
        console.debug('Rule 2 JSON:', JSON.stringify(r2?.getExpression().toJson(), null, 2));
        console.debug('Rule 3 JSON:', JSON.stringify(r3?.getExpression().toJson(), null, 2));
    });

    it('render using HtmlRenderer', async () => {

        const space = new Workspace();
        const parser = new RuleParser({ workspace: space });

        space.commandRegistry().register({
            name: 'Notify User',
            keyword: 'NotifyUser',
            immediate: false,
            arguments: {
                times: 'number',
                username: 'string',
            },
            execute(context, args) {
                // Command execution logic here
                return {};
            },
        });

        const r1 = parser.parse('if x then y = true');
        const r2 = parser.parse('if a + b > 10 OR a - b < 0 then b = max(10, a)');
        const r3 = parser.parse('if max(x.floor(), y.ceil()) > 10 then y = true else z = false');
        const r4 = parser.parse('SET x = 5');
        const r5 = parser.parse('IF max([x, y, z]) > 10 THEN result = true');
        const r6 = parser.parse('IF family.every(member: member.age > 21) > 10 THEN all_adults = true');
        const r7 = parser.parse('IF x > 10 THEN y = x > 10 ? 22 : 24');
        const r8 = parser.parse('IF x > 10 THEN y = switch(x + 5) case 11: 22, case 12: 24, default: x');
        const r9 = parser.parse('IF (times > 0 AND username.length() > 3) then RUN NotifyUser {times: 42, username: "Sameh"}');

        const renderer = new HtmlRenderer('inline');
        renderer.setStyles(DefaultHtmlTheme.styles());
        // renderer.setStyle('operator', { color: 'blue' });
        // renderer.setStyle('function', { color: 'green' });
        // renderer.setStyle('variable', { color: 'crimson', 'font-weight': 'bold' });
        // renderer.setStyle('literal', { color: 'orange' });
        // renderer.setStyle('parenthesis', { color: 'gray' });

        console.debug('------------------------------------------------');
        console.debug('Expr 1 HTML:', renderer.render(r1!.getExpression()));
        console.debug('------------------------------------------------');
        console.debug('Expr 2 HTML:', renderer.render(r2!.getExpression()));
        console.debug('------------------------------------------------');
        console.debug('Expr 3 HTML:', renderer.render(r3!.getExpression()));
        console.debug('------------------------------------------------');
        console.debug('Expr 4 HTML:', renderer.render(r4!.getExpression()));
        console.debug('------------------------------------------------');
        console.debug('Expr 5 HTML:', renderer.render(r5!.getExpression()));
        console.debug('------------------------------------------------');
        console.debug('Expr 6 HTML:', renderer.render(r6!.getExpression()));
        console.debug('------------------------------------------------');
        console.debug('Expr 7 HTML:', renderer.render(r7!.getExpression()));
        console.debug('------------------------------------------------');
        console.debug('Expr 8 HTML:', renderer.render(r8!.getExpression()));
        console.debug('------------------------------------------------');

        console.debug('Rule 1 HTML:', renderer.render(r1!));
        console.debug('------------------------------------------------');
        console.debug('Rule 2 HTML:', renderer.render(r2!));
        console.debug('------------------------------------------------');
        console.debug('Rule 3 HTML:', renderer.render(r3!));
        console.debug('------------------------------------------------');
        console.debug('Rule 4 HTML:', renderer.render(r4!));
        console.debug('------------------------------------------------');
        console.debug('Rule 5 HTML:', renderer.render(r5!));
        console.debug('------------------------------------------------');
        console.debug('Rule 6 HTML:', renderer.render(r6!));
        console.debug('------------------------------------------------');
        console.debug('Rule 7 HTML:', renderer.render(r7!));
        console.debug('------------------------------------------------');
        console.debug('Rule 8 HTML:', renderer.render(r8!));
        console.debug('------------------------------------------------');
        console.debug('Rule 9 HTML:', renderer.render(r9!));
        console.debug('------------------------------------------------');
    });

    it('render using MermaidRenderer', async () => {

        const space = new Workspace();
        const parser = new RuleParser({ workspace: space });

        space.commandRegistry().register({
            name: 'Notify User',
            keyword: 'NotifyUser',
            immediate: false,
            arguments: {
                times: 'number',
                username: 'string',
            },
            execute(context, args) {
                // Command execution logic here
                return {};
            },
        });

        const r1 = parser.parse('if x then y = true');
        const r2 = parser.parse('if a + b > 10 OR a - b < 0 then b = max(10, a)');
        const r3 = parser.parse('if max(x.floor(), y.ceil()) > 10 then y = true else z = false');
        const r4 = parser.parse('SET x = 5');
        const r5 = parser.parse('IF max([x, y, z]) > 10 THEN result = true');
        const r6 = parser.parse('IF family.every(member: member.age > 21) > 10 THEN all_adults = true');
        const r7 = parser.parse('IF x > 10 THEN y = x > 10 ? 22 : 24');
        const r8 = parser.parse('IF x > 10 THEN y = switch(x + 5) case 11: 22, case 12: 24, default: x');
        const r9 = parser.parse('IF (times > 0 AND username.length() > 3) then RUN NotifyUser {times: 42, username: "Sameh"}');

        const renderer = new MermaidRenderer();
        renderer.setStyles(DefaultMermaidTheme.styles());
        // renderer.setStyle('operator', { fill: 'blue' });
        // renderer.setStyle('function', { fill: 'green' });
        // renderer.setStyle('variable', { fill: 'crimson', stroke: 'red' });
        // renderer.setStyle('literal', { fill: 'black', stroke: 'orange' });
        // renderer.setStyle('block', { fill: 'transparent', stroke: 'grey', rx: '5', ry: '5' });

        console.debug('------------------------------------------------');

        console.debug(renderer.render(r1!.getExpression()));
        console.debug('------------------------------------------------');
        console.debug(renderer.render(r2!.getExpression()));
        console.debug('------------------------------------------------');
        console.debug(renderer.render(r3!.getExpression()));
        console.debug('------------------------------------------------');
        console.debug(renderer.render(r4!.getExpression()));
        console.debug('------------------------------------------------');
        console.debug(renderer.render(r5!.getExpression()));
        console.debug('------------------------------------------------');
        console.debug(renderer.render(r6!.getExpression()));
        console.debug('------------------------------------------------');
        console.debug(renderer.render(r7!.getExpression()));
        console.debug('------------------------------------------------');
        console.debug(renderer.render(r8!.getExpression()));
        console.debug('------------------------------------------------');

        renderer.setLayout('TD');
        console.debug(renderer.render(r1!));
        console.debug('------------------------------------------------');
        console.debug(renderer.render(r2!));
        console.debug('------------------------------------------------');
        console.debug(renderer.render(r3!));
        console.debug('------------------------------------------------');
        console.debug(renderer.render(r4!));
        console.debug('------------------------------------------------');
        console.debug(renderer.render(r5!));
        console.debug('------------------------------------------------');
        console.debug(renderer.render(r6!));
        console.debug('------------------------------------------------');
        console.debug(renderer.render(r7!));
        console.debug('------------------------------------------------');
        console.debug(renderer.render(r8!));
        console.debug('------------------------------------------------');
        console.debug(renderer.render(r9!));
        console.debug('------------------------------------------------');
    });

});