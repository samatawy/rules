import { ArithmeticExpression } from "../syntax/arithmetic.expression";
import { ComparisonExpression } from "../syntax/comparison.expression";
import type { Expression } from "../syntax/expression";
import { FunctionFactory } from "./function.factory";
import { LiteralExpression } from "../syntax/literal.expression";
import { LogicalExpression } from "../syntax/logical.expression";
import { TernaryExpression } from "../syntax/ternary.expression";
import { VariableExpression } from "../syntax/variable.expression";
import type { ParserOptions } from "./rule.parser";
import { LambdaExpression } from "../syntax/lambda.expression";
import { ArrayExpression } from "../syntax/array.expression";
import { SwitchExpression } from "../syntax/switch.expression";

/**
 * Parser class for parsing expressions from rule syntax.
 * You should normally not need to use this parser directly, as it is primarily used internally 
 * by the RuleParser and ExecutableParser when parsing conditions and consequences from rule syntax.
 * This parser handles parsing of literals, variables, function calls, logical expressions (AND/OR), 
 * comparison expressions (==, !=, <, >, <=, >=), arithmetic expressions (+, -, *, /, %), 
 * and ternary expressions (condition ? trueExpr : falseExpr).
 * It uses a recursive descent parsing approach, starting with the most complex expressions (function calls, logical expressions) 
 * and working down to simpler expressions (literals, variables).
 * The parser also handles operator precedence by first parsing lower-precedence operators (like + and -) 
 * before higher-precedence operators (like * and /).    
 */
export class ExpressionParser {

    private options: ParserOptions;

    constructor(options: ParserOptions) {
        this.options = options;
    }

    /**
     * Parse a string expression into an Expression object that can be evaluated within the rule engine.
     * @param syntax The string representation of the expression to parse.
     * @returns An Expression object representing the parsed expression if successful.
     * @throws An error if the expression is empty or invalid.
     */
    public parse(syntax: string): Expression {
        if (!syntax || syntax.trim() === '') {
            throw new Error("Empty expression");
        }

        const tokens = this.tokenize(syntax);
        if (tokens.length === 0) {
            throw new Error("Empty expression");
        }
        // console.debug(`Tokens: ${JSON.stringify(tokens)}`);

        // console.debug(`Parsing expression: ${syntax}`);

        if (this.isEnclosedInParentheses(syntax)) {
            // console.debug(`Expression is enclosed in parentheses, stripping and parsing inner expression: ${syntax}`);
            const innerSyntax = this.stripEnclosingParentheses(syntax);
            return this.parse(innerSyntax);
        }

        const lambdaExpr = this.readLambdaExpression(tokens);
        if (lambdaExpr) {
            return lambdaExpr;
        }

        const functionExpr = this.readFunctionExpression(tokens);
        if (functionExpr) {
            // console.debug(`Parsed function expression: ${syntax}`);
            return functionExpr;
        }

        const logicalExpr = this.readLogicalExpression(tokens);
        if (logicalExpr) {
            // console.debug(`Parsed logical expression: ${syntax}`);
            return logicalExpr;
        }

        const ternaryExpr = this.readTernaryExpression(tokens);
        if (ternaryExpr) {
            // console.debug(`Parsed ternary expression: ${syntax}`);
            return ternaryExpr;
        }

        const switchExpr = this.readSwitchExpression(tokens);
        if (switchExpr) {
            // console.debug(`Parsed switch expression: ${syntax}`);
            return switchExpr;
        }

        const comparisonExpr = this.readComparisonExpression(tokens);
        if (comparisonExpr) {
            // console.debug(`Parsed comparison expression: ${syntax}`);
            return comparisonExpr;
        }

        const arithmeticExpr = this.readArithmeticExpression(['+', '-'], tokens);
        if (arithmeticExpr) {
            // console.debug(`Parsed arithmetic expression: ${syntax}`);
            return arithmeticExpr;
        }

        const arithmeticExpr2 = this.readArithmeticExpression(['*', '/'], tokens);
        if (arithmeticExpr2) {
            // console.debug(`Parsed arithmetic expression: ${syntax}`);
            return arithmeticExpr2;
        }

        const arithmeticExpr3 = this.readArithmeticExpression(['%'], tokens);
        if (arithmeticExpr3) {
            // console.debug(`Parsed arithmetic expression: ${syntax}`);
            return arithmeticExpr3;
        }

        const literalExpr = this.readLiteralExpression(syntax);
        if (literalExpr) {
            // console.debug(`Parsed literal expression: ${syntax}`);
            return literalExpr;
        }

        const arrayExpr = this.readArrayExpression(tokens);
        if (arrayExpr) {
            // console.debug(`Parsed array expression: ${syntax}`);
            return arrayExpr;
        }

        const variableExpr = this.readVariableExpression(syntax);
        if (variableExpr) {
            // console.debug(`Parsed variable expression: ${syntax}`);
            return variableExpr;
        }

        throw new Error(`Unable to parse expression: ${syntax}`);
    }

