import { isArrayType, isAtomicType, isTypedObjectType } from "./parser/type.parser";
import { ArrayExpression } from "./syntax/array.expression";
import { BooleanExpression, DateExpression, Expression, NumericExpression, StringExpression } from "./syntax/expression";
import { LambdaExpression } from "./syntax/lambda.expression";
import { LiteralExpression } from "./syntax/literal.expression";
import { TernaryExpression } from "./syntax/ternary.expression";
import { VariableExpression } from "./syntax/variable.expression";
import type { ArrayType, AtomicType, ComplexType, ObjectArrayType, ObjectType, PropertyType, RootType } from "./types";
import type { TypeChecker } from "./interfaces";
import { TypeCheckError } from "./rules/exception";
import { WorkLogger } from "./logging/work.logger";
import { toDateSafe } from "./common.utils";

function hasReturnsType(expression: Expression): expression is Expression & {
    returnsType(checker?: TypeChecker): AtomicType | ArrayType | ObjectType | ObjectArrayType;
} {
    return typeof (expression as { returnsType?: unknown }).returnsType === 'function';
}

/**
 * Determine the return type of an expression.
 * 
 * @param expression the expression to evaluate.
 * @param checker an optional type checker to use for variable expressions.
 * @returns the return type of the expression, or undefined if it cannot be determined.
 */
export function getReturnType(expression: Expression, checker?: TypeChecker): AtomicType | ArrayType | ObjectType | ObjectArrayType | undefined {
    if (expression instanceof LiteralExpression) {
        const value = expression.evaluate();
        const type = typeof value;
        if (type === 'string' || type === 'number' || type === 'boolean') {
            return type as AtomicType;
        } else if (value instanceof Date) {
            return 'date';
        }
    }
    else if (expression instanceof VariableExpression) {
        if (checker) {
            return checker.getType(expression.getVariableName()) as AtomicType | ArrayType | ObjectType | ObjectArrayType | undefined;
        } else return undefined;
    } else if (expression instanceof ArrayExpression) {
        return getArrayType(expression, checker);

    } else if (expression instanceof LambdaExpression) {
        return (expression as LambdaExpression).returnsType(checker) as AtomicType | ObjectType | undefined;
    } else if (expression instanceof TernaryExpression) {
        return (expression as TernaryExpression).returnsType(checker) as AtomicType | ObjectType | undefined;

    } else if (hasReturnsType(expression)) {
        return expression.returnsType(checker);

    } else if (expression instanceof StringExpression) {
        return 'string';
    } else if (expression instanceof NumericExpression) {
        return 'number';
    } else if (expression instanceof BooleanExpression) {
        return 'boolean';
    } else if (expression instanceof DateExpression) {
        return 'date';
    }

    // const logger = checker ? checker.logger() : WorkLogger;
    WorkLogger.warn(`Unable to determine return type for expression: ${expression}`);
    // For other expression types, we would need to implement logic to determine the return type based on the expression structure and the types of its components.
    return undefined;
}

/**
 * Get the type of an array of expressions, attempting to determine the type of the elements and returning an appropriate array type.
 * 
 * @param array the array expression or array of expressions to evaluate.
 * @param checker an optional type checker to use for variable expressions.
 * @returns the array type, or 'array' if the element types cannot be determined.
 */
export function getArrayType(array: ArrayExpression | Expression[], checker?: TypeChecker): ArrayType | ObjectArrayType {
    if (array instanceof ArrayExpression) {
        array = array.getElements();
    }
    // For arrays, we can attempt to determine the type of the elements and return an array type accordingly
    const elementTypes = new Set<AtomicType | ArrayType | ObjectType | ObjectArrayType>();
    for (const element of array) {
        const elementType = getReturnType(element, checker);
        if (elementType) {
            elementTypes.add(elementType);
        }
    }
    if (elementTypes.size === 1) {
        const [elementType] = elementTypes;
        if (elementType === 'string[]' || elementType === 'number[]' || elementType === 'boolean[]' || elementType === 'date[]') {
            return elementType;
        } else if (elementType === 'string' || elementType === 'number' || elementType === 'boolean' || elementType === 'date') {
            return elementType + '[]' as ArrayType;
        } else if (isTypedObjectType(elementType)) {
            return { type: 'array', items: elementType } as ObjectArrayType;
        }
    }
    return 'array';
}

