# @samatawy/rules

TypeScript utilities for parsing, validating, and executing declarative business rules.

This package extracts the rule engine from the broader `@samatawy/checks` workspace into a standalone npm package so it can evolve and be published independently.

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

## Quick Example

```ts
import { WorkSpace } from '@samatawy/rules';

const space = new WorkSpace();

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