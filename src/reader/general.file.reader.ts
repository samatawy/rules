import JSON5 from "json5";
import { Workspace } from "../engine/workspace";
import { WorkspaceTransaction } from "./workspace.transaction";
import { FunctionParser } from "../parser/function.parser";
import { RuleParser } from "../parser/rule.parser";
import { TypeParser } from "../parser/type.parser";
import { AbstractRule } from "../rules/abstract.rule";
import type { FunctionDefinition, RootType } from "../types";
import { AbstractFileReader, type FileReaderOptions } from "./abstract.file.reader";

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
 * You should use this class to read content from a text file or stream, where each line (or block) defines a constant, type, rule, or function.
 * The reader will parse the file content and return an object containing the successfully parsed elements as well as any errors encountered during parsing.
 * The reader supports both line-by-line and block-by-block reading, allowing for flexible formatting of the file.
 * It also includes error handling for invalid syntax and duplicate keys, ensuring that the resulting objects are valid and usable within the rule engine.
 *
 * N.B. Declarations do not need to be in order, although that is still recommended.
 *  
 * N.B. This is a transactional safe reader. If you provide a workspace and select the option accept: 'all', 
 * then that workplace will not be affected if any errors are encountered. 
 */
export class GeneralFileReader extends AbstractFileReader {

    protected options: Partial<GeneralFileReaderOptions>;

    protected ruleParser: RuleParser;

    protected functionParser: FunctionParser;

    protected typeParser: TypeParser;

    /**
     * The workspace instance to which the parsed rules, functions, types, and constants will be added. 
     * This allows for components to recognize earlier declared components.
     */
    protected workspace: Workspace;

    protected blocks: string[];

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

        this.workspace = this.options.workspace || new Workspace();
        this.ruleParser = new RuleParser({ workspace: this.workspace });
        this.functionParser = new FunctionParser({ workspace: this.workspace });
        this.typeParser = new TypeParser({ workspace: this.workspace });
        this.blocks = [];
    }

    /**
     * Parse the content of a functions file and return the result, including the successfully parsed components and any errors encountered during parsing.
     * A general file can read types, constants, rules, and functions.
     * 
     * @param fileContent The content of the file to parse.
     * @returns The result of parsing, including the successfully parsed constants, functions, types, rules, and any errors encountered.

     */
    public parse(fileContent: string): GeneralReaderResult {
        let origin = fileContent.trim();
        let remainder = origin;
        // const syntaxes: string[] = [];
        while (remainder.length > 0) {
            const { line, remainder: newRemainder } = this.options.read_by === 'block' ?
                this.readBlock(remainder) :
                this.readLine(remainder);

            if (line.length > 0 && !line.startsWith('//')) {
                this.blocks.push(line);
            }
            remainder = newRemainder;
        }

        return this.parseAll();
    }

    protected parseAll(): GeneralReaderResult {

        const transaction = WorkspaceTransaction.begin(this.workspace);

        const result: GeneralReaderResult = {
            read: this.blocks.length,
            passed: 0,
            failed: 0,
            constants: {},
            functions: {},
            types: {},
            rules: [],
            errors: [],
        }
        let unparsed: string[] = [...this.blocks];
        let deferred: string[] = [];

        while (unparsed.length > 0) {
            let success = 0;
            // Take each unparsed block
            for (const syntax of unparsed) {
                // and try to parse it..
                const parsed = this.parseBlock(syntax);
                if (parsed) {
                    // Success - add the component to be used
                    if (this.isConstant(parsed)) {
                        const key = Object.keys(parsed)[0]!;
                        this.workspace.addConstant(key, parsed[key]);
                        result.constants[key] = parsed[key];
                        result.passed += 1;
                    }
                    else if (this.isRootType(parsed)) {
                        this.workspace.typeRegistry().addRootType(parsed);
                        result.types[parsed.key] = parsed;
                        result.passed += 1;
                    }
                    else if (this.isFunctionDefnition(parsed)) {
                        this.workspace.functionRegistry().addFunction(parsed);
                        result.functions[parsed.name] = parsed;
                        result.passed += 1;
                    }
                    else if (parsed instanceof AbstractRule) {
                        this.workspace.addRule(parsed);
                        result.rules.push(parsed);
                        result.passed += 1;
                    }
                    else {
                        result.errors.push('Unrecognized component: ' + JSON5.parse(parsed));
                        result.failed += 1;
                    }

                    success += 1;
                } else {
                    // Failure - may be missing dependencies
                    // Return the block to be parsed in a later iteration
                    deferred.push(syntax);
                }
            }
            if (success === 0) {
                // no more parsing can succeed
                break;
            } else {
                // return to parse deferred blocks
                unparsed = [...deferred];
                deferred = [];
            }
        }

        result.failed += deferred.length;
        for (const syntax of deferred) {
            result.errors.push(`Failed to parse syntax: [${syntax}]`);
        }

        if (this.options.accept === 'all' && result.errors.length > 0) {
            transaction.rollback();
        } else {
            transaction.commit();
        }

        return result;
    }

    protected parseBlock(syntax: string): any {
        const constant = this.parseConstant(syntax);
        if (constant) {
            return constant;
        }

        const rule = this.parseRule(syntax);
        if (rule) {
            return rule;
        }

        const func = this.parseFunction(syntax);
        if (func) {
            return func;
        }

        const type = this.parseType(syntax);
        if (type) {
            return type;
        }

        return undefined;
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
            let value = match[2];
            if (value === undefined) return null;
            // Remove quotes from string
            let quoted = /"(.*)"/.exec(value) || /'(.*)'/.exec(value);
            if (quoted) value = quoted[1];

            return { ['' + key]: value };
        } else {
            return null;
        }
    }

    protected parseType(content: string): RootType | null {
        // Parse a line defining a type, expected in JSON format with at least a "key" property, 
        // e.g. { "key": "Person", "properties": { "name": "string", "age": "number" } }
        // Should also be able to read JSON5 format to allow for comments and more flexible syntax, e.g.
        // {
        //     // This is a comment
        //     key: 'Person', // The unique key for this type
        //     properties: { // The properties of the Person type
        //         name: 'string', // The name property is a string
        //         age: 'number', // The age property is a number
        //         isAdult: 'boolean' // The isAdult property is a boolean
        //     }
        // }
        try {
            return this.typeParser.parseRootType(content);

        } catch (e) {
            return null;
        }
    }
}