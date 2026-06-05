import { describe, expect, it } from 'vitest';
import { Workspace } from '../src/engine/workspace';
import { Logger, Stopwatch } from '../src/logging';

import inspector from 'node:inspector';
import fs from 'node:fs';

import { ExecutableParser, ExpressionParser } from '../src';

const session = new inspector.Session();
session.connect();

describe('Speed tests', () => {

  it('suitable parsing speed', async () => {

    Logger.setLogLevel('warn'); // Set log level to warn to reduce console output during performance test

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
    let stopwatch = Stopwatch.start('error', `Adding ${iterations} rules`);
    for (let i = 0; i < iterations; i++) {
      space.addRule(`if Person.children.count() > ${i} then Person.child_count = ${i}`);
    }
    // console.debug(stopwatch.checkpoint().message);
    stopwatch.logEnd();

    iterations = 1000;
    stopwatch = Stopwatch.start('error', `Adding ${iterations} rules with function calls`);
    for (let i = 0; i < iterations; i++) {
      space.addRule(`if Person.children.count() > ${i} then Person.child_count = Person.children.filter(child : child.upperCase().contains("A"))`);
    }
    console.debug(stopwatch.checkpoint().message);

    // expect(space.checkTypes().valid).toBe(true);
  });

  it('suitable processing speed', async () => {

    Logger.setLogLevel('warn'); // Set log level to warn to reduce console output during performance test

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
    let stopwatch = Stopwatch.start('error', `Adding ${iterations} rules`);
    for (let i = 0; i < iterations; i++) {
      space.addRule(`if Person.children.count() > ${i} then Person.child_count = ${i}`);
    }
    stopwatch.logEnd();

    iterations = 1000;
    stopwatch = Stopwatch.start('error', `Adding ${iterations} rules`);
    for (let i = 0; i < iterations; i++) {
      space.addRule(`if Person.children.count() > ${i} then Person.child_count = Person.children.filter(child : child.upperCase().contains("A"))`);
    }
    // console.debug(stopwatch.checkpoint().message);
    stopwatch.logEnd();

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

    stopwatch = Stopwatch.start('error', `Processing ${iterations} times with ${rules} rules`);
    for (let i = 0; i < iterations; i++) {
      space.process(ctx);
    }
    // console.debug(stopwatch.checkpoint().message);
    stopwatch.logEnd();

    // const ruleCount = space.dependencyGraph().applicableRules(ctx).length;

  });

  it('test compiled functions', async () => {
    // Start recording the CPU activity
    session.post('Profiler.enable');
    session.post('Profiler.start');

    Logger.setLogLevel('error'); // Set log level to error to reduce output during test

    const space = new Workspace();
    const expressionParser = new ExpressionParser({ workspace: space });
    const executableParser = new ExecutableParser({ workspace: space });

    space.addFunction({
      name: 'calc',
      parameters: [
        { name: 'a', type: 'number' },
        { name: 'b', type: 'number' },
      ],
      lines: [
        executableParser.parse('c = a + b')!,
        executableParser.parse('d = a - b')!,
      ],
      expression: expressionParser.parse('c + d'),
    });
    space.addRule('if a AND b then set x = calc(4, 5)');

    const ctx = space.loadContext({ a: 4, b: 5 });
    const iterations = 100_000;

    let stopwatch = Stopwatch.start('error', `Executing uncompiled functions ${iterations} times`);
    for (let i = 0; i < iterations; i++) {
      space.process(ctx);
    }
    // console.debug(stopwatch.checkpoint().message);
    stopwatch.logEnd();

    const spaceResult = space.evaluate('x', ctx);

    // console.debug('Result of function from workspace:', spaceResult);
    expect(spaceResult).toEqual(4 * 2);

    const func = new Function('a', 'b', 'return a + b;');
    const compiledFunc = func as any as (...args: any[]) => any;

    const result = compiledFunc(2, 3);
    // console.debug('Result of compiled function:', result);
    expect(result).toEqual(5);

    const funclines = new Function('a', 'b', 'c = a + b; d = a - b; return c + d;');
    // as any as (...args: any[]) => any;
    const result2 = funclines(4, 5);
    // console.debug('Result of multiline function:', result2);
    expect(result2).toEqual(4 * 2);

    stopwatch = Stopwatch.start('error', `Execution of compiled multiline function ${iterations} times`);

    for (let i = 0; i < iterations; i++) {
      funclines(4, 5);
    }
    // console.debug(stopwatch.checkpoint().message);
    stopwatch.logEnd();

    // Stop recording and save the physical profile directly to disk
    session.post('Profiler.stop', (err, { profile }) => {
      if (!err && profile) {
        fs.writeFileSync('./rules_bottleneck.cpuprofile', JSON.stringify(profile));
        console.log('Successfully saved rules_bottleneck.cpuprofile!');
      }
    });
  });

});