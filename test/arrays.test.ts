import { describe, expect, it } from 'vitest';
import { Workspace } from '../src/engine/workspace';

describe('Engine tests', () => {

  it('handles arrays in rules and types', async () => {
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

    expect(space.checkTypes().valid).toBe(true);

    const ctx = space.loadContext({
      Person: {
        name: 'Alice', age: 30,
        children: ['Bob', 'Charlie', 'David'], ages: [5, 10, 15],
        family: []
      }
    });
    expect(space.applicableRules(ctx).length).toBe(1);
    const ok = space.process(ctx);
    expect(ok).toBe(true);
    const output = ctx.getOutput();
    // console.debug('Output with arrays:', output);
    expect(output.Person.hasManyChildren).toBe(true);
    expect(output.Person.family_range).toBe(10);

    const ctx2 = space.loadContext({
      Person: {
        name: 'Alice', age: 30,
        family: [{ name: 'Bob', age: 5 }, { name: 'Charlie', age: 10 }, { name: 'David', age: 15 }]
      }
    });
    expect(space.applicableRules(ctx2).length).toBe(1);
    const ok2 = space.process(ctx2);
    expect(ok2).toBe(true);
    const output2 = ctx2.getOutput();
    // console.debug('Output with family array:', output2);
    expect(output2.age_range).toBe(10);

    const invalidCtx = space.loadContext({ Person: { name: 'Alice', age: 30, children: ['Bob', 'Charlie', 'David'], ages: [5, 'ten', 15] } });
    const ok3 = space.process(invalidCtx);
    expect(ok3).toBe(false);
    expect(invalidCtx.getOutput().Person.family_range).toBeUndefined();
    // console.debug('Output with invalid array types:', JSON.stringify(invalidCtx.getExceptions()));
    // console.debug('Output with invalid array types:', invalidCtx.getExceptions());
  });


  it('handles lambda expressions', async () => {
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

    space.addRule('if every(Person.family, member : member.age > 10) then Person.hasOldChildren = true else Person.hasOldChildren = false');

    expect(space.checkTypes().valid).toBe(true);

    const ctx = space.loadContext({
      Person: {
        name: 'Alice', age: 30,
        family: [{ name: 'Bob', age: 15 }, { name: 'Charlie', age: 25 }, { name: 'David', age: 20 }]
      }
    });
    expect(space.applicableRules(ctx).length).toBe(1);
    const ok = space.process(ctx);
    expect(ok).toBe(true);
    const output = ctx.getOutput();
    // console.debug('Output with lambda expression:', output);
    expect(output.Person.hasOldChildren).toBe(true);

    space.clearRules();
    space.addRule('set adultChildren = count(filter(Person.family, member : member.age >= 21))');
    space.addRule('set family.children = count(filter(Person.family, member : member.age >= 21))');

    // console.debug(space.checkTypes());
    expect(space.checkTypes().valid).toBe(true);

    const ctx2 = space.loadContext({
      Person: {
        name: 'Alice', age: 30,
        family: [{ name: 'Bob', age: 5 }, { name: 'Charlie', age: 8 }, { name: 'David', age: 22 }]
      }
    });
    const ok2 = space.process(ctx2);
    expect(ok2).toBe(true);
    const output2 = ctx2.getOutput();
    // console.debug('Output with lambda expression - no older members:', output2);
    expect(output2.adultChildren).toBe(1);

    space.clearRules();
    space.addRule('if any(Person.family, member : member.years < 18) then Person.hasMinorChildren = true');
    // console.debug(space.checkTypes());
    expect(space.checkTypes().valid).toBe(false);
  });

  it('sorts arrays by lamda', async () => {
    const space = new Workspace({ strict_inputs: false });
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

    space.addRule('if count(Person.ages) > 1 then Person.ages = sort(Person.ages, age: -age)');
    space.addRule('if count(Person.family) > 1 then Person.family = sort(Person.family, member: member.age)');

    // console.debug(space.checkTypes());
    expect(space.checkTypes().valid).toBe(true);

    const ctx = space.loadContext({
      Person: {
        name: 'Alice', age: '30',
        ages: [20, 25, 15],
        family: [{ name: 'Bob', age: 15 }, { name: 'Charlie', age: 25 }, { name: 'David', age: 20 }]
      }
    });
    console.debug(space.typeChecker().checkData(ctx.getOutput()));

    expect(space.applicableRules(ctx).length).toBe(2);
    const ok = space.process(ctx);
    expect(ok).toBe(true);
    const output = ctx.getOutput();
    console.debug('Output with lambda expression:', output);
    expect(output.Person.ages[0]).toBe(25);
    expect(output.Person.ages[2]).toBe(15);
    expect(output.Person.family[0].age).toBe(15);
    expect(output.Person.family[2].age).toBe(25);

  });

});