import type { Workspace } from "../engine/workspace";
import { TestParser } from "../parser/test.parser";
import { AbstractTestCase } from "./abstract.test.case";
import type { TestCaseResult } from "./test.case.result";

/**
 * A TestSuite is a collection of test cases that can be run together to validate the behavior of the rules engine. 
 * You can create one TestSuite per workspace.
 */
export class TestSuite {

    private workspace: Workspace;

    private cases: AbstractTestCase[] = [];

    constructor(workspace: Workspace) {
        this.workspace = workspace;
    }

    /**
     * Add a test case to the suite. The test case can be provided either as a string in the DSL syntax or as an instance of AbstractTestCase. 
     * If a string is provided, it will be parsed into an AbstractTestCase using the TestParser.
     * @param testCase The test case to add, either as a string in DSL syntax or an instance of AbstractTestCase.
     * @returns The added test case as an instance of AbstractTestCase.
     */
    public addTestCase(testCase: string | AbstractTestCase): AbstractTestCase {
        if (typeof testCase === 'string') {
            const parser = new TestParser({ workspace: this.workspace });
            const parsedCase = parser.parseTestCase(testCase);
            this.cases.push(parsedCase);
            return parsedCase;

        } else if (testCase instanceof AbstractTestCase) {
            this.cases.push(testCase);
            return testCase;
        } else {
            throw new Error('Invalid test case type. Must be a string or an instance of AbstractTestCase.');
        }
    }

    /**
     * Remove a test case from the suite by its name. 
     * If multiple test cases have the same name, they will all be removed.
     * @param testCase The name or instance of the test case to remove.
     */
    public removeTestCase(testCase: string | AbstractTestCase): void {
        const toRemove = this.cases.filter(item => {
            if (typeof testCase === 'string') {
                return item.name === testCase;
            } else if (testCase instanceof AbstractTestCase) {
                return item === testCase;
            }
            return false;
        });
        for (const item of toRemove) {
            const index = this.cases.indexOf(item);
            if (index !== -1) {
                this.cases.splice(index, 1);
            }
        }
    }

    /**
     * Clear all test cases from the suite, leaving it empty. This can be useful for resetting the suite or removing all test cases at once.
     */
    public clearTestCases(): void {
        this.cases = [];
    }

    /**
     * Get all test cases in the suite. This returns an array of AbstractTestCase instances representing all the test cases currently in the suite.
     * @returns An array of AbstractTestCase instances for all test cases in the suite.
     */
    public testCases(): AbstractTestCase[] {
        return this.cases;
    }

    /**
     * Get test cases that require a specific input path or paths.
     * If more than one input path is provided, it will return test cases that require all of the specified paths.
     * @param inputPath The input path or paths to check for in the required set of each test case.
     * @returns An array of AbstractTestCase instances that require the specified input path(s).
     */
    public testCasesRequiring(inputPath: string | string[]): AbstractTestCase[] {
        return this.cases.filter(testCase => {
            const required = testCase.required();
            if (Array.isArray(inputPath)) {
                return inputPath.every(i => required.has(i));
            } else {
                return required.has(inputPath);
            }
        });
    }

    /**
     * Get test cases that change a specific output path or paths.
     * If more than one output path is provided, it will return test cases that change all of the specified paths.
     * @param outputPath The output path or paths to check for in the changes set of each test case.
     * @returns An array of AbstractTestCase instances that change the specified output path(s).
     */
    public testCasesChanging(outputPath: string | string[]): AbstractTestCase[] {
        return this.cases.filter(testCase => {
            const changes = testCase.changes();
            if (Array.isArray(outputPath)) {
                return outputPath.every(i => changes.has(i));
            } else {
                return changes.has(outputPath);
            }
        });
    }

    /**
     * Retrieve all test cases that have a specific annotation and optional value.
     * @param annotation The annotation to filter test cases by.
     * @param value The optional value of the annotation to match.
     * @returns An array of test cases that match the annotation and value.
     */
    public testCasesWithAnnotation(annotation: string, value?: any): AbstractTestCase[] {
        return this.cases.filter(testCase => testCase.isAnnotated(annotation, value));
    }

    /**
     * Runs the specified test cases by name or by instance and returns an array of their results.
     * If a test case name is provided, it will look up the corresponding test case instance in the suite and run it. 
     * If an instance of AbstractTestCase is provided directly, it will run that instance. 
     * Disabled test cases will be skipped and not included in the results.
     * @param testCases An array of test case names or instances to run.
     * @returns An array of TestCaseResult objects for the executed test cases.
     */
    public runTests(testCases: string[] | AbstractTestCase[]): TestCaseResult[] {
        const results: TestCaseResult[] = [];
        const toRun = testCases.map(caseItem => {
            return (typeof caseItem === 'string') ?
                this.cases.find(item => item.name === caseItem)
                : caseItem;
        }).filter(item => item !== undefined);

        for (const testCase of toRun) {
            if (!testCase.isDisabled()) {
                const result = testCase.runTest(this.workspace);
                results.push(result);
            }
        }
        return results;
    }

    /**
     * Run all test cases in the suite and return an array of their results.
     * Disabled test cases will be skipped and not included in the results.
     * @returns An array of TestCaseResult objects for the executed test cases.
     */
    public runAllTests(): TestCaseResult[] {
        return this.runTests(this.cases);
    }
}