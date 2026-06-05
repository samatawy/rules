---
title: Logging and Diagnostics
---

# Logging and Diagnostics

The engine gives you two related but separate ways to understand what happened during a run.

- The working context keeps an audit trail of invoked rules, their effects, and any exceptions raised.
- The logging system writes diagnostic messages at configurable log levels and can forward them to your own logger implementation.
- The stopwatch utility measures execution time and optional Node.js resource metrics for profiling specific code paths.

Use the audit trail when you need to inspect business outcomes. Use logging when you need to troubleshoot engine behaviour or integrate with your application's logging stack. Use the stopwatch when you want timing and resource snapshots around a block of work.

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

Use `Logger` to control diagnostic logging from the engine and your own extension code.

Supported log levels are:

- `trace`
- `debug`
- `info`
- `warn`
- `error`
- `fatal`

The global log level controls which messages are emitted to registered loggers.

```ts
import { Logger, Workspace } from '@samatawy/rules';

Logger.setLogLevel('warn');

const space = new Workspace({ strict_inputs: false, strict_outputs: false });

space.addRule('IF total > 100 THEN approved = true');

const ctx = space.loadContext({ total: 120 });
space.process(ctx);

// Context loggers buffer events until flushed.
ctx.logger().flush();

// If any registered global logger buffers, flush them as well.
Logger.flush();
```

Practical guidance:

- Use `warn` or `error` in production to keep output manageable.
- Move to `info`, `debug`, or `trace` only while investigating a problem.
- Flush the context logger after processing if you want buffered context events written immediately.
- Flush global loggers if your custom logger batches or buffers output.

## Context Logs Versus Audit Data

The context logger and the audit trail solve different problems.

- `ctx.getLog()` tells you which rules ran and what effect they had.
- `ctx.getExceptions()` tells you which rule exceptions were raised.
- `ctx.logger()` is for diagnostic log messages produced during processing.

The context logger is buffered. That means log events are collected during processing and written only when `flush()` is called.

In practice, `ctx.logger()` is typically a `ContextLogger`. It captures messages during the run and forwards them to registered logger implementations when flushed.

## Registering a Custom Logger

To send engine logs to your application's logging system such as Pino, Winston, or Sentry, implement `ILogger` and register it with `Logger.register()`.

You can implement `ILogger` directly or extend `AbstractLogger` to reuse log-level handling. You can handle logging immediately or buffer them until `flush()` is called (which is generally recommended for log readability).

```ts
import { AbstractLogger, Logger, type LogLevel } from '@samatawy/rules';

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

Logger.setLogLevel('info');
Logger.register('app', appLogger);

Logger.info('Rules engine started');
Logger.warn('Rule evaluation took longer than expected', { workspace: 'pricing' });

Logger.flush();
```

If you no longer want a logger bridge, remove it with `Logger.unregister('app')`.

Built-in logger implementations currently include:

- `ConsoleLogger` for direct console output.
- `MemoryLogger` for keeping structured log events in memory for tests or diagnostics. Calling `flush()` clears the captured events.
- `NoopLogger` for explicitly disabling log output.
- `ContextLogger` for buffered per-context logging.

## File Logging in Node.js

If you run the engine in Node.js, you can write logs to disk with `FileLoggerFactory`.

This feature is intended for the default Node package entry. It should not be used from the browser build because browsers do not provide a file system.

```ts
import fs from 'node:fs';
import { FileLoggerFactory, Logger } from '@samatawy/rules';

const fileLogger = FileLoggerFactory.create({
  directory: './logs',
  baseName: 'rules',
  level: 'info',
  rotation: { kind: 'size', maxBytes: 1_000_000 }
}, fs);

Logger.register('file', fileLogger);

Logger.info('Rules engine started');
Logger.flush();
```

Supported rotation modes are:

- No rotation. A single file created and used.
- `run` for one file per logger instance.
- `size` for a new file once the current file would exceed `maxBytes`.
- `interval` for a new file every `everySeconds` seconds.
- `boundary` for rollover on `hour`, `day`, `week`, or `month`, with optional `utc: true`.

Generated file names are human-readable and safe for common file systems, using a timestamp such as `rules.2026-06-05_09-58-49.194.log`.

There are two supported creation paths:

