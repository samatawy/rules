import { describe, expect, it } from 'vitest';
import { Workspace } from '../src/engine/workspace';
import { FunctionParser } from '../src/parser/function.parser';
import { RulesEngine } from '../src/engine/rules.engine';

describe('Backward Chaining tests', () => {

  it('handles backward-chaining for variables', async () => {

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

    // Check that we can evaluate a variable that requires backward chaining to resolve dependencies
    // in a single iteration

    space.addRule('if count(Person.children) > 2 then Person.hasManyChildren = true; Person.family_range = range(Person.ages)');
    space.addRule('set age_range = range(Person.family.age)');

    const context = space.loadContext({
      Person: {
        name: 'Alice',
        age: 40,
        children: ['Bob', 'Charlie', 'David'],
        ages: [10, 8, 5],
        family: [
          { name: 'Bob', age: 10 },
          { name: 'Charlie', age: 8 },
          { name: 'David', age: 5 },
        ],
      },
    });

    const result = space.evaluate('age_range', context);
    expect(result).toEqual(5);
    expect(context.getOutput('Person.hasManyChildren')).toBe(undefined);
    // console.debug(context.getLog());
    expect(context.getLog().length).toBe(1);
  });

  it('handles backward-chaining in multiple steps', async () => {

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

    // Check that we can evaluate a variable that requires backward chaining to resolve dependencies
    // in a single iteration

    space.addRule('if count(Person.children) > 2 then Person.hasManyChildren = true; Person.family_range = range(Person.ages)');
    space.addRule('set age_range = range(Person.family.age)');
    space.addRule('if Person.hasManyChildren == true then Person.isPopular = true');

    const context = space.loadContext({
      Person: {
        name: 'Alice',
        age: 40,
        children: ['Bob', 'Charlie', 'David'],
        ages: [10, 8, 5],
        family: [
          { name: 'Bob', age: 10 },
          { name: 'Charlie', age: 8 },
          { name: 'David', age: 5 },
        ],
      },
    });

    // The method evaluate2() is currently being comapared evaluate().
    //
    // const result = space.evaluate2('Person.isPopular', context);
    // expect(result).toEqual(true);
    // expect(context.getOutput('Person.hasManyChildren')).toBe(true);
    // expect(context.getOutput('Person.isPopular')).toBe(true);
    // // console.debug(context.getLog());
    // expect(context.getLog().length).toBe(2);

    const quick = space.evaluate('Person.isPopular', context);
    expect(quick).toEqual(true);
    expect(context.getOutput('Person.hasManyChildren')).toBe(true);
    expect(context.getOutput('Person.isPopular')).toBe(true);
    console.debug(context.getLog());
    console.debug(context.getLog().length);
    expect(context.getLog().length).toBe(2);
  });

  it('handles backward-chaining with missing requirements', async () => {

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

    // Check that we can evaluate a variable that requires backward chaining to resolve dependencies
    // in a single iteration

    space.addRule('if count(Person.children) > 2 then Person.hasManyChildren = true; Person.family_range = range(Person.ages)');
    space.addRule('set age_range = range(Person.family.age)');
    space.addRule('if Person.hasManyChildren == true then Person.isPopular = true');

    const context = space.loadContext({
      Person: {
        name: 'Alice',
        age: 40,
        children: undefined,
        ages: [10, 8, 5],
        family: [
          { name: 'Bob', age: 10 },
          { name: 'Charlie', age: 8 },
          { name: 'David', age: 5 },
        ],
      },
    });

    // The method evaluate2() is currently being comapared evaluate().
    //
    // const result = space.evaluate2('Person.isPopular', context);
    // expect(result).toEqual(true);
    // expect(context.getOutput('Person.hasManyChildren')).toBe(true);
    // expect(context.getOutput('Person.isPopular')).toBe(true);
    // // console.debug(context.getLog());
    // expect(context.getLog().length).toBe(2);

    const quick = space.evaluate('Person.isPopular', context);
    expect(quick).toEqual(undefined);
    expect(context.getOutput('Person.hasManyChildren')).toBe(undefined);
    expect(context.getOutput('Person.isPopular')).toBe(undefined);
    console.debug(context.getLog(), context.getExceptions());
    // console.debug(context.getLog().length);
    expect(context.getLog().length).toBe(2);
    expect(context.getExceptions().length).toBe(2);
  });

});