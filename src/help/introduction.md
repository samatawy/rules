---
title: Introduction
---

## What is a Rule Engine

A rule engine is a tool that performs actions on behalf of the application based on declarative logic that does not reside in the code base.

Rules are read into the engine and invoked against any given input data. The results are returned to the application. Engines do not change persistent data or lead to data loss.

It separates business logic from the application code, enabling them to be edited or expanded without rebuilding the application.

It therefore enables stakeholders to change system behavior when requirements change, without needing full knowledge of the code or technology stack. 

## When to use a Rule Engine

- If the logic is too complex that encoding it would lead to unreadable code or complex design.

- If the logic is used in multiple places (e.g. in workflows) and repeating blocks would appear.

- If the logic is liable to change at any time (more likely to change than the business model).

- If the system is designed to be generic enough to satisfy multiple scenarios, each with slightly different needs.

## When can Rule engines fail

- If the declarative syntax is too cumbersome or hard to maintain, the cost of keeping up rules can keep growing.

- Conflicting rules can lead to indeterministic results based on the order of rule invocation.

- If rules are highly inter-dependent, altering one rule may change the outcome of others in unexpected ways. This undeterministic behaviour can reduce reliability or create issues.

- If rules are poorly written, or the engine does not provide insight into its operations, unexpected results can arise and be difficult to audit or fix.

- If rules do not match the data model (e.g. when the data model changes or when the engine cannot check data types for validity) rules may fail leading to unexpected changes in behaviour.

- Too many rules can lead to poorly implemented engines slowing down and affecting system performance at every invocation.

## Quality features of Rule engines

To enable teams to benefit, and prevent failures from happening, the best rule engines provide the following features:

### At design time

- Clear and intuitive syntax for declaring rules.

- Sandboxes for testing rules before deployment to production. Rules are applied in bulk only when tested to work together as expected.

- Declarative input and output models that can validate rules to ensure they match application models.

- Audit features such as a clear audit chain of invoked rules and debug logs for troubleshooting issues.

### At run time

- Performant algorithms to ensure fast execution of only relevant rules.

- Data validation of inputs to ensure no misleading results are returned.

- Conflict resolution by respecting the priority (salience) of rules. More specific (or critical) rules override more general (or default) rules.

- Forward chaining of rule invocation to ensure that all dependent rules are invoked in order.

- Rich return data including original inputs, final outputs, and the rules invoked in order for a complete audit trail.

## Well-known Rule engines

Rule engines vary widely in style. Some are lightweight libraries embedded in application code, while others are larger platforms with authoring tools, decision tables, and workflow or event-processing features.

### TypeScript and JavaScript

- `json-rules-engine` is one of the better-known JavaScript rule engines. It uses a JSON-based rule format with conditions and events, which makes it relatively easy to store and exchange rules, though it is less natural for business users than a purpose-built DSL.

- `json-logic-js` is not a complete rule engine in the classic sense, but it is widely used for declarative conditional logic in JavaScript applications. It is often used as the expression layer underneath custom decision systems.

- `durable_rules` has JavaScript support in addition to other languages. It is more event- and state-oriented than many small rule libraries and is often discussed in the context of forward chaining and reactive rule processing.

- `nools` was a notable JavaScript rule engine inspired by Drools. It is still useful as a historical reference for DSL-style and Rete-style rule processing in the Node ecosystem, although it is no longer the obvious default choice for new projects.

In the TypeScript and JavaScript ecosystem, it is still common for teams to build a custom or domain-specific rule layer instead of adopting a very large engine. That is one reason packages like this one can be useful: they can focus on application-friendly syntax, strong typing, and integration with a specific runtime model rather than trying to replicate a full enterprise rules platform.

### Other languages and platforms

- `Drools` is one of the best-known rule engines in the Java ecosystem. It supports production rules, decision tables, CEP-style features, and a large surrounding platform, and it is often the reference point when people discuss enterprise rule engines.

- `CLIPS` is a long-standing expert-system and rule engine environment. It is older and lower-level than many modern libraries, but it remains an important reference in the history of production rule systems.

- `Jess` is another well-known Java rule engine, historically influenced by CLIPS, and has been used in expert-system style applications for many years.

- `OpenL Tablets` is a Java-based business rules platform focused on decision tables and spreadsheet-like authoring, which appeals to teams that want domain experts to contribute directly to rule definitions.

- `Camunda DMN` and other DMN-focused engines are often relevant when the problem is less about forward-chaining rule execution and more about structured business decisions, decision tables, and process automation.

These tools illustrate that “rule engine” can mean very different things:

- some focus on production rules and inference
- some focus on declarative expressions and condition evaluation
- some focus on decision tables and business-user authoring
- some combine rules with workflows, processes, or event streams

This package is closer to the lightweight application-embedded end of that spectrum. It is intended to provide a programmable and typed rule engine for TypeScript projects without requiring the full operational footprint of a larger enterprise platform.

