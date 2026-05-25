import type { TypedParameter } from "../../types";
import type { WorkingContext } from "../../interfaces";
import type { Expression, StringExpression } from "../expression";
import { StringFunctionExpression } from "../function.expression";
import { EvaluationError, TypeCheckError } from "../../rules/exception";

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
            case 'lastChars':
                return [{ type: 'string' }, { type: 'number' }];
            case 'append':
            case 'replace':
                return [{ type: 'string' }, { type: 'string' }];
            case 'upperCase':
            case 'lowerCase':
            case 'capitalize':
            case 'capitalizeWords':
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

        switch (this.name) {
            case 'substring':
                return targetValue.substring(evaluatedArgs[0], evaluatedArgs[1]);
            case 'firstChars':
                return targetValue.substring(0, evaluatedArgs[0]);
            case 'lastChars':
                return targetValue.substring(targetValue.length - evaluatedArgs[0]);
            case 'append':
                return targetValue + evaluatedArgs[0];
            case 'replace':
                return targetValue.replace(evaluatedArgs[0], evaluatedArgs[1]);
            case 'upperCase':
                return targetValue.toUpperCase();
            case 'lowerCase':
                return targetValue.toLowerCase();
            case 'capitalize':
                return targetValue.charAt(0).toUpperCase() + targetValue.slice(1).toLowerCase();
            case 'capitalizeWords':
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

    private static _names = ['substring', 'firstChars', 'lastChars', 'append', 'replace', 'upperCase', 'lowerCase', 'capitalize', 'capitalizeWords', 'extract'];

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
        return new this(name, args[0] as StringExpression, args.slice(1));
    }

    public static mock(name: string, args: Expression[]): StringManipulationFunction | undefined {
        if (!this._names.includes(name)) {
            return undefined;
        }
        return new this(name, args[0] as StringExpression, args.slice(1));
    }
}