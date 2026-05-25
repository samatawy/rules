import type { DateExpression, Expression, NumericExpression, StringExpression } from "../syntax/expression";
import type { FunctionExpression } from "../syntax/function.expression";
import type { ParserOptions } from "./rule.parser";
import { ArrayInspectionFunction } from "../syntax/functions/array.inspection.functions";
import { ArrayCollectionFunction } from "../syntax/functions/array.collection.functions";
import { ArrayLambdaFunction } from "../syntax/functions/array.lambda.functions";
import { BooleanFunction } from "../syntax/functions/boolean.functions";
import { DateTimeComparisonFunction } from "../syntax/functions/datetime.comparison.functions";
import { DateTimeInspectionFunction } from "../syntax/functions/datetime.inspection.functions";
import { DateTimeManipulationFunction } from "../syntax/functions/datetime.manipulation.functions";
import { ConstantDates, ConstantNumbers } from "../syntax/functions/constant.functions";
import { NumericComparisonFunction } from "../syntax/functions/numeric.comparison.functions";
import { NumericManipulationFunction } from "../syntax/functions/numeric.manipulation.functions";
import { TrigonomicFunction } from "../syntax/functions/numeric.trigonometric.functions";
import { StringComparisonFunction } from "../syntax/functions/string.comparison.functions";
import { StringInspectionFunction } from "../syntax/functions/string.inspection.functions";
import { StringManipulationFunction } from "../syntax/functions/string.manipulation.functions";
import { CustomFunctionExpression } from "../syntax/functions/custom.function";
import { RandomFunction } from "../syntax/functions/numeric.random.functions";
import type { FunctionProvider } from "../interfaces";
import { ParserError } from "../rules/exception";

/**
 * Factory class for creating FunctionExpression instances based on function name and arguments.
 * This factory centralizes the logic for mapping function names to their corresponding FunctionExpression classes,
 * and ensures that the correct types of arguments are passed to each function based on its expected signature.
 * It also provides a single point of maintenance for adding new functions in the future, 
 * as new functions can simply be added to this factory without needing to modify the parsing logic elsewhere in the codebase.   
 */
export class FunctionFactory {

