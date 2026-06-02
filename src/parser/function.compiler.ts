import { WorkLogger } from "../logging/work.logger";
import type { Expression } from "../syntax/expression";
import type { FunctionDefinition } from "../types";

export class FunctionCompiler {

    public static enabled: boolean = true;

    public static compileDefinition(definition: FunctionDefinition): Function | undefined {
        const params = definition.parameters.map(p => p.name);
        if (!params.some(p => p === 'context')) {
            params.push('context = undefined');
        }

        let body = definition.lines?.map(line => line.toJS()).join(';\n') || '';
        const innerVars = new Set<string>();
        if (body.length > 0) {
            body = this.normalizeParameters(params, body);
            for (const line of definition.lines || []) {
                const changes = line.typedChanges();
                for (const change of Object.keys(changes)) {
                    innerVars.add(change);
                }
            }
            body = this.normalizeParameters(Array.from(innerVars), body);
        }

        let expression = `return ${definition.expression.toJS()};`;
        if (!expression.length) return undefined;

        expression = this.normalizeParameters([...params, ...innerVars], expression);

        const sep = body ? ';\n' : '';
        const parts = [...params, body + sep + expression];

        try {
            return new Function(...parts);
        } catch (error) {
            WorkLogger.error(`Error compiling function ${definition.name}:`, error);
            return undefined;
        }
    }

    public static compileFunction(args: string[], body: string): Function | undefined {
        if (!body?.length) return undefined;

        const arrayParameter = args.find(p => p.startsWith('...'));
        if (arrayParameter) {
            const arrayName = arrayParameter.replace(/^\.\.\./, '');
            const splitArray = `const context = ${arrayName}.pop();\n`;
            const setArray = `${arrayName} = ${arrayName}.length == 1 && Array.isArray(${arrayName}) ? ${arrayName} = ${arrayName}[0] : ${arrayName};\n`;
            body = splitArray + setArray + body;
        }

        if (!args.some(p => p === 'context') && !arrayParameter) {
            args.push('context = undefined');
        }

        body = this.normalizeParameters(args, body);
        const parts = [...args, body];

        try {
            return new Function(...parts);
        } catch (error) {
            WorkLogger.error(`Error compiling built-in function`, error);
            return undefined;
        }
    }

    public static normalizeParameters(params: string[], target: string): string {
        for (const param of params) {
            // Capture whatever is requested from context.getData for this parameter, including any dot notation for sub-properties
            // Replace with the parameter name followed by the captured sub-property access if it exists, otherwise just the parameter name
            const regex = new RegExp(`\\bcontext\.get\\(['"](${param}(?:|\\..+?))['"]\\)`, 'g');
            target = target.replace(regex, '$1');
        }
        return target;
    }

    public static missingFunctions(expr: Expression): boolean {
        const invokes = expr.invokes();
        for (const func of invokes) {
            if (typeof (globalThis as any)[func] !== 'function') {
                return true;
            }
        }
        return false;
    }
}