---
title: Diagnostics and Auditing
children:
  - ./audit.trail.md
  - ./logger.md
  - ./stopwatch.md
---

# Diagnostics and Auditing

The engine provides three related but distinct ways to understand what happened during a run.

- The working context keeps an audit trail of invoked rules, their effects, and any exceptions raised.
- The logger system writes diagnostic messages at configurable log levels and can forward them to your own logger implementation.
- The stopwatch utility measures execution time and optional Node.js resource metrics for profiling specific code paths.

Use the audit trail when you need to inspect business outcomes. Use the logger when you need operational diagnostics or integration with your application's logging stack. Use the stopwatch when you want timing and resource snapshots around a block of work.

## Choose the Right Tool

- [Audit Trail](audit.trail.md) shows which rules ran, what effect they had, which exceptions were raised, and what output was produced.
- [Logger](logger.md) covers log levels, custom logger registration, context buffering, and Node.js file logging.
- [Stopwatch](stopwatch.md) covers timing checkpoints, laps, final measurements, and aggregated performance metrics.

## At a Glance

- Use the audit trail for support screens, test assertions, and business-facing traceability.
- Use the logger in your own code for operational diagnostics, integration with external logging systems, and structured debug output.
- Use the stopwatch in your own code for profiling hot paths, measuring stage durations, and comparing execution phases.

These features work well together, but they serve different purposes and should usually be documented or consumed separately in application code.

## Recommended Flow

Start with the audit trail when you want to understand rule outcomes.

Add the logger when you need environment-aware operational diagnostics or integration with your application's log sinks.

Add the stopwatch when you need explicit timing and resource measurements around important code paths.
