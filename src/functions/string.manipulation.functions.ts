import type { TypedParameter } from "../types";
import type { WorkingContext } from "../interfaces";
import type { Expression, StringExpression } from "../syntax/expression";
import { StringFunctionExpression } from "../syntax/function.expression";
import { EvaluationError, TypeCheckError } from "../rules/exception";
import { FunctionCompiler } from "../parser/function.compiler";

export class StringManipulationFunction extends StringFunctionExpression {

    protected target_arg: StringExpression;

    protected extra_args: Expression[];

    constructor(name: string, target: StringExpression, args: Expression[]) {
        super(name, [target, ...args]);
        this.target_arg = target;
        this.extra_args = args;
    }

    public expectsParameters(): TypedParameter[] {
        switch (this.name) {
            case 'substring':
                return [{ type: 'string' }, { type: 'number' }, { type: 'number', optional: true }];
            case 'firstChars':
            case 'first_chars':
            case 'lastChars':
            case 'last_chars':
                return [{ type: 'string' }, { type: 'number' }];
            case 'append':
            case 'replace':
                return [{ type: 'string' }, { type: 'string' }];
            case 'upperCase':
            case 'upper_case':
            case 'lowerCase':
            case 'lower_case':
            case 'capitalize':
            case 'capitalizeWords':
            case 'capitalize_words':
                return [{ type: 'string' }];
            case 'extract':
                return [{ type: 'string' }, { type: 'string' }];

            case 'base64_encode':
            case 'base64_decode':
            case 'hex_encode':
            case 'hex_decode':
            case 'url_encode':
            case 'url_decode':
            case 'html_escape':
            case 'html_unescape':
            case 'json_escape':
            case 'json_unescape':
                return [{ type: 'string' }];

            default:
                throw new TypeCheckError(`Unknown string manipulation function: ${this.name}`);
        }
    }

    public evaluate(context: WorkingContext): string {
        const cached = context.getCached(this.syntax);
        if (cached !== undefined) return cached;

        const evaluatedArgs = this.extra_args.map(arg => arg.evaluate(context));

        let targetValue = this.target_arg.evaluate(context);
        if (typeof targetValue !== 'string') {
            throw new EvaluationError(`Target argument for function ${this.name} did not evaluate to a string`);
        }

        if (FunctionCompiler.enabled) {
            const compiled = (globalThis as any)[this.name] as Function;
            if (typeof compiled === 'function') {
                return compiled(targetValue, ...evaluatedArgs, context);
            }
        }

        switch (this.name) {
            case 'substring':
                return targetValue.substring(evaluatedArgs[0], evaluatedArgs[1]);
            case 'firstChars':
            case 'first_chars':
                return targetValue.substring(0, evaluatedArgs[0]);
            case 'lastChars':
            case 'last_chars':
                return targetValue.substring(targetValue.length - evaluatedArgs[0]);
            case 'append':
                return targetValue + evaluatedArgs[0];
            case 'replace':
                return targetValue.replace(evaluatedArgs[0], evaluatedArgs[1]);
            case 'upperCase':
            case 'upper_case':
                return targetValue.toUpperCase();
            case 'lowerCase':
            case 'lower_case':
                return targetValue.toLowerCase();
            case 'capitalize':
                return targetValue.charAt(0).toUpperCase() + targetValue.slice(1).toLowerCase();
            case 'capitalizeWords':
            case 'capitalize_words':
                const words = targetValue.split(' ');
                return words.map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');

            case 'extract':
                const regex = new RegExp(evaluatedArgs[0]);
                const match = targetValue.match(regex);
                return match && match.length > 0 ? match[1] || '' : '';

            case 'base64_encode':
                return this.base64Encode(targetValue);
            case 'base64_decode':
                return this.base64Decode(targetValue);
            case 'hex_encode':
                return this.hexEncode(targetValue);
            case 'hex_decode':
                return this.hexDecode(targetValue);
            case 'url_encode':
                return encodeURIComponent(targetValue);
            case 'url_decode':
                return decodeURIComponent(targetValue);
            case 'html_escape':
                return this.htmlEscape(targetValue);
            case 'html_unescape':
                return this.htmlUnescape(targetValue);
            case 'json_escape':
                return JSON.stringify(targetValue).slice(1, -1);
            case 'json_unescape':
                return this.jsonUnescape(targetValue);

            default:
                throw new EvaluationError(`Unknown string manipulation function: ${this.name}`);
        }
    }

    private htmlEscape(str: string): string {
        return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    private htmlUnescape(str: string): string {
        return str.replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&amp;/g, '&');
    }

    private jsonUnescape(str: string): string {
        const parsed = JSON.parse('"' + str + '"');
        return typeof parsed === 'string' ? parsed : String(parsed);
    }

    private base64Encode(str: string): string {
        const encoder = new TextEncoder();
        const bytes = encoder.encode(str);
        let binary = '';

        for (const byte of bytes) {
            binary += String.fromCharCode(byte);
        }

        return btoa(binary);
    }

    private base64Decode(str: string): string {
        const binary = atob(str);
        const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
        return new TextDecoder().decode(bytes);
    }

