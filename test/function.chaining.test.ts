import { describe, expect, it } from 'vitest';
import { Workspace } from '../src/engine/workspace';
import { FunctionParser } from '../src';

describe('Function Chaining tests', () => {

  it('handles function chaining syntax', async () => {
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

    space.addRule('if Person.children.count() > 2 then Person.hasManyChildren = true; Person.family_range = Person.ages.range()');
    space.addRule('set age_range = Person.family.age.range()');

    expect(space.checkTypes().valid).toBe(true);

    const ctx = space.loadContext({
      Person: {
        name: 'Alice', age: 30,
        children: ['Bob', 'Charlie', 'David'], ages: [25, 10, 15],
        family: [{ name: 'Bob', age: 10 }, { name: 'Charlie', age: 15 }, { name: 'David', age: 25 }]
      }
    });
    expect(space.applicableRules(ctx).length).toBe(2);
    const ok = space.process(ctx);
    expect(ok).toBe(true);
    const output = ctx.getOutput();
    // console.debug('Output with arrays:', output);
    expect(output.Person.hasManyChildren).toBe(true);
    expect(output.Person.family_range).toBe(15);

    const funcParser = new FunctionParser({ workspace: space });
    const funcDef = funcParser.parse('greeting(name: string) = "Hello, ".concat(name, "!")');
    expect(funcDef).not.toBeNull();

    space.functionRegistry().addFunction(funcDef!);

    space.addRule('if Person.name THEN greet = Person.name.greeting()');
    const ok2 = space.process(ctx);
    // expect(ok2).toBe(true);
    const output2 = ctx.getOutput();
    // console.debug('Output with function chaining:', output2);
    expect(output2.age_range).toBe(15);
    expect(output2.greet).toBe('Hello, Alice!');

    space.addRule('IF Person.family.count() > 2 THEN Person.average_dependant_age = Person.family.age.filter(age : age < 21).average()');

    const ok3 = space.process(ctx);
    expect(ok3).toBe(true);
    const output3 = ctx.getOutput();
    // console.debug('Output with function chaining and filter:', output3);
    expect(output3.Person.average_dependant_age).toBe(12.5);

    space.addRule('IF Person.name.length() == 5 THEN stated = concat(Person.name, " is a word").upperCase()');

    const ok4 = space.process(ctx);
    expect(ok4).toBe(true);
    const output4 = ctx.getOutput();
    // console.debug('Output with function chaining and filter:', output4);
    expect(output4.stated).toBe('ALICE IS A WORD');
  });

});