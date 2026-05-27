import { describe } from "node:test";
import { expect, it } from "vitest";
import { Autocomplete } from "../src/autocomplete/autocomplete";
import { ExpressionParser } from "../src/parser/expression.parser";
import { Workspace } from "../src/engine/workspace";

describe('Autocomplete Test', () => {

    it('generates suggestions based on workspace types', async () => {
        const workspace = new Workspace();
        const typeRegistry = workspace.typeRegistry();
        typeRegistry.addRootType({
            key: 'Person',
            properties: {
                name: 'string',
                age: 'number',
                children: 'string[]',
                family: {
                    type: 'array',
                    items: {
                        name: 'string',
                        relation: 'string'
                    }
                }
            }
        });

        workspace.addConstant('PI', 3.14);
        workspace.addConstant('E', 2.71);
        workspace.addFunction({
            name: 'greet',
            parameters: [{ name: 'name', type: 'string' }],
            expression: new ExpressionParser({}).parse('concat(Hello, ", name, "!")')
        });

        const autocomplete = new Autocomplete(workspace);

        let suggested = autocomplete.getSuggestionsAt(0, '');
        // console.debug('At the beginning', suggested);
        expect(suggested.some(s => s.value === 'Person' && s.kind === 'variable')).toBe(true);
        expect(suggested.some(s => s.value === 'Person.name' && s.kind === 'variable' && s.returns === 'string')).toBe(true);
        expect(suggested.some(s => s.value === 'Person.age' && s.kind === 'variable' && s.returns === 'number')).toBe(true);
        expect(suggested.some(s => s.value === 'Person.children' && s.kind === 'variable' && s.returns === 'string[]')).toBe(true);
        expect(suggested.some(s => s.value === 'Person.family' && s.kind === 'variable' && s.returns === 'array')).toBe(true);
        expect(suggested.some(s => s.value === 'Person.family.name' && s.kind === 'variable' && s.returns === 'string')).toBe(true);
        expect(suggested.some(s => s.value === 'Person.family.relation' && s.kind === 'variable' && s.returns === 'string')).toBe(true);
        expect(suggested.some(s => s.value === 'PI' && s.kind === 'constant')).toBe(true);
        expect(suggested.some(s => s.value === 'E' && s.kind === 'constant')).toBe(true);
        expect(suggested.some(s => s.value === 'greet' && s.kind === 'function' && s.returns === 'string')).toBe(true);

        // suggested = autocomplete.getSuggestionsAt(10, 'Person.').filter(s => s.kind === 'variable');

        suggested = autocomplete.getSuggestionsAt(10, 'Person.');
        // console.debug('After typing "Person."', suggested);
        // Should only return properties of Person
        expect(suggested.every(s => s.value.startsWith('Person.'))).toBe(true);
        expect(suggested.some(s => s.value === 'Person.name' && s.returns === 'string')).toBe(true);
        expect(suggested.some(s => s.value === 'Person.age' && s.returns === 'number')).toBe(true);
        expect(suggested.some(s => s.value === 'Person.children' && s.returns === 'string[]')).toBe(true);
        expect(suggested.some(s => s.value === 'Person.family' && s.returns === 'array')).toBe(true);
        expect(suggested.some(s => s.value === 'Person.family.name' && s.returns === 'string')).toBe(true);
        expect(suggested.some(s => s.value === 'Person.family.relation' && s.returns === 'string')).toBe(true);

        suggested = autocomplete.getSuggestionsAt(9, 'x = max(');
        // console.debug('After typing "x = max("', autocomplete.getSuggestionsAt(8, 'x = max('));
        expect(suggested.every(s => s.returns === 'number')).toBe(true);
        expect(suggested.some(s => s.value === 'min' && s.kind === 'function' && s.returns === 'number')).toBe(true);

        suggested = autocomplete.getSuggestionsAt(5, 'x = max(Person.age, ');
        // console.debug('After m in "x = max(Person.age, "', autocomplete.getSuggestionsAt(5, 'x = max(Person.age, '));
        expect(suggested.every(s => s.value.startsWith('m'))).toBe(true);

        // console.debug('In function argument "greet("', autocomplete.getSuggestionsAt(6, 'greet('));
        // console.debug('In function argument "max(12, "', autocomplete.getSuggestionsAt(8, 'max(12, '));

        suggested = autocomplete.getSuggestionsAt(16, 'max(Person.age + ');
        // console.debug('In function argument "max(Person.age + "', autocomplete.getSuggestionsAt(16, 'max(Person.age + '));
        expect(suggested.every(s => s.returns === 'number')).toBe(true);

        suggested = autocomplete.getSuggestionsAt(7, 'count(');
        // console.debug('In function argument "count("', suggested);
        expect(suggested.every(s => s.returns === 'array')).toBe(true);

        suggested = autocomplete.getSuggestionsAt(11, 'Person.age.');
        // console.debug('After typing "Person.age."', suggested);
        // console.debug('After typing "Person.age."', suggested.filter(s => s.kind === 'function' && s.comes_after));
        expect(suggested.some(s => s.value === 'closeTo' && s.kind === 'function' && s.comes_after?.includes('number'))).toBe(true);
    });

});