import { EngineError, ParserError } from "../rules/exception";
import { AbstractFileReader } from "./abstract.file.reader";
import { WorkLogger } from "../logging/work.logger";
import JSON5 from 'json5';
import { Workspace, type WorkspaceOptions } from "../engine/workspace";
import { WorkspaceFilesReader } from "./workspace.files.reader";
import { RulesEngine } from "../engine/rules.engine";

export interface WorkspaceConfig {
    name: string;
    readerMode?: 'all' | 'partial';
    options?: Partial<WorkspaceOptions>;
    files: string[];
}

export interface ConfigFileResult {
    workspaces: WorkspaceConfig[];
}

export interface WorkspaceLoaderOptions {
    workspaceMode: 'create' | 'overwrite' | 'append',
}

/**
 * Helper class to safely read workspace configurations from files and load them into a workspace. 
 * It supports reading from strings or a configuration file in JSON5 format. 
 *
 * N.B. File paths should be absolute or relative to the current working directory.
 * 
 * The reader will determine the type of each file based on these naming conventions and use the appropriate parsing method to load its content into the workspace.
 *
 * NB: This class relies on Node's 'fs' module for file system access, so it is intended for use in Node.js environments. 
 * In browser environments, file reading should be handled differently; this class will report errors in a browser environment.
 */
export class ConfigFileReader extends AbstractFileReader {

    private fs?: typeof import('fs') | undefined;

    /**
     * Create a new reader instance for loading workspaces and file paths.
     * 
     * N.B. After creation you must either call `withFS()` or `loadFileSystem()` to provide access to the file system before attempting to read files in a Node environment.
     */
    constructor() {
        super();
    }

    /**
     * This method is intended for use in the browser where File System access is not supported. 
     * In a node environment, use readFromFile() or readFromFiles().
     * 
     * @param fileContent The content of the file to parse.
     * @returns The result of parsing, including the successfully parsed constants, functions, types, rules, and any errors encountered.
     * @throws Will throw an error if the file content cannot be parsed as valid JSON5. Errors will also be logged using the WorkLogger.
     * 
     */
    public parse(fileContent: string): ConfigFileResult {
        try {
            const contents = JSON5.parse(fileContent.trim());
            return this.validated(contents);
        } catch (e) {
            this.logError(e, "while parsing file content");
            throw e;
        }
    }

    /**
     * Attempt to read a file from a specified path and load its content into the workspace.
     * The reader will determine the type of the file based on its name and extension, and use the appropriate parsing method.
     * 
     * @param path the path of the file to read.
     * @returns the result of parsing, including the successfully parsed workspaces and any errors encountered.
     * @throws Will throw an error if the file cannot be read or if its content cannot be parsed as valid JSON5. Errors will also be logged using the WorkLogger.
     */
    public readFromFile(path: string): ConfigFileResult {
        if (this.fs) {
            try {
                const fileContent = this.fs.readFileSync(path, 'utf8');
                return this.parse(fileContent);
            } catch (e) {
                this.logError(e, `while reading file: ${path}`);
                throw e;
            }
        } else {
            throw new Error("File system module not loaded. Call withFS() or loadFileSystem() before reading files.");
        }
    }

