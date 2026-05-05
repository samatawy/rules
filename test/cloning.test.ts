import { describe, expect, it } from 'vitest';
import { WorkSpace } from '../src/engine/work.space';
import { FunctionParser } from '../src/parser/function.parser';

describe('Cloning tests', () => {

  it('handles workspace cloning safely', async () => {
    const space = new WorkSpace({ strict_inputs: true, strict_outputs: false });
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

    const double = new FunctionParser({ workspace: space }).parse('double(n: number) = n * 2');
    space.functionRegistry().addFunction(double!);

    space.addRule('if count(Person.children) > 2 then Person.hasManyChildren = true; Person.family_range = range(Person.ages)');
    space.addRule('set age_range = range(Person.family.age)');

    expect(space.checkTypes().valid).toBe(true);
    expect(space.getRules().length).toBe(2);
    expect(Object.keys(space.typeRegistry().getRootTypes()).length).toBe(1);
    expect(Object.keys(space.functionRegistry().getFunctions()).length).toBe(1);

    const clonedSpace = space.clone();

    // Verify that the cloned workspace has the same content
    expect(clonedSpace.checkTypes().valid).toBe(true);
    expect(clonedSpace.getRules().length).toBe(2);
    expect(Object.keys(clonedSpace.typeRegistry().getRootTypes()).length).toBe(1);
    expect(Object.keys(clonedSpace.functionRegistry().getFunctions()).length).toBe(1);

    // Mutate the original workspace and verify that the cloned workspace is not affected
    space.addRule('if Person.age > 18 then Person.isAdult = true');
    space.typeRegistry().addRootType({ key: 'Animal', properties: { species: 'string' } });
    const triple = new FunctionParser({ workspace: space }).parse('triple(n: number) = n * 3');
    space.functionRegistry().addFunction(triple!);

    expect(space.checkTypes().valid).toBe(true);
    expect(space.getRules().length).toBe(3);
    expect(Object.keys(space.typeRegistry().getRootTypes()).length).toBe(2);
    expect(Object.keys(space.functionRegistry().getFunctions()).length).toBe(2);

    // Verify that the cloned workspace is not affected by mutations to the original workspace
    expect(clonedSpace.checkTypes().valid).toBe(true);
    expect(clonedSpace.getRules().length).toBe(2);
    expect(Object.keys(clonedSpace.typeRegistry().getRootTypes()).length).toBe(1);
    expect(Object.keys(clonedSpace.functionRegistry().getFunctions()).length).toBe(1);
  });

});