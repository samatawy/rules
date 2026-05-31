import type { AtomicType, ObjectType } from "../types";
import type { TypeChecker, ValidationResult, WorkingContext } from "../interfaces";
import { getReturnType } from "../type.utils";
import { Expression } from "./expression";
import type { Renderable } from "../rendering/render.types";
import { FunctionCompiler } from "../parser/function.compiler";
import { WorkLogger } from "../logging/work.logger";

/**
 * A LambdaExpression represents an anonymous function that takes a single variable as input and returns a value based on an expression.
 * The variable name is used within the expression to refer to the input value of the lambda function.
 * Lambda expressions are commonly used in array functions like map or filter to define the transformation 
 * or condition applied to each element of the array.
 * 
 * N.B. Lambda expressions are not standalone functions and cannot be called directly. 
 * They are meant to be used as arguments to higher-order functions that can execute them with the appropriate context.
 * Use a ScopeContext and ScopeTypeChecker when calling lambda expressions.
 */
export class LambdaExpression extends Expression {

    protected variableName: string;

    protected expression: Expression;

    protected compiled?: Function;

    /**
     * Creates a new LambdaExpression with the given variable name and expression body.
     * The variable name is the identifier used in the expression body to refer to the input value of the lambda function.
     * @param variableName The name of the variable used in the lambda expression.
     * @param expression The expression body of the lambda function.
     */
    constructor(variableName: string, expression: Expression) {
        super();
        this.variableName = variableName;
        this.expression = expression;

        this.syntax = this.toString();

        if (FunctionCompiler.enabled) {
            if (FunctionCompiler.missingFunctions(this.expression)) {
                WorkLogger.warn(`Cannot compile LambdaExpression due to missing function dependencies in the expression body`);
            } else {
                this.compiled = FunctionCompiler.compileFunction([this.variableName], `{ return (${this.expression.toJS()}); }`);
            }
        }
    }

    /**
     * Get the name of the variable used in the lambda expression.
     * @returns The name of the variable.
     */
    public getVariableName(): string {
        return this.variableName;
    }

    public compiledFunction(): Function | undefined {
        return this.compiled;
    }

    public getParts(): Expression[] {
        return this.expression.getParts();
    }

    public required(): Set<string> {
        return new Set<string>();
    }

    public invokes(): Set<string> {
        return this.expression.invokes();
    }

    /**
     * Get the return type of the lambda expression. 
     * This can be an atomic type or an object type, depending on the expression body. 
     * @param checker optional type checker to use for determining the return type. 
     * This is needed for cases where the return type depends on variable types or function return types.
     * @returns The return type of the lambda expression.
     */
    public returnsType(checker?: TypeChecker): AtomicType | ObjectType {
        return getReturnType(this.expression, checker) as AtomicType || {} as ObjectType;
    }

    public checkTypes(checker?: TypeChecker): ValidationResult {
        return this.expression.checkTypes(checker);
    }

    public evaluate(context: WorkingContext): any {
        return this.expression.evaluate(context);
    }

    public toString(): string {
        return this.variableName + " => " + this.expression.toString();
    }

    public toJS(): string {
        let syntax = this.expression.toJS();
        syntax = FunctionCompiler.normalizeParameters([this.variableName], syntax);

        return `(${this.variableName}) => { return (${syntax}); }`;
    }

    public toJson(): Renderable {
        return {
            type: 'LambdaExpression',
            name: this.variableName,
            expression: this.expression.toJson(),
        };
    }
}