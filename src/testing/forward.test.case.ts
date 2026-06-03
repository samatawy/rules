import type { Workspace } from "../engine/workspace";
import type { TestCaseResult } from "./test.case.result";
import { compareDeep } from "../common.utils";
import { AbstractTestCase } from "./abstract.test.case";

/**
 * Test case for the process() method of a workspace, which evaluates the entire set of rules against the input context and produces an output context.
 */
export class ForwardTestCase extends AbstractTestCase {

    public runTest(workspace: Workspace): TestCaseResult {
        // For processing test cases, we consider the test to pass if there are no expected errors, and fail if there are any expected errors.
        const context = workspace.loadContext(this.input);
        const result = workspace.process(context);
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

    protected validateOutput(output: any): TestCaseResult {
        if (this.expect_output === undefined) {
            // If no expected output is defined, then we return no errors.
            return { passed: true, errors: [] };

        } else if (typeof this.expect_output === 'object' && this.expect_output !== null) {
            // If the expected output is an object, then we check that all expected keys are present in the actual output and that their values match.
            const errors: string[] = [];
            for (const key of this.changes()) {
                if (!(key in output)) {
                    errors.push(`Expected output to have key '${key}', but it was missing.`);
                } else {
                    const same = compareDeep(output[key], this.expect_output[key]);
                    if (!same) {
                        errors.push(`Expected output['${key}'] to be ${JSON.stringify(this.expect_output[key])}, but got ${JSON.stringify(output[key])}.`);
                    }
                }
            }
            return { passed: errors.length === 0, errors: errors };

        } else {
            // The following case should never happen:
            // If the expected output is a primitive value, then we check for exact equality with the actual output.
            return output === this.expect_output ?
                { passed: true, errors: [] } :
                {
                    passed: false, errors: [
                        `Expected output to be ${JSON.stringify(this.expect_output)}, but got ${JSON.stringify(output)}.`
                    ]
                };
        }
    }

    protected validateErrors(errors: string[], expected: string[]): TestCaseResult {
        const missingErrors = expected.filter(expectedError => !errors.includes(expectedError));
        const unexpectedErrors = errors.filter(error => !expected.includes(error));

        if (missingErrors.length === 0 && unexpectedErrors.length === 0) {
            return { passed: true, errors: [] };
        } else {
            const errorMessages: string[] = [];
            for (const error of missingErrors) {
                errorMessages.push(`Expected error '${error}' was missing.`);
            }
            for (const error of unexpectedErrors) {
                errorMessages.push(`Unexpected error '${error}' was present.`);
            }
            return { passed: false, errors: errorMessages };
        }
    }
}
