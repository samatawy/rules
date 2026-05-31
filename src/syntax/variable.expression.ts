import type { TypeChecker, ValidationResult, WorkingContext } from "../interfaces";
import type { Renderable } from "../rendering/render.types";
import { Expression } from "./expression";

export class VariableExpression extends Expression {

    protected variableName: string;

    constructor(variableName: string) {
        super();
        this.variableName = variableName;

        this.syntax = variableName;
    }

    public getVariableName(): string {
        return this.variableName;
    }

    public getParts(): Expression[] {
        return [this];
    }

    public required(): Set<string> {
        return new Set([this.variableName]);
    }

    public invokes(): Set<string> {
        return new Set();
    }

    public checkTypes(checker?: TypeChecker): ValidationResult {
        if (!checker || !checker.strictInputs()) {
            return { valid: true };
        }

        if (!checker.hasType(this.variableName)) {
            return { valid: false, errors: [`Undefined variable: ${this.variableName}`] };
        } else {
            return { valid: true };
        }
    }

    public evaluate(context: WorkingContext): any {
        const variable = context.getData(this.variableName);
        if (variable === undefined) {
            return context.getConstant(this.variableName);
        } else {
            return variable;
        }
    }

    public toString(): string {
        return this.variableName;
    }

    public toJS(): string {
        return `context.getData('${this.variableName}')`;
    }

    public toJson(): Renderable {
        return {
            type: 'VariableExpression',
            name: this.variableName,
        };
    }
}