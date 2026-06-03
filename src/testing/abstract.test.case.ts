import type { Workspace } from "../engine/workspace";
import type { TestCaseResult } from "./test.case.result";

/**
 * Abstract base class for all test cases in the system, providing common properties and methods for managing test case data and state. 
 * Each specific test case type should extend this class and implement the abstract methods for handling test case logic.
 */
export abstract class AbstractTestCase {

    /**
     * Optional name for the test case, which can be used for identification and debugging purposes.
     */
    public name?: string;

    /**
     * An optional hint or description for the test case, which can provide additional information about its purpose or usage. 
     * This is primarily for documentation and user guidance when working with the test case.
     */
    public hint?: string;

    private disabled?: boolean;

    protected input: any;

    protected expect_output: any;

    protected expect_errors: string[];

    private input_keys: Set<string>;

    private change_keys: Set<string>;

    constructor(input: any, expected: any, expectedErrors: string[] = []) {
        this.input = input;
        this.expect_output = expected;
        this.expect_errors = expectedErrors;

        if (typeof input === 'object' && input != null) {
            this.input_keys = new Set(Object.keys(input));
        } else this.input_keys = new Set();

        if (typeof expected === 'object' && expected != null) {
            this.change_keys = new Set(Object.keys(expected));
        } else this.change_keys = new Set();
    }

    /**
     * Check whether the test case is currently disabled. A disabled test case will not be evaluated or executed by the engine.
     * @returns true if the test case is disabled, false otherwise.
     */
    public isDisabled(): boolean {
        return this.disabled ?? false;
    }

    /**
     * Disable the test case, preventing it from being evaluated or executed by the engine. 
     * This can be useful for temporarily turning off test cases without removing them from the system, such as during testing.
     * Optionally, a reason can be provided for why the test case is being disabled, which will be included in the hint if no hint is already set for the test case.
     * @param reason a hint or reason for why the test case is being disabled.
     */
    public disable(reason?: string): void {
        this.disabled = true;
        if (reason && !this.hint) {
            this.hint = `Disabled: ${reason}`;
        }
    }

    /**
     * Enable the test case, allowing it to be evaluated and executed by the engine if it is applicable. 
     * This can be used to re-enable a rule that was previously disabled.
     */
    public enable(): void {
        this.disabled = false;
    }

    /**
     * What data keys are required for this test case to be applicable? 
     * This is determined by the specific implementation of the test case and should be set during the construction of the instance. 
     * The test engine uses this information to determine which test cases are applicable based on the current context.
     * @returns a set of data keys required for this test case to be applicable.
     */
    public required(): Set<string> {
        return this.input_keys;
    }

    /**
     * What data keys does this test case change when executed? This is determined by the specific implementation of the test case and should be set during the construction of the instance. 
     * The test engine can use this information to track which data keys are affected by the execution of the test case, which can be useful for debugging.
     * @returns a set of data keys changed by this test case.
     */
    public changes(): Set<string> {
        return this.change_keys;
    }

    /**
     * Provide any missing information in the test result, such as the name and hint of the test case, and return the complete TestCaseResult object.
     * @param test the partial test result to wrap with additional information.
     * @returns the complete test result, including the name, hint, and any missing output or errors.
     */
    protected wrapResult(test: TestCaseResult): TestCaseResult {
        return {
            name: this.name,
            hint: this.hint,
            passed: test.passed,
            output: test.output !== undefined ? test.output : (test.passed ? this.expect_output : undefined),
            errors: test.errors
        };
    }

    /**
     * Run the test case against the provided workspace and return the result. 
     * The specific logic for running the test case will depend on the type of test case and should be implemented in the subclasses.
     * @param workspace the workspace to run the test case against, which provides the context and environment for evaluating the test case.
     * @returns the result of running the test case, including whether it passed, any output produced, and any errors encountered.
     */
    public abstract runTest(workspace: Workspace): TestCaseResult;

}
