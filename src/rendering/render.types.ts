/**
 * Types of elements that can be rendered and styled.
 */
export type ElementType = 'operator' | 'parenthesis' | 'dot' | 'comma' | 'keyword'
    | 'literal' | 'variable' | 'array'
    | 'function'
    | 'arithmetic' | 'comparison' | 'logical'
    | 'ternary' | 'switch' | 'lambda'
    | 'block';

/**
 * Types of expressions and rules that can be rendered. 
 * This includes all the different expression types as well as rule types and function definitions.
 */
export type ExpressionType = 'LiteralExpression' | 'VariableExpression' | 'ArrayExpression'
    | 'FunctionExpression'
    | 'ArithmeticExpression' | 'ComparisonExpression' | 'LogicalExpression'
    | 'TernaryExpression' | 'SwitchExpression' | 'LambdaExpression'

    | 'IfThenRule' | 'IfThenElseRule' | 'IfThrowRule' | 'OutputRule'
    | 'CompositeAction' | 'OutputAction' | 'ExceptionThrower'
    | 'CommandExecutable';

// export type SyntaxElement = 'Expression' | 'Rule' | 'Function' | 'Type';

/**
 * A renderable element represents any element that can be rendered by the rendering system.
 * Each component provides whatever properties are necessary for rendering, based on its type
 * (which is the only required property).
 */
export interface Renderable {
    type: ExpressionType;
    name?: string;
    value?: any;
    output?: string;
    operator?: string;
    left?: Renderable;
    right?: Renderable;
    elements?: Renderable[];
    arguments?: Renderable[];

    expression?: Renderable;
    condition?: Renderable;
    trueExpression?: Renderable;
    falseExpression?: Renderable;
    cases?: {
        value?: Renderable;
        expression?: Renderable
    }[];
    defaultCase?: Renderable;
}