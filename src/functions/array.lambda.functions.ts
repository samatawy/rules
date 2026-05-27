import { ScopeContext, ScopeTypeChecker } from "../engine/scope.memory";
import type { ArrayType, AtomicType, ObjectArrayType, ObjectType, TypedParameter } from "../types";
import type { TypeChecker, ValidationResult, WorkingContext } from "../interfaces";
import { getReturnType, makeArrayType, makeItemType } from "../type.utils";
import { mergeValidationResults } from "../common.utils";
import type { Expression } from "../syntax/expression";
import { FunctionExpression } from "../syntax/function.expression";
import { LambdaExpression } from "../syntax/lambda.expression";
import type { VariableExpression } from "../syntax/variable.expression";
import { EvaluationError, TypeCheckError } from "../rules/exception";
import { isArrayType } from "../parser/type.parser";
import { WorkLogger } from "../logging/work.logger";

export class ArrayLambdaFunction extends FunctionExpression {

    protected target_arg: VariableExpression;

    protected lambda_arg: LambdaExpression;

    protected localChecker?: ScopeTypeChecker;

    public constructor(name: string, args: Expression[]) {
        super(name, args);
        this.target_arg = args[0] as VariableExpression;
        this.lambda_arg = args[1] as LambdaExpression;
    }

    protected setLambdaTargetType(type: AtomicType | ObjectType): void {
        this.localChecker?.setType(this.lambda_arg.getVariableName(), type);
    }

    protected getLocalChecker(checker?: TypeChecker): ScopeTypeChecker {
        if (!this.localChecker) {
            this.localChecker = new ScopeTypeChecker(checker);

            const arrayType = getReturnType(this.target_arg, checker) || 'array';
            if (arrayType) {
                if ((arrayType as ObjectArrayType) && (arrayType as ObjectArrayType).items) {
                    const items = (arrayType as ObjectArrayType).items!;
                    this.localChecker.setType(this.lambda_arg.getVariableName(), items);
                } else {
                    const itemType = (arrayType as ArrayType).endsWith('[]') ? (arrayType as ArrayType).slice(0, -2) as AtomicType : {} as ObjectType;
                    if (itemType) {
                        this.localChecker.setType(this.lambda_arg.getVariableName(), itemType);
                    }
                }
            }
        }
        return this.localChecker;
    }

    public requires(): Set<string> {
        const vars = new Set<string>();
        for (const arg of this.args) {
            const argReqs = arg.required();
            for (const req of argReqs) {
                vars.add(req);
            }
        }
        return vars;
    }

    public expectsParameters(): TypedParameter[] {
        return [
            { type: 'array' },
            { type: 'lambda' },
        ]
    }

    public returnsType(checker?: TypeChecker): AtomicType | ArrayType | ObjectArrayType {

        switch (this.name) {
            case 'every':
            case 'any':
                return 'boolean';

            case 'sort':
            case 'filter':
                // The following in case created without arguments, e.g. in autocomplete suggestions
                if (!this.target_arg || !this.lambda_arg) {
                    return 'array';
                }
                return getReturnType(this.target_arg, checker) as ArrayType | ObjectArrayType;

            case 'map':
                // The following in case created without arguments, e.g. in autocomplete suggestions
                if (!this.target_arg || !this.lambda_arg) {
                    return 'array';
                }
                this.localChecker = this.getLocalChecker(checker);
                const lambdaReturnType = getReturnType(this.lambda_arg, this.localChecker);
                if (!lambdaReturnType) {
                    throw new TypeCheckError(`Unable to determine return type of lambda argument in function ${this.name}`);
                }
                return makeArrayType(lambdaReturnType);
            default:
                throw new TypeCheckError(`Unknown lambda function: ${this.name}`);
        }
    }

