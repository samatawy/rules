---
title: Contributing
children:
- ./function.providers.md
- ./custom.commands.md
---

# Contributing (Extending Functionality)

You can extend the functionality of this Rules Engine (and contribute to the community) in more than one way:

1. Provide declared function libraries

2. Provide coded function providers

3. Provide custom commands

4. Provide custom loggers

5. Provide custom renderers

## Provide declared function libraries

- You can declare functions in a markdown file, providing both the DSL and the necessary documentation in one place.

- That file can be read by developers into their selected workspace(s) and used directly in rules and other functions.

- This is the simplest way and has the benefit of being selectively applicable. The downsides are that you are limited to DSL syntax, and developers will need to read that file using a reader class when they need to use it.

Learn more about [Custom Functions](custom.functions.md)

## Provide coded function providers

- You can create implementations of functions in native typescript and wrap your own library to be used with the rules engine.

- Once a function provider class has been imported, it must be registered for use with the `FunctionFactory` before use (generally on startup):

```
import { StatFunctions } from '@myself/mypackage';

FunctionFactory.registerProvider(StatFunctions);
```

- Now all your functions can be used in rules and other functions across all workspaces. This is more convenient but has two downsides: First, these functions cannot be applied to only selected workspaces, and secondly, you need to document usage in your own way.

- The reason this is powerful is that you get to use Typescript while evaluating your functions; you are NOT limited by the DSL. This is ideal if you want to wrap your own library to work within the rule engine seamlessly.

- N.B. Since function providers are global, any settings you may need should be provided with static properties or methods. You do not instantiate function providers.

Learn more about [Function Providers](function.providers.md)

## Provide custom commands

- You can create executable commands in typescript and wrap your own library to be invoked by the rules engine.

```
import { EmailCommand } from '@myself/mypackage';

space.commandRegistry().register(new EmailCommand());
```

- Like declared functions, commands can be applied to selected workspaces (i.e. they are not global).

- Commands, however, must be instantiated before registration, since parameters may need to be passed to your constructor (e.g. credentials or settings).

- Commands can be immediate or deferred. Both can be synchronous but only deferred commands can execute asynchronously.

- The difference between immediate commands and functions is that commands run in typescript without being restricted by the DSL. These commands can use your own code or library to return values for further processing (chaining).

- The difference between deferred commands and functions is that deferred commands are intended to cause side-effects while functions are intended to be pure and safe. Deferred commands may call external systems (e.g. sending an email, saving to a database, etc.) which is not normally part of rules evaluation.

- Deferred commands are invoked at the end of processing and only if explicitly invoked by application code. This is to avoid negatively impacting performance while allowing developers to selectively execute/queue commands that can cause external effects.

```
// This step only decides what commands are required
space.process(ctx);

// You can execute all deferred commands, or iterate over them for finer control
await ctx.commandHandler().executeDeferred();
```

Learn more about [Custom Commands](custom.commands.md)

## Provide custom loggers

- You can provide a custom logging extension to send engine logs to your application's logging system (e.g. Pino, Winston, Sentry, etc.).

- You can implement `ILogger` directly or extend `AbstractLogger` to reuse log-level handling.

- Developers will need to register your logger to have it take effect. This is recommended at system sartup.

```
import { SentryLogger } from '@myname/mypackage';

const settings = {
    // your specific configuration
};

WorkLogger.register('sentry', new SentryLogger( settings ));
```

- You can handle logging immediately or buffer them until `flush()` is called (which is generally recommended for log readability).

Learn more about [Logging and Audit Trails](logging.md)

## Provide custom renderers

- You can build your own renderer on top of the same `toJson()` tree used by the built-in HTML and Mermaid renderers.

- This is useful if you want rule output as Markdown, React components, PDF fragments, SVG, plain text, or any domain-specific format.

- Unlike function providers, commands, or loggers, renderers do not need engine-wide registration. They are ordinary classes that your application can instantiate wherever it needs to display or export rules.

- A custom renderer should accept either a parsed rule or expression, call `toJson()`, then recursively transform the returned `Renderable` nodes.

```ts
import { AbstractRule, Expression, type Renderable } from '@samatawy/rules';

export class MarkdownRenderer {

    public render(input: Expression | AbstractRule): string {
        return this.renderNode(input.toJson());
    }

    private renderNode(node: Renderable | undefined): string {
        if (!node) {
            return '';
        }

        switch (node.type) {
            case 'LiteralExpression':
                return String(node.value);
            case 'VariableExpression':
                return `\`${node.name}\``;
            case 'ComparisonExpression':
                return `${this.renderNode(node.left)} ${node.operator} ${this.renderNode(node.right)}`;
            case 'OutputAction':
                return `SET ${node.output} = ${this.renderNode(node.expression)}`;
            default:
                return node.type;
        }
    }
}
```

- This approach keeps rendering concerns separate from parsing and evaluation, which means you can evolve your output format without affecting engine behavior.

- If you want to match the built-in renderer model, style by `ElementType` categories such as `variable`, `literal`, `operator`, `function`, and `block` instead of coupling your renderer to concrete classes.

Learn more about [Rendering](rendering.md)
