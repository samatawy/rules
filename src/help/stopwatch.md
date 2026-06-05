---
title: Stopwatch
---

# Stopwatch

`Stopwatch` is the profiling utility in the package. It measures elapsed time and, in Node.js, can also capture CPU and heap deltas.

Use it when you want timing checkpoints, lap measurements, or end-of-run metrics around a block of work.

## Basic Usage

Create a stopwatch with `Stopwatch.start(level, label)`.

```ts
import { Logger, Stopwatch } from '@samatawy/rules';

Logger.setLogLevel('info');

const timer = Stopwatch.start('info', 'Workspace.process')
  .useLogger(Logger);

timer.logCheckpoint('Context loaded');

// do some work

timer.logLap('Rules evaluated');

// do more work

timer.logEnd('Workspace.process complete', { workspace: 'pricing' });
timer.logMetrics();
```

## What Each Method Does

`Stopwatch` supports methods that return measurements:

- `checkpoint()` to capture cumulative progress without resetting timing
- `lap()` to capture a segment and restart measurement from that point
- `end()` to finish the measurement and return the final point without logging it
- `metrics()` to compute aggregate metrics programmatically

.. and methods that also log measurements before returning.

- `logLap()` to capture a lap and emit its message through the logger
- `logCheckpoint()` to capture a checkpoint and emit its message through the logger
- `logEnd()` to finish the measurement and emit the final point through the logger
- `logMetrics()` to emit aggregate metrics through the configured logger

## Output Differences by Runtime

In Node.js, stopwatch points can include:

- duration
- user CPU time
- system CPU time
- heap delta

In browser runtimes, stopwatch data falls back to timing-only measurements.

## Custom Formatting

If you want custom stopwatch message output, provide a `MessageFormatter`.

```ts
import { Logger, MessageFormatter, Stopwatch } from '@samatawy/rules';

const timer = Stopwatch.start('debug', 'Import job')
  .useLogger(Logger)
  .useFormatter(
    MessageFormatter.using('{label}:[? {duration} ms][? - heap {heap_delta} b]')
  );

timer.logEnd();
```

`MessageFormatter` formats a plain data object. In stopwatch usage, that object typically contains stopwatch fields such as the label and timing metrics.

### MessageFormatter Placeholders

`MessageFormatter` replaces placeholders in the form `{key}` using values from the supplied data object.

For stopwatch messages, the commonly available placeholders are:

- `{label}` for the stopwatch label or the label passed to the current checkpoint, lap, or end call
- `{duration}` for the measured duration
- `{cpu_user}` for user CPU time when running in Node.js
- `{cpu_system}` for system CPU time when running in Node.js
- `{heap_delta}` for heap change when running in Node.js

You can also use any other keys if you call the formatter directly with your own data object.

### Optional Blocks

`MessageFormatter` also supports optional blocks in the form `[? ... ]`.

An optional block is included only if every placeholder inside that block has a defined value.

For example, this template:

```ts
const formatter = MessageFormatter.using(
  '{label}[? took {duration} ms][? | heap {heap_delta} b]'
);
```

behaves like this:

- In Node.js, if `duration` and `heap_delta` are both defined, the full message can be included.
- In a browser runtime, the heap block is omitted because `heap_delta` is not available.

### Template and Output Examples

Example template:

```ts
const formatter = MessageFormatter.using(
  '{label}[? took {duration} ms][? with cpu {cpu_user} us][? and heap {heap_delta} b]'
);
```

Example output in Node.js:

```text
Import job took 14.231 ms with cpu 820 us and heap 4,096 b
```

Example output in a browser-like runtime:

```text
Import job took 14.231 ms
```

### Notes on Formatting

- strings are inserted as-is
- booleans become `true` or `false`
- numbers are formatted with standard grouping
- large numeric values in timestamp range may be rendered as ISO dates
- `Date` values are rendered as ISO strings

## Working With Metrics

`metrics()` returns aggregate information derived from the checkpoints, laps, and the final stretch.

Typical fields include (when supported):

- `total_duration`
- `total_cpu_user`
- `total_cpu_system`
- `peak_heap_usage`
- `checkpoint_count`
- `fastest_lap`
- `slowest_lap`
- `average_lap`
- `laps`
- `checkpoints`
- `finish_line`

Use `metrics()` when you want to inspect or assert on performance data programmatically.

Use `logMetrics()` when you want to write those metrics through the configured logger.

## Practical Guidance

- use checkpoints to inspect cumulative progress through a long workflow
- use laps when you want to compare consecutive stages directly
- call `useLogger(...)` before `logCheckpoint()`, `logLap()`, `logEnd()`, or `logMetrics()` if you want explicit logger routing
- use `end()` when you only need the final data object and do not want to emit a log line yet