- Use `FileLoggerFactory.create(options, fs)` when you already have Node's `fs` module and want synchronous, deterministic setup.
- Use `await FileLoggerFactory.createAsync(options)` when you want the factory to load the file system module for you.

Both creation paths require a Node.js runtime and will throw if used outside Node.

If you want custom file output, provide a formatter through the `formatter` option. `LoggedEventFormatter` is the built-in helper for templated event formatting:

```ts
import fs from 'node:fs';
import { FileLoggerFactory, LoggedEventFormatter, Logger } from '@samatawy/rules';

const fileLogger = FileLoggerFactory.create({
  directory: './logs',
  baseName: 'rules',
  formatter: LoggedEventFormatter.using('{timestamp} [{level}] {message}[? :: {0}]'),
  rotation: { kind: 'boundary', unit: 'day' }
}, fs);

Logger.register('file', fileLogger);
```

The asynchronous creation path looks like this:

```ts
import { FileLoggerFactory, Logger } from '@samatawy/rules';

const fileLogger = await FileLoggerFactory.createAsync({
  directory: './logs',
  baseName: 'rules',
  rotation: { kind: 'interval', everySeconds: 300 }
});

Logger.register('file', fileLogger);
```

`maxFiles` is reserved for retention control, but it is not enforced yet. Current file loggers control when a new file is opened, not how old files are removed.

## Temporarily Overriding the Logger

Use `withLogger()` when you want a specific function call tree to emit through a different `ILogger` implementation without permanently changing the global logger setup.

```ts
import { Logger, withLogger, type ILogger } from '@samatawy/rules';

declare const requestLogger: ILogger;
declare function runRulePass(input: unknown): unknown;

const runWithRequestLogger = withLogger(requestLogger, runRulePass);

Logger.setLogLevel('debug');
runWithRequestLogger({ total: 120 });
```

This override only applies while the wrapped function executes. After the function returns or throws, the previous logger behavior is restored.

## Per-Context Logging

`ctx.logger()` returns the logger associated with that specific run. In practice this is often a `ContextLogger`, so it can buffer messages for that one processing pass and flush them later.

This means a common pattern is:

- register your logger once through `Logger.register(...)`
- process a context
- call `ctx.logger().flush()` to emit buffered context events

That gives you per-context buffering using your application's logger integration.

## Measuring Performance with Stopwatch

Use `Stopwatch` when you want timed checkpoints, laps, and a final measurement. In Node.js it can also include CPU and heap deltas. In browser runtimes it falls back to timing-only metrics.

```ts
import { Logger, Stopwatch } from '@samatawy/rules';

Logger.setLogLevel('info');

const timer = Stopwatch.start('info', 'Workspace.process')
  .useLogger(Logger);

timer.logCheckpoint('Context loaded');

// do some work

timer.logLap('Rules evaluated');

// do more work

timer.end('Workspace.process complete', { workspace: 'pricing' });
timer.logMetrics();
```

`Stopwatch` supports:

- `checkpoint()` to record cumulative progress without resetting timing.
- `lap()` to record a segment and restart measurement from that point.
- `end()` to finish the measurement and optionally log metadata.
- `metrics()` to inspect aggregated results programmatically.
- `logMetrics()` to emit the aggregated metrics through the configured logger.

If you want custom stopwatch output, provide a `MessageFormatter`:

```ts
import { Logger, MessageFormatter, Stopwatch } from '@samatawy/rules';

const timer = Stopwatch.start('debug', 'Import job')
  .useLogger(Logger)
  .useFormatter(MessageFormatter.using('{label}:[? {duration} ms][? - heap {heap_delta} b]'));

timer.end();
```

## Main Types

The main logging types exposed by the package are:

- `Logger` for global logger registration, log levels, and log dispatch.
- `ILogger` for plugging in your own logger implementation.
- `AbstractLogger` as a convenient base class for custom loggers.
- `ConsoleLogger` as the default console-backed implementation.
- `MemoryLogger` for capturing structured events in memory.
- `NoopLogger` for explicitly discarding log output.
- `ContextLogger` for buffered per-context logging.
- `FileLoggerFactory` for creating Node.js file loggers with run, size, interval, or boundary rotation.
- `LoggedEventFormatter` for templated file-event formatting.
- `Stopwatch` for timing and performance diagnostics.
- `MessageFormatter` for custom stopwatch message formats.