    /**
     * Ensure a workspace with the specified name and options exists in the engine, then attempt to read and load the specified files into that workspace.
     * 
     * @param config The configuration for the workspace, including its name, options, and files to load.
     * @param mode The mode for loading the workspace, including how to handle existing workspaces and file reading options.
     * @returns true if the workspace was successfully loaded, otherwise false. Errors will be logged using the WorkLogger.
     */
    public loadNewWorkspace(config: WorkspaceConfig, mode: WorkspaceLoaderOptions): boolean {
        const { name, readerMode, options, files } = config;

        // First, check the workspace
        switch (mode.workspaceMode) {
            case 'create':
                // If the workspace already exists, reject loading this workspace.
                if (RulesEngine.hasWorkspace(name)) {
                    this.logError(new ParserError(`Workspace with name '${name}' already exists in the engine`), "while loading workspace");
                    return false;
                }
                break;
            case 'overwrite':
                // If the workspace already exists, clear it.
                if (RulesEngine.hasWorkspace(name)) {
                    const existing = RulesEngine.getWorkspace(name);
                    existing!.clearSpace();
                }
                break;
            default:
            // No action needed
        }

        // Second, ensure the workspace and its options
        if (RulesEngine.hasWorkspace(name)) {
            const existing = RulesEngine.getWorkspace(name);
            existing?.setOptions({ ...existing.getOptions(), ...options });
        } else {
            RulesEngine.addWorkspace(name, new Workspace(options));
        }

        // Third, read the workspace files transactionally - if any file fails to load, the workspace will be left unchanged
        const workspace = RulesEngine.getWorkspace(name)!;
        const reader = new WorkspaceFilesReader(workspace, readerMode || 'all');
        return reader.readFromFiles(files);
    }

    /**
     * Load all workspaces from the given configuration.
     * 
     * @param config The configuration containing all workspaces to load.
     * @param mode The mode for loading the workspaces, including how to handle existing workspaces and file reading options.
     * @returns true if all workspaces were successfully loaded, otherwise false. Errors will be logged using the WorkLogger.
     */
    public loadAllWorkspaces(config: ConfigFileResult, mode: WorkspaceLoaderOptions): boolean {
        let result = true;
        for (const workspaceConfig of config.workspaces) {
            result &&= this.loadNewWorkspace(workspaceConfig, mode);
        }
        return result;
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

    /**
     * Validate the parsed content of the configuration file.
     * 
     * @param content the raw parsed content from the configuration file to validate.
     * @returns the validated content.
     * @throws Will throw an error if the content is invalid. Errors will also be logged using the WorkLogger.
     */
    protected validated(content: any): ConfigFileResult {
        if (content == null || typeof content !== 'object') {
            const error = new ParserError("Configuration file content must be an object.");
            this.logError(error, "while validating configuration file content");
            throw error;
        }

        if (!Array.isArray(content.workspaces)) {
            const error = new ParserError("Configuration file must contain a 'workspaces' array.");
            this.logError(error, "while validating configuration file content");
            throw error;
        }

        const workspaceNames = new Set<string>();

        for (const workspace of content.workspaces) {
            if (typeof workspace.name !== 'string') {
                const error = new ParserError("Each workspace must have a 'name' property of type string.");
                this.logError(error, "while validating configuration file content");
                throw error;
            }
            if (workspaceNames.has(workspace.name)) {
                const error = new ParserError(`Duplicate workspace name found: '${workspace.name}'. Each workspace must have a unique name.`);
                this.logError(error, "while validating configuration file content");
                throw error;
            }
            workspaceNames.add(workspace.name);

            if (workspace.readerMode && workspace.readerMode !== 'all' && workspace.readerMode !== 'partial') {
                const error = new ParserError(`Workspace '${workspace.name}' has an invalid 'readerMode' property. Valid values are 'all' or 'partial'.`);
                this.logError(error, "while validating configuration file content");
                throw error;
            }

            if (workspace.options && typeof workspace.options !== 'object') {
                const error = new ParserError(`Workspace '${workspace.name}' has an 'options' property that must be an object.`);
                this.logError(error, "while validating configuration file content");
                throw error;
            }
            if (!workspace.files || !Array.isArray(workspace.files)) {
                const error = new ParserError(`Workspace '${workspace.name}' must have a 'files' property that is an array of file paths.`);
                this.logError(error, "while validating configuration file content");
                throw error;
            }
            if (workspace.files.some((file: any) => typeof file !== 'string')) {
                const error = new ParserError(`Workspace '${workspace.name}' has a 'files' array that must contain only strings representing file paths.`);
                this.logError(error, "while validating configuration file content");
                throw error;
            }
        }
        return content;
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