import type { TypeChecker, ValidationResult, WorkingContext } from "../interfaces";
import type { Renderable } from "../rendering/render.types";
import { Expression } from "./expression";

export class LiteralExpression extends Expression {

    protected value: any;

    constructor(value: any) {
        super();
        this.value = value;

        this.syntax = this.toString();
    }

    public getParts(): Expression[] {
        return [this];
    }

    public required(): Set<string> {
        return new Set();
    }

    public invokes(): Set<string> {
        return new Set();
    }

    public checkTypes(checker?: TypeChecker): ValidationResult {
        return { valid: true };
    }

    public evaluate(context?: WorkingContext): any {
        return this.value;
    }

    public toString(): string {
        if (typeof this.value === 'string') {
            return `"${this.value}"`;
        }
        return String(this.value);
    }

    public toJson(): Renderable {
        return {
            type: 'LiteralExpression',
            value: this.value,
        };
    }
}