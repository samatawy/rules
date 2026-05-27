import type { MermaidStyle } from "./mermaid.style";
import type { ElementType } from "../render.types";

export class DefaultMermaidTheme {

    public static styles(): Record<ElementType, MermaidStyle> {
        return {
            'arithmetic': { fill: 'blue' },
            'array': { fill: 'darkgray', opacity: '0.5' },
            'block': { fill: 'transparent', stroke: 'gray', rx: '24', ry: '24' },
            'comma': { color: 'gray' },
            'comparison': { fill: 'blue' },
            'dot': { color: 'darkgray' },
            'function': { color: 'darkgreen', fill: 'lightgreen', rx: '12', ry: '12' },
            'keyword': { color: 'purple', fill: 'lavender' },
            'lambda': { fill: 'darkgreen', color: 'orange', stroke: 'orange' },
            'literal': { fill: 'black', stroke: 'orange', color: 'orange' },
            'logical': { fill: 'blue' },
            'operator': { fill: 'transparent', color: 'cyan', rx: '12', ry: '12' },
            'parenthesis': { fill: 'transparent', color: 'gray' },
            'switch': { color: 'darkcyan', fill: 'lightcyan' },
            'ternary': { color: 'darkmagenta', fill: 'plum' },
            'variable': { fill: 'darkgreen', color: 'lightgreen', stroke: 'lightgreen' },
        };
    }
}