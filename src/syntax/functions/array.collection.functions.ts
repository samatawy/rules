import { ArrayExpression } from "../array.expression";
import type { TypeChecker, TypedParameter, ValidationResult, WorkingContext } from "../../types";
import type { Expression } from "../expression";
import { StringFunctionExpression } from "../function.expression";
import { getReturnType, isArrayType, mergeValidationResults } from "../../utils";

export class ArrayCollectionFunction extends StringFunctionExpression {

    protected name: string;

    protected target_arg: Expression;

    protected extra_args: Expression[];

    constructor(name: string, target: Expression, args: Expression[]) {
        super(name, [target, ...args]);
        this.name = name;
        if (name === 'concat') {
            this.target_arg = target instanceof ArrayExpression ? target : new ArrayExpression([target, ...args]);
            this.extra_args = [];
        } else {
            this.target_arg = target;
            this.extra_args = args;
        }
    }

    public expectsParameters(): TypedParameter[] {
        switch (this.name) {
            case 'concat':
                return [{ type: 'string[]' }];
            case 'join':
                return [{ type: 'string[]' }, { type: 'string' }];
            default:
                throw new Error(`Unknown array collection function: ${this.name}`);
        }
    }

    public checkTypes(checker?: TypeChecker): ValidationResult {
        const checks: ValidationResult[] = [];

        checks.push(this.target_arg.checkTypes(checker));
        for (const arg of this.extra_args) {
            checks.push(arg.checkTypes(checker));
        }

        if (!checker?.strictSyntax()) {
            return mergeValidationResults(...checks);
        }

        let targetType: any = getReturnType(this.target_arg, checker);
        if (!isArrayType(targetType!)) {
            // console.debug(`Array Type mismatch for argument ${i + 1} in function ${this.name}: expected array, got ${argType} (${arg})`);
            checks.push({
                valid: false,
                errors: [`Argument 0 for function ${this.name} must be an array type, but got ${targetType}`],
            });
        }

        switch (this.name) {
            case 'concat':
                return mergeValidationResults(...checks);
            case 'join':
                if (this.extra_args.length > 0) {
                    const separatorType = getReturnType(this.extra_args[0]!, checker);
                    if (separatorType !== 'string') {
                        checks.push({
                            valid: false,
                            errors: [`Argument 1 for function ${this.name} must be of type string, but got ${separatorType}`],
                        });
                    }
                }
            default:
                return mergeValidationResults(...checks);
        }
    }

    public evaluate(context: WorkingContext): string {
        const targetValue = this.target_arg.evaluate(context);
        if (!Array.isArray(targetValue)) {
            console.debug('Received argument', targetValue, `for argument ${this.target_arg} in function ${this.name}`);
            throw new Error(`Target argument for function ${this.name} did not evaluate to an array`);
        }

        switch (this.name) {
            case 'concat':
                return targetValue.join('');
            case 'join':
                const separator = this.extra_args[0] ? this.extra_args[0].evaluate(context) : '';
                return targetValue.join(separator);
            default:
                throw new Error(`Unknown array collection function: ${this.name}`);
        }
    }

    static names = ['concat', 'join'];
}