/**
 * Check if a given key exists in a type definition, supporting nested keys using dot notation (e.g., "person.name.first").
 * TODO: Support arrays in the path (e.g., "person.children.name").
 * 
 * @param type the type definition to check.
 * @param key the key to check for, which can be a simple key or a nested key using dot notation.
 * @returns true if the key exists in the type definition, false otherwise.
 */
export function hasDefinedType(type: RootType | PropertyType | any, key?: string): boolean {
    // return type of the root if no key is provided
    if (!key) {
        return type.type || {} as ObjectType;
    }

    // for simple keys, check if the type defines the required key in its properties
    if (!key.includes('.')) {
        if (type.properties) {
            const property = type.properties[key];
            return property !== undefined;
        } else if (type.items) {
            const item = type.items[key];
            return item !== undefined;
        } else {
            return false;
        }
    }

    // otherwise handle nested keys by splitting the key and traversing the type structure accordingly
    const path = key.split('.');
    const firstSegment = path[0]!;
    const remainingPath = path.slice(1).join('.');

    if (type.properties) {
        const propertyType = type.properties[firstSegment];
        if (propertyType) {
            return hasDefinedType(propertyType, remainingPath);
        }
    }
    if (type.items) {
        const itemType = type.items[firstSegment];
        if (itemType) {
            return hasDefinedType(itemType, remainingPath);
        }
    }
    WorkLogger.warn(`Key segment ${firstSegment} not found in type properties or items:`, type);
    return false;
}

/**
 * Get the defined type for a given key in a type definition, supporting nested keys using dot notation (e.g., "person.name.first").
 * TODO: Support arrays in the path (e.g., "person.children.name").
 * 
 * @param type the type definition to check.
 * @param key the key to get the type for, which can be a simple key or a nested key using dot notation.
 * @param array_path a flag indicating if the current path is within an array.
 * @returns the type associated with the key, or undefined if the key is not found.
 */
export function getDefinedType(type: RootType | PropertyType | any, key?: string, array_path?: boolean): AtomicType | ArrayType | ObjectArrayType | ComplexType | undefined {
    if (!key) {
        return type.type || {} as ObjectType;
    }

    if (!key.includes('.')) {
        if (type.properties) {
            const property = type.properties[key];
            if (property) {
                if (array_path) {
                    const explicitType = property.type || property as AtomicType | ArrayType;
                    WorkLogger.debug(`Handling array in path for property ${key}: original type ${explicitType}, array_path=${array_path}`);
                    if (explicitType === 'array' && (property as ObjectArrayType).items) {
                        return property as ObjectArrayType;
                    } else if (isArrayType(explicitType)) {
                        return explicitType;
                    } else if (isAtomicType(explicitType)) {
                        WorkLogger.debug(`Converting atomic type to array type for property ${key}: original type ${explicitType}, ${explicitType + '[]' as ArrayType}`);
                        return explicitType + '[]' as ArrayType;
                    } else {
                        return 'array';
                    }
                } else {
                    if (property.type === 'array' && (property as ObjectArrayType).items) {
                        return property as ObjectArrayType;
                    } else {
                        return property.type || property as AtomicType | ArrayType;
                    }
                }
            }
        }
        if (type.items) {       // This is an array of objects, so we need to check the item type
            array_path = true;
            const itemType = type.items[key];
            if (itemType) {
                const explicitType = itemType.type || itemType as AtomicType | ArrayType | ObjectArrayType;
                WorkLogger.debug(`Handling array in last step for item ${key}: original type ${explicitType}, array_path=${array_path}`);
                if (explicitType === 'array' && (itemType as ObjectArrayType).items) {
                    return itemType as ObjectArrayType;
                } else if (isArrayType(explicitType)) {
                    return explicitType;
                } else if (isAtomicType(explicitType)) {
                    WorkLogger.debug(`Converting atomic type to array type for property ${key}: original type ${explicitType}, ${explicitType + '[]' as ArrayType}`);
                    return explicitType + '[]' as ArrayType;
                } else {
                    return 'array';
                }
            }
        }
        WorkLogger.warn(`Property ${key} not found in type properties: or items`);
        return undefined;
    }

    const path = key.split('.');
    const firstSegment = path[0]!;
    const remainingPath = path.slice(1).join('.');

    if (type.properties) {
        const propertyType = type.properties[firstSegment];
        if (propertyType) {
            WorkLogger.debug(`Found property ${firstSegment} in type properties: ${propertyType}, remainingPath=${remainingPath}, array_path=${array_path}`);
            return getDefinedType(propertyType, remainingPath, array_path);
        }
    }
    if (type.items) {
        const itemType = type.items[firstSegment];
        if (itemType) {
            array_path = true;
            WorkLogger.debug(`Setting array path for segment ${firstSegment}: itemType=${itemType}, remainingPath=${remainingPath}, array_path=${array_path}`);
            return getDefinedType(itemType, remainingPath, array_path);
        }
    }
    return undefined;
}

