import { describe, expect, it } from 'vitest';
import { Workspace } from '../src/engine/workspace';
import { WorkLogger } from '../src/logging/work.logger';

describe('Speed tests', () => {

  it('suitable parsing speed', async () => {

    WorkLogger.setLogLevel('warn'); // Set log level to warn to reduce console output during performance test

    const space = new Workspace({ strict_inputs: false, strict_outputs: false });
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

    let iterations = 10_000;
    let started = Date.now().valueOf();
    for (let i = 0; i < iterations; i++) {
      space.addRule(`if Person.children.count() > ${i} then Person.child_count = ${i}`);
    }
    let ended = Date.now().valueOf();
    console.log(`Time taken to add ${iterations} rules: ${ended - started} ms`);
    console.log(`Average time per rule: ${(ended - started) / iterations} ms`);

    iterations = 1000;
    started = Date.now().valueOf();
    for (let i = 0; i < iterations; i++) {
      space.addRule(`if Person.children.count() > ${i} then Person.child_count = Person.children.filter(child : child.upperCase().contains("A"))`);
    }
    ended = Date.now().valueOf();
    console.log(`Time taken to add ${iterations} rules: ${ended - started} ms`);
    console.log(`Average time per rule: ${(ended - started) / iterations} ms`);

    // expect(space.checkTypes().valid).toBe(true);

  });

  it('suitable processing speed', async () => {

    WorkLogger.setLogLevel('warn'); // Set log level to warn to reduce console output during performance test

    const space = new Workspace({ strict_inputs: false, strict_outputs: false });
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

    let iterations = 1000;
    let started = Date.now().valueOf();
    for (let i = 0; i < iterations; i++) {
      space.addRule(`if Person.children.count() > ${i} then Person.child_count = ${i}`);
    }
    let ended = Date.now().valueOf();
    console.log(`Time taken to add ${iterations} rules: ${ended - started} ms`);
    console.log(`Average time per rule: ${(ended - started) / iterations} ms`);

    iterations = 1000;
    started = Date.now().valueOf();
    for (let i = 0; i < iterations; i++) {
      space.addRule(`if Person.children.count() > ${i} then Person.child_count = Person.children.filter(child : child.upperCase().contains("A"))`);
    }
    ended = Date.now().valueOf();
    console.log(`Time taken to add ${iterations} rules: ${ended - started} ms`);
    console.log(`Average time per rule: ${(ended - started) / iterations} ms`);

    // expect(space.checkTypes().valid).toBe(true);

    const ctx = space.loadContext({
      Person: {
        name: 'Alice', age: 30,
        children: ['Bob', 'Charlie', 'David'], ages: [25, 10, 15],
        family: [{ name: 'Bob', age: 10 }, { name: 'Charlie', age: 15 }, { name: 'David', age: 25 }]
      }
    });

    iterations = 1000;

    // started = Date.now().valueOf();
    // for (let i = 0; i < iterations; i++) {
    //   space.process(ctx);
    // }
    // ended = Date.now().valueOf();
    // console.log(`Time taken to process ${iterations} times: ${ended - started} ms`);
    // console.log(`Average time per process(): ${(ended - started) / iterations} ms`);

    const rules = space.getRules().length;

    started = Date.now().valueOf();
    for (let i = 0; i < iterations; i++) {
      space.process(ctx);
    }
    ended = Date.now().valueOf();
    console.log(`Time taken to process ${iterations} times with ${rules} rules: ${ended - started} ms`);
    console.log(`Average time per process(): ${(ended - started) / iterations} ms`);

    const ruleCount = space.dependencyGraph().applicableRules(ctx).length;
    console.log(`Average time per rule per process(): ${(ended - started) / (iterations * ruleCount)} ms`);

  });
});