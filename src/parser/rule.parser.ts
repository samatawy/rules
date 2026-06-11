import type { Workspace } from "../engine/workspace";
import { OutputAction } from "../rules/executable";
import type { AbstractRule } from "../rules/abstract.rule";
import { OutputRule } from "../rules/assignment.rules";
import { IfThenElseRule, IfThenRule, IfThrowRule } from "../rules/conditional.rules";
import { ExecutableParser } from "./executable.parser";
import { ExpressionParser } from "./expression.parser";
import { ParserError } from "../rules/exception";
import { parseAnnotationValue, readLeadingAnnotation } from "./annotation.utils";
import type { Annotations } from "../types";

interface AnnotatedSyntax {
    name?: string;
    hint?: string;
    disabled?: boolean;
    salience?: number;
    annotations?: Annotations;
    syntax?: string;
}

export interface ParserOptions {
    workspace?: Workspace;
}

/**
 * Parser class for parsing rule syntax into AbstractRule objects.
 * You should normally not need to use this parser directly, as it is primarily used internally when creating rules from syntax.
 * This parser handles parsing of conditional rules (IF-THEN, IF-THEN-ELSE, IF-THROW) as well as assignment rules (SET x = value).
 * It also supports parsing of annotations for rules, such as @name, @hint, and @salience.
 * The parser uses regular expressions to identify the structure of the rule syntax and delegates to the ExpressionParser and ExecutableParser 
 * for parsing specific components of the rules (like conditions and consequences). 
 * The parser is designed to be extensible, allowing for additional rule types and syntax patterns to be added in the future as needed.
 */
export class RuleParser {

    private options: ParserOptions;

    private expressionParser: ExpressionParser;

    private executableParser: ExecutableParser;

    constructor(options: ParserOptions) {
        this.options = options;
        this.expressionParser = new ExpressionParser(this.options);
        this.executableParser = new ExecutableParser(this.options);
    }

    /**
     * Parse a rule from its syntax string and return the corresponding AbstractRule implementation.
     * 
     * @param syntax The syntax string of the rule to parse.
     * @returns The parsed implementation of AbstractRule object if successful, null otherwise.
     * @throws An error if the syntax is invalid or if parsing fails for any reason.
     */
    public parse(syntax: string): AbstractRule | null {

        const annotated = this.parseAnnotations({ syntax });
        let parsed: AbstractRule | null = null;
        syntax = annotated.syntax || '';
        if (syntax.length === 0) {
            throw new ParserError('Rule syntax cannot be empty');
        }

        // Support multiline syntax by normalizing whitespace and newlines to single spaces
        syntax = syntax.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

        // If this is a conditional rule, like "IF condition THEN consequence [ELSE alternative]"
        // or "IF condition THROW errorMessage"
        if (syntax.match(/^IF\s+/i)) {
            parsed = this.parseConditionalRule(syntax);
        }

        // If this is a conditional assignment rule like "SET x = 5 IF condition"
        if (syntax.match(/^SET\s+\w+(\.\w+)*\s*=\s*.+\s+IF\s+/i)) {
            // To support only flat keys:
            // if (syntax.match(/^SET\s+\w+\s*=\s*.+\s+IF\s+/i)) {
            parsed = this.parseStateIfRule(syntax);
        }

        // If this is a default assignment rule, like "SET x = 10"
        if (syntax.match(/^SET\s+/i)) {
            parsed = this.parseStateRule(syntax);
        }

        if (parsed) {
            parsed.name = annotated.name;
            parsed.hint = annotated.hint;
            annotated.disabled ? parsed.disable() : parsed.enable();
            parsed.setSalience(annotated.salience ?? 0);
            for (const key in annotated.annotations) {
                parsed.annotate(key, annotated.annotations[key]);
            }
            return parsed;
        } else {
            throw new ParserError(`Unrecognized rule syntax: ${syntax}`);
        }
    }

    /**
     * Create a deep clone of the given AbstractRule by parsing its syntax and copying its annotations.
     * 
     * @param original the original AbstractRule object to clone.
     * @returns a new AbstractRule object that is a deep clone of the original.
     * @throws an error if the original AbstractRule cannot be cloned for any reason.
     */
    public clone(original: AbstractRule): AbstractRule {
        const cloned = this.parse(original.getSyntax());
        if (!cloned) {
            throw new ParserError(`Failed to clone rule: ${original.getSyntax()}`);
        }
        // cloned.name = original.name;
        // cloned.hint = original.hint;
        for (const key in original.getAnnotations()) {
            // if (!cloned.isAnnotated(key)) {
            cloned.annotate(key, original.getAnnotation(key));
            // }
        }
        cloned.setSalience(original.getSalience());
        return cloned;
    }

    private parseAnnotations(given: AnnotatedSyntax): AnnotatedSyntax {
        given.syntax = given.syntax?.trim() || '';
        const annotation = readLeadingAnnotation(given.syntax);
        if (!annotation) {
            return given;
        }

        given.syntax = annotation.rest;

        if (annotation.name === 'name') {
            given.name = annotation.value;
        } else if (annotation.name === 'hint') {
            given.hint = annotation.value;
        } else if (annotation.name === 'disabled') {
            given.disabled = true;
        } else if (annotation.name === 'salience') {
            const salience = parseInt(annotation.value, 10);
            if (Number.isNaN(salience)) {
                throw new ParserError(`Invalid salience annotation value: ${annotation.value}`);
            }
            given.salience = salience;
        } else {
            given.annotations = given.annotations || {};
            given.annotations[annotation.name] = parseAnnotationValue(annotation.name, annotation.value);
        }

        // loop to allow multiple annotations in any order, like "@name(...) @salience(...) @hint(...)"
        return this.parseAnnotations(given);
    }