    private hexEncode(str: string): string {
        const bytes = new TextEncoder().encode(str);
        return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    private hexDecode(str: string): string {
        if (str.length % 2 !== 0) {
            throw new EvaluationError(`Invalid hex input for function ${this.name}`);
        }

        const bytes = new Uint8Array(str.length / 2);
        for (let i = 0; i < str.length; i += 2) {
            const byte = Number.parseInt(str.slice(i, i + 2), 16);
            if (Number.isNaN(byte)) {
                throw new EvaluationError(`Invalid hex input for function ${this.name}`);
            }
            bytes[i / 2] = byte;
        }

        return new TextDecoder().decode(bytes);
    }

}

export class StringManipulationFunctionProvider {

    private static _names = ['substring', 'firstChars', 'first_chars', 'lastChars', 'last_chars',
        'append', 'replace', 'upperCase', 'upper_case', 'lowerCase', 'lower_case',
        'capitalize', 'capitalizeWords', 'capitalize_words', 'extract',
        'base64_encode', 'base64_decode', 'hex_encode', 'hex_decode', 'url_encode', 'url_decode', 'html_escape', 'html_unescape', 'json_escape', 'json_unescape',
    ];

    public static names(): string[] {
        return this._names;
    }

    public static create(name: string, args: Expression[]): StringManipulationFunction | undefined {
        if (!this._names.includes(name)) {
            return undefined;
        }
        if (args.length < 1) {
            throw new TypeCheckError(`Function ${name} expects at least 1 argument, but got ${args.length}`);
        }
        return new StringManipulationFunction(name, args[0] as StringExpression, args.slice(1));
    }

    public static mock(name: string, args: Expression[]): StringManipulationFunction | undefined {
        if (!this._names.includes(name)) {
            return undefined;
        }
        return new StringManipulationFunction(name, args[0] as StringExpression, args.slice(1));
    }

    public static toJS(name: string): { args: string[], body: string } {
        switch (name) {
            case 'substring':
                return { args: ['target', 'from', 'to'], body: `return target.substring(from, to)` };
            case 'firstChars':
            case 'first_chars':
                return { args: ['target', 'count'], body: `return target.substring(0, count)` };
            case 'lastChars':
            case 'last_chars':
                return { args: ['target', 'count'], body: `return target.substring(target.length - count)` };
            case 'append':
                return { args: ['target', 'value'], body: `return target + value` };
            case 'replace':
                return { args: ['target', 'search', 'replace'], body: `return target.replace(search, replace)` };
            case 'upperCase':
            case 'upper_case':
                return { args: ['target'], body: `return target.toUpperCase()` };
            case 'lowerCase':
            case 'lower_case':
                return { args: ['target'], body: `return target.toLowerCase()` };
            case 'capitalize':
                return { args: ['target'], body: `return target.charAt(0).toUpperCase() + target.slice(1).toLowerCase()` };
            case 'capitalizeWords':
            case 'capitalize_words':
                return { args: ['target'], body: `return target.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')` };
            case 'extract':
                return { args: ['target', 'pattern'], body: `const regex = new RegExp(pattern); const match = target.match(regex); return match && match.length > 0 ? match[1] || '' : '';` };
            case 'base64_encode':
                return {
                    args: ['target'],
                    body: `const bytes = new TextEncoder().encode(target); let binary = ''; for (const byte of bytes) { binary += String.fromCharCode(byte); } return btoa(binary);`
                };
            case 'base64_decode':
                return {
                    args: ['target'],
                    body: `const binary = atob(target); const bytes = Uint8Array.from(binary, char => char.charCodeAt(0)); return new TextDecoder().decode(bytes);`
                };
            case 'hex_encode':
                return {
                    args: ['target'],
                    body: `const bytes = new TextEncoder().encode(target); return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');`
                };
            case 'hex_decode':
                return {
                    args: ['target'],
                    body: `if (target.length % 2 !== 0) { throw new Error('Invalid hex input'); } const bytes = new Uint8Array(target.length / 2); for (let i = 0; i < target.length; i += 2) { const byte = Number.parseInt(target.slice(i, i + 2), 16); if (Number.isNaN(byte)) { throw new Error('Invalid hex input'); } bytes[i / 2] = byte; } return new TextDecoder().decode(bytes);`
                };
            case 'url_encode':
                return { args: ['target'], body: `return encodeURIComponent(target);` };
            case 'url_decode':
                return { args: ['target'], body: `return decodeURIComponent(target);` };
            case 'html_escape':
                return {
                    args: ['target'],
                    body: `return target.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;').replace(/'/g, '&#39;');`
                };
            case 'html_unescape':
                return {
                    args: ['target'],
                    body: `return target.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');`
                };
            case 'json_escape':
                return { args: ['target'], body: `return JSON.stringify(target).slice(1, -1);` };
            case 'json_unescape':
                return {
                    args: ['target'],
                    body: `const parsed = JSON.parse('"' + target + '"'); return typeof parsed === 'string' ? parsed : String(parsed);`
                };
            default:
                throw new EvaluationError(`Unknown string manipulation function: ${this.name}`);
        }
    }
}