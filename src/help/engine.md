---
title: Engine Components
---

# Engine Components

This Rule Engine implementation is composed of basic classes that manage rules and process inputs. This is an overview of the system design.

## RulesEngine

The top-level manager of the rules engine is a manager of workspaces. 

It provides a registry of named workspaces, enabling you divide work into business domains, each with its own set of declared components. By default you have a global registry of workspaces with one default workspace (if you only need one):

```
// The following is the default workspace for simple deployments
const defaultSpace = RulesEngine.defaultSpace();

// The following is a targeted named workspace, previously added on startup
const salesSpace = RulesEngine.getWorkspace('SALES');
```

On startup, add the workspace you will need, load its declarations, check it, then use it anywhere in your code:

```
const space = RulesEngine.getWorkspace('SALES');
const ctx = space.loadContext({ ...inputData });
space.process(ctx);
```

To develop or test rules, you can clone an existing workspace so your changes do not affect requests being served by the system. 

```
const space = RulesEngine.getWorkspace('SALES');
const volatile = space.clone();
// You can modify the cloned instance freely.
...

// If you want to keep the cloned workspace available to others, you should name it:
const duplicate = RulesEngine.cloneWorkspace(space, 'TESTING SALES');
```

If you want to combine declarations from one workspace into another, you can import them instead of cloning the whole object:

```
const base = RulesEngine.getWorkspace('COMMON');
const sales = RulesEngine.getWorkspace('SALES');

sales.import(base);
```

Use `clone()` when you want an isolated copy that can diverge safely. Use `import()` when you want to merge rules, functions, types, and constants from one workspace into another workspace you are already building.

## Workspace

A workspace holds a set of rules and any types, constants, and functions they may need.

- You can have one global workspace `RulesEngine.defaultSpace()` or multiple, dividing your business logic into manageable domains (e.g. Sales, HR, etc.).

- Normally the lifetime of a workspace in production is the entire uptime of the application. However, a testing workspace can be created and then closed without ill-effect.

- A workspace internally handles forward chaining (running rules in iterations until no more changes are possible), checks declarations for type-safety, resolves conflicts in priorities (salient rules override less salient ones), and tracks executed actions and exceptions.

- Workspace behaviour can be tuned for specific use cases using options passed to the constructor:
```
const newSpace = new Workspace({
    strict_syntax: true,        // type check all expressions, operands, and function arguments
    strict_inputs: false,       // type check all inputs against declared types
    strict_outputs: false,      // type check all outputs against declared types
    strict_conflicts: false,    // whether to throw errors on salience conflicts
    max_iterations: 20          // allowed number of iterations for forward-chaining
})
```

- A workspace can create a context to hold input data, then processes that context. After processing, the context contains its inputs, outputs, any errors encountered, and an audit trail of the rules used.

### Forward chaining

The normal processing mode is forward chaining.

In forward chaining, the workspace starts from the data already present in the context, finds relevant rules, executes satisfied consequences, then keeps iterating while new outputs make more rules applicable.

```
const space = RulesEngine.defaultSpace();
const ctx = space.loadContext({ order: { total: 1200 } });

space.process(ctx);

console.log(ctx.getOutput());
```

This is the right mode when you want the engine to calculate all reachable consequences for a given input.

### Backward chaining

The workspace also supports a goal-oriented evaluation mode through `workspace.evaluate(variable, context)`.

In backward chaining, you ask for one specific variable and the workspace evaluates rules that can contribute to that target value.

```
const space = RulesEngine.defaultSpace();

space.addRule('SET invoice.tax_rate = invoice.total > 1000 ? 0.10 : 0.14');
space.addRule('SET invoice.tax = invoice.total * invoice.tax_rate');

const ctx = space.loadContext({
    invoice: {
        total: 1200,
    },
});

const tax = space.evaluate('invoice.tax', ctx);

console.log(tax);
console.log(ctx.getOutput('invoice.tax_rate'));
```

Use backward chaining when:

- you only need one output or a small number of outputs
- you want to answer a goal-oriented query instead of running the full rule set
- you are building selector, recommendation, or lookup-style flows

Practical notes:

- `evaluate()` still uses the same context, logging, exceptions, and type validation flow as normal processing.
- If the target variable already has a value in the current context, that value is returned immediately.
- If the target cannot be derived cleanly, `evaluate()` returns `undefined` and the context keeps any logged exceptions.

## Working Context

A context is a holder of data used in evaluating conditions and executing actions. The main implementation of context is the WorkingMemory.

#### Working Memory

A Working Memory is a context that holds inputs for an engine run, and the outputs that result.

- Each context knows: 
    - its initial inputs, 
    - its current outputs, 
    - a log of rules invoked and their effects, 
    - any exceptions raised,
    - cached expression values (internal optimization),
    - and the classes it has access to: the workspace, command handler, logging implemention, etc.

- On receiving data, use a workspace to wrap that data in a Working Memory. When you ask the workspace to process that object, you can then query that object to inspect output, errors, and an audit trail of the last run.

```
const space = RulesEngine.defaultSpace();
const ctx = space.loadContext({ ...input Data });
space.process(ctx);
if (ctx.getExceptions().length) {
    // report error messages
} else {
    const output = ctx.getOutput();
    // perform actions as necessary
}
```