export function makeArrayType(type: AtomicType | ObjectType | unknown): ArrayType | ObjectArrayType {
    if (isAtomicType(type)) {
        return type + '[]' as ArrayType;
    } else if ((type as ObjectType).items) {
        return { type: 'array', items: type } as ObjectArrayType;
    } else {
        return 'array';
    }
}

export function makeItemType(type: ArrayType | ObjectArrayType | unknown): AtomicType | ObjectType {
    if ((type as ObjectArrayType).items) {
        return (type as ObjectArrayType).items!;
    } else if (isArrayType(type)) {
        const itemType = type.replace('[]', '') as AtomicType;
        if (isAtomicType(itemType)) {
            return itemType;
        }
    }
    throw new TypeCheckError(`Unable to determine item type for array type: ${type}`);
}

export function makeAtomic(value: unknown, expectedType: AtomicType): any {
    switch (expectedType) {
        case 'string': return makeString(value);
        case 'number': return makeNumber(value);
        case 'boolean': return makeBoolean(value);
        case 'date': return makeDate(value);
    }
}

export function makeString(value: unknown): string | undefined {
    switch (typeof value) {
        case 'undefined': return undefined;
        case 'number': return `${value}`;
        case 'bigint': return value.toString();
        case 'string': return value;
        default: throw new TypeCheckError(`Cannot accept [${value}] as a string.`);
    }
}

export function makeNumber(value: unknown): number | bigint | undefined {
    switch (typeof value) {
        case 'undefined': return undefined;
        case 'number': return value;
        case 'bigint': return value;
        case 'string': return isNaN(+value) ? undefined : +value;
        default: throw new TypeCheckError(`Cannot accept [${value}] as a number.`);
    }
}

export function makeBoolean(value: unknown): boolean | undefined {
    switch (typeof value) {
        case 'undefined': return undefined;
        case 'boolean': return value;
        case 'number': return value != 0;
        default: throw new TypeCheckError(`Cannot accept [${value}] as a boolean.`);
    }
}

export function makeDate(value: unknown): Date | undefined {
    switch (typeof value) {
        case 'undefined': return undefined;
        case 'number': return new Date(value);
        case 'string': return new Date(value);
        case 'object': return toDateSafe(value);
        // return (value instanceof Date) ? new Date(value) : toDateSafe(value);

        default: throw new TypeCheckError(`Cannot accept [${value}] as a date.`);
    }
}

export function getLiteralType(value: any): AtomicType | ArrayType {
    const type = typeof value;
    if (type === 'string' || type === 'number' || type === 'boolean') {
        return type as AtomicType;
    } else if (value instanceof Date) {
        return 'date';
    } else if (Array.isArray(value)) {
        if (value.length === 0) {
            return 'array';
        }
        const itemType = getLiteralType(value[0]);
        if (isAtomicType(itemType)) {
            return itemType + '[]' as ArrayType;
        } else {
            return 'array';
        }
    }
    throw new TypeCheckError(`Unsupported literal type: ${type}`);
}

export function assignableTo(type: unknown, expectedType: unknown): boolean {

    if (!type || !expectedType) {
        throw new TypeCheckError("Invalid type check requested");
    }
    if (typeof type !== 'object') return type === expectedType;

    for (const [key, expected] of Object.entries(expectedType)) {
        const found = (type as any)[key];
        if (found === undefined) {
            return false;
        }
        if (!assignableTo(found, expected)) return false;
    }
    return true;
}
