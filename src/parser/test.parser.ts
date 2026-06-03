import type { ParserOptions } from "./rule.parser";
import { ParserError } from "../rules/exception";
import { parseTypeJson } from "../common.utils";
import { AbstractTestCase } from "../testing/abstract.test.case";
import { ForwardTestCase } from "../testing/forward.test.case";
import { BackwardTestCase } from "../testing/backward.test.case";
import JSON5 from "json5";

export interface TestCaseMetadata {
    name?: string;
    hint?: string;
    disabled?: boolean;
    syntax?: string;
}

/**
 * Parser class for parsing test cases from DSL syntax into AbstractTestCase objects.
 * This parser is designed to handle test cases that can be used to test workspaces.
 * The expected syntax for test cases is DSL-based, where an AbstractTestCase must have a "TEST input object" clause 
 * and either an "EXPECT output object" or an "EXPECT ERRORS array" clause.
 * The parser includes validation to ensure that the provided DSL syntax conforms to the expected structure for test cases. 
 */
export class TestParser {

    private options: ParserOptions;

    constructor(options: ParserOptions) {
        this.options = options;
    }

    /**
     * Parse a test case from its DSL syntax string and return the corresponding AbstractTestCase object.
     * Should be able to read strict and relaxed JSON syntax for test cases, such as:
     * { "key": "Person", "type": "object", "properties": { "name": "string", "age": "number" } }
     * or with relaxed JSON syntax like:
     * { key: 'Person', type: 'object', properties: { name: 'string', age: 'number' } }
     * 
     * @param syntax The DSL syntax string of the test case to parse.
     * @returns The parsed AbstractTestCase object if successful.
     * @throws An error if the syntax is invalid or if parsing fails for any reason.
     */
    public parseTestCase(syntax: string): AbstractTestCase {
        const metadata = this.parseMetadata({ syntax });
        syntax = metadata.syntax || '';
        if (syntax.length === 0) {
            throw new ParserError('Test case syntax cannot be empty');
        }

        const parsed = this.parseTestJson(syntax);

        if (parsed) {
            parsed.name = metadata.name;
            parsed.hint = metadata.hint;
            metadata.disabled ? parsed.disable() : parsed.enable();
            return parsed;
        } else {
            throw new ParserError(`Unrecognized test case syntax: ${syntax}`);
        }
    }

    protected parseMetadata(given: TestCaseMetadata): TestCaseMetadata {
        given.syntax = given.syntax?.trim() || '';
        if (given.syntax.length === 0 || !(given.syntax.startsWith('@'))) {
            return given;
        }

        if (given.syntax.startsWith('@name(')) {
            const match = given.syntax.match(/^@name\((.+?)\)\s*(.*)$/ms);
            if (match) {
                given.name = match[1]!;
                given.syntax = match[2]!;
            }
        } else if (given.syntax.startsWith('@hint(')) {
            const match = given.syntax.match(/^@hint\((.+?)\)\s*(.*)$/ms);
            if (match) {
                given.hint = match[1]!;
                given.syntax = match[2]!;
            }
        } else if (given.syntax.startsWith('@disabled(')) {
            const match = given.syntax.match(/^@disabled\((.*?)\)\s*(.*)$/ms);
            if (match) {
                given.disabled = true;
                given.syntax = match[2]!;
            }
        }

        // loop to allow multiple metadata annotations in any order, like "@name(...) @salience(...) @hint(...)"
        return this.parseMetadata(given);
    }

    protected parseTestJson(syntax: string): AbstractTestCase {

        const match = syntax.match(/^TEST\s+(.+?)\s+EXPECT\s+(.+)$/msi);
        if (match) {
            const inputSyntax = match[1]!;
            const expectedSyntax = match[2]!;

            const input = this.parseInput(inputSyntax);
            const expected = this.parseExpected(expectedSyntax);

            if (input.target && expected.errors.length > 0) {
                return new BackwardTestCase(input.target, input.input, expected.output, expected.errors);
            }
            else if (input.target) {
                return new BackwardTestCase(input.target, input.input, expected.output);
            }
            else if (expected.errors.length > 0) {
                return new ForwardTestCase(input.input, undefined, expected.errors);
            }
            else {
                return new ForwardTestCase(input.input, expected.output);
            }
        }
        throw new ParserError(`Syntax does not match TestCase pattern: ${syntax}`);
    }

    private parseInput(syntax: string): { target: string, input: any } {
        try {
            // Match against the pattern: <target> FROM <input> or simply <input> if no target is specified
            const match = syntax.match(/^(.+?)\s+FROM\s+(.+)$/msi);

            if (match) {
                const target = match[1]!.trim();
                const inputSyntax = match[2]!.trim();
                const input = JSON5.parse(inputSyntax);
                return { target, input };
            } else {
                const input = JSON5.parse(syntax);
                return { target: '', input };
            }
        } catch (e) {
            throw new ParserError(`Failed to parse input: ${syntax}`, { cause: e });
        }
    }

    private parseExpected(syntax: string): { output: any, errors: string[] } {
        try {
            // Match against the pattern: ERRORS <strings> or simply <output>
            const match = syntax.match(/^ERRORS\s+(.+)$/msi);
            if (match) {
                const errorSyntax = match[1]!.trim();
                const errors = JSON5.parse(errorSyntax);
                return { output: undefined, errors };
            } else {
                const output = JSON5.parse(syntax);
                return { output, errors: [] };
            }
        } catch (e) {
            throw new ParserError(`Failed to parse expected: ${syntax}`, { cause: e });
        }
    }

    public isValidTestCase(json: any): boolean {
        if (json.when == null || typeof json.when !== 'object') {
            return false;
        }
        if (json.expect == null || typeof json.expect !== 'object') {
            return false;
        }
        return true;
    }

}
