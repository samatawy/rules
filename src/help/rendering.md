---
title: Rendering and Visualization
children:
  - ./html.rendering.md
  - ./mermaid.rendering.md
---

# Rendering and Visualization

The rule engine can expose rules and expressions as a structured render tree, then turn that tree into formats such as HTML or Mermaid diagrams.

Rendering is read-only. It does not execute rules, mutate context, or change how rules are evaluated.

## Imports

Core engine APIs and the shared `Renderable` shape come from the main package, while renderer-specific classes come from the optional `@samatawy/rules/render` entry point.

```ts
import { type Renderable, RuleParser, Workspace } from '@samatawy/rules';
import { HtmlRenderer, MermaidRenderer } from '@samatawy/rules/render';
```

This keeps rendering and visualization helpers out of the default package surface for consumers that do not need them.

## The `toJson()` method

Every parsed expression and rule exposes `toJson()` and returns a `Renderable` object.

- Expressions return nodes such as `LiteralExpression`, `VariableExpression`, `FunctionExpression`, `ComparisonExpression`, `LogicalExpression`, `TernaryExpression`, `SwitchExpression`, and `LambdaExpression`.

- Rules return higher-level shapes such as `IfThenRule`, `IfThenElseRule`, `OutputRule`, `CompositeAction`, and `CommandExecutable`.

At a high level, the render tree uses these fields:

- `type` identifies the node.
- `name` and `value` carry literal names and values.
- `operator`, `left`, and `right` represent binary expressions.
- `arguments` and `elements` represent functions, commands, arrays, and grouped actions.
- `condition`, `trueExpression`, and `falseExpression` represent rule branches and ternaries.
- `output` and `expression` represent assignment targets.
- `cases` and `defaultCase` represent switch expressions.

Example:

```ts
import { RuleParser, type Renderable, Workspace } from '@samatawy/rules';

const space = new Workspace();
const parser = new RuleParser({ workspace: space });
const rule = parser.parse('IF total > 100 THEN discount = 0.1');

const ruleJson: Renderable | undefined = rule?.toJson();
const conditionJson = rule?.getExpression().toJson();
```

The rule-level output is shaped like this:

```json
{
  "type": "IfThenRule",
  "condition": {
    "type": "ComparisonExpression",
    "operator": ">",
    "left": {
      "type": "VariableExpression",
      "name": "total"
    },
    "right": {
      "type": "LiteralExpression",
      "value": 100
    }
  },
  "trueExpression": {
    "type": "OutputAction",
    "output": "discount",
    "expression": {
      "type": "LiteralExpression",
      "value": 0.1
    }
  }
}
```

This JSON tree is the common input used by the built-in renderers and any custom renderer you write.

## Built-in renderers

The package currently includes two renderers:

- [HTML renderer](html.rendering.md) for inline markup or class-based markup that you can insert into your own UI.
- [Mermaid renderer](mermaid.rendering.md) for flowchart output that can be displayed anywhere Mermaid diagrams are supported.

Both renderers accept either a full rule or an expression.

- Rendering a rule preserves `IF`, `THEN`, `ELSE`, `SET`, and command structure.
- Rendering an expression focuses on the expression tree itself.

## When to use JSON directly

Use `toJson()` directly when you want to:

- build your own visual representation
- serialize rule structure for inspection or debugging
- transform rules into another text format
- integrate the engine with your own frontend components

If you need a custom output format, see [Contributing](contributing.md) for guidance on creating a custom renderer.
