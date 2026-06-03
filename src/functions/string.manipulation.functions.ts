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
            default:
                throw new EvaluationError(`Unknown string manipulation function: ${this.name}`);
        }
    }

}

export class StringManipulationFunctionProvider {

    private static _names = ['substring', 'firstChars', 'first_chars', 'lastChars', 'last_chars',
        'append', 'replace', 'upperCase', 'upper_case', 'lowerCase', 'lower_case',
        'capitalize', 'capitalizeWords', 'capitalize_words', 'extract'];

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
            default:
                throw new EvaluationError(`Unknown string manipulation function: ${this.name}`);
        }
    }
}