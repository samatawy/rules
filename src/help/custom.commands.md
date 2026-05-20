---
title: Custom Commands
---

# Custom Commands

Custom commands let a rule call application code using `RUN`.

Use a custom command when the rule needs to trigger behaviour that does not fit naturally into a pure expression or assignment. Typical cases include sending a notification, calling a service, writing to an audit log, or performing a side effect after the rule has matched.

## How they work

- Register the command on the workspace through `commandRegistry()`.
- Give the command a unique `keyword` that rules will use with `RUN`.
- Declare the expected arguments and their types.
- Add a rule that invokes the command with `RUN keyword { ... }`.
- Choose whether the command is `immediate` or deferred.

The `RUN` syntax looks like this:

```
if person.age >= 18 then RUN notify_customer { name: Person.name, age: Person.age }
```

Argument names in the rule must match the names declared on the command.

## Immediate Commands

An immediate command runs during normal rule processing. Its result is available right away, triggering forward-chaining in the rule engine.

```ts
import { Workspace } from '@samatawy/rules';

const space = new Workspace({ strict_inputs: false, strict_outputs: false });

space.typeRegistry().addRootType({
  key: 'Person',
  properties: {
    name: 'string',
    age: 'number'
  }
});

space.commandRegistry().register({
  keyword: 'score_bonus',
  name: 'Score Bonus',
  immediate: true,
  arguments: {
    age: 'number'
  },
  execute: (params) => {
    return params.age >= 65 ? 20 : 5;
  }
});

space.addRule('IF Person.age > 0 THEN RUN score_bonus { age: Person.age }');
space.addRule('IF score_bonus >= 20 THEN Person.priority = "gold" ELSE Person.priority = "standard"');

const ctx = space.loadContext({
  Person: {
    name: 'Alice',
    age: 72
  }
});

space.process(ctx);

console.log(ctx.getOutput().score_bonus);      // 20
console.log(ctx.getOutput().Person.priority);  // gold
```

In this example, the command result is written to `score_bonus`, which makes it available to the next rule immediately.

## Deferred Commands

A deferred command is queued during rule processing and runs later through the command handler. Use this when the command represents a side effect that should happen after the engine finishes evaluating rules.

```ts
import { Workspace } from '@samatawy/rules';

const sentMessages: string[] = [];

const space = new Workspace({ strict_inputs: false, strict_outputs: false });

space.typeRegistry().addRootType({
  key: 'Person',
  properties: {
    name: 'string',
    age: 'number'
  }
});

space.commandRegistry().register({
  keyword: 'send_welcome_email',
  name: 'Send Welcome Email',
  immediate: false,
  arguments: {
    name: 'string'
  },
  execute: (params) => {
    sentMessages.push(`Welcome ${params.name}`);
    return true;
  }
});

space.addRule('IF Person.age >= 18 THEN RUN send_welcome_email { name: Person.name }');

const ctx = space.loadContext({
  Person: {
    name: 'Alice',
    age: 30
  }
});

space.process(ctx);

console.log(sentMessages.length); // 0

await ctx.commandHandler().executeDeferred();

console.log(sentMessages); // ["Welcome Alice"]
```

This pattern keeps rule evaluation separate from side effects.

## Practical Notes

- Command keywords must be unique within the workspace.
- A command must define exactly one of `execute` or `executeAsync`.
- Immediate commands cannot use `executeAsync`.
- Rules are type-checked against the declared command arguments, so mismatched argument names or types are reported early.
- Keep business decision logic in rules and use commands for integration work or side effects.