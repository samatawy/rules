import type { GeneralReaderResult } from "./general.file.reader";
import { EngineError, ParserError } from "../rules/exception";
import type { Workspace } from "../engine/workspace";
import { AbstractFileReader } from "./abstract.file.reader";
import type { FunctionDefinition, RootType } from "../types";
import { AbstractRule } from "../rules/abstract.rule";
import { TypeParser } from "../parser/type.parser";
import { FunctionParser } from "../parser/function.parser";
import { RuleParser } from "../parser/rule.parser";
import { WorkspaceTransaction } from "./workspace.transaction";
import { parseTypeJson } from "../common.utils";
import { WorkLogger } from "../logging/work.logger";

export interface ComponentResult {
    read: number;
    failed: number;
    components: any[]
}

/**
 * Helper class to safely read rules, functions, types, and constants from files and load them into a workspace. 
 * It supports reading from strings, individual files, or entire folders, and can handle different file formats 
 * such as markdown, general, constants, rules, types, and functions files. The reader can be configured 
 * to either accept all valid components while logging errors for invalid ones, or to reject the entire file if any component is invalid. 
 *
 * N.B. Declarations do not need to be in order, although that is still recommended.
 *  
 * N.B. This is a transactional safe reader. If you provide a workspace and select the option accept: 'all', 
 * then that workplace will not be affected if any errors are encountered. 
 * 
 * Files should be named according to their content, with the following conventions:
 * - Constants files should include '.constants' in their name (e.g. 'my.constants.txt').
 * - Functions files should include '.functions' in their name (e.g. 'my.functions.txt').
 * - Types files should include '.types' in their name (e.g. 'my.types.txt').
 * - Rules files should include '.rules' in their name (e.g. 'my.rules.txt').
 * - Markdown files should have a '.md' extension (e.g. 'my.logic.md').
 * - General (mixed) files can have any name (e.g. 'my.logic.txt').
 * 
 * The reader will determine the type of each file based on these naming conventions and use the appropriate parsing method to load its content into the workspace.
 *
 * NB: This class relies on Node's 'fs' module for file system access, so it is intended for use in Node.js environments. 
 * In browser environments, file reading should be handled differently; this class will report errors in a browser environment.
 */
export class WorkspaceFilesReader extends AbstractFileReader {

    private workspace: Workspace;

    protected ruleParser: RuleParser;

    protected functionParser: FunctionParser;

    protected typeParser: TypeParser;

    private accept: 'all' | 'partial';

    private blocks: string[];

    private fs?: typeof import('fs') | undefined;

    /**
     * Create a new reader instance for loading rules, functions, types, and constants into the provided workspace.
     * 
     * N.B. After creation you must either call `withFS()` or `loadFileSystem()` to provide access to the file system before attempting to read files in a Node environment.
     * 
     * @param workspace The workspace into which the components will be loaded.
     * @param accept Determines whether to accept all valid components while logging errors for invalid ones ('partial') or to reject the entire file if any component is invalid ('all').
     */
    constructor(workspace: Workspace, accept: 'all' | 'partial' = 'all') {
        super();
        this.workspace = workspace;
        this.ruleParser = new RuleParser({ workspace });
        this.functionParser = new FunctionParser({ workspace });
        this.typeParser = new TypeParser({ workspace });

        this.accept = accept;
        this.blocks = [];
    }

    /**
     * This method is intended for use in the browser where File System access is not supported. 
     * In a node environment, use readFromFile() or readFromFiles().
     * 
     * @param fileContent The content of the file to parse.
     * @returns The result of parsing, including the successfully parsed constants, functions, types, rules, and any errors encountered.
     */
    public parse(fileContent: string): GeneralReaderResult {
        const read: string[] = [];

        let origin = fileContent.trim();
        let remainder = origin;

        // First, Read blocks until done
        while (remainder.length > 0) {
            const { line, remainder: newRemainder } = this.readBlock(remainder);

            if (line.length > 0) {
                read.push(line);
            }
            remainder = newRemainder;
        }
        this.blocks = [...read];

        // Second, try to parse all blocks
        const parseResult = this.parseAll();

        if (this.accept === 'all') {
            if (parseResult.failed > 0) return {
                read: parseResult.read,
                passed: 0,
                failed: parseResult.failed,
                constants: {},
                functions: {},
                types: {},
                rules: [],
                errors: []
            };
        }

        return parseResult;
    }

    /**
     * Attempt to read all files from a specified folder path and load their content into the workspace. 
     * The reader will determine the type of each file based on its name and extension, and use the appropriate parsing method. 
     * If any file fails to load and the accept option is set to 'partial', the reader will continue loading the remaining files while logging errors for the failed ones. 
     * If the accept option is set to 'all', the reader will stop loading further files upon encountering an error in any file.
     * 
     * @param folderPath the path of the folder containing the files to read. The reader will attempt to read all files in this folder.
     * @returns true if components were registered successfully (according to 'all' or 'partial' option), otherwise false.
     */
    public readFromFolder(folderPath: string): boolean {
        const paths = this.readFolderPaths(folderPath);

        return this.readFromFiles(paths || []);
    }

