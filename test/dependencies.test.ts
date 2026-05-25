import { describe, expect, it } from 'vitest';
import { Workspace } from '../src/engine/workspace';

describe('Cyclic dependencies tests', () => {

  it('detects cyclic dependencies', async () => {

    const space = new Workspace();
    const graph = space.dependencyGraph();

    space.addRule('if x then y = true');
    space.addRule('if y then x = true');

    const cycles = graph.circularDependencies();
    expect(cycles.length).toBe(2);
    console.debug('Detected cycles:', JSON.stringify(cycles, null, 2));
    // expect(cycles[0]!.map(node => node.getSyntax())).toEqual(['if x then y = true', 'if y then x = true']);

    space.clearRules();
    const new_graph = space.dependencyGraph();

    space.addRule('if a then b = true');
    space.addRule('if b then c = true');
    space.addRule('if c then a = true');

    const cycles2 = new_graph.circularDependencies();
    expect(cycles2.length).toBe(3);
    console.debug('Detected cycles after adding more rules:', JSON.stringify(cycles2, null, 2));
  });

});