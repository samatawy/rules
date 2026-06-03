import type { Workspace } from "../engine/workspace";
import type { TestCaseResult } from "./test.case.result";
import { ForwardTestCase } from "./forward.test.case";

/**
 * Test case for the evaluate() method of a workspace, which evaluates a specific target expression against the input context and produces an output value.
 */
export class BackwardTestCase extends ForwardTestCase {

    private target: string;

    constructor(target: string, input: any, expected: any, expectedErrors: string[] = []) {
        super(input, expected, expectedErrors);
        this.target = target;
    }

    public runTest(workspace: Workspace): TestCaseResult {
        // For processing test cases, we consider the test to pass if there are no expected errors, and fail if there are any expected errors.
        const context = workspace.loadContext(this.input);
        const result = workspace.evaluate(this.target, context);
        const output = context.getOutput();
        const errors = context.getExceptions().map(e => e.message);

        if (result && this.expect_errors.length === 0) {
            // If the processing succeeded and there are no expected errors, then validate output.
            return this.wrapResult(this.validateOutput(output));

        } else if (!result && this.expect_errors.length > 0) {
            // If the processing failed and there are expected errors, then validate errors.
            return this.wrapResult(this.validateErrors(errors, this.expect_errors));

        } else {
            // If the processing result does not match the expectation based on the presence of expected errors, then the test fails.
            return this.expect_errors.length === 0 ?
                this.wrapResult({ passed: false, errors: ['Expected processing to succeed, but it failed.'] }) :
                this.wrapResult({ passed: false, errors: ['Expected processing to fail, but it succeeded.'] });
        }
    }

}
