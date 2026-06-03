import { Workspace } from "../engine/workspace";
import { WorkspaceTransaction } from "../readers/workspace.transaction";
import { TestParser } from "../parser/test.parser";
import { ParserError } from "../rules/exception";
import { AbstractFileReader, type FileReaderOptions } from "../readers/abstract.file.reader";
import type { AbstractTestCase } from ".";

export interface TestsFileResult {
    read: number;
    passed: number;
    failed: number;
    test_cases: AbstractTestCase[];
    errors: string[];
}

/**
 * Options for configuring the behavior of the TestsFileReader when parsing tests from a file.
 */
export interface TestsFileReaderOptions extends FileReaderOptions {
    /**
     * Determines whether to accept all test cases (including invalid ones) or only fully valid test cases.
     * - 'all': Accept all test cases, but include errors for any invalid test cases. The resulting test cases object will include only the successfully parsed test cases, and the errors array will contain messages for any test cases that failed to parse.
     * - 'partial': Only accept test cases if all of them are valid. If any test case fails to parse, the entire parsing process will be considered a failure, and the resulting test cases object will be empty while the errors array will contain messages for all failed test cases.
     */
    accept: 'all' | 'partial';
};

/**
 * Reader class for parsing test cases files that define test cases for input (and output) properties.
 * You should use this class to read test cases from a text file, where each line (or block) defines a test case
 * as a JSON object with a "key" property and either: "type" or "properties" that define the test case structure.
 * The reader will parse the file content and return an object containing the successfully parsed test cases as well as any errors encountered during parsing.
 * The reader supports both line-by-line and block-by-block reading, but blocks are the default and highly recommended.
 * It also includes error handling for invalid syntax and duplicate keys, ensuring that the resulting test cases object is valid and usable within the rule engine.
 *
 * N.B. Declarations need to be in order, otherwise errors will be returned.
 *  
 * N.B. This is a transactional safe reader. If you provide a workspace and select the option accept: 'all', 
 * then that workplace will not be affected if any errors are encountered. 
 */
export class TestsFileReader extends AbstractFileReader {

    protected options: TestsFileReaderOptions;

    protected testParser: TestParser;

    protected workspace: Workspace;

    /**
     * Create a new instance of the TestsFileReader with the specified options for parsing test cases from a file.
     * @param options Optional configuration for the reader.
     */
    constructor(options?: Partial<TestsFileReaderOptions>) {
        super({
            read_by: options?.read_by || 'block',
            workspace: options?.workspace,
        });

        this.options = {
            read_by: options?.read_by || 'block',
            accept: options?.accept || 'all',
            ...options
        };
        this.testParser = new TestParser({ workspace: options?.workspace });
        this.workspace = this.options.workspace || new Workspace();
    }

    /**
     * Parse the content of a tests file and return the result, including the successfully parsed tests and any errors encountered.
     * If a Workspace was passed in options, that Workspace will be changed to reflect successful declarations.
     * 
     * @param fileContent The content of the tests file to parse.
     * @returns The result of parsing, including the successfully parsed tests and any errors encountered.
     */
    public parse(fileContent: string): TestsFileResult {

        const transaction = WorkspaceTransaction.begin(this.workspace);

        let read = 0, errors: string[] = [];
        try {
            let origin = fileContent.trim();
            let remainder = origin;
            const syntaxes: string[] = [];
            while (remainder.length > 0) {
                const { line, remainder: newRemainder } = this.options.read_by === 'block' ?
                    this.readBlock(remainder) :
                    this.readLine(remainder);

                if (line.length > 0) {
                    syntaxes.push(line);
                    read++;
                }
                remainder = newRemainder;
            }
            const attempts: (AbstractTestCase | null)[] = syntaxes.map(syntax => {
                try {
                    const testCase = this.parseTest(syntax);
                    // if (type) {
                    //     this.workspace.typeRegistry().addRootType(type);
                    // }
                    return testCase;

                } catch (e) {
                    errors.push(`Failed to parse type syntax: ${syntax}. Error: ${e instanceof Error ? e.message : String(e)}`);
                    return null;
                }
            });

            if (this.options.accept === 'all' && errors.length > 0) {
                transaction.rollback();
            } else {
                // Already added to workspace..
                transaction.commit();
            }

            if (attempts.includes(null) && this.options.accept === 'all') {
                return {
                    read,
                    passed: 0,
                    failed: read,
                    test_cases: [],
                    errors
                };
            }
            // Prevent duplicates (and report them as errors) returning the test cases as an array
            const parsed_test_cases = attempts.filter(c => c !== null) as AbstractTestCase[];
            try {
                return {
                    read,
                    passed: parsed_test_cases.length,
                    failed: read - parsed_test_cases.length,
                    test_cases: parsed_test_cases,
                    errors
                };

            } catch (e) {
                errors.push(e instanceof Error ? e.message : String(e));
                return {
                    read,
                    passed: 0,
                    failed: read,
                    test_cases: [],
                    errors
                };
            }

        } catch (error) {
            throw new ParserError(`Failed to parse types file: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    protected parseTest(content: string): AbstractTestCase {
        // Parse a line defining a test case, expected in DSL format
        // with the syntax: 
        // TEST <input> EXPECT <expected_output>
        // TEST <input> EXPECT ERRORS <expected_errors>
        // TEST <target> FROM <input> EXPECT <expected_output>
        // TEST <target> FROM <input> EXPECT ERRORS <expected_errors>
        try {
            return this.testParser.parseTestCase(content);

        } catch (e) {
            throw new ParserError(`Invalid type syntax: ${content}. Error: ${e instanceof Error ? e.message : String(e)}`);
        }
    }
}