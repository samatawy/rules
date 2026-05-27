import type { TypeChecker, ValidationResult, WorkingContext } from "../interfaces";
import { mergeValidationResults } from "../common.utils";
import { Expression } from "./expression";
import type { Renderable } from "../render/render.types";

export class ArrayExpression extends Expression {

    protected elements: Expression[];

    constructor(elements: Expression[]) {
        super();
        this.elements = elements;

        this.syntax = this.toString();
    }

    public getElements(): Expression[] {
        return this.elements;
    }

    public getParts(): Expression[] {
        return [...this.elements];
    }

    public required(): Set<string> {
        const requirements = new Set<string>();
        for (const element of this.elements) {
            const elementRequirements = element.required();
            for (const req of elementRequirements) {
                requirements.add(req);
            }
        }
        return requirements;
    }

    public invokes(): Set<string> {
        const all = this.elements.flatMap(e => Array.from(e.invokes()));
        return new Set(all);
    }

    public checkTypes(checker?: TypeChecker): ValidationResult {
        return mergeValidationResults(...this.elements.map(e => e.checkTypes(checker)));
    }

    public evaluate(context: WorkingContext): any[] {
        const cached = context.getCached(this.syntax);
        if (cached !== undefined) return cached;

        return this.elements.map(e => e.evaluate(context));
    }

    public toString(): string {
        return `[${this.elements.map(e => e.toString()).join(', ')}]`;
    }

    public toJson(): Renderable {
        return {
            type: 'ArrayExpression',
            elements: this.elements.map(e => e.toJson()),
        };
    }
}