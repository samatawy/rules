import type { Expression } from "../syntax/expression";
import type { FunctionExpression } from "../syntax/function.expression";
import type { ParserOptions } from "./rule.parser";
import type { FunctionProvider } from "../interfaces";
import { FunctionCompiler } from "./function.compiler";
import { ParserError } from "../rules/exception";

import { ArrayInspectionFunctionProvider } from "../functions/array.inspection.functions";
import { ArrayCollectionFunctionProvider } from "../functions/array.collection.functions";
import { ArrayLambdaFunctionProvider } from "../functions/array.lambda.functions";
import { BooleanFunctionProvider } from "../functions/boolean.functions";
import { DateTimeComparisonFunctionProvider } from "../functions/datetime.comparison.functions";
import { DateTimeInspectionFunctionProvider } from "../functions/datetime.inspection.functions";
import { DateTimeManipulationFunctionProvider } from "../functions/datetime.manipulation.functions";
import { ConstantDatesProvider, ConstantNumbersProvider } from "../functions/constant.functions";
import { NumericComparisonFunctionProvider } from "../functions/numeric.comparison.functions";
import { NumericManipulationFunctionProvider } from "../functions/numeric.manipulation.functions";
import { TrigonometricFunctionProvider } from "../functions/numeric.trigonometric.functions";
import { StringComparisonFunctionProvider } from "../functions/string.comparison.functions";
import { StringInspectionFunctionProvider } from "../functions/string.inspection.functions";
import { StringManipulationFunctionProvider } from "../functions/string.manipulation.functions";
import { CustomFunctionExpression } from "../functions/custom.function";
import { RandomFunctionProvider } from "../functions/numeric.random.functions";
import { ArrayComparisonFunctionProvider } from "../functions/array.comparison.functions";

/**
 * Factory class for creating FunctionExpression instances based on function name and arguments.
 * This factory centralizes the logic for mapping function names to their corresponding FunctionExpression classes,
 * and ensures that the correct types of arguments are passed to each function based on its expected signature.
 * It also provides a single point of maintenance for adding new functions in the future, 
 * as new functions can simply be added to this factory without needing to modify the parsing logic elsewhere in the codebase.   
 */
export class FunctionFactory {

    private static providers: FunctionProvider[] = [];

    private static reserved_names = new Map<string, FunctionProvider>();

    protected options: ParserOptions;

    constructor(options: ParserOptions) {
        this.options = options;
    }

    /**
     * Create a FunctionExpression instance based on the provided function name and arguments.
     * @param name The name of the function to create.
     * @param args The arguments to pass to the function.
     * @returns A FunctionExpression instance representing the specified function.
     * @throws An error if the function name is unknown or if the arguments are invalid.
     */
    public create(name: string, args: Expression[]): FunctionExpression {

        if (FunctionFactory.isReservedName(name)) {
            const provider = FunctionFactory.getProvider(name);
            if (provider) {
                const func = provider.create(name, args);
                if (func) return func;
            }
        }
        else if (this.options.workspace) {
            const customFunction = this.options.workspace.functionRegistry().getFunction(name);
            if (customFunction && !customFunction.disabled) {
                return CustomFunctionExpression.from(customFunction, args);
            }
        }

        throw new ParserError(`Unknown function: "${name}()"`);
    }

    public mock(name: string, args: Expression[]): FunctionExpression | undefined {
        if (FunctionFactory.isReservedName(name)) {
            const provider = FunctionFactory.getProvider(name);
            if (provider) {
                return provider.mock(name, args);
            }
        }
        else if (this.options.workspace) {
            const customFunction = this.options.workspace.functionRegistry().getFunction(name);
            if (customFunction && !customFunction.disabled) {
                return CustomFunctionExpression.from(customFunction, args);
            }
        }
    }

    static {
        this.registerProvider(ArrayCollectionFunctionProvider);
        this.registerProvider(ArrayInspectionFunctionProvider);
        this.registerProvider(ArrayComparisonFunctionProvider);
        this.registerProvider(ArrayLambdaFunctionProvider);
        this.registerProvider(BooleanFunctionProvider);
        this.registerProvider(ConstantDatesProvider);
        this.registerProvider(ConstantNumbersProvider);
        this.registerProvider(DateTimeComparisonFunctionProvider);
        this.registerProvider(DateTimeInspectionFunctionProvider);
        this.registerProvider(DateTimeManipulationFunctionProvider);
        this.registerProvider(NumericComparisonFunctionProvider);
        this.registerProvider(NumericManipulationFunctionProvider);
        this.registerProvider(RandomFunctionProvider);
        this.registerProvider(TrigonometricFunctionProvider);
        this.registerProvider(StringComparisonFunctionProvider);
        this.registerProvider(StringInspectionFunctionProvider);
        this.registerProvider(StringManipulationFunctionProvider);
    }

    public static registerProvider(provider: FunctionProvider): void {
        this.providers.push(provider);
        for (const name of provider.names()) {
            if (this.reserved_names.has(name)) {
                throw new ParserError(`Function name "${name}" is reserved and cannot be registered by a provider.`);
            }
            this.reserved_names.set(name, provider);

            if (FunctionCompiler.enabled) {
                const compilable = provider.toJS(name);
                if (compilable) {
                    const func = FunctionCompiler.compileFunction(compilable.args, compilable.body);
                    if (func) {
                        (globalThis as any)[name] = func;
                    }
                }
            }
        }
    }

    public static unregisterProvider(provider: FunctionProvider): void {
        this.providers = this.providers.filter(p => p !== provider);
        for (const name of provider.names()) {
            this.reserved_names.delete(name);
        }
    }

    public static clearProviders(): void {
        this.providers.forEach(provider => {
            for (const name of provider.names()) {
                this.reserved_names.delete(name);
            }
        });
        this.providers = [];
    }

    public static isReservedName(name: string): boolean {
        return this.reserved_names.has(name);
    }

    public static getReservedNames(): Set<string> {
        return new Set(this.reserved_names.keys());
    }

    private static getProvider(name: string): FunctionProvider | undefined {
        return this.reserved_names.get(name);
    }

}