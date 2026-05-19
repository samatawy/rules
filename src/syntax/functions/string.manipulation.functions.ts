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
            default:
                throw new EvaluationError(`Unknown string manipulation function: ${this.name}`);
        }
    }

    static names = ['substring', 'firstChars', 'lastChars', 'append', 'replace', 'upperCase', 'lowerCase', 'capitalize', 'capitalizeWords'];
}