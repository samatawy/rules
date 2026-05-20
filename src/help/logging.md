---
title: Logging and Audit Trails
---

# Logging and Audit Trails

The engine gives you two related but separate ways to understand what happened during a run.

- The working context keeps an audit trail of invoked rules, their effects, and any exceptions raised.
- The logging system writes diagnostic messages at configurable log levels and can forward them to your own logger implementation.

Use the audit trail when you need to inspect business outcomes. Use logging when you need to troubleshoot engine behaviour or integrate with your application's logging stack.

## Built-in Audit Trail on the Context

After processing a context, you can inspect:

- `ctx.getLog()` for the ordered list of invoked rules and their effects.
- `ctx.getExceptions()` for exceptions raised during evaluation.
- `ctx.getOutput()` for the final output after rule execution.

Each audit-log entry contains:

- `rule`, the rule instance that ran.
- `effect`, a `RuleEffect` object. Depending on the rule, this may include `satisfied`, `changed`, or `exception`.

```ts
import { Workspace } from '@samatawy/rules';

const space = new Workspace({ strict_inputs: false, strict_outputs: false });

space.typeRegistry().addRootType({
  key: 'Person',
  properties: {
    age: 'number',
    is_adult: 'boolean'
  }
});

space.addRule('@name(Adult Check) IF Person.age >= 18 THEN Person.is_adult = true');
space.addRule('@name(Reject Negative Age) IF Person.age < 0 THROW "Invalid age"');

const ctx = space.loadContext({
  Person: {
    age: 22,
    is_adult: false
  }
});

space.process(ctx);

const auditTrail = ctx.getLog().map((entry) => ({
  rule: entry.rule.toString(),
  effect: entry.effect
}));

console.log(auditTrail);
console.log(ctx.getExceptions());
console.log(ctx.getOutput());
```

This is the main built-in audit view for application code. It is useful for support screens, post-run diagnostics, and tests that need to confirm which rules fired.

## Built-in Logging with Levels

Use `WorkLogger` to control diagnostic logging from the engine.

Supported log levels are:

- `trace`
- `debug`
- `info`
- `warn`
- `error`
- `fatal`

The global log level controls which messages are emitted to registered loggers.

```ts
import { WorkLogger, Workspace } from '@samatawy/rules';

WorkLogger.setLogLevel('warn');

const space = new Workspace({ strict_inputs: false, strict_outputs: false });

space.addRule('IF total > 100 THEN approved = true');

const ctx = space.loadContext({ total: 120 });
space.process(ctx);

// Context loggers buffer events until flushed.
ctx.logger().flush();

// If any registered global logger buffers, flush it as well.
WorkLogger.flush();
```

Practical guidance:

- Use `warn` or `error` in production to keep output manageable.
- Move to `info`, `debug`, or `trace` only while investigating a problem.
- Flush the context logger after processing if you want buffered context events written immediately.

## Context Logs Versus Audit Data

The context logger and the audit trail solve different problems.

- `ctx.getLog()` tells you which rules ran and what effect they had.
- `ctx.getExceptions()` tells you which rule exceptions were raised.
- `ctx.logger()` is for diagnostic log messages produced during processing.

The context logger is buffered. That means log events are collected during processing and written only when `flush()` is called.

## Registering a Custom Logger

To send engine logs to your application's logging system (e.g. Pino, Winston, Slack, etc.), implement `ILogger` and register it with `WorkLogger.register()`. 

You can implement `ILogger` directly or extend `AbstractLogger` to reuse log-level handling. You can handle logging immediately or buffer them until `flush()` is called (which is generally recommended for log readability).

```ts
import { AbstractLogger, WorkLogger, type LogLevel } from '@samatawy/rules';

class ArrayLogger extends AbstractLogger {
  public events: Array<{ level: LogLevel; msg: string; args: unknown[] }> = [];

  private push(level: LogLevel, msg: string, ...args: unknown[]): void {
    if (this.canLog(level)) {
      this.events.push({ level, msg, args });
    }
  }

  public trace(msg: string, ...args: unknown[]): void {
    this.push('trace', msg, ...args);
  }

  public debug(msg: string, ...args: unknown[]): void {
    this.push('debug', msg, ...args);
  }

  public info(msg: string, ...args: unknown[]): void {
    this.push('info', msg, ...args);
  }

  public warn(msg: string, ...args: unknown[]): void {
    this.push('warn', msg, ...args);
  }

  public error(msg: string, ...args: unknown[]): void {
    this.push('error', msg, ...args);
  }

  public fatal(msg: string, ...args: unknown[]): void {
    this.push('fatal', msg, ...args);
  }

  public log(level: LogLevel, msg: string, ...args: unknown[]): void {
    this.push(level, msg, ...args);
  }

  public flush(): void {
    for (const event of this.events) {
      console.log(`[${event.level}]`, event.msg, ...event.args);
    }
    this.events = [];
  }
}

const appLogger = new ArrayLogger();

WorkLogger.setLogLevel('info');
WorkLogger.register('app', appLogger);

WorkLogger.info('Rules engine started');
WorkLogger.warn('Rule evaluation took longer than expected', { workspace: 'pricing' });

WorkLogger.flush();
```

If you no longer want a logger bridge, remove it with `WorkLogger.unregister('app')`.

By default, only logging to the console is provided out of the box.

## Per-Context Custom Logging

`ctx.logger()` returns the logger associated with that specific run. In practice this is a `ContextLogger`, created from `WorkLogger.forContext(ctx)`, so it inherits the global log level and any globally registered logger bridges.

This means a common pattern is:

- register your logger once through `WorkLogger.register(...)`
- process a context
- call `ctx.logger().flush()` to emit buffered context events

That gives you per-context buffering using your application's logger integration.
