import { RulesEngine } from "../engine/rules.engine";
import { ParserError } from "../rules/exception";
import { containsAllValues } from "../common.utils";

export interface LeadingAnnotation {
    name: string;
    value: string;
    rest: string;
}

export function readLeadingAnnotation(syntax: string): LeadingAnnotation | null {
    const trimmed = syntax.trimStart();
    if (!trimmed.startsWith('@')) {
        return null;
    }

    let index = 1;
    while (index < trimmed.length && isAnnotationNameChar(trimmed.charCodeAt(index))) {
        index += 1;
    }

    const name = trimmed.slice(1, index);
    if (name.length === 0) {
        throw new ParserError(`Invalid annotation syntax: ${syntax}`);
    }
    if (trimmed[index] !== '(') {
        throw new ParserError(`Invalid annotation syntax for @${name}: missing opening parenthesis`);
    }

    const start = index + 1;
    let depth = 1;
    let quote: string | undefined;
    let escaped = false;

    for (index = start; index < trimmed.length; index += 1) {
        const ch = trimmed[index]!;

        if (escaped) {
            escaped = false;
            continue;
        }

        if (quote) {
            if (ch === '\\') {
                escaped = true;
            } else if (ch === quote) {
                quote = undefined;
            }
            continue;
        }

        if (ch === '"' || ch === "'" || ch === '`') {
            quote = ch;
            continue;
        }

        if (ch === '(') {
            depth += 1;
            continue;
        }

        if (ch === ')') {
            depth -= 1;
            if (depth === 0) {
                return {
                    name,
                    value: trimmed.slice(start, index).trim(),
                    rest: trimmed.slice(index + 1).trimStart()
                };
            }
        }
    }

    throw new ParserError(`Unclosed annotation: @${name}(`);
}

export function parseAnnotationValue(name: string, rawValue: string): unknown {
    return RulesEngine.registry().annotationRegistry().parse(name, rawValue);
}

function isAnnotationNameChar(code: number): boolean {
    return code === 95
        || (code >= 48 && code <= 57)
        || (code >= 65 && code <= 90)
        || (code >= 97 && code <= 122);
}

export function isAnnotated(target: unknown, annotation: string, value?: unknown): boolean {
    if (target != null && typeof target === 'object' && 'annotations' in target) {
        const annotations = (target as any).annotations;
        if (annotations && typeof annotations === 'object') {
            if (annotation in annotations) {
                return containsAllValues(annotations[annotation], value);
            }
        }
    }
    return false;
}

