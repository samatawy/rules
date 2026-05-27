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
import { ParserError } from "../rules/exception";

/**
 * Parser class for parsing expressions from rule syntax.
 * You should normally not need to use this parser directly, as it is primarily used internally 
 * by the RuleParser and ExecutableParser when parsing conditions and consequences from rule syntax.
 * This parser handles parsing of literals, variables, function calls, logical expressions (AND/OR), 
 * comparison expressions (==, !=, <, >, <=, >=, in), arithmetic expressions (+, -, *, /, %), 
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
            throw new ParserError("Empty expression");
        }

        const tokens = this.tokenize(syntax);
        if (tokens.length === 0) {
            throw new ParserError("Empty expression");
        }

        if (this.isEnclosedInParentheses(syntax)) {
            const innerSyntax = this.stripEnclosingParentheses(syntax);
            return this.parse(innerSyntax);
        }

        const logicalExpr = this.readLogicalExpression(tokens);
        if (logicalExpr) {
            return logicalExpr;
        }

        const ternaryExpr = this.readTernaryExpression(tokens);
        if (ternaryExpr) {
            return ternaryExpr;
        }

        const switchExpr = this.readSwitchExpression(tokens);
        if (switchExpr) {
            return switchExpr;
        }

        const lambdaExpr = this.readLambdaExpression(tokens);
        if (lambdaExpr) {
            return lambdaExpr;
        }

        const comparisonExpr = this.readComparisonExpression(tokens);
        if (comparisonExpr) {
            return comparisonExpr;
        }

        const negativeExpr = this.readNegativeExpression(tokens);
        if (negativeExpr) {
            return negativeExpr;
        }

        const arithmeticExpr = this.readArithmeticExpression(['+', '-'], tokens);
        if (arithmeticExpr) {
            return arithmeticExpr;
        }

        const arithmeticExpr2 = this.readArithmeticExpression(['*', '/'], tokens);
        if (arithmeticExpr2) {
            return arithmeticExpr2;
        }

        const arithmeticExpr3 = this.readArithmeticExpression(['%'], tokens);
        if (arithmeticExpr3) {
            return arithmeticExpr3;
        }

        const literalExpr = this.readLiteralExpression(tokens);
        if (literalExpr) {
            return literalExpr;
        }

        const arrayExpr = this.readArrayExpression(tokens);
        if (arrayExpr) {
            return arrayExpr;
        }

        const functionExpr2 = this.readFunctionExpression(tokens);
        if (functionExpr2) {
            return functionExpr2;
        }

        const variableExpr = this.readVariableExpression(tokens);
        if (variableExpr) {
            return variableExpr;
        }

        throw new ParserError(`Unable to parse expression: ${syntax}`);
    }

    protected tokenize(syntax: string): string[] {

        // Extract string literals to avoid corrupting them
        const stringLiterals: string[] = [];
        const protectedSyntax = syntax.replace(/(["'])(?:\\.|(?!\1).)*\1/g, (match) => {
            const placeholder = `__STR_${stringLiterals.length}__`;
            stringLiterals.push(match);
            return placeholder;
        });

        // insert spaces around parentheses and operators to ensure they are treated as separate tokens
        // Take care to treat ==, !=, <=, >= as single operators and not split them into two tokens
        const spacedSyntax = protectedSyntax.replace(/(==|!=|<=|>=|&&|\|\||\+|\-|\*|\/|%|[()\[\]?:,%+<>=])/g, ' $1 ');

        // collapse multiple spaces into a single space
        const normalizedSyntax = spacedSyntax.replace(/\s+/g, ' ').trim();

        // Restore string literals
        syntax = normalizedSyntax.replace(/__STR_(\d+)__/g, (_, idx) => stringLiterals[parseInt(idx)] || '');

        const tokens = normalizedSyntax.split(/\s+/);

        // restore string literals in tokens
        for (let i = 0; i < tokens.length; i++) {
            if (tokens[i]?.includes('__STR_')) {
                tokens[i] = tokens[i]!.replace(/__STR_(\d+)__/, (_, idx) => stringLiterals[+idx]!);
            }
        }
        return tokens;
    }

    protected splitOperands(tokens: string[], operators: string[]): { left: string, operator: string, right: string } | null {
        const stack: string[] = [];
        const openers = ['(', '[', '{', '"', '\''];
        const closers = [')', ']', '}', '"', '\''];
        let latest: string | null = null;

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i]!;
            if (closers.includes(token) && stack.length > 0) {
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
                return { left, operator: token.toUpperCase(), right };
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
        // Maybe this should accept the raw string and walk through it backwards character by character 
        // instead of relying on tokenization, to better handle edge cases with nested function calls and complex arguments. 
        // But for now let's try this approach and see if it works well enough.

        // Read functions from the end to support chaining syntax like Person.children.age.average().roundTo(2) 
        // where each function call is parsed with the entire left side as the first argument, 
        // e.g. average(Person.children.age) and roundTo(average(Person.children.age), 2)
        for (let i = tokens.length - 1; i >= 0; i--) {
            const lastTokens = tokens.slice(i);
            if (lastTokens.length >= 2 && lastTokens[1] === '(' && lastTokens[lastTokens.length - 1] === ')') {
                if (!this.isEnclosedInParentheses(lastTokens.slice(1).join(' '))) {
                    // unbalanced parentheses in function arguments, not a valid function expression
                    continue;
                }

                const funcSyntax = lastTokens[0]!;
                const argsSyntax = lastTokens.slice(2, -1).join(' ');
                const args = this.splitArguments(argsSyntax);
                const argExpressions = args.map(arg => this.parse(arg));

                // Check if the function name is chained, e.g. Person.children.count()
                const lastDotIndex = funcSyntax.lastIndexOf('.');
                const functionName = lastDotIndex > -1 ? funcSyntax.slice(lastDotIndex + 1) : funcSyntax;

                if (lastDotIndex > -1) {
                    // function chaining syntax, e.g. Person.children.count()
                    // we can treat this as a function call with the entire left side as the first argument, e.g. count(Person.children)
                    const preceding = funcSyntax.slice(0, lastDotIndex);
                    const firstArg = preceding.length ? tokens.slice(0, i).concat(preceding).join(' ') : tokens.slice(0, i).join(' ');

                    argExpressions.unshift(this.parse(firstArg));
                }
                return new FunctionFactory(this.options).create(functionName, argExpressions);
            }
        }

        // Also check if the entire expression is a function call without chaining, e.g. count(Person.children)
        if (tokens.length >= 2 && tokens[1] === '(' && tokens[tokens.length - 1] === ')') {
            if (tokens[0]?.includes('.')) {
                // Sanity check: if it has dots but doesn't match the chaining pattern, it's not a valid function expression
                return null;
            }
            if (!this.isEnclosedInParentheses(tokens.slice(1).join(' '))) {
                // Required check: unbalanced parentheses in function arguments, not a valid function expression
                return null;
            }

            let functionName = tokens[0]!;
            const argsSyntax = tokens.slice(2, -1).join(' ');
            const args = this.splitArguments(argsSyntax);
            const argExpressions = args.map(arg => this.parse(arg));

            return new FunctionFactory(this.options).create(functionName, argExpressions);
        }

        return null;
    }

    /* Older implementation
    
    protected readFunctionExpression(tokens: string[]): Expression | null {
        if (tokens.length >= 2 && tokens[1] === '(' && tokens[tokens.length - 1] === ')') {
            if (!this.isEnclosedInParentheses(tokens.slice(1).join(' '))) {
                // unbalanced parentheses in function arguments, not a valid function expression
                return null;
            }

            let functionName = tokens[0]!;
            const argsSyntax = tokens.slice(2, -1).join(' ');
            const args = this.splitArguments(argsSyntax);
            const argExpressions = args.map(arg => this.parse(arg));

            if (functionName.includes('.')) {
                // function chaining syntax, e.g. Person.children.count()
                // we can treat this as a function call with the entire left side as the first argument, e.g. count(Person.children)
                const parts = functionName.split('.');
                functionName = parts[parts.length - 1]!;
                const firstArg = parts.slice(0, -1).join('.');
                argExpressions.unshift(this.parse(firstArg));
            }

            return new FunctionFactory(this.options).create(functionName, argExpressions);
        }
        return null;
    }
    */

    /**
     * Safely split function arguments or array items) by commas while respecting nested structures like parentheses, brackets, and string literals.
     * @param argsSyntax the whole argument string, e.g. "candidate : scoreCandidate(candidate), otherArg: 5, arr: [1, 2, 3]"
     * @returns an array of individual argument strings
     */
    public splitArguments(argsSyntax: string): string[] {
        argsSyntax = argsSyntax.trim();
        if (argsSyntax.length === 0) {
            return [];
        }
        const { left, operator: comma, right } = this.splitOperands(this.tokenize(argsSyntax), [',']) || {};
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
        // Parse the syntax condition ? trueExpr : falseExpr
        const { left: conditionSyntax, operator: questionMark, right: remainder } = this.splitOperands(tokens, ['?']) || {};
        if (conditionSyntax && questionMark && remainder) {
            const { left: trueSyntax, operator: colon, right: falseSyntax } = this.splitOperands(this.tokenize(remainder), [':']) || {};
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

        if (tokens.length >= 4 && tokens[0]!.toUpperCase() === 'SWITCH' && tokens[1] === '(') {
            const closingParenIndex = this.findFirstToken(tokens, ')', 2);
            if (closingParenIndex > 1) {
                const conditionSyntax = tokens.slice(2, closingParenIndex).join(' ');
                const conditionExpr = this.parse(conditionSyntax);

                let i = closingParenIndex + 1;
                while (i < tokens.length) {
                    if (tokens[i]!.toUpperCase() === 'CASE') {
                        const colonIndex = this.findFirstToken(tokens, ':', i + 1);
                        if (colonIndex === -1) {
                            throw new ParserError(`Expected ':' after case value in switch expression, but not found`);
                        }
                        const caseTokens = tokens.slice(i + 1, colonIndex);
                        const caseSyntax = caseTokens.join(' ');
                        const caseValue = this.parse(caseSyntax);
                        if (!caseValue) {
                            throw new ParserError(`Unable to parse case value in switch expression: ${caseSyntax}`);
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
                    } else if (tokens[i]?.toUpperCase() === 'DEFAULT' && tokens[i + 1] === ':') {
                        const defaultExprTokens = tokens.slice(i + 2);
                        const defaultExprSyntax = defaultExprTokens.join(' ');
                        const defaultExpr = this.parse(defaultExprSyntax);
                        return new SwitchExpression(conditionExpr, caseValues, caseExpressions, defaultExpr);
                    } else {
                        throw new ParserError(`Expected 'CASE' in switch expression, but got '${tokens[i]}'`);
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
        const { left, operator, right } = this.splitOperands(tokens, ['==', '!=', '<=', '>=', '<', '>', 'IN']) || {};
        if (left && operator && right) {
            const leftExpr = this.parse(left);
            const rightExpr = this.parse(right);
            // TODO: Should we check that if operator is IN, then rightExpr must be an array expression 
            // or variable that resolves to an array type? 
            // Or should we allow any type and let the type checker handle it?
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

    public readNegativeExpression(tokens: string[]): ArithmeticExpression | LiteralExpression | null {
        if (tokens[0]?.startsWith('-')) {
            const right = tokens.join(' ').slice(1);
            const rightExpr = this.parse(right);
            if (rightExpr instanceof LiteralExpression) {
                const value = rightExpr.evaluate();
                if (!Number.isNaN(value)) {
                    return new LiteralExpression(-1 * value);
                }
            }
            return new ArithmeticExpression('-', new LiteralExpression(0), rightExpr);
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

    protected readLiteralExpression(tokens: string[]): LiteralExpression | null {
        if (tokens.length !== 1 || !tokens[0]) {
            return null;
        }
        const syntax = tokens[0];
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

    protected readVariableExpression(tokens: string[]): VariableExpression | null {
        if (tokens.length !== 1 || !tokens[0]) {
            return null;
        }
        const syntax = tokens[0].trim();
        // match alphanumeric strings that may include separating dots for nested variables, but do not start with a digit
        if (/^\w+(?:\.\w+)*$/.test(syntax)) {
            return new VariableExpression(syntax);
        }
        return null;
    }

}