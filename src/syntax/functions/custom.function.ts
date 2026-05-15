import { ScopeContext, ScopeTypeChecker } from "../../engine/scope.memory";
import { EvaluationError, RuleException, TypeCheckError } from "../../rules/exception";
import type { ArrayType, AtomicType, FunctionDefinition, ObjectType, TypedParameter } from "../../types";
import type { TypeChecker, ValidationResult, WorkingContext } from "../../interfaces";
import { assignableTo, getLiteralType, getReturnType } from "../../type.utils";
import { mergeValidationResults } from "../../common.utils";
import type { Expression } from "../expression";
import { FunctionExpression } from "../function.expression";
import { WorkLogger } from "../../log/work.logger";
import { isArrayType, isAtomicType, isTypedObjectType } from "../../parser/type.parser";

export class CustomFunctionExpression extends FunctionExpression {

    static from(definition: FunctionDefinition, args: Expression[]): CustomFunctionExpression {
        const expr = new CustomFunctionExpression(definition.name, args);
        expr.definition = definition;
        return expr;
    }

    protected definition?: FunctionDefinition;

    protected localChecker?: ScopeTypeChecker;

    protected constructor(name: string, args: Expression[]) {
        super(name, args);
    }

    protected getLocalChecker(checker?: TypeChecker): ScopeTypeChecker {
        if (!this.definition) {
            throw new TypeCheckError(`Function definition not found for function ${this.name}`);
        }

        if (!this.localChecker) {
            this.localChecker = new ScopeTypeChecker(checker);

            const expected = this.definition.parameters;
            for (const arg of this.args) {
                const defined = expected[this.args.indexOf(arg)];
                if (defined) {
                    this.localChecker.setType(defined.name, defined.type as AtomicType | ArrayType);
                }
            }
            for (const line of this.definition.lines || []) {
                const changes = line.typedChanges();
                for (const change of Object.keys(changes)) {
                    const newType = changes[change];
                    if (newType) {
                        this.localChecker.setType(change, newType);
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

    public returnsType(checker?: TypeChecker): AtomicType | ArrayType | ObjectType {
        if (!this.definition) {
            throw new TypeCheckError(`Function definition not found for function ${this.name}`);
        }
        this.localChecker = this.getLocalChecker(checker);

        const returnType = getReturnType(this.definition.expression, this.localChecker);
        if (!returnType) {
            throw new TypeCheckError(`Unable to determine return type of function ${this.name}`);
        }
        if (isAtomicType(returnType) || isArrayType(returnType) || isTypedObjectType(returnType)) {  // || returnType === 'any') {
            return returnType;
        } else {
            throw new TypeCheckError(`Invalid return type for function ${this.name}: expected atomic or array type, got ${returnType}`);
        }
    }

    public expectsParameters(): TypedParameter[] {
        if (this.definition) {
            return this.definition.parameters;
        } else {
            throw new TypeCheckError(`Function definition not found for function ${this.name}`);
        }
    }

    public checkTypes(checker?: TypeChecker): ValidationResult {
        if (!this.definition) {
            throw new TypeCheckError(`Function definition not found for function ${this.name}`);
        }

        this.localChecker = this.getLocalChecker(checker);

        const expected = this.expectsParameters();
        const checks: ValidationResult[] = [];
        let i = 0;

        for (const arg of this.args) {
            if (i >= expected.length) {
                checks.push({
                    valid: false,
                    errors: [`Function ${this.name} expects at most ${expected.length} arguments, but got ${this.args.length}`],
                });
                break;
            }
            const argType = getReturnType(arg, checker);
            const expectedType = expected[i]!.type;
            if (expectedType === 'array') {
                // This is a special case, parameters of type array can accept any array type (string[], number[], etc.)
                if (argType && !isArrayType(argType!)) {
                    WorkLogger.warn(`Array Type mismatch for argument ${i + 1} in function ${this.name}: expected array, got ${argType} (${arg})`);
                    checks.push({
                        valid: false,
                        errors: [`Argument ${i + 1} for function ${this.name} must be of type array, but got ${argType}`],
                    });
                }
            } else if (argType && !assignableTo(argType, expectedType)) {   // argType } != expectedType) {
                WorkLogger.warn(`Type mismatch for argument ${i + 1} in function ${this.name}: expected ${expectedType}, got ${argType} (${arg})`);
                checks.push({
                    valid: false,
                    errors: [`Argument ${i + 1} for function ${this.name} must be of type ${JSON.stringify(expectedType)}, but got ${JSON.stringify(argType)}`],
                });
            }

            // Dive into the argument's own type checks as well
            checks.push(arg.checkTypes(checker));
            i++;
        }

        if (i < expected.length) {
            const missingParams = expected.slice(i).map(param => param.toString()).join(', ');
            checks.push({
                valid: false,
                errors: [`Function ${this.name} expects at least ${expected.length} arguments, but got ${this.args.length}. Missing parameters: ${missingParams}`],
            });
        }

        for (const line of this.definition.lines || []) {
            const lineCheck = line.checkTypes(this.localChecker);
            if (!lineCheck.valid) {
                for (const error of lineCheck.errors || []) {
                    checks.push({ valid: false, errors: [`Type check failed for line in function ${this.name}: ${error}`] });
                }
            }
        }
        checks.push(this.definition.expression.checkTypes(this.localChecker));

        return mergeValidationResults(...checks);
    }

    public evaluate(context: WorkingContext): any {
        const cached = context.getCached(this.syntax);
        if (cached !== undefined) return cached;

        if (!this.definition) {
            throw new EvaluationError(`Undefined function ${this.name}`);
        }

        this.localChecker = this.getLocalChecker();
        const scope = new ScopeContext(context);
        for (const arg of this.args) {
            const defined = this.definition!.parameters[this.args.indexOf(arg)];
            const value = arg.evaluate(context);
            scope.setData(defined!.name, value);
        }

        if (this.definition.lines && this.definition.lines.length > 0) {
            for (const line of this.definition.lines) {
                const effect = line.execute(scope);
                if (effect.exception) {
                    scope.addException(new RuleException(effect.exception, { function: this.name }));
                    break;
                } else if (effect.changed) {
                    const newValue = scope.getOutput(effect.changed);
                    this.localChecker?.setType(effect.changed, getLiteralType(newValue));
                }
            }
        }
        return this.definition.expression.evaluate(scope);
    }
}
