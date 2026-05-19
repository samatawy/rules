import type { Workspace } from "../engine/workspace";
import { FunctionFactory } from "../parser/function.factory";
import type { ArgumentType, FunctionDefinition } from "../types";
import { makeItemType } from "../type.utils";
import { SuggestionBuilder } from "./suggestion.builder";
import { Closers, ComparisonOperators, LogicalOperators, NumericOperators, Openers, Quoters, Separators, TernaryOperators } from "./constants";
import { isArrayType } from "../parser/type.parser";

export type AutocompleteKind = 'operator' | 'function' | 'type' | 'constant' | 'variable' | 'literal' | 'opener' | 'closer' | 'separator' | 'quoter';

/**
 * A single suggested token
 */
export interface AutocompleteSuggestion {
    /**
     * The suggested token
     */
    value: string;

    /**
     * The kind of suggested token
     */
    kind: AutocompleteKind;

    /**
     * Optionally the type returned by this token
     */
    returns?: string;

    /**
     * Optionally whether the token must follow certain types
     */
    comes_after?: string[];

    /**
     * Optionally whether the token must come before certain types
     */
    comes_before?: string[];
}

/**
 * A helper class that can be used in syntax editors.
 */
export class Autocomplete {

    private workspace: Workspace;

    private functionFactory: FunctionFactory;

    private suggestions: AutocompleteSuggestion[];

    /**
     * Create an autocomplete instance tailored to a given workspace.
     * @param workspace the workspace to provide suggestions for.
     */
    constructor(workspace: Workspace) {
        this.workspace = workspace;
        this.functionFactory = new FunctionFactory({ workspace });

        this.suggestions = [];
        this.suggestions = new SuggestionBuilder(this.workspace).generateSuggestions();
    }

    /**
     * Get suggestions suitable for a given cursor position in a given line.
     * @param cursor the position of the cursor relative to the start of the line.
     * @param text the complete line where the cursor is positioned.
     * @returns an array of suggestions that can be displayed.
     */
    public getSuggestionsAt(cursor: number, text: string): AutocompleteSuggestion[] {
        const prior_tokens = this.tokenize(text.substring(0, cursor));
        const prefix = prior_tokens.pop() || '';
        const prefixSuggestion = this.suggestions.find(s => s.value === prefix);
        const mustChainPrefix = prefix.endsWith('.') ? prefix.slice(0, -1) : undefined;

        const post_tokens = this.tokenize(text.substring(cursor));
        const suffix = post_tokens[0] || '';
        const suffixSuggestion = this.suggestions.find(s => s.value === suffix);

        const functionArgumentType = this.isFunctionArgument([...prior_tokens, prefix]);

        if (mustChainPrefix) {
            // If after a dot, only suggest variables and functions that can be chained.
            const vars = this.getSuggestionsToComplete(mustChainPrefix + '.');
            const firstArg = this.suggestions.find(s => s.value === mustChainPrefix);
            if (firstArg && firstArg.returns) {
                const funcs = this.suggestions.filter(s => (s.kind === 'function') && s.comes_after?.includes(firstArg.returns!));
                return [...vars, ...funcs];
            }
            return vars;

        } else if (this.isMidToken(prefix)) {
            // If the cursor is in the middle of a token, we should only suggest based on the prefix of that token
            return this.getSuggestionsToComplete(prefix);
        } else if (functionArgumentType.type) {
            // If we are inside a function argument, we should suggest based on the expected type of that argument
            return this.suggestions.filter(s => s.returns == functionArgumentType.type && s.comes_after === undefined);

        } else {
            let subset = this.suggestions;
            // If the prefix is empty, we should only suggest things that can come at the beginning of an expression (i.e. not those that require a certain type before them)
            if (prefix === '') subset = subset.filter(s => s.comes_after === undefined);
            // If the prefix is not empty, we should only suggest things that can come after the prefix suggestion
            if (prefixSuggestion) {
                subset = subset.filter(s => this.canComeAfter(s, prefixSuggestion));
            }
            // If the suffix is not empty, we should only suggest things that can come before the suffix suggestion
            if (suffixSuggestion) {
                subset = subset.filter(s => this.canComeBefore(s, suffixSuggestion));
            }

            return subset;
        }
    }

