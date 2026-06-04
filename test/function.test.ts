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
    space.addRule('if Person.name then encoded = Person.name.base64_encode()');
    space.addRule('if Encoded then decoded = Encoded.base64_decode()');
    space.addRule('if Person.name then hex_encoded = Person.name.hex_encode()');
    space.addRule('if HexEncoded then hex_decoded = HexEncoded.hex_decode()');
    space.addRule('if Url then url_encoded = Url.url_encode()');
    space.addRule('if UrlEncoded then url_decoded = UrlEncoded.url_decode()');
    space.addRule('if Html then html_escaped = Html.html_escape()');
    space.addRule('if HtmlEscaped then html_unescaped = HtmlEscaped.html_unescape()');
    space.addRule('if JsonText then json_escaped = JsonText.json_escape()');
    space.addRule('if JsonEscaped then json_unescaped = JsonEscaped.json_unescape()');

    let ctx = space.loadContext({ Person: { name: 'john doe' } });
    space.process(ctx);
    expect(ctx.getOutput('capitalized')).toBe('John Doe');

    space.addRule('if Formula.includes("C") then carbon_atoms = Formula.extract(".*C(\\d+).*")');
    space.addRule('if Formula.includes("H") then hydrogen_atoms = Formula.extract(".*H(\\d+).*")');
    space.addRule('if Formula.includes("O") then oxygen_atoms = Formula.extract(".*O(\\d+).*")');

    ctx = space.loadContext({ Formula: 'C6H1206' });
    space.process(ctx);
    expect(ctx.getOutput('carbon_atoms')).toBe('6');

    ctx = space.loadContext({
      Person: { name: 'Hello ✓' },
      Encoded: 'SGVsbG8g4pyT',
      HexEncoded: '48656c6c6f20e29c93',
      Url: 'email+tag@example.com/a path',
      UrlEncoded: 'email%2Btag%40example.com%2Fa%20path',
      Html: '<a href="/x?y=1&z=2">Hi</a>',
      HtmlEscaped: '&lt;a href=&quot;/x?y=1&amp;z=2&quot;&gt;Hi&lt;/a&gt;',
      JsonText: 'Line 1\n"quoted"',
      JsonEscaped: 'Line 1\\n\\"quoted\\"',
    });
    space.process(ctx);

    expect(ctx.getOutput('encoded')).toBe('SGVsbG8g4pyT');
    expect(ctx.getOutput('decoded')).toBe('Hello ✓');
    expect(ctx.getOutput('hex_encoded')).toBe('48656c6c6f20e29c93');
    expect(ctx.getOutput('hex_decoded')).toBe('Hello ✓');
    expect(ctx.getOutput('url_encoded')).toBe('email%2Btag%40example.com%2Fa%20path');
    expect(ctx.getOutput('url_decoded')).toBe('email+tag@example.com/a path');
    expect(ctx.getOutput('html_escaped')).toBe('&lt;a href=&quot;/x?y=1&amp;z=2&quot;&gt;Hi&lt;/a&gt;');
    expect(ctx.getOutput('html_unescaped')).toBe('<a href="/x?y=1&z=2">Hi</a>');
    expect(ctx.getOutput('json_escaped')).toBe('Line 1\\n\\"quoted\\"');
    expect(ctx.getOutput('json_unescaped')).toBe('Line 1\n"quoted"');

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

  it('handle array inspection functions', async () => {

    const space = new Workspace({});
    space.addRule('if values then count_value = values.count()');
    space.addRule('if values then total_value = values.total()');
    space.addRule('if values then gcd_value = values.gcd()');
    space.addRule('if values then hcf_value = values.hcf()');
    space.addRule('if values then lcm_value = values.lcm()');

    const ctx = space.loadContext({ values: [12, 18, 24] });
    space.process(ctx);

    expect(ctx.getOutput('count_value')).toBe(3);
    expect(ctx.getOutput('total_value')).toBe(54);
    expect(ctx.getOutput('gcd_value')).toBe(6);
    expect(ctx.getOutput('hcf_value')).toBe(6);
    expect(ctx.getOutput('lcm_value')).toBe(72);

  });

  it('handle numeric manipulation functions', async () => {

    const space = new Workspace({});
    space.addRule('if value then absolute = value.abs()');
    space.addRule('if value then sign_value = value.sign()');
    space.addRule('if value then rounded = value.round_to(2)');
    space.addRule('if value then truncated = value.truncate()');
    space.addRule('if value then clamped = value.clamp(10, 0)');
    space.addRule('if value then modded = value.modulo(4)');
    space.addRule('if value then squared = value.power(2)');
    space.addRule('if value2 then rooted = value2.root(3)');
    space.addRule('if count then factorial_value = count.factorial()');
    space.addRule('if n and r then permutations = n.permutation(r)');
    space.addRule('if n and r then combinations = n.combination(r)');

    const ctx = space.loadContext({
      value: -5.678,
      value2: -8,
      count: 5,
      n: 5,
      r: 2,
    });
    space.process(ctx);

    expect(ctx.getOutput('absolute')).toBeCloseTo(5.678, 6);
    expect(ctx.getOutput('sign_value')).toBe(-1);
    expect(ctx.getOutput('rounded')).toBeCloseTo(-5.68, 6);
    expect(ctx.getOutput('truncated')).toBe(-5);
    expect(ctx.getOutput('clamped')).toBe(0);
    expect(ctx.getOutput('modded')).toBeCloseTo(2.322, 6);
    expect(ctx.getOutput('squared')).toBeCloseTo(32.239684, 6);
    expect(ctx.getOutput('rooted')).toBe(-2);
    expect(ctx.getOutput('factorial_value')).toBe(120);
    expect(ctx.getOutput('permutations')).toBe(20);
    expect(ctx.getOutput('combinations')).toBe(10);

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