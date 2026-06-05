---
title: Logger
---

# Logger

The logger system is the diagnostic side of the engine. It lets you emit messages at log levels, register custom sinks, buffer per-context logs, and in Node.js write logs to files.

Use it when you need operational diagnostics rather than business-level audit data.

## Core Types

The main logging types are:

- `Logger` for global logger registration, log levels, and dispatch
- `ILogger` for custom logger implementations
- `AbstractLogger` as a base class for custom loggers
- `ConsoleLogger` for direct console output
- `MemoryLogger` for storing structured log events in memory
- `NoopLogger` for explicitly discarding log output
- `ContextLogger` for buffered per-context logging

## Log Levels

Supported log levels are:

- `trace`
- `debug`
- `info`
- `warn`
- `error`
- `fatal`

The global log level controls which messages are emitted.

```ts
import { Logger, Workspace } from '@samatawy/rules';

Logger.setLogLevel('warn');

const workspace = new Workspace({ strict_inputs: false, strict_outputs: false });
workspace.addRule('IF total > 100 THEN approved = true');

const ctx = workspace.loadContext({ total: 120 });
workspace.process(ctx);

ctx.logger().flush();
Logger.flush();
```

Practical guidance:

- use `warn` or `error` in production to keep output manageable
- move to `info`, `debug`, or `trace` while investigating problems
- flush buffered loggers after a run if you need output immediately

## Context Logs Versus Audit Data

The context logger and the audit trail solve different problems.

- `ctx.getLog()` describes which rules ran and what effect they had
- `ctx.getExceptions()` describes rule exceptions
- `ctx.logger()` is for diagnostic messages produced during processing

`ctx.logger()` is typically a `ContextLogger`. It buffers events during the run and forwards them to registered loggers when `flush()` is called.

## Registering a Custom Logger

To connect the engine to your own logging system such as Pino, Winston, or Sentry, implement `ILogger` and register it with `Logger.register()`.

```ts
import { AbstractLogger, Logger, type LogLevel } from '@samatawy/rules';

class ArrayLogger extends AbstractLogger {
  public events: Array<{ level: LogLevel; msg: string; args: unknown[] }> = [];

  private push(level: LogLevel, msg: string, ...args: unknown[]): void {
    if (this.canLog(level)) {
      this.events.push({ level, msg, args });
    }
  }

  public trace(msg: string, ...args: unknown[]): void { this.push('trace', msg, ...args); }
  public debug(msg: string, ...args: unknown[]): void { this.push('debug', msg, ...args); }
  public info(msg: string, ...args: unknown[]): void { this.push('info', msg, ...args); }
  public warn(msg: string, ...args: unknown[]): void { this.push('warn', msg, ...args); }
  public error(msg: string, ...args: unknown[]): void { this.push('error', msg, ...args); }
  public fatal(msg: string, ...args: unknown[]): void { this.push('fatal', msg, ...args); }
  public log(level: LogLevel, msg: string, ...args: unknown[]): void { this.push(level, msg, ...args); }

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

Remove a logger with `Logger.unregister('app')` or by passing the logger instance.

## Built-in Logger Implementations

Built-in logger implementations currently include:

- `ConsoleLogger` for direct console output
- `MemoryLogger` for tests and in-memory diagnostics; calling `flush()` clears captured events
- `NoopLogger` for intentionally suppressing log output
- `ContextLogger` for buffering log events per processing context

## Temporarily Overriding the Logger

Use `withLogger()` when you want a particular call tree to emit through a different logger without permanently changing global logger setup.

```ts
import { Logger, withLogger, type ILogger } from '@samatawy/rules';

declare const requestLogger: ILogger;
declare function runRulePass(input: unknown): unknown;

const runWithRequestLogger = withLogger(requestLogger, runRulePass);

Logger.setLogLevel('debug');
runWithRequestLogger({ total: 120 });
```

The override applies only while the wrapped function executes.

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
  rotation: { kind: 'size', maxBytes: 1_000_000 },
}, fs);

Logger.register('file', fileLogger);

Logger.info('Rules engine started');
Logger.flush();
```

Supported rotation modes are:

- no rotation, which keeps writing to one file
- `run` for one file per logger instance
- `size` for a new file once the current file would exceed `maxBytes`
- `interval` for a new file every `everySeconds` seconds
- `boundary` for rollover on `hour`, `day`, `week`, or `month`, with optional `utc: true`

Generated file names are human-readable and safe for common file systems, using a timestamp such as `rules.2026-06-05_09-58-49.194.log`.

