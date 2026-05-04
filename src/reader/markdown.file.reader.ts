import { GeneralFileReader, type GeneralFileReaderOptions, type GeneralReaderResult } from "./general.file.reader";

/**
 * Options for configuring the behavior of the MarkdownFileReader when parsing markdown content from a file.
 */
export interface MarkdownFileReaderOptions extends GeneralFileReaderOptions {
};

/**
 * Reader class for parsing markdown files that can contain constants, types, rules, and functions.
 * You should use this class to read content from a markdown file, where code blocks have the expected syntax.
 * The reader will parse the file content and return an object containing the successfully parsed elements 
 * as well as any errors encountered during parsing.
 * This reader supports block-by-block reading, but each code block is treated independently. A component cannot be declared over 2 code blocks.
 * All code must be in a code block with standard markdown syntax, e.g. ```\n ... \n```. 
 * The language identifier is optional and ignored. So any markdown file with foreign code will lead to the file failing. 
 * Only read valid markdown files.
 * It also includes error handling for invalid syntax and duplicate keys, 
 * ensuring that the resulting objects are valid and usable within the rule engine.
 */
export class MarkdownFileReader extends GeneralFileReader {

    protected options: MarkdownFileReaderOptions;

    /**
     * Create a new instance of the MarkdownFileReader with the specified options for parsing markdown content from a file.
     * @param options Optional configuration for the reader.
     */
    constructor(options?: Partial<MarkdownFileReaderOptions>) {
        super({
            read_by: options?.read_by || 'block',
            workspace: options?.workspace,
        });
        this.options = {
            read_by: options?.read_by || 'block',
            accept: options?.accept || 'all',
            ...options
        }
    }

    /**
     * Parse the content of a markdown file and return the result, 
     * including the successfully parsed markdown content and any errors encountered during parsing.
     * @param fileContent The content of the markdown file to parse.
     * @returns The result of parsing, including the successfully parsed markdown content and any errors encountered.
     */
    public parse(fileContent: string): GeneralReaderResult {

        let aggregateResult: GeneralReaderResult = {
            read: 0,
            passed: 0,
            failed: 0,
            rules: [],
            functions: {},
            types: {},
            constants: {},
            errors: []
        };

        const codeBlocks = this.extractCodeBlocks(fileContent);
        for (const block of codeBlocks) {
            const result = super.parse(block);
            // Early exit if we require all to pass and any failed
            if (result.failed > 0 && this.options.accept === 'all') {
                return {
                    read: result.read,
                    passed: result.passed,
                    failed: result.failed,
                    rules: result.rules,
                    functions: result.functions,
                    types: result.types,
                    constants: result.constants,
                    errors: result.errors
                };
            } else {
                aggregateResult = this.mergeResults(aggregateResult, result);
            }
        }
        return aggregateResult;
    }

    protected extractCodeBlocks(content: string): string[] {
        const codeBlockRegex = /```([\w-]*)\n([\s\S]*?)```/g;
        const codeBlocks: string[] = [];
        let match;

        while ((match = codeBlockRegex.exec(content)) !== null) {
            // if (match[1] && match[1].toLowerCase() !== 'powerzero') {
            //     continue;
            // }
            if (match[2]) {
                codeBlocks.push(match[2].trim());
            }
        }

        return codeBlocks;
    }

    protected mergeResults(aggregate: GeneralReaderResult, current: GeneralReaderResult): GeneralReaderResult {
        return {
            read: aggregate.read + current.read,
            passed: aggregate.passed + current.passed,
            failed: aggregate.failed + current.failed,
            rules: [...aggregate.rules, ...current.rules],
            functions: { ...aggregate.functions, ...current.functions },
            types: { ...aggregate.types, ...current.types },
            constants: { ...aggregate.constants, ...current.constants },
            errors: [...aggregate.errors, ...current.errors]
        };
    }

}