#### Scope Context

A Scope Context is created by a function or a closure (from a lambda function) to isolate local data from the Working Memory. This object is discarded after the function returns.

## Utility classes

- Every workspace uses these classes to manage components.

#### Type Registry

- This class holds type defintions to support validation.

- This is where we register declared types for type-checking. If no types are to be registered we can configure a workspace to skip `strict_inputs` and `strict_outputs` so types will be largely unnecessary (highly discouraged).

#### Type Checker

- This class uses the Type Registry to identify the type of variables used in input or output (supporting validation). 

- This is what we use to validate rules for type-safety and validate input data.

- This class must be passed to every method that requires type checking, e.g. in expressions, functions, etc.

#### Function Registry

- This class holds function declarations and helps with the creation and validation of function calls.

- This is where we register declared custom functions. It will guarantee name uniqueness.

#### Command Registry

- This class holds custom commands and helps with the creation and validation of command actions.

- This is where we register declared custom commands. It will guarantee name uniqueness.

#### Rule Registry

- This class holds rules for use by a workspace, and provides dependency based sorting and conflict resolution during engine processing.

- We register rules through the workspace directly. You should not need to use this class directly.

#### Dependency Graph

- This class builds a graph of rules to enable faster selection of rules applicable to a given context. 

- It also detects cyclic dependencies on demand (recommended after rules are loaded or changed).

- You should not normally have to deal with this class.

#### Rete Graph

- This class builds a graph of conditional expressions to enable faster evaluation of rules on a given context. 

- You should not normally have to deal with this class.

## File Readers

There are multiple ways to provide declarations to a workspace. You can parse declarative syntax through code or from loaded files.

- File readers read specific flavours of files, each supporting a possible use case. Select the one you decide to use:

- General File Reader (if you decide to separate components into business domains, each with a mized set of declarations)

- Markdown File Reader (if you decide to maintain your documentation in sync with your declarations)

- Specific File Readers (if you decide to separate components into files by type: Constants, Functions, Types, and Rules)

Read about [Declaration Files](declaration.files.md)

## Syntax Parsers

If you decide to declare components directly in code instead of loading files, the engine provides parser classes that translate syntax strings into in-memory objects.

In practice, parsers are the bridge between the declarative DSL and the executable classes used by a workspace.

#### Rule Parser

The Rule Parser reads full rule syntax and creates concrete rule objects in memory. It also reads rule annotations such as `@name(...)`, `@hint(...)`, `@disabled()`, and `@salience(...)`.

Example:

```
const parser = new RuleParser({ workspace });
const rule = parser.parse('@name(Adult Status) if person.age >= 18 then person.is_adult = true');

workspace.addRule(rule!);
```

Read about [Rules Syntax](rules.syntax.md)

Normally you do not need to instantiate a Rule Parser directly because `workspace.addRule()` accepts rule syntax and parses it for you.

#### Expression Parser

The Expression Parser reads expressions used inside conditions, assignments, function bodies, and lambdas.

It supports:

- literals and variables
- arithmetic and comparisons
- boolean logic
- function calls
- array literals
- ternary expressions
- switch expressions
- lambda expressions

Example:

```
const parser = new ExpressionParser({ workspace });
const expr = parser.parse('x > 10 && (y < 5 || z == 0)');
```

Read about [Expression Syntax](expression.syntax.md)

This parser is used internally by both the Rule Parser and the Executable Parser.

#### Executable Parser

The Executable Parser reads the action side of rules.

It handles:

- `SET x = value`
- `x = value`
- multiple actions separated by semicolons

Example:

```
const parser = new ExecutableParser({ workspace });
const action = parser.parse('person.child_count = count(person.children); person.family_size = "large"');
```

This parser is used by the Rule Parser for `then` and `else` branches, and by the Function Parser for intermediate lines in custom function bodies.

#### Function Parser

The Function Parser reads custom function declarations.

It supports both simple single-expression forms and block forms with intermediate lines and a final `return`.

Simple example:

```
const parser = new FunctionParser({ workspace });
const func = parser.parse('greeting(name: string) = concat("Hello ", name)');

workspace.functionRegistry().addFunction(func!);
```

Block example:

```
const parser = new FunctionParser({ workspace });
const func = parser.parse(`sales_tax(total: number) {
		tax_rate = total < 100 ? 0.12 : 0.14;
		tax = total * tax_rate;
		return max(1, tax)
}`);
```

Read about [Custom Functions](custom.functions.md)

The Function Parser uses the Expression Parser for returned expressions and the Executable Parser for intermediate body lines.

#### Type Parser

The Type Parser reads declared types from JSON or relaxed JSON5-style syntax.

Example:

```
const parser = new TypeParser({ workspace });
const type = parser.parseRootType(`{
	key: 'Person',
	properties: {
		name: 'string',
		age: 'number'
	}
}`);

workspace.typeRegistry().addRootType(type);
```

This parser validates that the provided structure is a legal root type before returning it.

#### When to Use Parsers Directly

Use parser classes directly when:

- building editor tooling or testing syntax fragments
- validating declarations before loading them into a workspace
- creating custom loading flows outside the provided file readers

If you are simply loading declarations into a workspace, the higher-level APIs and file readers are usually the better entry point.