There are two supported creation paths:

- use `FileLoggerFactory.create(options, fs)` when you already have Node's `fs` module and want synchronous deterministic setup
- use `await FileLoggerFactory.createAsync(options)` when you want the factory to load the file system module for you

Both creation paths require a Node.js runtime and throw if used outside Node.

If you want custom file output, provide a formatter through the `formatter` option. `LoggedEventFormatter` is the built-in helper for templated event formatting.

```ts
import fs from 'node:fs';
import { FileLoggerFactory, LoggedEventFormatter, Logger } from '@samatawy/rules';

const fileLogger = FileLoggerFactory.create({
  directory: './logs',
  baseName: 'rules',
  formatter: LoggedEventFormatter.using('{timestamp} [{level}] {message}[? :: {0}]'),
  rotation: { kind: 'boundary', unit: 'day' },
}, fs);

Logger.register('file', fileLogger);
```

`LoggedEventFormatter` formats a `LoggedEvent`, so it works with the fixed event fields plus positional logger arguments.

### LoggedEventFormatter Placeholders

These placeholders are always supported:

- `{timestamp}` for the event timestamp, formatted as an ISO string
- `{level}` for the log level in uppercase
- `{message}` for the main log message

You can also reference logger arguments by zero-based index:

- `{0}` for the first extra argument
- `{1}` for the second extra argument
- `{2}` for the third extra argument

and so on.

Two wildcard placeholders are also supported:

- `{args}` or `{*}` for all extra arguments not already referenced by numbered placeholders in the template

Wildcard placeholders render the remaining arguments as a bracketed comma-separated list.

For example, this call:

```ts
Logger.info('Rule evaluation finished', { workspace: 'pricing' }, 42);
```

can be formatted with `{message}`, `{0}`, and `{1}`. If you also use `{args}` or `{*}`, only the extra arguments not already claimed by numbered placeholders are included there.

### Optional Blocks

`LoggedEventFormatter` also supports optional blocks in the form `[? ... ]`.

An optional block is included only if every placeholder inside that block is available for that event.

For example:

```ts
const formatter = LoggedEventFormatter.using(
  '{timestamp} [{level}] {message}[? :: {0}][? :: code={1}]'
);
```

- if both `{0}` and `{1}` exist, both optional blocks are included
- if only `{0}` exists, the first block is included and the second is removed
- if neither exists, both optional blocks are removed
- if `{args}` or `{*}` is used inside an optional block, that block is included only when at least one remaining argument exists

### Template and Output Examples

Example template:

```ts
const formatter = LoggedEventFormatter.using(
  '{timestamp} [{level}] {message}[? :: {0}]'
);
```

Example event call:

```ts
Logger.warn('Rule evaluation took longer than expected', { workspace: 'pricing' });
```

Example output:

```text
2026-06-05T10:15:30.000Z [WARN] Rule evaluation took longer than expected :: {"workspace":"pricing"}
```

Another template:

```ts
const formatter = LoggedEventFormatter.using(
  '{timestamp} [{level}] {message}[? | request={0}][? | attempt={1}]'
);
```

Possible output when both arguments are present:

```text
2026-06-05T10:15:30.000Z [INFO] Retrying rule pass | request=pricing | attempt=2
```

Possible output when only the first argument is present:

```text
2026-06-05T10:15:30.000Z [INFO] Retrying rule pass | request=pricing
```

Template using remaining args:

```ts
const formatter = LoggedEventFormatter.using(
  '{timestamp} [{level}] {message}[? | primary={0}][? | rest={args}]'
);
```

Example event call:

```ts
Logger.warn('Rule evaluation took longer than expected', { workspace: 'pricing' }, 2, true);
```

Example output:

```text
2026-06-05T10:15:30.000Z [WARN] Rule evaluation took longer than expected | primary={"workspace":"pricing"} | rest=[2, true]
```

`{*}` behaves the same way as `{args}`.

### Notes on Formatting

- strings are inserted as-is
- booleans become `true` or `false`
- numbers are formatted with standard grouping
- large numeric values in timestamp range may be rendered as ISO dates
- `Date` values are rendered as ISO strings

The asynchronous creation path looks like this:

```ts
import { FileLoggerFactory, Logger } from '@samatawy/rules';

const fileLogger = await FileLoggerFactory.createAsync({
  directory: './logs',
  baseName: 'rules',
  rotation: { kind: 'interval', everySeconds: 300 },
});

Logger.register('file', fileLogger);
```

`maxFiles` is reserved for retention control, but it is not enforced yet.