    protected tokenize(syntax: string): string[] {
        // insert spaces around parentheses and operators to ensure they are treated as separate tokens
        // Take care to treat ==, !=, <=, >= as single operators and not split them into two tokens
        syntax = syntax.replace(/(==|!=|<=|>=|[()\[\]?:,%+=*/])/g, ' $1 ');

        // collapse multiple spaces into a single space
        syntax = syntax.replace(/\s+/g, ' ').trim();

        // split by spaces using simple regex
        const tokens = syntax.split(/\s+/);
        return tokens;
    }


    protected splitOperands(tokens: string[], operators: string[]): { left: string, operator: string, right: string } | null {
        const stack: string[] = [];
        const openers = ['(', '[', '{', '"', '\''];
        const closers = [')', ']', '}', '"', '\''];
        let latest: string | null = null;

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i]!;
            if (closers.includes(token)) {
                if (latest && closers.indexOf(token) === openers.indexOf(latest)) {
                    stack.pop();
                    latest = stack.length > 0 ? stack[stack.length - 1]! : null;
                    continue;
                }
            }
            if (openers.includes(token)) {
                stack.push(token);
                latest = token;
                continue;
            }
            if (operators.includes(token.toUpperCase()) && stack.length === 0) {
                const left = tokens.slice(0, i).join(' ');
                const right = tokens.slice(i + 1).join(' ');
                return { left, operator: token, right };
            }
        }
        return null;
    }

    protected isEnclosedInParentheses(syntax: string): boolean {
        if (syntax.length < 2 || syntax[0] !== '(' || syntax[syntax.length - 1] !== ')') {
            return false;
        }

        let parenthesesCount = 0;
        for (let i = 0; i < syntax.length; i++) {
            if (syntax[i] === '(') {
                parenthesesCount++;
            } else if (syntax[i] === ')') {
                parenthesesCount--;
                if (parenthesesCount === 0 && i !== syntax.length - 1) {
                    return false;
                }
            }
        }

        return parenthesesCount === 0;
    }

    protected isEnclosedInBrackets(syntax: string): boolean {
        if (syntax.length < 2 || syntax[0] !== '[' || syntax[syntax.length - 1] !== ']') {
            return false;
        }

        let bracketsCount = 0;
        for (let i = 0; i < syntax.length; i++) {
            if (syntax[i] === '[') {
                bracketsCount++;
            } else if (syntax[i] === ']') {
                bracketsCount--;
                if (bracketsCount === 0 && i !== syntax.length - 1) {
                    return false;
                }
            }
        }

        return bracketsCount === 0;
    }

    protected stripEnclosingParentheses(syntax: string): string {
        if (this.isEnclosedInParentheses(syntax)) {
            return syntax.slice(1, -1);
        }
        return syntax;
    }

    protected readFunctionExpression(tokens: string[]): Expression | null {

        if (tokens.length >= 2 && tokens[1] === '(' && tokens[tokens.length - 1] === ')') {
            if (!this.isEnclosedInParentheses(tokens.slice(1).join(' '))) {
                // unbalanced parentheses in function arguments, not a valid function expression
                return null;
            }

            const functionName = tokens[0]!;
            const argsSyntax = tokens.slice(2, -1).join(' ');
            const args = this.splitArguments(argsSyntax);
            const argExpressions = args.map(arg => this.parse(arg));
            return new FunctionFactory(this.options).create(functionName, argExpressions);
        }
        return null;
    }

    protected splitArguments(argsSyntax: string): string[] {
        argsSyntax = argsSyntax.trim();
        if (argsSyntax.length === 0) {
            return [];
        }
        const { left, operator: comma, right } = this.splitOperands(argsSyntax.split(' '), [',']) || {};
        if (left && comma && right) {
            return [left, ...this.splitArguments(right)];
        } else {
            return [argsSyntax];
        }
    }

    protected readLogicalExpression(tokens: string[]): LogicalExpression | null {
        const { left, operator, right } = this.splitOperands(tokens, ['AND', 'OR', '&&', '||']) || {};
        if (left && operator && right) {
            const leftExpr = this.parse(left);
            const rightExpr = this.parse(right);
            return new LogicalExpression(operator, leftExpr, rightExpr);
        }
        return null;
    }

    protected readTernaryExpression(tokens: string[]): TernaryExpression | null {
        const { left: conditionSyntax, operator: questionMark, right: remainder } = this.splitOperands(tokens, ['?']) || {};
        if (conditionSyntax && questionMark && remainder) {
            const { left: trueSyntax, operator: colon, right: falseSyntax } = this.splitOperands(remainder.split(' '), [':']) || {};
            if (trueSyntax && colon && falseSyntax) {
                const conditionExpr = this.parse(conditionSyntax);
                const trueExpr = this.parse(trueSyntax);
                const falseExpr = this.parse(falseSyntax);
                return new TernaryExpression(conditionExpr, trueExpr, falseExpr);
            }
        }
        return null;
    }

    protected readSwitchExpression(tokens: string[]): Expression | null {
        const caseValues: Expression[] = [];
        const caseExpressions: Expression[] = [];

        if (tokens.length >= 4 && tokens[0] === 'SWITCH' && tokens[1] === '(') {
            const closingParenIndex = this.findFirstToken(tokens, ')', 2);
            if (closingParenIndex > 1) {
                const conditionSyntax = tokens.slice(2, closingParenIndex).join(' ');
                const conditionExpr = this.parse(conditionSyntax);

                let i = closingParenIndex + 1;
                while (i < tokens.length) {
                    if (tokens[i] === 'CASE') {
                        const colonIndex = this.findFirstToken(tokens, ':', i + 1);
                        if (colonIndex === -1) {
                            throw new Error(`Expected ':' after case value in switch expression, but not found`);
                        }
                        const caseTokens = tokens.slice(i + 1, colonIndex);
                        const caseSyntax = caseTokens.join(' ');
                        const caseValue = this.parse(caseSyntax);
                        if (!caseValue) {
                            throw new Error(`Unable to parse case value in switch expression: ${caseSyntax}`);
                        }
                        i += caseTokens.length + 1; // move index past case value and colon

                        const commaIndex = this.findFirstToken(tokens, ',', i);
                        if (commaIndex === -1) {
                            // no more cases, take the rest of the tokens as the case expression
                            const caseExprTokens = tokens.slice(i + 1);
                            const caseExprSyntax = caseExprTokens.join(' ');
                            const caseExpr = this.parse(caseExprSyntax);
                            caseValues.push(caseValue);
                            caseExpressions.push(caseExpr);
                            // caseExpressions[caseValue.toString()] = caseExpr;
                            break;
                        } else {
                            // there are more cases, take tokens until the next CASE as the case expression
                            const caseExprTokens = tokens.slice(i + 1, commaIndex);
                            const caseExprSyntax = caseExprTokens.join(' ');
                            const caseExpr = this.parse(caseExprSyntax);
                            caseValues.push(caseValue);
                            caseExpressions.push(caseExpr);
                            //
                            i = commaIndex + 1; // move index past comma to next CASE
                        }
                    } else if (tokens[i] === 'DEFAULT' && tokens[i + 1] === ':') {
                        const defaultExprTokens = tokens.slice(i + 2);
                        const defaultExprSyntax = defaultExprTokens.join(' ');
                        const defaultExpr = this.parse(defaultExprSyntax);
                        return new SwitchExpression(conditionExpr, caseValues, caseExpressions, defaultExpr);
                    } else {
                        throw new Error(`Expected 'CASE' in switch expression, but got '${tokens[i]}'`);
                    }
                }

                return new SwitchExpression(conditionExpr, caseValues, caseExpressions);
            }
        }
        return null;
    }

    protected findFirstToken(tokens: string[], target: string, startIndex: number): number {
        const stack: string[] = [];
        const openers = ['(', '[', '{', '"', '\''];
        const closers = [')', ']', '}', '"', '\''];
        let latest: string | null = null;

        for (let i = startIndex; i < tokens.length; i++) {
            const token = tokens[i]!;
            if (closers.includes(token)) {
                if (latest && closers.indexOf(token) === openers.indexOf(latest)) {
                    stack.pop();
                    latest = stack.length > 0 ? stack[stack.length - 1]! : null;
                    continue;
                }
            }
            if (openers.includes(token)) {
                stack.push(token);
                latest = token;
                continue;
            }
            if (token === target && stack.length === 0) {
                return i;
            }
        }
        return -1;
    }

    protected readLambdaExpression(tokens: string[]): LambdaExpression | null {
        const match = tokens.join(' ').match(/^(\w+)\s*:\s*(.*)$/);
        if (match) {
            const variableSyntax = match[1]!;
            const expressionSyntax = match[2]!;
            const expression = this.parse(expressionSyntax);
            return new LambdaExpression(variableSyntax, expression);
        } else {
            return null;
        }
    }

    protected readComparisonExpression(tokens: string[]): ComparisonExpression | null {
        const { left, operator, right } = this.splitOperands(tokens, ['==', '!=', '<=', '>=', '<', '>']) || {};
        if (left && operator && right) {
            const leftExpr = this.parse(left);
            const rightExpr = this.parse(right);
            return new ComparisonExpression(operator, leftExpr, rightExpr);
        }
        return null;
    }

    public readArithmeticExpression(operators: string[], tokens: string[]): ArithmeticExpression | null {
        const { left, operator, right } = this.splitOperands(tokens, operators) || {};
        if (left && operator && right) {
            const leftExpr = this.parse(left);
            const rightExpr = this.parse(right);
            return new ArithmeticExpression(operator, leftExpr, rightExpr);
        }
        return null;
    }

    protected readArrayExpression(tokens: string[]): Expression | null {
        if (this.isEnclosedInBrackets(tokens.join(' '))) {
            const elementsSyntax = tokens.slice(1, -1).join(' ');
            const elementParts = this.splitArguments(elementsSyntax);
            const elementExpressions = elementParts.map(part => this.parse(part));
            return new ArrayExpression(elementExpressions);
        }
        return null;
    }

    protected readLiteralExpression(syntax: string): LiteralExpression | null {
        // match numbers (integer and floating point), booleans, null, and quoted strings
        if (/^\d+(\.\d+)?$/.test(syntax)) {
            return new LiteralExpression(parseFloat(syntax));
        } else if (/^true$/i.test(syntax)) {
            return new LiteralExpression(true);
        } else if (/^false$/i.test(syntax)) {
            return new LiteralExpression(false);
        } else if (/^null$/i.test(syntax)) {
            return new LiteralExpression(null);
        } else if (/^".*"$/.test(syntax) || /^'.*'$/.test(syntax)) {
            return new LiteralExpression(syntax.slice(1, -1));
        }
        return null;
    }

    protected readVariableExpression(syntax: string): VariableExpression | null {
        // match alphanumeric strings that may include separating dots for nested variables, but do not start with a digit
        if (/^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*$/.test(syntax)) {
            return new VariableExpression(syntax);
        }
        return null;
    }

}