    // private static reserved_names: Set<string>;

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
            for (const provider of FunctionFactory.providers) {
                if (provider.names().includes(name)) {
                    const func = provider.create(name, args);
                    if (func) return func;
                }
            }
        }
        else if (this.options.workspace) {
            const customFunction = this.options.workspace.functionRegistry().getFunction(name);
            if (customFunction && !customFunction.disabled) {
                return CustomFunctionExpression.from(customFunction, args);
            }
        }

        // // Constants
        // if (ConstantNumbers.names.includes(name)) {
        //     return new ConstantNumbers(name);
        // }
        // if (ConstantDates.names.includes(name)) {
        //     return new ConstantDates(name);
        // }

        // // Array functions
        // if (ArrayInspectionFunction.names.includes(name)) {
        //     return new ArrayInspectionFunction(name, args[0] as Expression, args.slice(1));
        // }
        // if (ArrayCollectionFunction.names().includes(name)) {
        //     return new ArrayCollectionFunction(name, args[0] as Expression, args.slice(1));
        // }
        // if (ArrayLambdaFunction.names.includes(name)) {
        //     return new ArrayLambdaFunction(name, args);
        // }

        // // Boolean functions
        // if (BooleanFunction.names.includes(name.toLowerCase())) {
        //     return new BooleanFunction(name, args[0] as Expression);
        // }

        // // Numeric functions
        // if (NumericManipulationFunction.names.includes(name)) {
        //     return new NumericManipulationFunction(name, args[0] as NumericExpression, args.slice(1));
        // }
        // if (NumericComparisonFunction.names.includes(name)) {
        //     return new NumericComparisonFunction(name, args[0] as NumericExpression, [args[1] as Expression]);
        // }
        // if (RandomFunction.names.includes(name)) {
        //     return new RandomFunction(name, args);
        // }
        // if (TrigonomicFunction.names.includes(name)) {
        //     return new TrigonomicFunction(name, args[0] as NumericExpression, []);
        // }

        // // String functions
        // if (StringManipulationFunction.names.includes(name)) {
        //     return new StringManipulationFunction(name, args[0] as StringExpression, args.slice(1));
        // }
        // if (StringComparisonFunction.names.includes(name)) {
        //     return new StringComparisonFunction(name, args[0] as StringExpression, args[1] as StringExpression);
        // }
        // if (StringInspectionFunction.names.includes(name)) {
        //     return new StringInspectionFunction(name, args[0] as StringExpression, []);
        // }

        // // DateTime functions
        // if (DateTimeManipulationFunction.names.includes(name)) {
        //     return new DateTimeManipulationFunction(name, args[0] as DateExpression, args.slice(1));
        // }
        // if (DateTimeComparisonFunction.names.includes(name)) {
        //     return new DateTimeComparisonFunction(name, args[0] as DateExpression, args[1] as DateExpression);
        // }
        // if (DateTimeInspectionFunction.names.includes(name)) {
        //     return new DateTimeInspectionFunction(name, args[0] as DateExpression, []);
        // }

        // if (this.options.workspace) {
        //     const customFunction = this.options.workspace.functionRegistry().getFunction(name);
        //     if (customFunction && !customFunction.disabled) {
        //         return CustomFunctionExpression.from(customFunction, args);
        //     }
        // }

        throw new ParserError(`Unknown function: "${name}()"`);
    }

    public mock(name: string, args: Expression[]): FunctionExpression | undefined {
        if (FunctionFactory.isReservedName(name)) {
            for (const provider of FunctionFactory.providers) {
                if (provider.names().includes(name)) {
                    const func = provider.mock(name, args);
                    if (func) return func;
                }
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
        this.registerProvider(ArrayCollectionFunction);
        this.registerProvider(ArrayInspectionFunction);
        this.registerProvider(ArrayLambdaFunction);
        this.registerProvider(BooleanFunction);
        this.registerProvider(ConstantDates);
        this.registerProvider(ConstantNumbers);
        this.registerProvider(DateTimeComparisonFunction);
        this.registerProvider(DateTimeInspectionFunction);
        this.registerProvider(DateTimeManipulationFunction);
        this.registerProvider(NumericComparisonFunction);
        this.registerProvider(NumericManipulationFunction);
        this.registerProvider(RandomFunction);
        this.registerProvider(TrigonomicFunction);
        this.registerProvider(StringComparisonFunction);
        this.registerProvider(StringInspectionFunction);
        this.registerProvider(StringManipulationFunction);

        //     this.reserved_names = new Set<string>([
        //         ...ConstantNumbers.names,
        //         ...ConstantDates.names,
        //         ...ArrayInspectionFunction.names,
        //         ...ArrayCollectionFunction.names,
        //         ...ArrayLambdaFunction.names,
        //         ...BooleanFunction.names,
        //         ...StringManipulationFunction.names,
        //         ...StringComparisonFunction.names,
        //         ...StringInspectionFunction.names,
        //         ...NumericManipulationFunction.names,
        //         ...NumericComparisonFunction.names,
        //         ...RandomFunction.names,
        //         ...TrigonomicFunction.names,
        //         ...DateTimeManipulationFunction.names,
        //         ...DateTimeComparisonFunction.names,
        //         ...DateTimeInspectionFunction.names,
        //         // Add more built-in function names here as needed
        //     ]);
    }

    public static registerProvider(provider: FunctionProvider): void {
        this.providers.push(provider);
        for (const name of provider.names()) {
            if (this.reserved_names.has(name)) {
                throw new ParserError(`Function name "${name}" is reserved and cannot be registered by a provider.`);
            }
            this.reserved_names.set(name, provider);
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

    // public static createFromProvider(name: string, args: Expression[]): FunctionExpression | undefined {
    //     for (const provider of this.providers) {
    //         if (provider.names().includes(name)) {
    //             return provider.create(name, args);
    //         }
    //     }
    //     return undefined;
    // }

    public static isReservedName(name: string): boolean {
        return this.reserved_names.has(name);
    }

    public static getReservedNames(): Set<string> {
        return new Set(this.reserved_names.keys());
    }
}