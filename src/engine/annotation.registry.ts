import JSON5 from "json5";
import { ParserError } from "../rules/exception";
import type { AnnotationDefinition, AnnotationType } from "../types";

export class AnnotationRegistry {

    protected definitions: Map<string, AnnotationDefinition>;

    constructor() {
        this.definitions = new Map<string, AnnotationDefinition>();
    }

    public register(name: string, type: AnnotationType): void {
        const normalized = name.trim();
        this.definitions.set(normalized, { name: normalized, type });
    }

    public has(name: string): boolean {
        return this.definitions.has(name);
    }

    public get(name: string): AnnotationDefinition | undefined {
        const definition = this.definitions.get(name);
        return definition ? { ...definition } : undefined;
    }

    public list(): AnnotationDefinition[] {
        return Array.from(this.definitions.values()).map(definition => ({ ...definition }));
    }

    public clear(): void {
        this.definitions.clear();
    }

    public parse(name: string, rawValue: string): unknown {
        const definition = this.definitions.get(name);
        if (!definition) {
            throw new ParserError(`Unknown annotation: @${name}()`);
        }
        return this.coerceValue(rawValue, definition.type, name);
    }

    protected coerceValue(rawValue: string, type: AnnotationType, name: string): unknown {
        if (type === 'any') {
            return this.tryParseValue(rawValue);
        }
        if (type === 'string') {
            return this.readStringValue(rawValue, name);
        }
        if (type === 'email') {
            const value = this.readStringValue(rawValue, name);
            if (!this.isEmailValue(value)) {
                throw new ParserError(`Annotation value for @${name} must be a valid email address`);
            }
            return value;
        }
        if (type === 'number') {
            const value = this.readParsedValue(rawValue, name);
            if (typeof value !== 'number' || Number.isNaN(value)) {
                throw new ParserError(`Annotation value for @${name} must be a number`);
            }
            return value;
        }
        if (type === 'boolean') {
            const value = this.readParsedValue(rawValue, name);
            if (typeof value !== 'boolean') {
                throw new ParserError(`Annotation value for @${name} must be a boolean`);
            }
            return value;
        }
        if (type === 'date') {
            return this.readDateValue(rawValue, name);
        }
        if (type === 'object') {
            const value = this.readParsedValue(rawValue, name);
            if (!value || typeof value !== 'object' || Array.isArray(value)) {
                throw new ParserError(`Annotation value for @${name} must be an object`);
            }
            return value;
        }
        if (type === 'array') {
            const value = this.readParsedValue(rawValue, name);
            if (!Array.isArray(value)) {
                throw new ParserError(`Annotation value for @${name} must be an array`);
            }
            return value;
        }
        if (type === 'string[]') {
            return this.readArrayValue(rawValue, name, item => {
                if (typeof item !== 'string') {
                    throw new ParserError(`Annotation value for @${name} must be an array of strings`);
                }
                return item;
            });
        }
        if (type === 'number[]') {
            return this.readArrayValue(rawValue, name, item => {
                if (typeof item !== 'number' || Number.isNaN(item)) {
                    throw new ParserError(`Annotation value for @${name} must be an array of numbers`);
                }
                return item;
            });
        }
        if (type === 'boolean[]') {
            return this.readArrayValue(rawValue, name, item => {
                if (typeof item !== 'boolean') {
                    throw new ParserError(`Annotation value for @${name} must be an array of booleans`);
                }
                return item;
            });
        }
        if (type === 'date[]') {
            return this.readArrayValue(rawValue, name, item => this.coerceDateValue(item, name));
        }
        if (type === 'email[]') {
            return this.readArrayValue(rawValue, name, item => {
                if (typeof item !== 'string' || !this.isEmailValue(item)) {
                    throw new ParserError(`Annotation value for @${name} must be an array of email addresses`);
                }
                return item;
            });
        }

        throw new ParserError(`Unsupported metadata type for @${name}: ${type}`);
    }

    protected readParsedValue(rawValue: string, name: string): any {
        try {
            return JSON5.parse(rawValue);
        } catch (e) {
            throw new ParserError(`Failed to parse annotation @${name}`, { cause: e });
        }
    }

    protected tryParseValue(rawValue: string): unknown {
        try {
            return JSON5.parse(rawValue);
        } catch {
            return rawValue.trim();
        }
    }

    protected readStringValue(rawValue: string, name: string): string {
        const trimmed = rawValue.trim();
        if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
            const parsed = JSON5.parse(trimmed);
            if (typeof parsed !== 'string') {
                throw new ParserError(`Annotation value for @${name} must resolve to a string`);
            }
            return parsed;
        }
        return trimmed;
    }

    protected readDateValue(rawValue: string, name: string): Date {
        return this.coerceDateValue(this.tryParseValue(rawValue), name);
    }

    protected coerceDateValue(value: unknown, name: string): Date {
        if (value instanceof Date && !Number.isNaN(value.getTime())) {
            return value;
        }
        if (typeof value !== 'string' && typeof value !== 'number') {
            throw new ParserError(`Annotation value for @${name} must be a valid date`);
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            throw new ParserError(`Annotation value for @${name} must be a valid date`);
        }
        return date;
    }

    protected readArrayValue(rawValue: string, name: string, coerce: (value: unknown) => unknown): unknown[] {
        const value = this.readParsedValue(rawValue, name);
        if (!Array.isArray(value)) {
            throw new ParserError(`Annotation value for @${name} must be an array`);
        }
        return value.map(item => coerce(item));
    }

    protected isEmailValue(value: string): boolean {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }
}
