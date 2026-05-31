/**
 * Types of elements that can be rendered and styled.
 */
export type ElementType = 'operator' | 'parenthesis' | 'dot' | 'comma' | 'keyword'
    | 'literal' | 'variable' | 'array'
    | 'function' | 'command'
    | 'arithmetic' | 'comparison' | 'logical'
    | 'ternary' | 'switch' | 'lambda'
    | 'keyword' | 'block';

export type { ExpressionType, Renderable } from '../renderable';