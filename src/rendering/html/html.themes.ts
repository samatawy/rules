import type { ElementType } from "../render.types";
import type { RenderableCSS } from "./css.style";

export class DefaultHtmlTheme {

    public static styles(): Record<ElementType, RenderableCSS> {
        return {
            'arithmetic': { color: 'blue' },
            'array': { border: '1px dotted darkgray', padding: '4px' },
            'block': { border: 'gray', 'border-radius': '24px', padding: '8px', margin: '8px' },
            'comma': { color: 'gray' },
            'comparison': { color: 'blue' },
            'dot': { color: 'darkgray' },
            'function': { color: 'darkgreen' },
            'command': { color: 'forestgreen' },
            'keyword': { color: 'purple' },
            'lambda': { color: 'orange', border: 'orange', padding: '4px' },
            'literal': { color: 'orange', border: 'orange', padding: '4px' },
            'logical': { color: 'blue' },
            'operator': { color: 'cyan' },
            'parenthesis': { color: 'gray' },
            'switch': { color: 'darkcyan' },
            'ternary': { color: 'darkmagenta' },
            'variable': { color: 'green', border: 'lightgreen', padding: '4px' },
        };
    }
}