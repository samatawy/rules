import JSON5 from "json5";
import type { ArrayType, AtomicType, FunctionDefinition, NamedParameter, ObjectType, PropertyType } from "../types";
import { isArrayType, isAtomicType } from "../type.utils";
import { ExpressionParser } from "./expression.parser";
import { ExecutableParser } from "./executable.parser";
import type { ParserOptions } from "./rule.parser";
import { ArrayInspectionFunction } from "../syntax/functions/array.inspection.functions";
import { ArrayCollectionFunction } from "../syntax/functions/array.collection.functions";
import { ArrayLambdaFunction } from "../syntax/functions/array.lambda.functions";
import { BooleanFunction } from "../syntax/functions/boolean.functions";
import { ConstantDates, ConstantNumbers } from "../syntax/functions/constant.functions";
import { StringManipulationFunction } from "../syntax/functions/string.manipulation.functions";
import { StringComparisonFunction } from "../syntax/functions/string.comparison.functions";
import { StringInspectionFunction } from "../syntax/functions/string.inspection.functions";
import { NumericManipulationFunction } from "../syntax/functions/numeric.manipulation.functions";
import { NumericComparisonFunction } from "../syntax/functions/numeric.comparison.functions";
import { TrigonomicFunction } from "../syntax/functions/numeric.trigonometric.functions";
import { DateTimeManipulationFunction } from "../syntax/functions/datetime.manipulation.functions";
import { DateTimeComparisonFunction } from "../syntax/functions/datetime.comparison.functions";
import { DateTimeInspectionFunction } from "../syntax/functions/datetime.inspection.functions";
import type { Expression } from "../syntax/expression";
import { RandomFunction } from "../syntax/functions/numeric.random.functions";
import { ParserError } from "../rules/exception";
import { WorkLogger } from "../log/work.logger";
import { TypeParser } from "./type.parser";

/**
 * Parser class for parsing function syntax into CustomFunctionExpression objects.
 * You should normally not need to use this parser directly, as it is primarily used internally when creating functions from syntax.
 * This parser handles parsing of custom functions with parameters and a body expression.
 * The parser uses regular expressions to identify the structure of the function syntax and delegates to the ExpressionParser 
 * for parsing specific components of the function (like the body expression). 
 * The parser is designed to be extensible, allowing for additional function types and syntax patterns to be added in the future as needed.
 */
export class FunctionParser {

    private options: ParserOptions;

    private expressionParser: ExpressionParser;

    private executableParser: ExecutableParser;

    private static reserved_names: Set<string>;

    static {
        FunctionParser.reserved_names = new Set<string>([
            ...ConstantNumbers.names,
            ...ConstantDates.names,
            ...ArrayInspectionFunction.names,
            ...ArrayCollectionFunction.names,
            ...ArrayLambdaFunction.names,
            ...BooleanFunction.names,
            ...StringManipulationFunction.names,
            ...StringComparisonFunction.names,
            ...StringInspectionFunction.names,
            ...NumericManipulationFunction.names,
            ...NumericComparisonFunction.names,
            ...RandomFunction.names,
            ...TrigonomicFunction.names,
            ...DateTimeManipulationFunction.names,
            ...DateTimeComparisonFunction.names,
            ...DateTimeInspectionFunction.names,
            // Add more built-in function names here as needed
        ]);
    }

    static isReservedName(name: string): boolean {
        return FunctionParser.reserved_names.has(name);
    }

    static getReservedNames(): Set<string> {
        return new Set(FunctionParser.reserved_names);
    }

    constructor(options: ParserOptions) {
        this.options = options;
        this.expressionParser = new ExpressionParser(this.options);
        this.executableParser = new ExecutableParser(this.options);
    }

    /**
     * Parse a function definition from its syntax string and return the corresponding FunctionDefinition object.
     * 
     * @param syntax The syntax string of the function to parse.
     * @returns The parsed FunctionDefinition object if successful, null otherwise.
     * @throws An error if the syntax is unrecognized or invalid, or if the function name is reserved.
     */
    public parse(syntax: string): FunctionDefinition | null {

        let defined: FunctionDefinition | null = null;
        if (syntax.length === 0) {
            throw new ParserError('Function syntax cannot be empty');
        }

        // If this is in the form name(arg1, arg2) { expr } attempt parsing
        if (syntax.match(/\w+\(.*\)\s*{.*}/g) || syntax.match(/\w+\(.*\)\s*=\s*.*$/g)) {
            defined = this.parseCustomFunction(syntax);
        } else {
            WorkLogger.debug('Syntax does not pass initial match');
        }

        if (defined) {
            return defined;
        } else {
            throw new ParserError(`Unrecognized function syntax: ${syntax}`);
        }
    }

    /**
     * Create a deep clone of a FunctionDefinition object by parsing its string representation.
     * 
     * @param original the original FunctionDefinition object to clone.
     * @returns a new FunctionDefinition object that is a deep clone of the original.
     * @throws an error if the original FunctionDefinition cannot be cloned for any reason.
     */
    public clone(original: FunctionDefinition): FunctionDefinition {
        const cloned: FunctionDefinition = {
            name: original.name,
            parameters: original.parameters.map(param => ({ ...param })),
            expression: this.expressionParser.parse(original.expression.toString()),
            lines: original.lines ? original.lines.map(line => this.executableParser.parse(line.toString()) as any) : undefined
        };
        return cloned;
    }

