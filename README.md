# @samatawy/rules

TypeScript utilities for parsing, validating, and executing declarative business rules.

## Features

- declarative `IF ... THEN ...` style rules
- constants, types, and custom functions
- expression parsing with arithmetic, logical, comparison, and ternary operators
- rule graphs for selecting relevant rules from the current input context
- runtime workspaces for loading context, processing rules, and capturing outputs and exceptions

## Installation

```bash
npm install @samatawy/rules
```

## Runtime Support

This package is intended to work in both Node.js and browser applications.

- Node.js: supported directly.
- Browser apps: supported when bundled with tools such as Vite, Webpack, Rollup, or similar.

The published package exposes an ESM browser-safe entry and does not depend on Node builtins in its runtime source.

Optional features are exposed as subpath imports so consumers do not need to pull them into the main entry by default.

- Node runtime including core, string readers, and file-system readers: `@samatawy/rules`
- Browser core engine, syntax, rules, and parsers: `@samatawy/rules/browser`
- Autocomplete helpers: `@samatawy/rules/autocomplete`

## Quick Example

```ts
import { Workspace } from '@samatawy/rules';

const space = new Workspace();

space.addRule("IF invoice.total > 1000 THEN invoice.tax_rate = 0.10");
space.addRule("IF invoice.total <= 1000 THEN invoice.tax_rate = 0.14");
space.addRule("invoice.tax = invoice.total * invoice.tax_rate");

const context = space.loadContext({
  invoice: {
    total: 1200,
  },
});

space.process(context);

console.log(context.getOutput('invoice.tax_rate'));
console.log(context.getOutput('invoice.tax'));
```

## Documentation

The package includes Typedoc API output plus authored guides from [src/help/index.md](src/help/index.md).

Generate local documentation with:

```bash
npm run docs
```

## Development

```bash
npm run lint
npm test
npm run build
```