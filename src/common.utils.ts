import type { ValidationResult } from "./interfaces";
import { WorkLogger } from "./log/work.logger";
import { ExecutionError } from "./rules/exception";
import JSON5 from "json5";

/**
 * Check if a given key exists in the context, supporting nested keys using dot notation (e.g., "person.name.first").
 * TODO: Support arrays in the path (e.g., "person.children.name").
 * 
 * @param context the context object to check for the key.
 * @param key the key to check for existence, which can be a simple key or a nested key using dot notation.
 * @returns true if the key exists in the context, false otherwise.
 */
export function pathExists(context: any, key: string): boolean {
    if (context == null || typeof context !== 'object') {
        return false;
    }

    if (key.includes('.')) {
        const keys = key.split('.');
        let currentContext = context;
        for (const k of keys) {
            if (currentContext && typeof currentContext === 'object' && k in currentContext) {
                currentContext = currentContext[k];
            } else {
                return false;
            }
        }
        return true;
    } else {
        return key in context;
    }
}

/**
 * Read a value from the context using a key that can be a nested path with dot notation.
 * TODO: Support arrays in the path (e.g., "person.children.name").
 * 
 * @param context the context object to read the value from.
 * @param key the key to read the value for, which can be a simple key or a nested key using dot notation.
 * @returns the value associated with the key, or undefined if the key is not found.
 */
export function getPathValue(context: any, key: string): any {
    if (context == null || typeof context !== 'object') {
        return undefined;
    }

    if (key.includes('.')) {
        const keys = key.split('.');
        let currentContext = context;
        for (const k of keys) {
            if (currentContext && typeof currentContext === 'object' && k in currentContext) {
                currentContext = currentContext[k];
            } else if (currentContext && Array.isArray(currentContext)) {
                // follow all items in the array and check if the key exists in any of the items, if so we return an array of the values at that key for each item
                const items = currentContext.map(item => getPathValue(item, k));

                currentContext = items.filter(item => item !== undefined);

            } else {
                return undefined;
            }
        }
        return currentContext;
    } else {
        return context[key];
    }
}

/**
 * Write a value to a context using a key that can be a nested path with dot notation.
 * TODO: Support arrays in the path (e.g., "person.children.name").
 * 
 * @param context the context object to write the value from.
 * @param key the key to write the value at, which can be a simple key or a nested key using dot notation.
 * @returns the context after setting the value.
 */
export function setPathValue(context: any, key: string, value: any): any {
    if (key.includes('.')) {
        // if the key is a nested path, we need to traverse the output object to set the value at the correct path
        const parts = key.split('.');
        let current = context;
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i]!;
            const target = current[part];
            if (Array.isArray(target)) {
                // cannot handle arrays yet, throw error if we encounter an array in the path
                throw new ExecutionError(`Cannot set output for key: ${key} because ${part} is an array`);
            }
            else if (target != null && typeof target === 'object') {
                current = target;
            } else if (target != null && typeof current[part] !== 'object') {
                // cannot set output for key if the path already exists but is not an object
                throw new ExecutionError(`Cannot set output for key: ${key} because ${part} is not an object`);
            } else if (target == null) {
                // if the path does not exist, create an empty object at that path
                current[part] = {};
                current = current[part];
            } else {
                current = target;
            }
        }
        current[parts[parts.length - 1]!] = value;
    } else {
        // if the key is a simple key, we can set the value directly on the output object
        context[key] = value;
    }
    return context;
}

export function equalsDeep(A: any, B: any): boolean {
    if (A === B) return true;
    try {
        const jsonA = JSON.stringify(A);
        const jsonB = JSON.stringify(B);
        return jsonA == jsonB;
    } catch (e) {
        WorkLogger.warn(`Could not compare facts: ${A} and ${B}`);
        return false;
    }
}

export function cloneDeep(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => cloneDeep(item));
    }

    const clonedObj: any = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            clonedObj[key] = cloneDeep(obj[key]);
        }
    }
    return clonedObj;
}

/**
 * Merge multiple validation results into a single result, combining the validity and aggregating any error messages.
 * 
 * @param results the validation results to merge.
 * @returns a single validation result representing the merged outcome.
 */
export function mergeValidationResults(...results: ValidationResult[]): ValidationResult {
    const merged: ValidationResult = { valid: true };
    for (const result of results) {
        merged.valid = merged.valid && result.valid;
        if (result.errors) {
            merged.errors = merged.errors ? [...merged.errors, ...result.errors] : [...result.errors];
        }
    }
    return merged;
}

export function parseTypeJson(input: string): any {
    input = quoteUnquotedTypes(input);
    return JSON5.parse(input);
}

export function quoteUnquotedTypes(input: string): string {
    // Matches identifiers (optionally followed by []) in value positions
    // After `:`, `,`, or `[` and before `,`, `}`, or `]`
    return input.replace(
        /([:,\[])\s*([a-zA-Z_$][\w$]*(?:\[\])?)(?=\s*[,}\]])/g,
        '$1 "$2"'
    );
}
