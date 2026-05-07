import type { TypedParameter } from "../../types";
import type { WorkingContext } from "../../interfaces";
import type { NumericExpression } from "../expression";
import { NumericFunctionExpression } from "../function.expression";

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
                throw new Error(`Unknown random function: ${this.name}`);
        }
    }

    public evaluate(context: WorkingContext): number {
        const evaluatedArgs = this.args.map(arg => arg.evaluate(context));
        evaluatedArgs.forEach((arg, index) => {
            if (typeof arg !== 'number') {
                throw new Error(`Argument ${index} for function ${this.name} did not evaluate to a number`);
            }
        });

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
                throw new Error(`Unknown random function: ${this.name}`);
        }
    }

    static names = ['random', 'randomBetween', 'randomInteger'];
}