    protected normalizeSyntax(syntax: string): string {
        // insert spaces around parentheses and operators to ensure they are treated as separate tokens
        // Take care to treat ==, !=, <=, >= as single operators and not split them into two tokens
        syntax = syntax.replace(/(==|!=|<=|>=|[()\[\]?:,%+=*/])/g, ' $1 ');

        // collapse multiple spaces into a single space
        syntax = syntax.replace(/\s+/g, ' ').trim();
        return syntax;
    }

    protected tokenize(syntax: string): string[] {
        syntax = this.normalizeSyntax(syntax);

        // split by spaces using simple regex
        const tokens = syntax.split(/\s+/);
        return tokens;
    }

    protected getSuggestionsToComplete(prefix: string): AutocompleteSuggestion[] {
        if (prefix.length) {
            const lowerPrefix = prefix.toLowerCase();
            return this.suggestions.filter(suggestion => suggestion.value.toLowerCase().startsWith(lowerPrefix));
        } else {
            return this.suggestions.filter(suggestion => suggestion.comes_after === undefined);
        }
    }

    protected isMidToken(token: string): boolean {
        // Check if the token is in the middle of being typed
        if (token.length > 0) {
            const lastChar = token[token.length - 1]!;
            if (Closers.includes(lastChar) || Separators.includes(lastChar) || Quoters.includes(lastChar) ||
                NumericOperators.includes(lastChar) || ComparisonOperators.includes(lastChar) ||
                LogicalOperators.includes(lastChar) || TernaryOperators.includes(lastChar)) {
                return false;
            }
        }
        for (const suggested of this.suggestions) {
            if (token.toLowerCase() === suggested.value.toLowerCase()) {
                return false;
            }
        }
        return true;
    }

    protected isFunctionArgument(prior_tokens: string[]): { type: ArgumentType | undefined } {
        let in_list = false;
        let in_block = false;
        let in_function: FunctionDefinition | undefined = undefined;
        let argument_index: number | undefined = undefined;

        if (prior_tokens.length === 0) return { type: undefined };

        for (let i = prior_tokens.length - 1; i >= 0; i--) {
            const token = prior_tokens[i]!;

            if (token === '(') {
                // Check if the token before the '(' is a function that expects arguments
                if (i > 0) {
                    const funcToken = prior_tokens[i - 1]!;
                    const builtin = this.functionFactory.create(funcToken, []);
                    if (builtin) {
                        const expectsArray = builtin.expectsParameterArray();
                        if (expectsArray) {
                            const argument = builtin.expectsParameters()[0];
                            const type = argument ? makeItemType(argument.type) : undefined;
                            return { type: type ? type : undefined };
                        } else {
                            const argument = builtin.expectsParameters()[argument_index || 0];
                            return { type: argument ? argument.type : undefined };
                        }
                    }
                    const custom = this.workspace.functionRegistry().getFunction(funcToken);
                    if (custom) {
                        const argument = custom.parameters[argument_index || 0];
                        const type = argument ? argument.type : undefined;
                        return { type: type ? type : undefined };
                    }
                }
                break;

            } else if (token === ',' || token === '?') {
                argument_index = (argument_index || 0) + 1;
                in_list = true;

            } else if (Openers.includes(token) || Quoters.includes(token)) {
                // If we see an opening token, we might be entering a block or a function argument list
                in_block = true;

            } else if (Closers.includes(token)) {
                // If we see a closing token, we are no longer in the argument list of the function
                in_block = false;
                if (!in_list) {
                    // If we haven't seen a comma yet, we are not in a function argument list
                    break;
                }

            } else {
                if (!in_list) {
                    // If we haven't seen a comma yet, we are not in a function argument list
                    break;
                }
            }
        }
        return { type: undefined };
    }

    protected getKindsToSuggest(cursor: number, text: string): AutocompleteKind[] {
        const tokens = this.tokenize(text.substring(0, cursor));
        const prefix = tokens.pop() || '';

        if (prefix.startsWith('"') || prefix.startsWith("'")) {
            return ['literal'];
        } else if (/^\d/.test(prefix)) {
            return ['literal'];
        } else if (prefix.includes('.')) {
            return ['variable'];
        } else if (/^[a-zA-Z_]/.test(prefix)) {
            return ['constant', 'variable'];
        }
        return [];
    }