    /**
     * Attempt to read all given files and load their contents into the workspace.
     * The reader will determine the type of each file based on its name and extension, and use the appropriate parsing method. 
     * If any file fails to load and the accept option is set to 'partial', the reader will continue loading the remaining files while logging errors for the failed ones. 
     * If the accept option is set to 'all', the reader will stop loading further files upon encountering an error in any file.
     * 
     * @param paths an array of file paths to read.
     * @returns true if components were registered successfully (according to 'all' or 'partial' option), otherwise false.
     */
    public readFromFiles(paths: string[]): boolean {
        if (paths?.length > 0) {
            for (const path of paths) {
                const read = this.readBlocksFromFile(path);
                this.blocks.push(...read);
            }
        }

        if (this.blocks.length === 0) {
            return false;
        }

        // Second, try to parse all blocks
        const parseResult = this.parseAll();

        return (this.accept === 'all') ?
            parseResult.errors.length === 0 && parseResult.passed > 0
            : parseResult.passed > 0;
    }

    /**
     * Attempt to read a file from a specified path and load its content into the workspace.
     * The reader will determine the type of the file based on its name and extension, and use the appropriate parsing method.
     * 
     * @param path the path of the file to read.
     * @returns true if components were registered successfully (according to 'all' or 'partial' option), otherwise false.
     */
    public readFromFile(path: string): boolean {    // GeneralReaderResult {

        // First, read all blocks
        const read = this.readBlocksFromFile(path);
        this.blocks.push(...read);
        if (this.blocks.length === 0) {
            return false;
        }

        // Second, try to parse all blocks
        const parseResult = this.parseAll();

        return (this.accept === 'all') ?
            parseResult.errors.length === 0 && parseResult.passed > 0
            : parseResult.passed > 0;
    }

    /**
     * Provide a node file system module to be used for reading files.
     * This method or the equivalent `loadFileSystem()` must be called before attempting to read files in a Node environment.
     * 
     * @param fs the node fs module to use.
     * @returns the current instance for chaining.
     */
    public withFS(fs: typeof import('fs')): this {
        this.fs = fs;
        return this;
    }

    /**
     * Dynamically import the Node.js file system module in a Node environment.
     * This method or the equivalent `withFS()` must be called before attempting to read files in a Node environment. 
     * In a browser environment, this method will log an error since file system access is not supported.
     * 
     * @returns the imported fs module if successful, otherwise undefined.
     */
    public async loadFileSystem(): Promise<any> {
        if (typeof process !== 'undefined' && process.versions && process.versions.node) {
            try {
                // Dynamic import prevents bundle errors in pure browser environments
                // this.fs = await (async () => import('fs'))();
                this.fs = await import('fs');
                return this.fs;
            } catch (e) {
                this.logErrors(["fs module requested but not found", "Cannot use file system in browser environment"], "");
            }
        }
        return undefined;
    }

    protected readFolderPaths(folderPath: string): string[] | undefined {
        if (this.fs) {
            try {
                const files = this.fs.readdirSync(folderPath);
                return files.map(file => `${folderPath}/${file}`);
            } catch (e) {
                this.logError(e, `while reading folder: ${folderPath}`);
                return undefined;
            }
        } else {
            this.logError("File system access requested but fs module is not available", `while reading folder: ${folderPath}`);
            return undefined;
        }
    }

    protected readFileContents(path: string): string | undefined {
        if (this.fs) {
            return this.fs.readFileSync(path, 'utf8');
        } else {
            this.logError("File system access requested but fs module is not available", `while reading file: ${path}`);
            return undefined;
        }
    }

    protected readBlocksFromFile(path: string): string[] {
        const read: string[] = [];
        if (this.fs) {
            try {
                const fileContent = this.fs.readFileSync(path, 'utf8');
                let origin = fileContent.trim();
                let remainder = origin;

                // Read blocks until done
                while (remainder.length > 0) {
                    const { line, remainder: newRemainder } = this.readBlock(remainder);

                    if (line.length > 0) {
                        read.push(line);
                    }
                    remainder = newRemainder;
                }
                return read;
            } catch (e) {
                // const message = (e instanceof Error) ? e.message : `${String(e)}`;
                this.logError(e, `while reading ${path}`);
                return [];
            }
        } else {
            this.logError('File system access requested but fs module is not available', `while reading ${path}`);
            return [];
        }
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
                        result.errors.push('Unrecognized component: ' + parseTypeJson(parsed));
                        // result.errors.push('Unrecognized component: ' + JSON5.parse(parsed));
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

        if (this.accept === 'all' && result.failed > 0) {
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

    protected isConstant(component: any): component is Record<string, any> {
        const constant = component as Record<string, any>;
        const keys = Object.keys(constant);
        return (keys.length === 1 && !!keys[0] && constant[keys[0]!] !== undefined);
    }

    protected isFunctionDefnition(component: any): component is FunctionDefinition {
        const funcdef = component as FunctionDefinition;
        return (!!funcdef.name && !!funcdef.parameters && !!funcdef.expression);
    }

    protected isRootType(component: any): component is RootType {
        const type = component as RootType;
        return (!!type.key && (!!type.type || !!type.properties));
    }

    protected rejectOnErrors(): boolean {
        return this.accept === 'all';
    }

    protected logError(e: unknown, context: string): void {
        if (!e) {
            WorkLogger.error(`Unknown error occurred ${context}.`);
        } else if (e instanceof ParserError) {
            WorkLogger.error(`Parser Error ${context}: ${e.message}`);
        } else if (e instanceof EngineError) {
            WorkLogger.error(`Engine Error ${context}: ${e.message}`);
        } else if (e instanceof Error) {
            WorkLogger.error(`Error ${context}: ${e.message}`);
        } else {
            WorkLogger.error(`Unexpected error ${context}: ${String(e)}`);
        }
    }

    protected logErrors(errors: any[], context: string): void {
        if (errors.length > 0) {
            errors.forEach(error => this.logError(error, context));
        }
    }

}