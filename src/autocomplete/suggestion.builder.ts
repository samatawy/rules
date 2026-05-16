import type { Workspace } from "../engine/workspace";
import { FunctionFactory } from "../parser/function.factory";
import { FunctionParser } from "../parser/function.parser";
import type { ObjectArrayType, ObjectType, PropertyType } from "../types";
import { getReturnType, makeItemType } from "../type.utils";
import type { AutocompleteSuggestion } from "./autocomplete";
import { Closers, ComparisonOperators, LogicalOperators, NumericOperators, Openers, Quoters, Separators, TernaryOperators } from "./constants";
import { isArrayType, isAtomicType } from "../parser/type.parser";

/**
 * Internal helper class used by Autocomplete.
 * You should not need to use this class directly.
 */
export class SuggestionBuilder {

    private workspace: Workspace;

    private functionFactory: FunctionFactory;

    constructor(workspace: Workspace) {
        this.workspace = workspace;
        this.functionFactory = new FunctionFactory({ workspace });
    }

    public generateSuggestions(): AutocompleteSuggestion[] {
        const typeRegistry = this.workspace.typeRegistry();
        const constants = this.workspace.getConstants();
        const functionRegistry = this.workspace.functionRegistry();

        const suggestions: AutocompleteSuggestion[] = [];

        // Add operators
        for (const operator of NumericOperators) {
            suggestions.push({ value: operator, kind: 'operator', comes_after: ['number'], comes_before: ['number'] });
        }
        for (const operator of ComparisonOperators) {
            if (operator === 'IN') {
                suggestions.push({ value: operator, kind: 'operator', comes_after: ['any'], comes_before: ['array'] });
            } else {
                suggestions.push({ value: operator, kind: 'operator', comes_after: ['any'], comes_before: ['any'] });
            }
        }
        for (const operator of LogicalOperators) {
            suggestions.push({ value: operator, kind: 'operator', comes_after: ['boolean'], comes_before: ['boolean'] });
        }
        for (const operator of TernaryOperators) {
            switch (operator) {
                case '?':
                    suggestions.push({ value: operator, kind: 'operator', comes_after: ['boolean'] });
                    break;
                case ':':
                    suggestions.push({ value: operator, kind: 'operator', comes_after: ['any'] });
                    break;
            }
        }

        for (const opener of Openers) {
            suggestions.push({ value: opener, kind: 'opener' });
        }
        for (const closer of Closers) {
            suggestions.push({ value: closer, kind: 'closer', comes_after: ['any'] });
        }
        for (const quoter of Quoters) {
            suggestions.push({ value: quoter, kind: 'quoter' });
        }
        for (const separator of Separators) {
            suggestions.push({ value: separator, kind: 'separator', comes_after: ['any'] });
        }

        // Add variables - any identifier in the type registry that is not a root type can be considered a variable
        for (const variable of Object.keys(this.workspace.typeRegistry().getRootTypes())) {
            const rootType = typeRegistry.getRootType(variable);
            if (rootType) {
                suggestions.push({ value: variable, kind: 'variable' });
                if (rootType.properties) {
                    for (const prop of Object.keys(rootType.properties)) {
                        const propType = rootType.properties[prop];
                        this.addVariableSuggestions(`${variable}.${prop}`, propType!, suggestions);
                    }
                }
            }
        }

        // Add constants
        for (const constant of Object.keys(constants)) {
            suggestions.push({ value: constant, kind: 'constant' });
        }

        // Add types
        for (const type of ['string', 'number', 'boolean', 'date', 'array', 'string[]', 'number[]', 'boolean[]', 'date[]']) {
            suggestions.push({ value: type, kind: 'type', comes_after: [':'] });
        }

        // Add custom functions
        for (const [key, func] of Object.entries(functionRegistry.getFunctions())) {
            const returnType = func.expression ? getReturnType(func.expression) || 'any' : 'any';
            suggestions.push({ value: func.name, kind: 'function', returns: returnType + '', comes_before: ['('] });
        }

        // Add built-in functions
        const builtin = FunctionParser.getReservedNames();
        for (const name of builtin) {
            const func = this.functionFactory.create(name, []);
            const returnType = func?.returnsType();

            suggestions.push({ value: name, kind: 'function', returns: returnType + '', comes_before: ['('] });
        }

        return suggestions;
    }

    protected addVariableSuggestions(path: string, type: PropertyType, suggestions: AutocompleteSuggestion[]): void {
        if (isAtomicType(type)) {
            // For atomic types, we can directly add them to suggestions
            suggestions.push({ value: path, kind: 'variable', returns: `${type}` });
        } else if (isArrayType(type) && isAtomicType(makeItemType(type))) {
            // For array types, we can also add them directly to suggestions
            suggestions.push({ value: path, kind: 'variable', returns: `${type}` });
        } else if ((type as ObjectArrayType).type === 'array') {
            // For object array types, we can add the array type and also the item type if it exists
            suggestions.push({ value: path, kind: 'variable', returns: 'array' });
            const items = (type as ObjectArrayType).items;
            if (items) {
                for (const [key, prop] of Object.entries(items as ObjectType)) {
                    this.addVariableSuggestions(`${path}.${key}`, prop, suggestions);
                }
            }
        } else if (typeof type === 'object' && type !== null) {
            // For object types, we can add the type itself and also its properties
            for (const [key, prop] of Object.entries(type)) {
                this.addVariableSuggestions(`${path}.${key}`, prop, suggestions);
            }
        }
    }
}
