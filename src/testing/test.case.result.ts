export interface TestCaseResult {
    name?: string;
    hint?: string;
    output?: any;
    passed: boolean;
    errors: string[];
}