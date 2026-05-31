import { WorkLogger } from "../logging/work.logger";
import type { Expression } from "../syntax/expression";
import type { FunctionDefinition } from "../types";

export class FunctionCompiler {

    public static enabled: boolean = true;

    // when true
    // Time taken to add 1000 rules: 28 ms
    // Average time per rule: 0.028 ms
    // Time taken to add 1000 rules: 54 ms
    // Average time per rule: 0.054 ms
    // Time taken to process 1000 times with 2000 rules: 229 ms
    // Average time per process(): 0.229 ms
    // Average time per rule per process(): 0.0001145 ms
    // 
    // Time taken to execute function in rules 100000 times: 167 ms
    // Time taken to execute compiled multiline function 100000 times: 1 ms

    // when false
    // Time taken to add 1000 rules: 82 ms
    // Average time per rule: 0.082 ms
    // Time taken to add 1000 rules: 138 ms
    // Average time per rule: 0.138 ms
    // Time taken to process 1000 times with 2000 rules: 246 ms
    // Average time per process(): 0.246 ms
    // Average time per rule per process(): 0.000123 ms
    //
    // Time taken to execute function in rules 100000 times: 246 ms
    // Time taken to execute compiled multiline function 100000 times: 1 ms

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
            const regex = new RegExp(`\\bcontext\.getData\\(['"](${param}(?:|\\..+?))['"]\\)`, 'g');
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