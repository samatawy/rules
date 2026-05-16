import { describe, expect, it } from 'vitest';
import { IfThenRule } from '../src/rules/conditional.rules';
import { WorkspaceTypeChecker } from '../src/engine/workspace.type.checker';
import { getDefinedType, hasDefinedType } from '../src/type.utils';
import { TypeRegistry } from '../src/engine/type.registry';
import { Workspace, type ObjectArrayType, type ObjectType } from '../src';

describe('Types Test', () => {

  it('handles typed inputs and outputs', async () => {
    const registry = new TypeRegistry();
    const types = new WorkspaceTypeChecker(registry, { strict_inputs: true, strict_outputs: true });
    registry.addRootType({
      key: 'Person',
      properties: {
        name: 'string',
        age: 'number',
        children: 'string[]',
      }
    });

    expect(registry.hasRootType('Person')).toBe(true);
    const personType = registry.getRootType('Person');
    expect(personType).toBeDefined();
    expect(personType!.properties!.name).toBe('string');
    expect(personType!.properties!.age).toBe('number');

    const validInput = { Person: { name: 'Alice', age: 30, children: ['Bob', 'Charlie'] } };
    expect(types.checkData(validInput).valid).toBe(true);

    const invalidArrayInput = { Person: { name: 'Alice', age: 30, children: [26, 'Bob'] } };
    const invalidArrayResult = types.checkData(invalidArrayInput);
    // console.debug(invalidArrayResult);
    expect(invalidArrayResult.valid).toBe(false);
    expect(invalidArrayResult.errors?.length).toBeGreaterThan(0);

    const invalidInput = { Person: { name: 50, age: 'thirty' }, Extra: true };
    const invalidResult = types.checkData(invalidInput);
    // console.debug(invalidResult);
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.errors?.length).toBeGreaterThan(0);

    // Check hasDefinedType and getDefinedType utilities
    expect(hasDefinedType(personType!, 'name')).toBe(true);
    expect(hasDefinedType(personType!, 'age')).toBe(true);
    expect(hasDefinedType(personType!, 'nonexistent')).toBe(false);
    expect(getDefinedType(personType!, 'name')).toBe('string');
    expect(getDefinedType(personType!, 'age')).toBe('number');
    expect(getDefinedType(personType!, 'nonexistent')).toBeUndefined();

    // Check hasType and getType methods in WorkspaceTypeChecker
    expect(types.hasType('Person')).toBe(true);
    expect(types.hasType('Person.name')).toBe(true);
    expect(types.getType('Person')).toBeDefined();
    expect(types.getType('Person.name')).toBe('string');
    expect(types.getType('Person.age')).toBe('number');
    expect(types.hasType('Nonexistent')).toBe(false);
    expect(types.getType('Nonexistent')).toBeUndefined();
  });


  it('handles type checking for rules', async () => {
    const registry = new TypeRegistry();
    const types = new WorkspaceTypeChecker(registry, { strict_inputs: true, strict_outputs: false });
    registry.addRootType({
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

    const rule = IfThenRule.parse('if Person.age > 18 then Person.isAdult = true');
    const typeCheckResult = rule.checkTypes(types);
    // console.debug(typeCheckResult);
    expect(typeCheckResult.valid).toBe(true);

    const arrayRule = IfThenRule.parse('if count(Person.children) > 2 then Person.hasManyChildren = true; Person.family_range = range(Person.family.age)');
    const arrayTypeCheckResult = arrayRule.checkTypes(types);
    // console.debug(arrayTypeCheckResult);
    expect(arrayTypeCheckResult.valid).toBe(true);

    const invalidRule = IfThenRule.parse('if Person.height > 180 then Person.isTall = true');
    const invalidTypeCheckResult = invalidRule.checkTypes(types);
    // console.debug(invalidTypeCheckResult);
    expect(invalidTypeCheckResult.valid).toBe(false);
    expect(invalidTypeCheckResult.errors?.length).toBeGreaterThan(0);
  });


  it('handles type checking for rules with functions', async () => {
    const registry = new TypeRegistry();
    const types = new WorkspaceTypeChecker(registry, { strict_inputs: true, strict_outputs: false });
    registry.addRootType({
      key: 'Person',
      properties: {
        name: 'string',
        age: 'number',
      }
    });

    const rule = IfThenRule.parse('if max(Person.age, 30) > 18 then Person.isAdult = true');
    const typeCheckResult = rule.checkTypes(types);
    // console.debug(typeCheckResult);
    expect(typeCheckResult.valid).toBe(true);

    const invalidRule = IfThenRule.parse('if max(Person.height, 180) > 180 then Person.isTall = true');
    const invalidTypeCheckResult = invalidRule.checkTypes(types);
    // console.debug(invalidTypeCheckResult);
    expect(invalidTypeCheckResult.valid).toBe(false);
    expect(invalidTypeCheckResult.errors?.length).toBeGreaterThan(0);

    const invalidParams = IfThenRule.parse('if max(Person.age, "thirty") > 18 then Person.isAdult = true');
    const invalidParamsTypeCheckResult = invalidParams.checkTypes(types);
    // console.debug(invalidParamsTypeCheckResult);
    expect(invalidParamsTypeCheckResult.valid).toBe(false);
    expect(invalidParamsTypeCheckResult.errors?.length).toBeGreaterThan(0);

    registry.clear();
    const types2 = new WorkspaceTypeChecker(registry, { strict_inputs: false, strict_outputs: true });
    registry.addRootType({
      key: 'Person',
      properties: {
        name: 'string',
        age: 'number',
        isAdult: 'boolean',
      }
    });

    const invalidOutput = IfThenRule.parse('if Person.age > 18 then Person.isAdult = true');
    const invalidOutputCheckResult = invalidOutput.checkTypes(types2);
    // console.debug(invalidOutputCheckResult);
    expect(invalidOutputCheckResult.valid).toBe(true);

    const invalidOutputType = IfThenRule.parse('if Person.age > 18 then Person.isAdult = "yes"');
    const invalidOutputTypeCheckResult2 = invalidOutputType.checkTypes(types2);
    // console.debug(invalidOutputTypeCheckResult2);
    expect(invalidOutputTypeCheckResult2.valid).toBe(false);
    expect(invalidOutputTypeCheckResult2.errors?.length).toBeGreaterThan(0);
  });

  it('handles type checking with type inheritance', async () => {
    const space = new Workspace({
      strict_syntax: true,
      strict_inputs: true,
      strict_outputs: true,
    });
    const registry = space.typeRegistry();

    registry.addRootType({
      key: 'Person',
      properties: {
        name: 'string',
        age: 'number',

        is_adult: 'boolean',  // for output type checking
      }
    });

    registry.addRootType({
      key: 'Employee',
      inherits: 'Person',
      // No properties defined here, but should inherit name and age from Person
    });

    registry.addRootType({
      key: 'Father',
      inherits: 'Person',
      properties: {
        // name: 'string',
        // age: 'number',
        children: 'string[]',
        ages: 'number[]',
        family: {
          type: 'array',
          inherits: 'Person',
        },

        family_range: 'number', // for output type checking
      }
    });

    expect(registry.getRootType('Employee')?.properties?.name).toBeDefined();
    expect(registry.getRootType('Employee')?.properties?.age).toBeDefined();
    expect(registry.getRootType('Father')?.properties?.family).toBeDefined();
    expect((registry.getRootType('Father')?.properties?.family as ObjectArrayType).items?.name).toBeDefined();
    expect((registry.getRootType('Father')?.properties?.family as ObjectArrayType).items?.age).toBeDefined();

    space.addRule('if Employee.age > 18 then Employee.is_adult = true');
    space.addRule('if Father.age > 18 then Father.is_adult = true; Father.family_range = range(Father.family.age)');
    space.addRule('if count(Father.family.age) > 1 then Father.family_range = range(Father.family.age)');

    const typeCheckResult = space.checkTypes();
    // console.debug('should be valid', typeCheckResult);
    expect(typeCheckResult.valid).toBe(true);

    space.addRule('if Employee.height > 180 then Employee.isTall = true; Father.family_range = range(Father.family.age)');
    const invalidTypeCheckResult = space.checkTypes();
    // console.debug('should be invalid', invalidTypeCheckResult);
    expect(invalidTypeCheckResult.valid).toBe(false);
    expect(invalidTypeCheckResult.errors?.length).toBeGreaterThan(0);
  });

});
