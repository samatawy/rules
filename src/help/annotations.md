---
title: Annotations
---

# Annotations

Annotations are `@name(...)` style markers placed before rules, custom functions, and test cases.

The engine uses a small built-in set for common behavior such as naming, hints, disabling, and rule salience. You can also declare your own custom annotations and use them for grouping, ownership, team responsibility, tickets, rollout state, or other organizational concerns.

## Built-in and Custom Annotations

Built-in annotations are interpreted directly by the engine:

- `@name(...)`
- `@hint(...)`
- `@disabled(...)`
- `@salience(...)` for rules only

Custom annotations are declared up front in the global annotation registry and then become available for typed parsing.

## Declaring Custom Annotations

Use the annotation registry on `RulesEngine` during startup:

```ts
import { RulesEngine } from '@samatawy/rules';

RulesEngine.annotationRegistry().register('group', 'string');
RulesEngine.annotationRegistry().register('team', 'string');
RulesEngine.annotationRegistry().register('owner_email', 'email');
RulesEngine.annotationRegistry().register('tags', 'string[]');
RulesEngine.annotationRegistry().register('reviewed_at', 'date');
```

Available annotation types currently include:

- `string`
- `number`
- `boolean`
- `date`
- `array`
- `object`
- `string[]`
- `number[]`
- `boolean[]`
- `date[]`
- `email`
- `email[]`
- `any`

## Using Custom Annotations

Once declared, the annotations can be used before rule syntax, function definitions, and test cases.

### Grouping Rules

```ts
workspace.addRule(`
  @group(pricing)
  @team(commercial)
  @name(Premium Discount)
  IF Order.customer_tier == "premium"
  THEN Order.discount_rate = 0.15
`);

workspace.addRule(`
  @group(pricing)
  @team(finance)
  @name(Tax Rate)
  IF Order.country == "CA"
  THEN Order.tax_rate = 0.13
`);
```

### Ownership and Responsibility on Functions

```ts
workspace.addFunction(`
  @team(risk)
  @owner_email(risk-team@example.com)
  @tags(["manual-review", "fraud"])
  requires_manual_review(score: number) = score >= 75
`);
```

### Team Context on Test Cases

```ts
suite.addTestCase(`
  @group(pricing)
  @team(commercial)
  @reviewed_at("2026-06-05T10:00:00Z")
  TEST { Order: { customer_tier: "premium" } }
  EXPECT { Order: { discount_rate: 0.15 } }
`);
```

## Filtering by Annotation

Rules and functions can be filtered through their registries.

```ts
const pricingRules = workspace.ruleRegistry().getRulesAnnotated('group', 'pricing');
const financeRules = workspace.ruleRegistry().getRulesAnnotated('team', 'finance');

const riskFunctions = workspace.functionRegistry().getFunctionsAnnotated('team', 'risk');
const taggedFunctions = workspace.functionRegistry().getFunctionsAnnotated('tags');
```

Pass only the annotation name to find all components carrying that annotation, or include the optional value to filter more narrowly.

## Practical Patterns

Custom annotations are useful for:

- grouping related rules such as `@group(pricing)` or `@group(eligibility)`
- marking team ownership such as `@team(commercial)` or `@team(finance)`
- carrying responsibility or contact information such as `@owner_email(...)`
- attaching rollout or governance status such as `@status(review)`
- linking external systems such as `@ticket(PROJ-123)`

Keep custom annotations descriptive and organizational. They should help humans and tooling understand the declared logic, not hide business behavior that belongs in the rule or function itself.

## Guidance

- Register custom annotations once during startup before parsing declarations that use them.
- Prefer small stable names such as `group`, `team`, `status`, or `ticket`.
- Use built-in annotations when they already express the behavior you need.
- Keep custom annotations focused on classification, ownership, and lifecycle rather than execution logic.

For built-in rule syntax and built-in annotations, see [Rules Syntax](rules.syntax.md). For custom functions, see [Custom Functions](custom.functions.md). For test-case annotations, see [Testing Automation](testing.md).