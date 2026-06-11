import { describe, expect, it } from 'vitest';
import { Workspace } from '../src/engine/workspace';
import { TestParser } from '../src/parser/test.parser';
import { RulesEngine } from '../src/engine/rules.engine';

describe('Test Cases tests', () => {

  it('handles test cases', async () => {

    const space = new Workspace({ strict_inputs: true, strict_outputs: false });
    space.typeRegistry().addRootType({
      key: 'Person',
      properties: {
        name: 'string',
        age: 'number',
        children: 'string[]',
        ages: 'number[]',
        family: {
          type: 'array',
          items: {
            name: 'string',
            age: 'number',
          }
        }
      }
    });

    space.addRule('if count(Person.children) > 2 then Person.hasManyChildren = true; Person.family_range = range(Person.ages)');
    space.addRule('set age_range = range(Person.family.age)');

    const parser = new TestParser({ workspace: space });
    const case1 = parser.parseTestCase(`
      @name(Test case 1)
      @hint(This test checks if the rules correctly identify that a person has many children and calculates the family age range.)
      TEST {
          Person: {
            name: "Alice",
            age: 40,
            children: ["Bob", "Charlie", "David"],
            ages: [10, 8, 5],
            family: [
              { name: "Bob", age: 10 },
              { name: "Charlie", age: 8 },
              { name: "David", age: 5 }
            ]
          }
        }
      EXPECT {
          Person: {
            hasManyChildren: true,
            family_range: 5
          },
          age_range: 5
        }
    `);
    const result1 = case1.runTest(space);
    expect(result1.passed).toBe(true);

    const case2 = parser.parseTestCase(`
      @name(Test case 2)
      @hint(This test checks if the rules correctly handle missing children information and does not incorrectly assign hasManyChildren or calculate age_range.)
      TEST {
          "Person": {
            "name": "Alice",
            "age": 40,
            "ages": [10, 8, 5],
            "family": [
              { "name": "Bob", "age": 10 },
              { "name": "Charlie", "age": 8 },
              { "name": "David", "age": 5 }
            ]
          }
        }
      EXPECT {
          "Person": {
            hasManyChildren: true,
            family_range: 5
          },
        }
    `);
    const result2 = case2.runTest(space);
    expect(result2.passed).toBe(false);

    const case3 = parser.parseTestCase(`
      @name(Test case 3)
      @hint(This test checks expecting errors.)
      TEST {
          "Person": {
            "name": "Alice",
            "age": 40,
            "children": ["Bob", "Charlie"],
            "ages": [10, 8],
            "family": [
              { "name": "Bob", "age": 10 },
              { "name": "Charlie", "age": 8 }
            ]
          }
        }
      EXPECT ERRORS [
          "Invalid type",
    ]
    `);
    const result3 = case3.runTest(space);
    expect(result3.passed).toBe(false);

    const case4 = parser.parseTestCase(`
      @name(Test case 4)
      @hint(This test checks backward chaining.)
      TEST Person.family_range 
      FROM {
          "Person": {
            "name": "Alice",
            "age": 40,
            "children": ["Bob", "Charlie", "David"],
            "ages": [10, 8, 5],
            "family": [
              { "name": "Bob", "age": 10 },
              { "name": "Charlie", "age": 8 },
              { "name": "David", "age": 5 }
            ]
          }
        }
      EXPECT {
          Person: {
            family_range: 5
          },
        }
    `);
    const result4 = case4.runTest(space);
    expect(result4.passed).toBe(true);
    expect(result4.name).toEqual(case4.name);
    expect(result4.hint).toEqual(case4.hint);
  });

  it('matches array annotations on test cases by element and subset', async () => {
    const space = new Workspace({ strict_inputs: false, strict_outputs: false });
    const annotationName = `teams_${Date.now()}`;
    RulesEngine.annotationRegistry().register(annotationName, 'string[]');

    const parser = new TestParser({ workspace: space });
    const testCase = parser.parseTestCase(`
      @${annotationName}(["pricing", "qa", "risk"])
      TEST { value: 1 }
      EXPECT { value: 1 }
    `);

    expect(testCase.isAnnotated(annotationName)).toBe(true);
    expect(testCase.isAnnotated(annotationName, 'qa')).toBe(true);
    expect(testCase.isAnnotated(annotationName, ['pricing', 'risk'])).toBe(true);
    expect(testCase.isAnnotated(annotationName, ['pricing', 'missing'])).toBe(false);
  });

});