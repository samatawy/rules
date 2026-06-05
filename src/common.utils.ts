import type { ValidationResult } from "./interfaces";
import { Logger } from "./logging";
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

// const hasOwnProperty = Object.prototype.hasOwnProperty.call.bind(Object.prototype.hasOwnProperty);

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
    if (typeof key !== 'string') {
        throw new Error(`Key must be a string, but got ${typeof key}`);
    }

    if (key.includes('.')) {
        return getSplitPathValue(context, key.split('.'));
    } else {
        return context[key];
    }
}

export function getSplitPathValue(context: any, keys: string[]): any {
    if (context == null || typeof context !== 'object') {
        return undefined;
    }
    if (!Array.isArray(keys)) {
        throw new Error(`Keys must be an array of strings, but got ${typeof keys}`);
    }

    let currentContext = context;
    let level = 0;
    for (const k of keys) {
        if (currentContext && typeof currentContext === 'object' && hasOwn(currentContext, k)) {
            currentContext = currentContext[k];
            level += 1;
        } else if (currentContext && Array.isArray(currentContext)) {
            // follow all items in the array and check if the key exists in any of the items, if so we return an array of the values at that key for each item

            // preallocate for performance
            const remaining = keys.slice(level);
            const results = new Array(currentContext.length);
            let count = 0;
            for (let i = 0; i < currentContext.length; i++) {
                const value = getSplitPathValue(currentContext[i], remaining);
                if (value !== undefined) {
                    results[count++] = value;
                }
            }
            results.length = count; // trim the results array to the number of valid entries
            return results;
            // const items = currentContext.map(item => getSplitPathValue(item, remaining));

            // currentContext = items.filter(item => item !== undefined);
            // return currentContext;

        } else {
            return undefined;
        }
    }
    return currentContext;
}

// Cache hasOwnProperty for speed + prototype safety
export const hasOwn = Object.prototype.hasOwnProperty.call.bind(Object.prototype.hasOwnProperty);


// export function getPathValue2(context: any, key: string): any {
//     if (context == null || typeof context !== 'object') {
//         return undefined;
//     }
//     if (typeof key !== 'string') {
//         throw new Error(`Key must be a string, but got ${typeof key}`);
//     }

//     if (key.includes('.')) {
//         const keys = key.split('.');
//         let currentContext = context;
//         for (const k of keys) {
//             if (currentContext && typeof currentContext === 'object' && k in currentContext) {
//                 currentContext = currentContext[k];
//             } else if (currentContext && Array.isArray(currentContext)) {
//                 // follow all items in the array and check if the key exists in any of the items, if so we return an array of the values at that key for each item
//                 const items = currentContext.map(item => getPathValue(item, k));

//                 currentContext = items.filter(item => item !== undefined);

//             } else {
//                 return undefined;
//             }
//         }
//         return currentContext;
//     } else {
//         return context[key];
//     }
// }

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

// Use withLogger to wrap the equalsDeep function, so that it can log any issues encountered during deep equality checks 
// without needing to modify the original function logic. 
export function equalsDeep(A: any, B: any): boolean {
    if (A === B) return true;
    try {
        const jsonA = JSON.stringify(A);
        const jsonB = JSON.stringify(B);
        return jsonA == jsonB;
    } catch (e) {
        Logger.warn(`Could not compare facts: ${A} and ${B}`);
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

export function compareDeep(value: any, expected: any): boolean {
    if (typeof value !== typeof expected) {
        return false;
    }
    if (typeof value === 'object' && value !== null && expected !== null) {
        for (const key in expected) {
            if (!(key in value)) {
                return false;
            }
            const result = compareDeep(value[key], expected[key]);
            if (result !== true) {
                return false;
            }
        }
        return true;

    } else if (Array.isArray(value) && Array.isArray(expected)) {
        if (value.length !== expected.length) {
            return false;
        }
        for (let i = 0; i < value.length; i++) {
            const result = compareDeep(value[i], expected[i]);
            if (result !== true) {
                return false;
            }
        }
        return true;

    } else {
        return value === expected;
    }
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
            merged.errors = merged.errors || [];
            for (const error of result.errors) {
                merged.errors.push(error);
            }
            // merged.errors = merged.errors ? [...merged.errors, ...result.errors] : [...result.errors];
        }
    }
    return merged;
}

export function stringifyTypeJson(input: any): string {
    return JSON5.stringify(input);
}

export function parseTypeJson(input: string): any {
    input = quoteUnquotedTypes(input);
    return JSON5.parse(input);
}

export function quoteUnquotedTypes(input: string): string {
    // Matches identifiers (optionally followed by []) in value positions
    // After `:`, `,`, or `[` and before `,`, `}`, or `]`
    return input.replace(
        /([:,\[])\s*([a-zA-Z_$][\w\.$]*(?:\[\])?)(?=\s*[,}\]])/g,
        '$1 "$2"'
    );
}

export function toDateSafe(value: unknown): Date | undefined {
    if (!value) return undefined;

    // 1. Already a native Date (handles cross-realm via toString check)
    if (value instanceof Date || Object.prototype.toString.call(value) === '[object Date]') {
        return Number.isNaN((value as Date).getTime()) ? undefined : (value as Date);
    }

    // 2. dayjs / moment-like
    if (typeof (value as any).toDate === 'function') {
        return (value as any).toDate();
    }

    // 3. luxon-like
    if (typeof (value as any).toJSDate === 'function') {
        return (value as any).toJSDate();
    }

    // 4. js-joda / TemporalAccessor-like
    if (typeof (value as any).toInstant === 'function') {
        return new Date((value as any).toInstant().toEpochMilli());
    }

    // 5. Temporal-like with toTemporalInstant
    if (typeof (value as any).toTemporalInstant === 'function') {
        const instant = (value as any).toTemporalInstant(); // JS-Joda Instant object
        const jsDate = new Date(instant.toEpochMilli());    // Native JavaScript Date
        return Number.isNaN(jsDate.getTime()) ? undefined : jsDate;
    }

    // 6. Fallback: try native constructor
    const fallback = new Date(value as any);
    return Number.isNaN(fallback.getTime()) ? undefined : fallback;
}

export function garbageCollect() {
    if (globalThis.gc) try {
        globalThis.gc();
    } catch (e) {
        // Ignore errors when calling gc, as it may not be exposed or available in all environments
    }
}
