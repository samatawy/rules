---
title: HTML Renderer
---

# HTML Renderer

`HtmlRenderer` turns a rule or expression into HTML markup with semantic class names.

Import it from the optional rendering entry point:

```ts
import { DefaultHtmlTheme, HtmlRenderer } from '@samatawy/rules/render';
```

## Basic usage

```ts
import { RuleParser, Workspace } from '@samatawy/rules';
import { DefaultHtmlTheme, HtmlRenderer } from '@samatawy/rules/render';

const space = new Workspace();
const parser = new RuleParser({ workspace: space });
const rule = parser.parse('IF total > 100 THEN discount = 0.1');

const renderer = new HtmlRenderer('inline');
renderer.setStyles(DefaultHtmlTheme.styles());

const html = renderer.render(rule);
```

The renderer accepts either:

- a parsed rule, which produces blocks for `IF`, `THEN`, `ELSE`, `SET`, and command execution
- an expression, which produces only the expression markup

## Styling modes

`HtmlRenderer` supports two output modes.

### `class`

`class` is the default.

```ts
const renderer = new HtmlRenderer();
const html = renderer.render(rule);
```

In this mode, the renderer emits class names such as `keyword`, `variable`, `operator`, `function`, `literal`, and `block`, but it does not inject inline styles.

This is the right mode when:

- you already control the page stylesheet
- you want to theme output with CSS variables or design tokens
- you want to keep markup and styling separate

Example stylesheet:

```css
.keyword { color: rebeccapurple; font-weight: 600; }
.variable { color: darkgreen; }
.literal { color: darkorange; }
.operator { color: dodgerblue; }
.block {
  border: 1px solid #c7c7c7;
  border-radius: 1.5rem;
  padding: 0.5rem 0.75rem;
  margin: 0.5rem 0;
}
```

### `inline`

```ts
const renderer = new HtmlRenderer('inline');
renderer.setStyles(DefaultHtmlTheme.styles());
```

In this mode, the renderer still emits class names, but it also writes `style="..."` attributes for any element types you configure with `setStyle()` or `setStyles()`.

This is useful when:

- the output will be embedded into emails or CMS fields
- you want portable standalone markup
- you do not want to maintain a separate stylesheet

`DefaultHtmlTheme.styles()` returns a ready-made inline theme for the built-in element types.

## Theme and styling

The HTML renderer styles logical element categories instead of specific AST classes. The available element types are:

- `operator`
- `parenthesis`
- `dot`
- `comma`
- `keyword`
- `literal`
- `variable`
- `array`
- `function`
- `command`
- `arithmetic`
- `comparison`
- `logical`
- `ternary`
- `switch`
- `lambda`
- `block`

Example customization:

```ts
const renderer = new HtmlRenderer('inline');
renderer.setStyles(DefaultHtmlTheme.styles());
renderer.setStyle('variable', {
  color: 'crimson',
  'font-weight': '700',
  'border-radius': '4px',
});
renderer.setStyle('operator', { color: 'royalblue' });
```

Supported CSS properties are intentionally limited to text and box styling that can be safely applied to inline output. They include:

- `color`, `background`, `background-color`
- `border`, `border-width`, `border-style`, `border-color`, `border-radius`
- `border-top-left-radius`, `border-top-right-radius`, `border-bottom-left-radius`, `border-bottom-right-radius`
- `margin`, `margin-top`, `margin-right`, `margin-bottom`, `margin-left`
- `padding`, `padding-top`, `padding-right`, `padding-bottom`, `padding-left`
- `font-size`, `font-weight`, `font-style`, `font-family`
- `text-align`, `text-decoration`, `text-transform`, `text-shadow`
- `line-height`, `letter-spacing`, `word-spacing`, `white-space`

## Practical notes

- `setStyle()` and `setStyles()` only affect generated markup when the renderer is created with `'inline'`.
- In `'class'` mode, styling is entirely controlled by your own CSS.
- Variable names are split on `.` and rendered segment-by-segment, which lets you style dotted paths cleanly.
- Arrays, lambdas, commands, and switch expressions render as structured HTML spans and blocks rather than plain text.