    public checkTypes(checker?: TypeChecker): ValidationResult {
        if (!checker || !checker.strictSyntax()) {
            return { valid: true };
        }

        this.localChecker = this.getLocalChecker(checker);
        // const logger = checker.logger();

        const checks: ValidationResult[] = [];
        checks.push(this.target_arg.checkTypes(checker));

        const targetType = getReturnType(this.target_arg, checker);
        const target_is_array = isArrayType(targetType);
        if (!target_is_array) {
            checks.push({
                valid: false,
                errors: ['First parameter of lambda function must be an array type']
            });
            WorkLogger.warn('First argument to lambda function is not an array');
        }

        const lambdaTargetType = target_is_array ? makeItemType(targetType) : undefined;
        if (lambdaTargetType) this.setLambdaTargetType(lambdaTargetType);

        const lambdaReturns = getReturnType(this.lambda_arg, this.localChecker);

        switch (this.name) {
            case 'every':
            case 'any':
                if (lambdaReturns && lambdaReturns !== 'boolean') {
                    checks.push({
                        valid: false,
                        errors: [`Lambda expression in ${this.name} must return boolean, but got ${lambdaReturns}`],
                    });
                }
                break;
            case 'map':
            case 'sort':
            case 'filter':
                if (!lambdaReturns) {
                    checks.push({
                        valid: false,
                        errors: [`Unable to determine return type of lambda argument in function ${this.name}`],
                    });
                }
                break;
            default:
                checks.push({
                    valid: false,
                    errors: [`Unknown lambda function: ${this.name}`],
                });
        }

        checks.push(this.lambda_arg.checkTypes(this.localChecker));
        return mergeValidationResults(...checks);
    }

    public evaluate(context: WorkingContext): any {
        const cached = context.getCached(this.syntax);
        if (cached !== undefined) return cached;

        const targetArray = this.target_arg.evaluate(context);

        if (!Array.isArray(targetArray)) {
            throw new EvaluationError(`First argument to ${this.name} must evaluate to an array, but got ${typeof targetArray}`);
        }
        if (!(this.lambda_arg instanceof LambdaExpression)) {
            throw new EvaluationError(`Second argument to ${this.name} must be a lambda expression`);
        }

        // Run the lambda expression for each item in the array and collect the results
        const values = targetArray.map((item: any) => {
            const scope = new ScopeContext(context);
            scope.setData(this.lambda_arg.getVariableName(), item);
            return this.lambda_arg.evaluate(scope);
        });

        switch (this.name) {
            case 'every':
                return values.reduce((acc, val) => acc && !!val, true);
            case 'any':
                return values.reduce((acc, val) => acc || !!val, false);
            case 'sort':
                const indices = targetArray.map((_, idx) => idx);
                indices.sort((a, b) => {
                    const item_a = values[a], item_b = values[b];
                    return this.defaultCompare(item_a, item_b);
                });
                return indices.map(idx => targetArray[idx]);

            case 'filter':
                return targetArray.filter((_: any, index: number) => !!values[index]);
            case 'map':
                return values;
            default:
                throw new EvaluationError(`Unknown lambda function: ${this.name}`);
        }
    }

    private defaultCompare(a: unknown, b: unknown): number {
        if (a === b) return 0;
        if (a == null) return -1;
        if (b == null) return 1;

        // Strings: locale-aware comparison
        if (typeof a === 'string' && typeof b === 'string') {
            return a.localeCompare(b);
        }

        // Numbers, Dates, or other comparable primitives
        return a < b ? -1 : a > b ? 1 : 0;
    }
}

export class ArrayLambdaFunctionProvider {

    private static _names = ['every', 'any', 'sort', 'filter', 'map'];

    public static names(): string[] {
        return this._names;
    }

    public static create(name: string, args: Expression[]): FunctionExpression | undefined {
        if (!this._names.includes(name)) {
            return undefined;
        }
        if (args.length !== 2) {
            throw new TypeCheckError(`Function ${name} expects exactly 2 arguments, but got ${args.length}`);
        }
        return new ArrayLambdaFunction(name, args);
    }

    public static mock(name: string, args: Expression[]): FunctionExpression | undefined {
        if (!this._names.includes(name)) {
            return undefined;
        }
        return new ArrayLambdaFunction(name, args);
    }
}
