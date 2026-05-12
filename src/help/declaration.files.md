---
title: Declaration Files
---

# Declaration Files

To configure the Rule engine, you need to declare your business logic. You can provide persistent files to do this in more than one way.

Please note that you may have dependencies between files, e.g. a rules file may use functions declared in another file. 
If so, the order of reading files into a workspace will matter, especially with strict options.

There are multiple reader classes you can use to read files (even if out of order), so you can select the style you prefer.

## Reading Declaration Files

In a node environment with known paths, the easiest way to load files (or folders) into a workspace is to use the helper class `WorkspaceFilesReader`: 

```
const sales_space = new Workspace();
const reader = new WorkspaceFilesReader(sales_space);

let success = reader.readFromFiles([
    '<path>/sales.rule.text',
    '<path>/common.functions.text',
]);

// Alternatively
let folderSuccess = read.readFromFolder('<path>')
```

The above will not fail if declarations are not properly ordered, e.g. if a function is used before it is declared. 
However, although the above will work with any order of files, each call must leave the workspace in a valid state, so load all relevant files in one call.
If your files depend on external declarations, these must have been already loaded.

N.B. Keeping proper order will help keep your declaration/documentation file(s) readable and maintainable. 

Alternatively, in a browser or when you need more control (e.g. if building your own editor) you can use reader classes (e.g. `GeneralFileReader`) directly. Using these readers, the order of declarations DOES matter, even within a single file.

```
const fileContents = <load file as string>;
const reader = new GeneralFileReader();
const result = reader.parse(fileContents);

const mySpace = new Workspace();
if (result.getExceptions().length === 0) {
    mySpace.addConstants(result.constants);
    mySpace.typeChecker().addRootTypes(result.types);
    mySpace.functionRegistry().addFunctions(result.functions);
    mySpace.addRules(result.rules);
}
```

File readers return a result interface you can use.

- `errors` is an array of any error messages encountered.

- `constants` is an object where every key:value pair is a constant.

- `functions` is an object where every key is the name of a function, and its value is the definition of that fucntion.

- `types` is an object where every key is the root key of a type, and its value is the detailed type definition.

- `rules` is an array of rules.

These can be loaded into your workplace in sequence. You can also have them loaded for you automatically by passing the workplace when creating your reader:

```
const myWorkplace = new Workplace();
const reader = new GeneralFileReader({ workplace: myWorkplace });

// After parsing a file, now your workplace can recognize and use all components declared in that file.
```

- File readers are transactional. If you decide to accept `'partial'` declarations (e.g. in development / testing), errors will not cause the entire read method top fail. If you decide to accept `'all'` (e.g. in staging / production) then any error will prevent all components from being parsed. In that case, your workspace will not be affected unless all components are accepted.

## General Files

A general file contains mixed declarations. You can have one file for a specific type and its relevant rules.

You can also declare constants and custom functions in the same file.

These are parsed in order so a function or constant declared earlier can be used later but not the other way around.

```
// Set by state legislation
TAX_RATE = 0.14

TAX(total: number) = total * TAX_RATE

// Invoices are accepted with only total
{ key: 'Invoice',
  properties: {
    total: 'number',    // required
    tax: 'number'       // calculated
  }
}

@name(Invoice tax calculator)
IF invoice.total > 0 
THEN invoice.tax = TAX(invoice.total)
ELSE THROW "Invalid invoice amount"
```

This approach encourages separation of declarations into business-relevant areas such as a single file for every domain of interest.

## Markdown Files

You can also provide documentation for your business logic in markdown files.

Since the declarative syntax is human-readable, it can serve as documentation in itself. However logic may need to be explained further. Instead of maintaining documentation separate from your declarative code, you can keep both together.

Use markdown files to document your logic. Declarative code must be placed in code blocks surrounded by triple ticks. This standard wrapper makes them appear highlighted in most readers and separates them from text you do not want to parse.

````
# Invoice Handling

All invoices need tax to be applied as defined by state legislature.

```
    TAX_RATE = 0.14

    TAX(total: number) = total * TAX_RATE
```

- This is maintained by John Smith in Accounting.
````

By submitting these files to the engine, it extracts and uses all code blocks to enforce your logic, ensuring your documentation is actually in-sync with what the engine is executing.


## Specific Files

You can also declare all constants in one file, all types in one (or more) files, and rules in other files.

This approach can be useful to manage declarations but there is a catch: In any file you can only use constants and functions you know are already declared in the same workspace.

A generally useful loading order is:

```
Constants -> Functions -> Types -> Rules 
```

### Type Files

- These only declare types.

- Types can be written in strict or relaxed JSON syntax, supported by JSON5. So not all keys have to be double-quoted. Single-quoted values are acceptable, and a trailing comma in the last property in an object is allowed.

- Types are separated by empty lines. Inside a single type block, empty lines will lead to an error.

- Types can have comments starting at any place in a line. Comments start with # or //.

### Constant Files

- These only declare constants.

- Each line declares a single constant declared as:
```
<name> = <value>
```

- Constants can have comments starting at any place in a line. Comments start with # or //.

### Function Files

- These only declare custom functions.

- Each block declares a single function declared as:
```
<name>(<param1>: <type>, <param2: <type>...) {
    <line1>;
    <line2>; ...
    return <expression>
}
```

- Order is important. Functions can only use components known to be already recognized. So a function can use another function only if that function is built-in, or declared earlier.

- Functions are separated by empty lines. Inside a single function block, empty lines will lead to an error.

- Functions can have comments starting at any place in a line. Comments start with # or //.

### Rule Files

- These only declare rules.

- Each block declares a single rules. Different rule types may be mixed in a file.

- Order is not important, however, if a rule uses a constant or a custom function, those must be known to have already been declared.

- Rules can have annotations before their syntax. These can be on the same line or split over lines. Supported annotations are `@name()`, `@description()`, and `@salience()`

- Rules are separated by empty lines. Inside a single rule, empty lines will lead to an error.

- Rules can have comments starting at any place in a line. Comments start with # or //.

#### Reading specific files 

You can load specific files using the general reader or specific readers. This is only a personal preference.

```
const ruleContents = <load rule file as string>;
const reader = new RulesFileReader();
const result = reader.parse(ruleContents);

const myWorkspace = new Workspace();
if (result.errors.length === 0) {
    myWorkspace.addRules(result.rules);
}
```

- Results follow the expected format but each reader only returns the components it can read.

- Specific readers may be useful if you manage a large team. You can delegate file authoring to different members and ensure that each member manages only a single kind of component. For example, this prevents a rule editor from polluting the workspace with a custom function that may conflict with other function names.
