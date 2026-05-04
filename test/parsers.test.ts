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

});

