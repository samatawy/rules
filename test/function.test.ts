import { describe, expect, it } from 'vitest';
import { Workspace } from '../src/engine/workspace';

describe('Function tests', () => {

  it('handle date functions', async () => {
    const space = new Workspace({});
    space.typeRegistry().addRootType({
      key: 'Person',
      properties: {
        birthdate: 'date',
      },
    });

    space.addRule('if Person.birthdate then year = Person.birthdate.year()');
    space.addRule('if Person.birthdate then weekday = Person.birthdate.weekday()');
    space.addRule('if Person.birthdate then month = Person.birthdate.month()');

    // accept date strings in ISO format
    let ctx = space.loadContext({ Person: { birthdate: '1971-01-20' } });
    space.process(ctx);
    let year = ctx.getOutput('year');
    expect(typeof year).toBe('number');
    expect(year).toBe(1971);
    expect(ctx.getOutput('weekday')).toBe(3);

    // also test with timestamp input
    ctx = space.loadContext({ Person: { birthdate: new Date('1971-01-20').getTime() } });
    space.process(ctx);
    year = ctx.getOutput('year');
    expect(typeof year).toBe('number');
    expect(year).toBe(1971);
    expect(ctx.getOutput('weekday')).toBe(3);

  });

  it('handle string manipulation functions', async () => {

    const space = new Workspace({});
    space.addRule('if Person.name then capitalized = Person.name.capitalizeWords()');
    let ctx = space.loadContext({ Person: { name: 'john doe' } });
    space.process(ctx);
    expect(ctx.getOutput('capitalized')).toBe('John Doe');

    space.addRule('if Formula.includes("C") then carbon_atoms = Formula.extract(".*C(\\d+).*")');
    space.addRule('if Formula.includes("H") then hydrogen_atoms = Formula.extract(".*H(\\d+).*")');
    space.addRule('if Formula.includes("O") then oxygen_atoms = Formula.extract(".*O(\\d+).*")');

    ctx = space.loadContext({ Formula: 'C6H12O6' });
    space.process(ctx);
    expect(ctx.getOutput('carbon_atoms')).toBe('6');
    expect(ctx.getOutput('hydrogen_atoms')).toBe('12');
    expect(ctx.getOutput('oxygen_atoms')).toBe('6');


  });


});