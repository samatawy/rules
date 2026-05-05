---
title: Engine Components
---

# Engine Components

This Rule Engine implementation is composed of basic classes that manage rules and process inputs. This is an overview of the system design so you can use these classes in your own application.

## Workspace

A Workspace holds a set of rules and any types, constants, and functions they may need.

- You can have one global Workspace or multiple, dividing your business logic into manageable domains (e.g. Sales, HR, etc.).

- Normally the lifetime of a Workspace in production is the entire uptime of the application. However, a testing Workspace can be created and then closed without ill-effect.

- A Workspace creates a context to hold input data, then processes that context. After processing, the contact contains its inputs, outputs, any eerrors encountered, and an audit trail of the rules used.

- A Workspace internally handles forward chaining (running rules in iterations until no more changes are possible), checks declarations for type-safety, resolves conflicts in priorities (salient rules override less salient ones), and tracks executed actions and exceptions.

- A Workspace holds and invokes its own rules, but uses other classes to manage components.

#### Type Memory

This class holds type definitions and helps identify the type of variables used in input or output (supporting validation). 

- This is where we register declared types for type-checking. If no types are to be registered we can configure a Workspace to skip `strict_inputs` and `strict_outputs` so types will be largely unnecessary (highly discouraged).

#### Function Memory

This class holds function declarations and helps with the creation and validation of function calls.

- This is where we register declared custom functions. It will guarantee name uniqueness.

#### Rule Graph

This class builds a graph of rules to enable faster selection of rules applicable to a given context. You should not normally have to deal with this class.

## Working Context

A Context is a holder of data used in evaluating conditions and executing actions.

#### Working Memory

A Working Memory is a Context holds inputs for an engine run, and the outputs that result. It also holds any executed actions and any errors encountered.

- On receiving data, use a Workspace to wrap that data in a Working Memory. When you ask the Workspace to process that object, you can then query that object to inspect output, errors, and an audit trail of the last run.

#### Scope Context

A Scope Context is created by a function or a closure (from a lambda function) to isolate local data from the Working Memory. This object is discarded after the function returns.

## File Readers

There are multiple ways to provide declarations to a Workspace. You can parse declarative syntax through code or from loaded files.

- File readers read specific flavours of files, each supporting a possible use case. Select the one you decide to use:

- General File Reader (if you decide to separate components into business domains, each with a mized set of declarations)

- Markdown File Reader (if you decide to maintain your documentation in sync with your declarations)

- Specific File Readers (if you decide to separate components into files by type: Constants, Functions, Types, and Rules)

## Syntax Readers

If you decide to declare your components in code, you can pass the syntax directly into Rules, Types, or Custom Functions. These will use Parser classes to read each relevant syntax and build an in-memory object that can be used by a Workspace.

- Create a new Rule by using its constructor and passing the syntax.

- Create a new ...