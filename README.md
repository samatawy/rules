# @samatawy/rules

TypeScript utilities for parsing, validating, and executing declarative business rules.

This package provides an embedded rule engine for applications that need business logic to stay explicit, testable, and auditable instead of being scattered across service code.

## What It Does

It lets you define rules, constants, functions, and types in a compact DSL, load them into a workspace, and run them against application data.

The engine is designed for cases where the decision logic changes more often than the application model, or where you need better visibility into why a particular outcome was produced.

## Features

### Highlights

- declarative `IF ... THEN ...`, `ELSE`, `THROW`, and `SET` style rules
- typed workspaces with input validation, type coercion, and rule checking
- custom functions, constants, and commands for extending the DSL safely
- built-in audit trails showing invoked rules, effects, and exceptions
- forward-chaining execution so derived values can trigger follow-up rules
- backward-chaining on demand for goal-oriented tasks

### Advanced

- expression parsing with arithmetic, comparison, logical, and ternary operators
- array and lambda-oriented expression support for more complex matching logic
- dependency graphs and Rete graphs for highly scalable rule selection and evaluation
- rule salience and conflict handling for overlapping or competing rules
- detection/prevention of invalid syntax, invalid data types, cyclic dependencies, etc.
- flexible declaration loading through parsers and file readers, including markdown-backed rule documentation

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
- Rendering and visualization helpers: `@samatawy/rules/render`

## Quick Example

```ts
import { Workspace } from '@samatawy/rules';

const space = new Workspace();

space.addFunction('tiered_rate(total: number) = (total > 1000)? 0.10 : 0.14');

space.addRule('SET invoice.tax_rate = tiered_rate(invoice.total)');
space.addRule('SET invoice.tax = invoice.total * invoice.tax_rate');
space.addRule('IF invoice.tax > 100 THEN invoice.review = true ELSE invoice.review = false');

const context = space.loadContext({
  invoice: {
    total: 1200,
  },
});

space.process(context);

console.log(context.getOutput('invoice.tax_rate'));
console.log(context.getOutput('invoice.tax'));
console.log(context.getOutput('invoice.review'));
```


## Version History

- Since version `0.3.5`
  - performance optimizations.
- Since version `0.3.0`:
  - rendering and visualization of rules and expressions to HTML and Mermaid are available.
  - experimental dynamic compilation added for faster evaluation of large data loads.
- Since version `0.2.0`:
  - backward-chaining goal-oriented tasks are supported.
  - cyclic dependency detection is available.
  - coded function providers are supported as a new extension mechanism.
  - additional built-in functions are available.

### N.B.

- You may see warnings of eval-like code as a security concern. This is due to dynamic compilation.
- The engine compiles generated code from its own DSL model rather than executing arbitrary user-supplied JavaScript directly. This reduces the attack surface compared with raw `eval`, but environments and scanners may still treat it as dynamic code execution.
- This feature only works in environments that allow dynamic code generation.
- You can enable or disable dynamic compilation by importing `FunctionCompiler` from `@samatawy/rules` and setting `FunctionCompiler.enabled = true` or `FunctionCompiler.enabled = false`.

## Documentation

The package includes Typedoc API output plus authored guides from [src/help/index.md](src/help/index.md).

Generate local documentation with:

```bash
npm run docs
```

## Contributing

You can extend the functionality of the rules engine and publish your own libraries to work with it. Read [Contributing (Extending Functionality)](src/help/contributing.md)
