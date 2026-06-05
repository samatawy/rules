---
title: Audit Trail
---

# Audit Trail

The built-in audit trail records what happened during rule processing at the business level.

Use the audit trail when you need to inspect:

- which rules ran
- what effect each rule had
- which exceptions were raised
- what output the context produced

This is different from diagnostic logging. The audit trail is about rule outcomes. Logging is about operational and debugging messages.

## What You Can Inspect

After processing a context, the main inspection methods are:

- `ctx.getLog()` for the ordered list of invoked rules and their effects
- `ctx.getExceptions()` for exceptions raised during evaluation
- `ctx.getOutput()` for the final output after rule execution

Each entry returned by `ctx.getLog()` contains:

- `rule`, the rule instance that ran
- `effect`, a `RuleEffect` value that may include properties such as `satisfied`, `changed`, or `exception`

## Example

```ts
import { Workspace } from '@samatawy/rules';

const workspace = new Workspace({
  strict_inputs: false,
  strict_outputs: false,
});

workspace.typeRegistry().addRootType({
  key: 'Person',
  properties: {
    age: 'number',
    is_adult: 'boolean',
  },
});

workspace.addRule('@name(Adult Check) IF Person.age >= 18 THEN Person.is_adult = true');
workspace.addRule('@name(Reject Negative Age) IF Person.age < 0 THROW "Invalid age"');

const ctx = workspace.loadContext({
  Person: {
    age: 22,
    is_adult: false,
  },
});

workspace.process(ctx);

const auditTrail = ctx.getLog().map((entry) => ({
  rule: entry.rule.toString(),
  effect: entry.effect,
}));

console.log(auditTrail);
console.log(ctx.getExceptions());
console.log(ctx.getOutput());
```

## When To Use Audit Data

The audit trail is the right feature for:

- support and troubleshooting screens that explain why a result was produced
- regression tests that need to confirm which rules fired
- post-run inspection of thrown rule exceptions
- debugging rule behavior without wiring in a custom logger

If you need structured operational logs, log levels, or external sinks, use the logger system instead.
