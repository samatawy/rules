import { ConstantsFileReader } from "./constants.file.reader";
import { FunctionsFileReader } from "./functions.file.reader";
import { GeneralFileReader } from "./general.file.reader";
import { MarkdownFileReader } from "./markdown.file.reader";
import { RulesFileReader } from "./rules.file.reader";
import { TypesFileReader } from "./types.file.reader";
import { EngineError, ParserError } from "../rules/exception";
import type { WorkSpace } from "../engine/workspace";

/**
 * Helper class to read rules, functions, types, and constants from files and load them into a workspace. 
 * It supports reading from individual files or entire folders, and can handle different file formats 
 * such as markdown, general, constants, rules, types, and functions files. The reader can be configured 
 * to either accept all valid components while logging errors for invalid ones, or to reject the entire file if any component is invalid. 
 * 
 * NB: This class relies on Node's 'fs' module for file system access, so it is intended for use in Node.js environments. 
 * In browser environments, file reading should be handled differently; this class will report errors in a browser environment.
 * 
 * NB: A workspace may become corrupt if some files are loaded and others are not (i.e. when reading from a folder). 
 * If you pass 'all' to the accept option, the reader will not load parts of an invalid file. However, one file may pass while another fails, 
 * which would lead to a partially loaded workspace.
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
 */
export class WorkspaceFilesReader {

    private workspace: WorkSpace;

    private accept: 'all' | 'partial';

    private fs?: typeof import('fs') | undefined;

    constructor(workspace: WorkSpace, accept: 'all' | 'partial' = 'all') {
        this.workspace = workspace;
        this.accept = accept;
        this.loadFileSystem();
    }

    /**
     * Attempt to read all files from a specified folder path and load their content into the workspace. 
     * The reader will determine the type of each file based on its name and extension, and use the appropriate parsing method. 
     * If any file fails to load and the accept option is set to 'partial', the reader will continue loading the remaining files while logging errors for the failed ones. 
     * If the accept option is set to 'all', the reader will stop loading further files upon encountering an error in any file.
     * 
     * NB: This may lead to a partially loaded workspace if some files are valid and others are not. 
     * This method will return false if ANY file fails to load, even if the accept option is set to 'partial', 
     * to allow the caller to know that there were issues during loading.
     * 
     * @param folderPath the path of the folder containing the files to read. The reader will attempt to read all files in this folder.
     * @returns true if all files were read successfully, false if ANY file had errors.
     */
    public readFromFolder(folderPath: string): boolean {
        const paths = this.readFolderPaths(folderPath);
        let proceed = true;
        if (paths) {
            for (const path of paths) {
                proceed &&= this.readFromFile(path);

                if (!proceed && this.rejectOnErrors()) break;
            }
        }
        return proceed;
    }

    /**
     * Attempt to read a file from a specified path and load its content into the workspace.
     * The reader will determine the type of the file based on its name and extension, and use the appropriate parsing method.
     * 
     * @param path the path of the file to read.
     * @returns true if the file was read successfully, false if there were errors.
     */
    public readFromFile(path: string): boolean {
        const content = this.readFileContents(path);
        if (content) {
            if (path.endsWith('.md')) {
                return this.readMarkdown(content);
            } else if (path.includes('.constants')) {
                return this.readConstants(content);
            } else if (path.includes('.general')) {
                return this.readGeneral(content);
            } else if (path.includes('.rules')) {
                return this.readRules(content);
            } else if (path.includes('.types')) {
                return this.readTypes(content);
            } else if (path.includes('.functions')) {
                return this.readFunctions(content);
            } else {
                return this.readGeneral(content);
            }
        } else {
            this.logError(`No content read from path: ${path}`, "");
            return false;
        }
    }

    protected async loadFileSystem(): Promise<any> {
        if (typeof process !== 'undefined' && process.versions && process.versions.node) {
            try {
                // Dynamic import prevents bundle errors in pure browser environments
                this.fs = await import('fs');
                return this.fs;
            } catch (e) {
                this.logErrors(["fs module requested but not found", "Cannot use file system in browser environment"], "");
            }
        }
        return undefined;
    }

    protected rejectOnErrors(): boolean {
        return this.accept === 'all';
    }

    protected logError(e: unknown, context: string): void {
        if (!e) {
            console.error(`Unknown error occurred ${context}.`);
            return;
        } else if (e instanceof ParserError) {
            console.error(`Parser Error ${context}: ${e.message}`);
        } else if (e instanceof EngineError) {
            console.error(`Engine Error ${context}: ${e.message}`);
        } else if (e instanceof Error) {
            console.error(`Error ${context}: ${e.message}`);
        } else {
            console.error(`Unexpected error ${context}: ${String(e)}`);
        }
    }