    protected getSuggestionsByKind(kind: AutocompleteKind): AutocompleteSuggestion[] {
        // This method can be expanded to provide kind-specific suggestions
        return this.suggestions.filter(suggestion => suggestion.kind.toLowerCase().includes(kind.toLowerCase()));
    }

    protected getSuggestionsByReturnType(returnType: string): AutocompleteSuggestion[] {
        return this.suggestions.filter(suggestion => suggestion.returns === returnType);
    }

    protected canComeAfter(suggestion: AutocompleteSuggestion, preceding: AutocompleteSuggestion): boolean {
        // Both the suggestion and the after suggestion can specify what kinds of suggestions they can come after or before, 
        // and if either of them does not specify, we should assume it can come after any suggestion
        let suggestionAllows = false, precedingAllows = false;

        // If the suggestion does not specify what can come before it, it should be at the start
        if (suggestion.comes_after === undefined) suggestionAllows = true;
        // If the preceding suggestion does not specify what can come after it, it should be at the end
        if (preceding.comes_after === undefined) precedingAllows = true;

        // If the suggestion specifies 'any' as a possible preceding kind, it can come after any suggestion
        if (suggestion.comes_after?.includes('any')) suggestionAllows = true;
        // If the preceding suggestion specifies 'any' as a possible following kind, the suggestion can come after it
        if (preceding.comes_after?.includes('any')) precedingAllows = true;

        // if both allow, return true; if one of them disallows, continue checking
        if (suggestionAllows && precedingAllows) return true;

        // If the suggestion must come before an 'array', then the preceding suggestion must be of a kind that can come before an array
        if (suggestion.comes_after?.includes('array')) suggestionAllows = isArrayType(preceding.returns);
        // If the preceding suggestion must come after an 'array', then the suggestion must be of a kind that can come after an array
        if (preceding.comes_after?.includes('array')) precedingAllows = isArrayType(suggestion.returns);

        // Otherwise check specific types
        if (suggestion.comes_after) {
            suggestionAllows = suggestion.comes_after.includes(preceding.returns || '');
        }
        if (preceding.comes_after) {
            precedingAllows = preceding.comes_after.includes(suggestion.returns || '');
        }

        return suggestionAllows && precedingAllows;
    }

    protected canComeBefore(suggestion: AutocompleteSuggestion, following: AutocompleteSuggestion): boolean {
        // Both the suggestion and the before suggestion can specify what kinds of suggestions they can come after or before, 
        // and if either of them does not specify, we should assume it can come before any suggestion
        let suggestionAllows = false, followingAllows = false;

        // If the suggestion does not specify what can come after it, it should be at the end
        if (suggestion.comes_before === undefined) suggestionAllows = true;
        // If the following suggestion does not specify what can come before it, it should be at the start
        if (following.comes_before === undefined) followingAllows = true;

        // If the suggestion specifies 'any' as a possible following kind, it can come before any suggestion
        if (suggestion.comes_before?.includes('any')) suggestionAllows = true;
        // If the following suggestion specifies 'any' as a possible preceding kind, the suggestion can come before it
        if (following.comes_before?.includes('any')) followingAllows = true;

        // if both allow, return true; if one of them disallows, continue checking
        if (suggestionAllows && followingAllows) return true;

        // If the suggestion must come after an 'array', then the following suggestion must be of a kind that can come after an array
        if (suggestion.comes_before?.includes('array')) suggestionAllows = isArrayType(following.returns);
        // If the following suggestion must come before an 'array', then the suggestion must be of a kind that can come before an array
        if (following.comes_before?.includes('array')) followingAllows = isArrayType(suggestion.returns);

        // Otherwise check specific types
        if (suggestion.comes_before) {
            suggestionAllows = suggestion.comes_before.includes(following.returns || '');
        }
        if (following.comes_before) {
            followingAllows = following.comes_before.includes(suggestion.returns || '');
        }

        return suggestionAllows && followingAllows;
    }

}