    protected parseConditionalRule(syntax: string): AbstractRule | null {
        let rule = this.parseIfThenElseRule(syntax);
        if (rule) {
            return rule;
        }
        rule = this.parseIfThenRule(syntax);
        if (rule) {
            return rule;
        }
        rule = this.parseIfThrowRule(syntax);
        if (rule) {
            return rule;
        }
        return null;
    }

    protected parseIfThenRule(syntax: string): AbstractRule | null {

        // split syntax allowing nested variables names in the left side 
        // and allowing any executable action in the right side
        const match = syntax.match(/^IF\s+(.+?)\s+THEN\s+(.+)$/i);
        if (match) {
            const conditionSyntax = match[1]!;
            const condition = this.expressionParser.parse(conditionSyntax);
            if (!condition) {
                throw new ParserError(`Failed to parse condition for IfThenRule: ${conditionSyntax}`);
            }

            const consequenceSyntax = match[2]!;
            const consequence = this.executableParser.parse(consequenceSyntax);
            if (!consequence) {
                throw new ParserError(`Failed to parse consequence for IfThenRule: ${consequenceSyntax}`);
            }
            return IfThenRule.parsed(syntax, condition, consequence, this.options.workspace?.typeChecker());
        }
        throw new ParserError(`Syntax does not match IfThenRule pattern: ${syntax}`);
    }

    protected parseIfThenElseRule(syntax: string): AbstractRule | null {

        const match = syntax.match(/^IF\s+(.+?)\s+THEN\s+(.+?)\s+ELSE\s+(.+)$/i);
        if (match) {
            const conditionSyntax = match[1]!;
            const condition = this.expressionParser.parse(conditionSyntax);
            if (!condition) {
                throw new ParserError(`Failed to parse condition for IfThenElseRule: ${conditionSyntax}`);
            }

            const consequenceSyntax = match[2]!;
            const consequence = this.executableParser.parse(consequenceSyntax);
            if (!consequence) {
                throw new ParserError(`Failed to parse consequence for IfThenElseRule: ${consequenceSyntax}`);
            }
            const alternativeSyntax = match[3]!;
            const alternative = this.executableParser.parse(alternativeSyntax);
            if (!alternative) {
                throw new ParserError(`Failed to parse alternative for IfThenElseRule: ${alternativeSyntax}`);
            }

            return IfThenElseRule.parsed(syntax, condition, consequence, alternative, this.options.workspace?.typeChecker());
        }
        return null;
    }

    protected parseIfThrowRule(syntax: string): AbstractRule | null {

        // Both if x throw e and if x then throw e are supported
        // The keyword 'THEN' is optional
        const match = syntax.match(/^IF\s+(.+?)\s+(?:THEN\s+)?THROW\s+(.+)$/i);
        if (match) {
            const conditionSyntax = match[1]!;
            const condition = this.expressionParser.parse(conditionSyntax);
            if (!condition) {
                throw new ParserError(`Failed to parse condition for IfThrowRule: ${conditionSyntax}`);
            }
            const errorMessage = match[2]!;

            return IfThrowRule.parsed(syntax, condition, errorMessage);
        }
        return null;
    }

    protected parseStateRule(syntax: string): AbstractRule | null {
        // Parsing assignment rules like "SET x = 10"
        // Maybe we should also accept nested states like "SET x.y.z = 10" ?

        const match = syntax.match(/^SET\s+(\w+(?:\.\w+)*)\s*=\s*(.+)$/i);
        // To support only flat keys:
        // const match = syntax.match(/^SET\s+(\w+)\s*=\s*(.+)$/i);
        if (match) {
            const variableName = match[1]!;
            const valueSyntax = match[2]!;
            const valueExpr = this.expressionParser.parse(valueSyntax);
            if (!valueExpr) {
                throw new ParserError(`Failed to parse value expression for StateRule: ${valueSyntax}`);
            }

            return OutputRule.parsed(syntax, variableName, valueExpr, this.options.workspace?.typeChecker());
        }
        return null;
    }

    protected parseStateIfRule(syntax: string): AbstractRule | null {
        // Parsing conditional assignment rules like "SET x = 5 IF condition"

        const match = syntax.match(/^SET\s(\w+(?:\.\w+)*)\s*=\s*(.+)\s+IF\s+(.+)$/i);
        // To support only flat keys:
        // const match = syntax.match(/^SET\s+(\w+)\s*=\s*(.+)\s+IF\s+(.+)$/i);
        if (match) {
            const variableName = match[1]!;
            const valueSyntax = match[2]!;
            const conditionSyntax = match[3]!;

            const valueExpr = this.expressionParser.parse(valueSyntax);
            if (!valueExpr) {
                throw new ParserError(`Failed to parse value expression for StateIfRule: ${valueSyntax}`);
            }

            const conditionExpr = this.expressionParser.parse(conditionSyntax);
            if (!conditionExpr) {
                throw new ParserError(`Failed to parse condition expression for StateIfRule: ${conditionSyntax}`);
            }

            return IfThenRule.parsed(syntax, conditionExpr, new OutputAction(variableName, valueExpr), this.options.workspace?.typeChecker());
        }
        return null;
    }
}