    protected logErrors(errors: any[], context: string): void {
        if (errors.length > 0) {
            errors.forEach(error => this.logError(error, context));
            // console.warn(`Errors encountered ${context}: ${errors.join('; ')}`);
        }
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
            console.warn(`File system access requested for folder: ${folderPath}, but fs module is not available.`);
            return undefined;
        }
    }

    protected readFileContents(path: string): string | undefined {
        if (this.fs) {
            return this.fs.readFileSync(path, 'utf8');
        } else {
            this.logError("File system access requested but fs module is not available.", `while reading file: ${path}`);
            // console.warn(`File system access requested for path: ${path}, but fs module is not available.`);
            return undefined;
        }

        // Check if we are in a Node-like environment where 'fs' might exist
        // if (typeof process !== 'undefined' && process.versions && process.versions.node) {
        //     try {
        //         // Dynamic import prevents bundle errors in pure browser environments
        //         const fs = await import('fs');
        //         return fs.readFileSync(path, 'utf8');
        //     } catch (e) {
        //         console.warn("fs module requested but not found.");
        //     }
        // }
    }

    protected readConstants(string: string): boolean {
        const reader = new ConstantsFileReader();
        try {
            const result = reader.parse(string);
            if (result) {
                if (result.errors.length) {
                    this.logErrors(result.errors, "while parsing constants file");
                    if (this.rejectOnErrors()) return false;
                }
                if (result.constants) {
                    this.workspace.addConstants(result.constants);
                    return true;
                }
            }
            return false;
        } catch (e: any) {
            this.logError(e, "while reading constants file");
            return false;
        }
    }

    protected readFunctions(string: string): boolean {
        const reader = new FunctionsFileReader();
        try {
            const result = reader.parse(string);
            if (result) {
                if (result.errors.length) {
                    this.logErrors(result.errors, "while parsing functions file");
                    if (this.rejectOnErrors()) return false;
                }
                if (result.functions) {
                    this.workspace.functionRegistry().addFunctions(result.functions);
                    return true;
                }
            }
            return false;
        } catch (e: any) {
            this.logError(e, "while reading functions file");
            return false;
        }
    }

    protected readTypes(string: string): boolean {
        const reader = new TypesFileReader();
        try {
            const result = reader.parse(string);
            if (result) {
                if (result.errors.length) {
                    this.logErrors(result.errors, "while parsing types file");
                    if (this.rejectOnErrors()) return false;
                }
                if (result.types) {
                    this.workspace.typeRegistry().addRootTypes(result.types);
                    return true;
                }
            }
            return false;
        } catch (e: any) {
            this.logError(e, "while reading types file");
            return false;
        }
    }

    protected readRules(string: string): boolean {
        const reader = new RulesFileReader();
        try {
            const result = reader.parse(string);
            if (result) {
                if (result.errors.length) {
                    this.logErrors(result.errors, "while parsing rules file");
                    if (this.rejectOnErrors()) return false;
                }
                if (result.rules) {
                    result.rules.forEach(rule => this.workspace.addRule(rule));
                    return true;
                }
            }
            return false;
        } catch (e: any) {
            this.logError(e, "while reading rules file");
            return false;
        }
    }

    protected readGeneral(string: string): boolean {
        const reader = new GeneralFileReader();
        try {
            const result = reader.parse(string);
            if (result) {
                if (result.errors.length) {
                    this.logErrors(result.errors, "while parsing general file");
                    if (this.rejectOnErrors()) return false;
                }
                if (result.constants) {
                    this.workspace.addConstants(result.constants);
                }
                if (result.functions) {
                    this.workspace.functionRegistry().addFunctions(result.functions);
                }
                if (result.types) {
                    this.workspace.typeRegistry().addRootTypes(result.types);
                }
                if (result.rules) {
                    result.rules.forEach(rule => this.workspace.addRule(rule));
                }
                return true;
            }
            return false;
        } catch (e: any) {
            this.logError(e, "while reading general file");
            return false;
        }
    }

    protected readMarkdown(string: string): boolean {
        const reader = new MarkdownFileReader();
        try {
            const result = reader.parse(string);
            if (result) {
                if (result.errors.length) {
                    this.logErrors(result.errors, "while parsing markdown file");
                    if (this.rejectOnErrors()) return false;
                }
                if (result.constants) {
                    this.workspace.addConstants(result.constants);
                }
                if (result.functions) {
                    this.workspace.functionRegistry().addFunctions(result.functions);
                }
                if (result.types) {
                    this.workspace.typeRegistry().addRootTypes(result.types);
                }
                if (result.rules) {
                    result.rules.forEach(rule => this.workspace.addRule(rule));
                }
                return true;
            }
            return false;
        } catch (e: any) {
            this.logError(e, 'while reading markdown file');
            return false;
        }
    }

}