    protected parseCustomFunction(syntax: string): FunctionDefinition | null {
        syntax = syntax?.trim() || '';
        if (syntax.length === 0) {
            return null;
        }
        const simple_match = syntax.match(/(\w+)\s*\((.*)\)\s*=\s*(.*)$/);
        if (simple_match) {
            const name = simple_match[1]!;
            if (FunctionParser.isReservedName(name)) {
                throw new ParserError(`Cannot define function with reserved name: ${name}`);
            }
            const paramsSyntax = simple_match[2]!;
            const bodySyntax = simple_match[3]!;
            const params = this.readParameters(paramsSyntax);
            const expression = this.parseBody(bodySyntax);
            return { name, parameters: params, expression };
        }

        const match = syntax.match(/(\w+)\s*\((.*)\)\s*{(.*)}$/);
        if (match) {
            const name = match[1]!;
            if (FunctionParser.isReservedName(name)) {
                throw new ParserError(`Cannot define function with reserved name: ${name}`);
            }
            const paramsSyntax = match[2]!;
            const bodySyntax = match[3]!;
            const params = this.readParameters(paramsSyntax);

            // Split body into lines and return expression (last line)
            const all_lines = bodySyntax.split(';').map(s => s.trim()).filter(s => s.length > 0);
            if (all_lines.length === 0) {
                throw new ParserError('Function body cannot be empty');
            }
            const return_line = all_lines[all_lines.length - 1]!;

            if (!return_line.trim().toLowerCase().startsWith('return ')) {
                throw new ParserError('Last line of function body must be a return statement');
            }
            // Parse lines if they exist into executables 
            // that will be executed in order before the return expression is evaluated
            const parsed_lines = [];
            const other_lines = all_lines.slice(0, all_lines.length - 1);
            if (other_lines.length > 0) {
                for (const line of other_lines) {
                    if (line.trim().length === 0) {
                        continue;
                    }
                    if (line.trim().toLowerCase().startsWith('return ')) {
                        throw new ParserError('Only the last line of the function body can be a return statement');
                    }
                    const parsed = this.executableParser.parse(line);
                    if (parsed) {
                        parsed_lines.push(parsed);
                    } else {
                        throw new ParserError(`Failed to parse line ${line} in function body.`);
                    }
                }
            }

            const parsed_return = this.parseBody(return_line.trim().substring(7).trim());
            return { name, parameters: params, lines: parsed_lines, expression: parsed_return };

        } else {
            WorkLogger.debug('Syntax does not match function pattern, cannot parse as function expression');
        }
        throw new ParserError(`Syntax does not match CustomFunction pattern: ${syntax}`);
    }

    protected readParameters(syntax: string): NamedParameter[] {
        // Parse parameters if any are provided, otherwise return an empty array
        // Parameters are expected in the form "name: type, name2: type2, ..."
        // Only atomic type parameters are allowed for now
        const params: NamedParameter[] = [];
        const paramSyntaxes = syntax.split(',').map(s => s.trim()).filter(s => s.length > 0);
        for (const paramSyntax of paramSyntaxes) {
            // allow type names to include atomic, array, or object syntax (allowing []{}, )
            let ok = false;
            const matchAtomic = paramSyntax.match(/^(\w+)\s*:\s*(\w+)$/);
            if (matchAtomic) {
                if (isAtomicType(matchAtomic[2]! as PropertyType)) {
                    params.push({
                        name: matchAtomic[1]!,
                        type: matchAtomic[2]! as AtomicType,
                        optional: false
                    } as NamedParameter);
                    ok = true;
                }
            }
            if (!ok) {
                const matchArray = paramSyntax.match(/^(\w+)\s*:\s*(\w*\[\])\s*$/);
                if (matchArray) {
                    if (isArrayType(matchArray[2]! as PropertyType)) {
                        params.push({
                            name: matchArray[1]!,
                            type: matchArray[2]! as ArrayType,
                            optional: false
                        } as NamedParameter);
                        ok = true;
                    }
                }
            }
            if (!ok) {
                const matchObject = paramSyntax.match(/^(\w+)\s*:\s*(\{[^{}]*\})\s*$/);
                if (matchObject) {
                    try {
                        if (TypeParser.isValidObjectType(JSON5.parse(matchObject[2]!))) {
                            params.push({
                                name: matchObject[1]!,
                                type: JSON5.parse(matchObject[2]!) as ObjectType,
                                optional: false
                            } as NamedParameter);
                            ok = true;
                        }
                    } catch (e) {
                        throw new ParserError(`Parameter syntax does not match expected pattern "name: type": ${paramSyntax}`);
                    }
                }
            }
            if (!ok) {
                throw new ParserError(`Parameter syntax does not match expected pattern "name: type": ${paramSyntax}`);
            }
        }
        return params;
    }

    protected parseBody(syntax: string): Expression {
        // Parse body in the form "return expression" or just "expression"
        if (syntax.trim().startsWith('return ')) {
            syntax = syntax.trim().substring(7).trim();
        }
        const expression = this.expressionParser.parse(syntax);
        if (!expression) {
            throw new ParserError(`Failed to parse body for CustomFunction: ${syntax}`);
        }
        return expression;
    }
}