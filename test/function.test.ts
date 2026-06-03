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

    ctx = space.loadContext({ Formula: 'C6H1206' });
    space.process(ctx);
    expect(ctx.getOutput('carbon_atoms')).toBe('6');

  });

  it('handle array set functions', async () => {

    const space = new Workspace({});
    space.addRule('if A and B then union = A.union(B)');
    space.addRule('if A and B then intersection = A.intersection(B)');
    space.addRule('if A and B then difference = A.difference(B)');
    space.addRule('if A and B then symmetric_difference = A.symmetric_difference(B)');

    let ctx = space.loadContext({ A: [1, 2, 3, 4], B: [3, 4, 5] });
    space.process(ctx);
    expect(ctx.getOutput('union').sort()).toEqual([1, 2, 3, 4, 5]);
    expect(ctx.getOutput('intersection')).toEqual([3, 4]);
    expect(ctx.getOutput('difference')).toEqual([1, 2]);
    expect(ctx.getOutput('symmetric_difference').sort()).toEqual([1, 2, 5]);

  });

  it('handle unit conversion functions with canonical and alias names', async () => {

    const space = new Workspace({});
    space.addRule('if kph then speed_si = km_per_hour_to_meter_per_second(kph)');
    space.addRule('if kph then speed_alias = kph_to_mps(kph)');
    space.addRule('if sqm then area_si = square_m_to_square_ft(sqm)');
    space.addRule('if sqm then area_alias = sqm_to_sqft(sqm)');
    space.addRule('if hp then power = hp_to_btu_per_hour(hp)');
    space.addRule('if hp then power_alias = hp_to_btu(hp)');
    space.addRule('if j then charge_energy = j_to_ev(j)');
    space.addRule('if j then charge_energy_alias = j_to_eV(j)');

    const ctx = space.loadContext({
      kph: 36,
      sqm: 10,
      hp: 1,
      j: 1.60218e-19,
    });
    space.process(ctx);

    expect(ctx.getOutput('speed_si')).toBeCloseTo(10, 6);
    expect(ctx.getOutput('speed_alias')).toBeCloseTo(10, 6);
    expect(ctx.getOutput('area_si')).toBeCloseTo(107.639, 3);
    expect(ctx.getOutput('area_alias')).toBeCloseTo(107.639, 3);
    expect(ctx.getOutput('power')).toBeCloseTo(2544.43, 2);
    expect(ctx.getOutput('power_alias')).toBeCloseTo(2544.43, 2);
    expect(ctx.getOutput('charge_energy')).toBeCloseTo(1);
    expect(ctx.getOutput('charge_energy_alias')).toBeCloseTo(1);

  });


});