import { describe, expect, it } from 'vitest';
import { Workspace } from '../src/engine/workspace';

describe('Command tests', () => {

  it('handles deferred command actions', async () => {
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

    space.commandRegistry().register({
      keyword: 'test_cmd',
      immediate: false,
      name: 'Test Command',
      arguments: {
        first: 'string',
        second: 'number'
      },
      execute: (params) => {
        // console.log('Executing test command with params:', params);
        return params.second * 2;
      },
      // executeAsync: (params) => {
      //   console.log('Executing test command with params:', params);
      //   return Promise.resolve(params.second * 2);
      // }
    });

    space.addRule('IF Person.name THEN RUN test_cmd { first: Person.name, second: Person.age }');

    expect(space.checkTypes().valid).toBe(true);

    const ctx = space.loadContext({
      Person: {
        name: 'Alice', age: 30,
        children: ['Bob', 'Charlie', 'David'], ages: [5, 10, 15],
        family: []
      }
    });
    expect(space.dependencyGraph().applicableRules(ctx).length).toBe(1);
    const ok = space.process(ctx);
    expect(ok).toBe(true);
    const output = ctx.getOutput();
    // console.debug('Output before. deferred execution:', output);

    ctx.commandHandler().executeDeferred().then(() => {
      const finalOutput = ctx.getOutput();
      // console.debug('Output after deferred execution:', finalOutput);
      expect(finalOutput['test_cmd']).toBe(60);
    }).catch(err => {
      console.error('Error executing command:', err);
      throw err;
    });

  });

  it('handles immediate command actions', async () => {
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

    space.commandRegistry().register({
      keyword: 'test_cmd',
      immediate: true,
      name: 'Test Command',
      arguments: {
        first: 'string',
        second: 'number'
      },
      execute: (params) => {
        console.log('Executing test command with params:', params);
        return params.second * 2;
      },
      // executeAsync: (params) => {
      //   console.log('Executing test command with params:', params);
      //   return Promise.resolve(params.second * 2);
      // }
    });

    space.addRule('IF Person.name THEN RUN test_cmd { first: Person.name, second: Person.age }');
    space.addRule('IF test_cmd > 50 THEN test_cmd_square = test_cmd.power(2)');

    expect(space.checkTypes().valid).toBe(true);

    const ctx = space.loadContext({
      Person: {
        name: 'Alice', age: 30,
        children: ['Bob', 'Charlie', 'David'], ages: [5, 10, 15],
        family: []
      }
    });
    expect(space.dependencyGraph().applicableRules(ctx).length).toBe(1);
    const ok = space.process(ctx);
    expect(ok).toBe(true);
    const output = ctx.getOutput();
    console.debug('Output after immediate execution:', output);
    expect(output['test_cmd']).toBe(60);
    expect(output['test_cmd_square']).toBe(3600);

  });


  it('rejects command actions inside functions', async () => {
    const space = new Workspace({ strict_inputs: true, strict_outputs: false });

    space.commandRegistry().register({
      keyword: 'test_cmd',
      immediate: true,
      name: 'Test Command',
      arguments: {
        first: 'number',
      },
      execute: (params) => {
        console.log('Executing test command with params:', params);
        return params.first * 2;
      },
    });

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

    expect(() => {
      space.addFunction(`test_func(x: { age: number }) { RUN test_cmd { first: x.age }; return test_cmd }`)
    }).toThrow();

    // space.addRule('IF Person.name THEN test_func_result = test_func(Person.age)');

    // const ctx = space.loadContext({
    //   Person: {
    //     name: 'Alice', age: 30,
    //     children: ['Bob', 'Charlie', 'David'], ages: [5, 10, 15],
    //     family: []
    //   }
    // });
    // const ok = space.process(ctx);
    // expect(ok).toBe(true);
    // const output = ctx.getOutput();
    // console.debug('Output after processing function with command:', output);
    // expect(output['test_func_result']).toBe(60);

  });


  it('rejects invalid commands', async () => {
    const space = new Workspace({ strict_inputs: false, strict_outputs: false });

    expect(() => {
      space.commandRegistry().register({
        keyword: 'test_cmd',
        immediate: true,
        name: 'Test Command',
        arguments: {
          first: 'string',
          second: 'number'
        },
      });
    }).toThrow();

    expect(() => {
      space.commandRegistry().register({
        keyword: 'test_cmd',
        immediate: true,
        name: 'Test Command',
        arguments: {
          first: 'string',
          second: 'number'
        },
        execute: (params) => {
          console.log('Executing test command with params:', params);
          return params.second * 2;
        },
        executeAsync: (params) => {
          console.log('Executing test command with params:', params);
          return Promise.resolve(params.second * 2);
        }
      });
    }).toThrow();

    expect(() => {
      space.commandRegistry().register({
        keyword: 'test_cmd',
        immediate: true,
        name: 'Test Command',
        arguments: {
          first: 'string',
          second: 'number'
        },
        executeAsync: (params) => {
          console.log('Executing test command with params:', params);
          return Promise.resolve(params.second * 2);
        }
      });
    }).toThrow();

  });

});