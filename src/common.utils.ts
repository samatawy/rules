import type { ValidationResult } from "./interfaces";

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

