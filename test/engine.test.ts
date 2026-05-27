import { describe, expect, it } from 'vitest';
import { DependencyGraph } from '../src/engine/graph/dependency.graph';
import { IfThenElseRule, IfThenRule } from '../src/rules/conditional.rules';
import { Workspace } from '../src/engine/workspace';
import { ExpressionParser } from '../src/parser/expression.parser';
import { RuleParser } from '../src/parser/rule.parser';
import { CustomFunctionExpression } from '../src/functions/custom.function';
import { FunctionParser } from '../src/parser/function.parser';

describe('Engine tests', () => {

  it('add rules to graph', async () => {

    const graph = new DependencyGraph();
    const r1 = IfThenRule.parse('if x then y = true');
    expect(r1.required().size).toBe(1);
    const r2 = IfThenRule.parse('if a then b = true');
    expect(r2.required().size).toBe(1);

    graph.addRule(r1);
    graph.addRule(r2);

    expect(graph.getRoots().length).toBe(2);
  });


  it('add rules to workspace and find applicable rules to context', async () => {

    const space = new Workspace();
    const graph = space.dependencyGraph();

    const r1 = IfThenRule.parse('if x then y = true');
    expect(r1.required().size).toBe(1);
    const r2 = IfThenRule.parse('if a then b = true');
    expect(r2.required().size).toBe(1);

    space.addRule(r1);
    space.addRule(r2);

    expect(graph.getRoots().length).toBe(2);
    expect(space.getRules().length).toBe(2);

    let ctx = space.loadContext({ x: true });
    expect(graph.applicableRules(ctx).length).toBe(1);
    ctx = space.loadContext({ x: 10, a: true });
    expect(graph.applicableRules(ctx).length).toBe(2);
  });

  it('add rules to workspace and find applicable rules to context with nested keys', async () => {
    const space = new Workspace();
    const graph = space.dependencyGraph();

    space.addRule('if x.y then z = true');
    space.addRule('if a.b then c = true');

    expect(graph.getRoots().length).toBe(2);
    expect(space.getRules().length).toBe(2);

    let ctx = space.loadContext({ x: { y: true } });
    expect(graph.applicableRules(ctx).length).toBe(1);
    ctx = space.loadContext({ x: { y: 10 }, a: { b: true } });
    expect(graph.applicableRules(ctx).length).toBe(2);
    ctx = space.loadContext({ a: { y: 10 }, b: { y: true } });
    expect(graph.applicableRules(ctx).length).toBe(0);
  });


  it('define custom functions and use them in rules', async () => {
    const space = new Workspace();
    const graph = space.dependencyGraph();
    const expressionParser = new ExpressionParser({ workspace: space });
    const triple = CustomFunctionExpression.from({
      name: 'triple',
      parameters: [{ name: 'n', type: 'number', optional: false }],
      expression: expressionParser.parse('n * 3'),
    }, [expressionParser.parse('4')]);
    const ctx = space.loadContext({});
    expect(triple.evaluate(ctx)).toBe(12);
    // console.debug('Custom function syntax:', triple.toString());
    // console.debug('Custom function evaluation result:', triple.evaluate(ctx));

    const double = new FunctionParser({ workspace: space }).parse('double(n: number) = n * 2');
    space.addFunction(double!);

    space.addRule('if x < 5 then result = double(x)');

    expect(space.checkTypes().valid).toBe(true);

    const ctx2 = space.loadContext({ x: 3 });
    expect(graph.applicableRules(ctx2).length).toBe(1);
    space.process(ctx2);
    expect(ctx2.getOutput('result')).toBe(6);

    // console.debug('Logged rules during processing:', ctx2.getLog().map(logged => ({ rule: logged.rule.toString(), effect: logged.effect })));
  });


  it('evaluate rules', async () => {
    const space = new Workspace();
    const graph = space.dependencyGraph();

    const r1 = IfThenRule.parse('if x > 10 then result = 10 + 5 / 2');
    const r2 = IfThenRule.parse('if a == 5 then result = (10 + 5) / 2');

    // const r_disabled = IfThenRule.parse('@disabled() if x < 0 then result = 0');

    space.addRule(r1);
    space.addRule(r2);
    // space.addRule(r_disabled);

    expect(space.checkTypes().valid).toBe(true);

    let ctx = space.loadContext({ x: 15 });
    expect(graph.applicableRules(ctx).length).toBe(1);
    space.process(ctx);
    expect(ctx.getOutput('result')).toBe(12.5);

    ctx = space.loadContext({ x: 9, a: 5 });
    expect(graph.applicableRules(ctx).length).toBe(2);
    space.process(ctx);
    expect(ctx.getOutput('result')).toBe(7.5);

    ctx = space.loadContext({ x: 5, a: 5 });
    expect(graph.applicableRules(ctx).length).toBe(2);

    const r3 = IfThenElseRule.parse('if x > 10 then nested.value = 10 + 5 / 2 else nested.value = (10 + 5) / 2');
    space.addRule(r3);
    ctx = space.loadContext({ x: 15 });
    expect(graph.applicableRules(ctx).length).toBe(2);
    space.process(ctx);
    expect(ctx.getOutput('nested.value')).toBe(12.5);
    const output = ctx.getOutput();
    expect(output.nested.value).toBe(12.5);

    // console.debug('Logged rules during processing:', ctx.getLog().map(logged => ({ rule: logged.rule.toString(), effect: logged.effect })));
  });


  it('evaluate rules in iterations', async () => {
    const space = new Workspace({});
    const graph = space.dependencyGraph();

    space.addRule('if x > 10 then y = 15');

    let ctx = space.loadContext({ x: 12 });
    expect(graph.applicableRules(ctx).length).toBe(1);
    space.process(ctx);
    expect(ctx.getOutput('y')).toBe(15);

    space.addRule('if y > 10 then z = 20');
    ctx = space.loadContext({ x: 12 });
    expect(graph.applicableRules(ctx).length).toBe(1);
    space.process(ctx);
    expect(ctx.getOutput('z')).toBe(20);

    // test oscillating data
    space.clearRules();
    space.addRule('if x > 10 then y = 15');
    space.addRule('if y > 10 then y = 20');
    ctx = space.loadContext({ x: 12 });
    expect(graph.applicableRules(ctx).length).toBe(1);
    space.process(ctx);

    expect(space.checkTypes().valid).toBe(true);
  });


  it('handle composite actions', async () => {
    const space = new Workspace({ strict_inputs: false, strict_outputs: false });
    const graph = space.dependencyGraph();

    space.addRule('if x > 10 then SET y = 15; z = 20');

    expect(space.checkTypes().valid).toBe(true);

    let ctx = space.loadContext({ x: 12 });
    expect(graph.applicableRules(ctx).length).toBe(1);
    space.process(ctx);
    expect(ctx.getOutput('y')).toBe(15);
    expect(ctx.getOutput('z')).toBe(20);
  });


  it('handle conflicting rule effects', async () => {
    // Conflicting rules can be prevented by setting strict_conflicts to true in the workspace options. 
    // In this case, if two or more applicable rules have the same highest salience and affect the same output key, 
    // an error will be thrown to prevent non-deterministic behavior.
    const space = new Workspace({ strict_conflicts: true });
    space.addRule('if x > 10 then y = 15');
    space.addRule('if x > 20 then y = 20');

    let ctx = space.loadContext({ x: 22 });
    // more than one rule with the highest salience exist for x = 22
    expect(() => space.process(ctx)).toThrow(/Conflict detected.*/);

    ctx = space.loadContext({ x: 12 });
    // only one rule with the highest salience exists for x = 12
    // expect(() => space.process(ctx)).toThrow(/Conflict detected.*/);
    expect(space.process(ctx)).toBe(true);

    // If we set different salience values for the rules, the one with the higher salience will take precedence 
    // without throwing an error.
    space.addRule('if x > 30 then y = 25', 5);
    ctx = space.loadContext({ x: 35 });
    space.process(ctx);
    expect(ctx.getOutput('y')).toBe(25);

    const rmeta = new RuleParser({}).parse('@salience(7) @name(Highest Priority) if x > 30 then y = 30');
    expect(rmeta).toBeInstanceOf(IfThenRule);
    expect(rmeta!.name).toBe('Highest Priority');
    expect(rmeta!.getSalience()).toBe(7);

    space.addRule(rmeta!);
    ctx = space.loadContext({ x: 35 });
    space.process(ctx);
    expect(ctx.getOutput('y')).toBe(30);

    expect(space.checkTypes().valid).toBe(true);
    // console.debug('Logged rules during processing:', ctx.getLog().map(logged => ({ rule: logged.rule.toString(), effect: logged.effect })));
  });

});