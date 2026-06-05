---
title: Testing Automation
---

# Testing Automation

The package includes a lightweight testing feature for validating rule behavior against a workspace.

Use the testing API when you want to:

- keep regression tests close to your rule definitions
- run several scenarios against the same workspace
- validate either full processing results or a single evaluated target
- read test cases from a DSL file instead of building them manually

The testing feature is exported from `@samatawy/rules/testing`.

## Main Testing Types

The main testing types are:

- `TestSuite` to collect and run test cases for one workspace
- `ForwardTestCase` to test `workspace.process(...)`
- `BackwardTestCase` to test `workspace.evaluate(target, ... )`
- `TestsFileReader` to parse test cases from a text file

## Creating a Test Suite

Create a workspace as usual, register your types and rules, then create a `TestSuite` for that workspace.

```ts
import { Workspace } from '@samatawy/rules';
import { TestSuite } from '@samatawy/rules/testing';

const workspace = new Workspace({
  strict_inputs: false,
  strict_outputs: false,
});

workspace.typeRegistry().addRootType({
  key: 'Order',
  properties: {
    total: 'number',
    approved: 'boolean',
    discount: 'number',
  },
});

workspace.addRule('IF Order.total >= 100 THEN Order.approved = true');
workspace.addRule('IF Order.total >= 200 THEN Order.discount = 10');

const suite = new TestSuite(workspace);
```

## Adding Test Cases in DSL

The simplest approach is to add test cases as DSL strings. This lets the suite parse the test case for you.

```ts
suite.addTestCase(`
  @name(Approves orders over threshold)
  TEST { Order: { total: 120, approved: false, discount: 0 } }
  EXPECT { Order: { approved: true } }
`);

suite.addTestCase(`
  @name(Applies high-value discount)
  @hint(Orders over 200 should receive a discount)
  TEST { Order: { total: 250, approved: false, discount: 0 } }
  EXPECT { Order: { approved: true, discount: 10 } }
`);

const results = suite.runAllTests();
console.log(results);
```

Each test result includes:

- `name` if provided
- `hint` if provided
- `passed`
- `output` for successful cases
- `errors` for failures

## Forward and Backward Tests

There are two kinds of test cases.

- Forward tests run the whole workspace using `process(...)`
- Backward tests evaluate a specific target using `evaluate(target, ... )`

Forward test example:

```ts
suite.addTestCase(`
  TEST { Order: { total: 80, approved: false, discount: 0 } }
  EXPECT { Order: { approved: false, discount: 0 } }
`);
```

Backward test example:

```ts
suite.addTestCase(`
  TEST Order.approved FROM { Order: { total: 120, approved: false, discount: 0 } }
  EXPECT { Order: { approved: true } }
`);
```

Use backward tests when you want to validate one computed target without asserting the entire processing path.

## Creating Test Cases in Code

If you prefer explicit TypeScript objects, you can create test cases directly.

```ts
import {
  BackwardTestCase,
  ForwardTestCase,
  TestSuite,
} from '@samatawy/rules/testing';

const suite = new TestSuite(workspace);

suite.addTestCase(new ForwardTestCase(
  { Order: { total: 120, approved: false, discount: 0 } },
  { Order: { approved: true } },
));

suite.addTestCase(new BackwardTestCase(
  'Order.discount',
  { Order: { total: 250, approved: false, discount: 0 } },
  { Order: { discount: 10 } },
));
```

## Expected Errors

You can also write negative tests that expect rule execution to fail.

```ts
suite.addTestCase(`
  @name(Rejects invalid totals)
  TEST { Order: { total: -1, approved: false, discount: 0 } }
  EXPECT ERRORS ["Invalid total"]
`);
```

This is useful for validation rules that throw exceptions or for workflows that intentionally reject bad input.

## Reading Test Cases from a File

If you want to keep test cases in a text file, use `TestsFileReader`.

```ts
import { Workspace } from '@samatawy/rules';
import { TestSuite, TestsFileReader } from '@samatawy/rules/testing';

const workspace = new Workspace();
const reader = new TestsFileReader({ workspace, read_by: 'block' });

const parsed = reader.parse(`
  @name(Approves order)
  TEST { Order: { total: 120, approved: false } }
  EXPECT { Order: { approved: true } }

  @name(Leaves small order unapproved)
  TEST { Order: { total: 80, approved: false } }
  EXPECT { Order: { approved: false } }
`);

const suite = new TestSuite(workspace);
for (const testCase of parsed.test_cases) {
  suite.addTestCase(testCase);
}
```

`TestsFileReader` is useful when you want rule authors or analysts to maintain test scenarios in the same DSL style as other declared components.

## Annotations

Testing DSL supports a few annotations before the `TEST` clause:

- `@name(...)` to label the test case
- `@hint(...)` to attach extra context
- `@disabled(...)` to temporarily skip a test case

You can also use declared custom annotations when you want to group ownership, team responsibility, ticket links, or similar workflow fields. See [Annotations](annotations.md).

Example:

```ts
suite.addTestCase(`
  @name(Temporary regression)
  @hint(Enable after pricing rules are finalized)
  @disabled(waiting for pricing review)
  TEST { Order: { total: 120, approved: false } }
  EXPECT { Order: { approved: true } }
`);
```

Disabled test cases stay in the suite but are skipped by `runTests(...)` and `runAllTests()`.
