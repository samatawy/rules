import { WorkSpace } from "../engine/work.space";
import { FunctionParser } from "../parser/function.parser";
import { RuleParser } from "../parser/rule.parser";
import type { AbstractRule } from "../rules/abstract.rule";
import type { FunctionDefinition, RootType } from "../types";
import { AbstractFileReader, type FileReaderOptions } from "./abstract.file.reader";
import JSON5 from 'json5';

export interface GeneralReaderResult {
    read: number;
    passed: number;
    failed: number;
    rules: AbstractRule[];
    functions: Record<string, FunctionDefinition>;
    types: Record<string, RootType>;
    constants: Record<string, any>;
    errors: string[];
}

/**
 * Options for configuring the behavior of the GeneralFileReader when parsing content from a file.
 */
export interface GeneralFileReaderOptions extends FileReaderOptions {
    /**
     * Determines whether to accept all components (including invalid ones) or only fully valid components.
     * - 'all': Accept all components, but include errors for any invalid components. The resulting objects will include only the successfully parsed components, and the errors array will contain messages for any components that failed to parse.
     * - 'partial': Only accept components if all of them are valid. If any component fails to parse, the entire parsing process will be considered a failure, and the resulting objects will be empty while the errors array will contain messages for all failed components.
     */
    accept: 'all' | 'partial';
};

/**
 * Reader class for parsing general files that can contain constants, types, rules, and functions to be used within the rule engine.
 * You should use this class to read content from a text file, where each line (or block) defines a constant, type, rule, or function.
 * The reader will parse the file content and return an object containing the successfully parsed elements as well as any errors encountered during parsing.
 * The reader supports both line-by-line and block-by-block reading, allowing for flexible formatting of the file.
 * It also includes error handling for invalid syntax and duplicate keys, ensuring that the resulting objects are valid and usable within the rule engine.
 */
export class GeneralFileReader extends AbstractFileReader {

    protected options: Partial<GeneralFileReaderOptions>;

    protected ruleParser: RuleParser;

    protected functionParser: FunctionParser;

    /**
     * The workspace instance to which the parsed rules, functions, types, and constants will be added. 
     * This allows for components to recognize earlier declared components.
     */
    protected workspace: WorkSpace;

    /**
     * Create a new instance of the GeneralFileReader with the specified options for parsing content from a file.
     * @param options Optional configuration for the reader.
     */
    constructor(options?: Partial<GeneralFileReaderOptions>) {
        super({
            read_by: options?.read_by || 'block',
            workspace: options?.workspace,
        });
        this.options = {
            read_by: options?.read_by || 'block',
            accept: options?.accept || 'all',
            ...options
        }

        this.workspace = this.options.workspace || new WorkSpace();
        this.ruleParser = new RuleParser({ workspace: this.workspace });
        this.functionParser = new FunctionParser({ workspace: this.workspace });
    }

    /**
     * Parse the content of a file and return an array of strings, each representing a line or block of content based on the specified reading method.
     * A general file can read types, constants, rules, and functions.
     * @param fileContent The content of the file to parse.
     * @returns An array of strings, each representing a line or block of content based on the specified reading method.
     */
    public parse(fileContent: string): GeneralReaderResult {
        let origin = fileContent.trim();
        let remainder = origin;
        const syntaxes: string[] = [];
        while (remainder.length > 0) {
            const { line, remainder: newRemainder } = this.options.read_by === 'block' ?
                this.readBlock(remainder) :
                this.readLine(remainder);
            if (line.length > 0 && !line.startsWith('//')) {
                syntaxes.push(line);
            }
            remainder = newRemainder;
        }

        const result: GeneralReaderResult = {
            read: syntaxes.length,
            passed: 0,
            failed: 0,
            rules: [],
            functions: {},
            types: {},
            constants: {},
            errors: []
        };

        for (const syntax of syntaxes) {

            const constant = this.parseConstant(syntax);
            if (constant) {
                const key = Object.keys(constant)[0] || '';
                if (!!key && result.constants.hasOwnProperty(key)) {
                    result.errors.push(`Duplicate constant key: ${key}`);
                    result.failed++;
                    continue;
                }
                result.constants[key] = constant[key];
                this.workspace.addConstant(key, constant[key]);
                result.passed++;
                continue;
            }

            const rule = this.parseRule(syntax);
            if (rule) {
                result.rules.push(rule);
                result.passed++;
                continue;
            }

            const func = this.parseFunction(syntax);
            if (func) {
                const key = func.name;
                if (result.functions.hasOwnProperty(key)) {
                    result.errors.push(`Duplicate function name: ${key}`);
                    result.failed++;
                    continue;
                }
                result.functions[key] = func;
                this.workspace.getFunctionMemory().addFunction(func);
                result.passed++;
                continue;
            }

            const type = this.parseType(syntax);
            if (type) {
                if (result.types.hasOwnProperty(type.key)) {
                    result.errors.push(`Duplicate type key: ${type.key}`);
                    result.failed++;
                    continue;
                }
                result.types[type.key] = type;
                this.workspace.getTypeMemory().addRootType(type);
                result.passed++;
                continue;
            }

            result.errors.push(`Unrecognized syntax: ${syntax}`);
            result.failed++;
        }

        return result;
    }

    protected parseRule(content: string): AbstractRule | null {
        try {
            return this.ruleParser.parse(content);
        } catch (e) {
            return null;
        }
    }

    protected parseFunction(content: string): FunctionDefinition | null {
        try {
            return this.functionParser.parse(content);
        } catch (e) {
            return null;
        }
    }

    protected parseConstant(content: string): Record<string, any> | null {
        // Parse a line assigning a key to a value, e.g. CONST YEAR = 365 or YEAR= 365 (with or without the CONST keyword)
        const match = /^\s*(?:CONST\s+)?(\w+)\s*=\s*(.+)$/i.exec(content);
        if (match) {
            const key = match[1];
            const value = match[2];
            return { ['' + key]: value };
        } else {
            return null;
        }
    }

    protected parseType(content: string): RootType | null {
        // Parse a line defining a type, expected in JSON format with at least a "key" property, 
        // e.g. { "key": "Person", "properties": { "name": "string", "age": "number" } }
        // Should also be able to read JSON5 format to allow for comments and more flexible syntax, e.g.
        // { key: 'Person', properties: { name: 'string', age: 'number', isAdult: 'boolean' } }
        try {
            const json = JSON5.parse(content);
            if (typeof json !== 'object' || json === null || Array.isArray(json)) {
                return null;
            }
            if (!json.hasOwnProperty('key')) {
                throw new Error(`Type definition must have a "key" property: ${content}`);
            }
            return json as RootType;

        } catch (e) {
            return null;
        }
    }
}