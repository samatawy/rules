import type { TypedParameter } from "../types";
import type { WorkingContext } from "../interfaces";
import type { NumericExpression } from "../syntax/expression";
import { NumericFunctionExpression } from "../syntax/function.expression";
import { EvaluationError, TypeCheckError } from "../rules/exception";
import { FunctionCompiler } from "../parser/function.compiler";

export class RandomFunction extends NumericFunctionExpression {

    constructor(name: string, args: NumericExpression[]) {
        super(name, args);
    }

    public expectsParameters(): TypedParameter[] {
        switch (this.name) {
            case 'random':
                return [];
            case 'randomBetween':
            case 'randomInteger':
                return [{ type: 'number' }, { type: 'number' }];
            default:
                throw new TypeCheckError(`Unknown random function: ${this.name}`);
        }
    }

    public evaluate(context: WorkingContext): number {
        const cached = context.getCached(this.syntax);
        if (cached !== undefined) return cached;

        const evaluatedArgs = this.args.map(arg => arg.evaluate(context));
        evaluatedArgs.forEach((arg, index) => {
            if (typeof arg !== 'number') {
                throw new EvaluationError(`Argument ${index} for function ${this.name} did not evaluate to a number`);
            }
        });

        if (FunctionCompiler.enabled) {
            const compiled = (globalThis as any)[this.name] as Function;
            if (typeof compiled === 'function') {
                return compiled(...evaluatedArgs, context);
            }
        }

        switch (this.name) {
            case 'random':
                return Math.random();
            case 'randomBetween':
                const min = Math.min(evaluatedArgs[0], evaluatedArgs[1]);
                const max = Math.max(evaluatedArgs[0], evaluatedArgs[1]);
                return min + (Math.random() * (max - min + 1));
            case 'randomInteger':
                const intMin = Math.ceil(Math.min(evaluatedArgs[0], evaluatedArgs[1]));
                const intMax = Math.floor(Math.max(evaluatedArgs[0], evaluatedArgs[1]));
                return Math.floor(intMin + (Math.random() * (intMax - intMin + 1)));
            default:
                throw new EvaluationError(`Unknown random function: ${this.name}`);
        }
    }
}

export class RandomFunctionProvider {

    private static _names = ['random', 'randomBetween', 'randomInteger'];

    public static names(): string[] {
        return this._names;
    }

    public static create(name: string, args: NumericExpression[]): RandomFunction | undefined {
        if (!this._names.includes(name)) {
            return undefined;
        }
        return new RandomFunction(name, args as NumericExpression[]);
    }

    public static mock(name: string, args: NumericExpression[]): RandomFunction | undefined {
        if (!this._names.includes(name)) {
            return undefined;
        }
        return new RandomFunction(name, args as NumericExpression[]);
    }

    public static toJS(name: string): { args: string[], body: string } {
        switch (name) {
            case 'random':
                return { args: [], body: 'return Math.random();' };
            case 'randomBetween':
                return {
                    args: ['min', 'max'],
                    body: 'return Math.random() * (max - min) + min;'
                };
            case 'randomInteger':
                return {
                    args: ['min', 'max'],
                    body: 'return Math.floor(Math.random() * (Math.floor(max) - Math.ceil(min) + 1)) + Math.ceil(min);'
                };
            default:
                throw new TypeCheckError(`Unknown random function: ${name}`);
        }
    }
}
