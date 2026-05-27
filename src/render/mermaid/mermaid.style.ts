export type MermaidStyleProperty = 'color'
    | 'rx'
    | 'ry'
    | 'fill'
    | 'stroke'
    | 'stroke-width'
    | 'opacity'
    | 'font-size'
    | 'font-weight'
    | 'font-style'
    | 'font-family';

export type MermaidStyle = Partial<Record<MermaidStyleProperty, string>>;