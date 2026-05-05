import { describe, expect, it } from 'vitest';
import { IfThenElseRule, IfThenRule } from '../src/rules/conditional.rules';
import { WorkSpace } from '../src/engine/work.space';
import { ExpressionParser } from '../src/parser/expression.parser';
import { LogicalExpression } from '../src/syntax/logical.expression';
import { TernaryExpression } from '../src/syntax/ternary.expression';
import { ComparisonExpression } from '../src/syntax/comparison.expression';
import { ArithmeticExpression } from '../src/syntax/arithmetic.expression';

describe('Parsers Tests', () => {


  it('parse expressions', async () => {
    const parser = new ExpressionParser({});

    const expr1 = parser.parse('x > 10 && y < 5');
    expect(expr1).toBeInstanceOf(LogicalExpression);
    expect(expr1.required().size).toBe(2);

    const expr2 = parser.parse('a == 5 || b != 3');
    expect(expr2).toBeInstanceOf(LogicalExpression);
    const expr3 = parser.parse('x > 10 && (y < 5 || z == 0)');
    expect(expr3).toBeInstanceOf(LogicalExpression);
    expect(expr3.required().size).toBe(3);

    const expr4 = parser.parse('x > 10 ? y : z');
    expect(expr4).toBeInstanceOf(TernaryExpression);
    expect(expr4.required().size).toBe(3);

    const expr5 = parser.parse('x + 5 == y * 2');
    expect(expr5).toBeInstanceOf(ComparisonExpression);
    const expr6 = parser.parse('(x + 5) * 2 == (y / 2)');
    expect(expr6).toBeInstanceOf(ComparisonExpression);
    const expr7 = parser.parse('x + y >= 5 * 2');
    expect(expr7).toBeInstanceOf(ComparisonExpression);
    expect(expr7.required().size).toBe(2);

    const expr8 = parser.parse('x + y - 5 * 2');
    expect(expr8).toBeInstanceOf(ArithmeticExpression);
    const expr9 = parser.parse('(x + y) % 5');
    expect(expr9).toBeInstanceOf(ArithmeticExpression);
    expect(expr9.required().size).toBe(2);

    const expr10 = parser.parse('5 in [1, 2, 3]');
    expect(expr10).toBeInstanceOf(ComparisonExpression);
    const expr11 = parser.parse('x in ["1", "2", "3"]');
    expect(expr11).toBeInstanceOf(ComparisonExpression);
  });


  it('parse functions', async () => {
    const space = new WorkSpace();
    space.addRule('if x < avogadro() then approx = floor(pi())');
    space.addRule('if x > max(1, 2, 3) then year = year(now())');
    space.addRule('if x >= 10 then calc = max(5, 10, 15) else result = min(5, 10)');

    expect(space.checkTypes().valid).toBe(true);

    const ctx = space.loadContext({ x: 10 });
    expect(space.applicableRules(ctx).length).toBe(3);
    space.process(ctx);
    expect(ctx.getOutput('approx')).toBe(3);
    expect(ctx.getOutput('year')).toEqual(new Date().getFullYear());
    expect(ctx.getOutput('calc')).toBe(15);

    space.addRule('if count(person.children) > 2 then person.child_count = count(person.children); person.age_range = range(person.children)');
    const ctx2 = space.loadContext({ person: { children: [1, 8, 16] } });
    expect(space.applicableRules(ctx2).length).toBe(1);
    space.process(ctx2);
    expect(ctx2.getOutput('person.child_count')).toBe(3);
    expect(ctx2.getOutput('person.age_range')).toBe(15);

    // console.debug('Logged rules during processing:', ctx.getLog().map(logged => ({ rule: logged.rule.toString(), effect: logged.effect })));
  });

  it('parse switch expressions', async () => {
    const space = new WorkSpace();
    space.addRule('if status == "A" or status == "B" or status == "C" then result = SWITCH(status) CASE "A": "one", CASE "B": "two", DEFAULT: "other" ELSE result = "unknown"');
    const ctx1 = space.loadContext({ status: "A" });
    expect(space.applicableRules(ctx1).length).toBe(1);
    space.process(ctx1);
    expect(ctx1.getOutput('result')).toBe('one');

    const ctx2 = space.loadContext({ status: "B" });
    expect(space.applicableRules(ctx2).length).toBe(1);
    space.process(ctx2);
    expect(ctx2.getOutput('result')).toBe('two');

    const ctx3 = space.loadContext({ status: "C" });
    expect(space.applicableRules(ctx3).length).toBe(1);
    space.process(ctx3);
    expect(ctx3.getOutput('result')).toBe('other');
  });

  it('throws errors for invalid syntax', async () => {
    const parser = new ExpressionParser({});

    expect(() => parser.parse('')).toThrow("Empty expression");
    expect(() => parser.parse('x > ')).toThrow();
    expect(() => parser.parse('> 10')).toThrow();
    expect(() => parser.parse('x > 10 &&')).toThrow();
    expect(() => parser.parse('&& y < 5')).toThrow();
    expect(() => parser.parse('x > 10 ? y')).toThrow();
    expect(() => parser.parse('x > 10 ? y :')).toThrow();
    expect(() => parser.parse('x + * 5')).toThrow();
    expect(() => parser.parse('(x + 5')).toThrow();
    expect(() => parser.parse('x + 5)')).toThrow();
    expect(() => parser.parse('max(1, 2, )')).toThrow();
    expect(() => parser.parse('min(1 3)')).toThrow();
    expect(() => parser.parse('unknownFunc(1, 2)')).toThrow();
    expect(() => parser.parse('x IN (1, 2, 3)')).toThrow();

    try {
      IfThenRule.parse('if x then z');
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
    }
    expect(() => IfThenRule.parse('if x then z')).toThrow();
    expect(() => IfThenElseRule.parse('if x then y else')).toThrow();
    expect(() => IfThenElseRule.parse('if x then else z')).toThrow();
    expect(() => IfThenElseRule.parse('if then y else z')).toThrow();
  });

  it('parse rules with variable conditions', async () => {
    const space = new WorkSpace();
    space.addRule('if isActive then status = "active" else status = "inactive"');
    space.addRule('if person.age then status = "age_known" else status = "age_unknown"');
    const ctx1 = space.loadContext({ isActive: true });
    expect(space.applicableRules(ctx1).length).toBe(1);
    space.process(ctx1);
    expect(ctx1.getOutput('status')).toBe('active');

    const ctx2 = space.loadContext({ isActive: false });
    expect(space.applicableRules(ctx2).length).toBe(1);
    space.process(ctx2);
    expect(ctx2.getOutput('status')).toBe('inactive');

    const ctx3 = space.loadContext({ person: { age: 30 } });
    expect(space.applicableRules(ctx3).length).toBe(1);
    space.process(ctx3);
    expect(ctx3.getOutput('status')).toBe('age_known');

    const ctx4 = space.loadContext({ person: { age: null } });
    expect(space.applicableRules(ctx4).length).toBe(1);
    space.process(ctx4);
    expect(ctx4.getOutput('status')).toBe('age_unknown');
  });

  it('parse ternary expressions', async () => {
    const parser = new ExpressionParser({});
    const expr = parser.parse('x > 10 ? y : z');
    expect(expr).toBeInstanceOf(TernaryExpression);

    const expr2 = parser.parse('IF(x > 10)? y : z');
    expect(expr2).toBeInstanceOf(TernaryExpression);

    const space = new WorkSpace();
    space.addRule('if x then result = x? "greater" : "lesser"');
    space.addRule('if x then result = not(x < 10)? "greater" : "lesser"');
    const ctx1 = space.loadContext({ x: 15 });
    expect(space.applicableRules(ctx1).length).toBe(2);
    space.process(ctx1);
    expect(ctx1.getOutput('result')).toBe('greater');

    const ctx2 = space.loadContext({ x: 5 });
    space.process(ctx2);
    expect(ctx2.getOutput('result')).toBe('lesser');
  });

});

