import { describe, expect, it } from 'vitest';
import { Workspace } from '../src/engine/workspace';
import { FunctionFactory } from '../src';
import { ArrayAnalyticalFunctionProvider } from '../src/functions/array.analytical.functions';

describe('Engine tests', () => {

  it('handles arrays in rules and types', async () => {
    const space = new Workspace({ strict_inputs: true, strict_outputs: false });
    const graph = space.dependencyGraph();

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
    expect(graph.applicableRules(ctx).length).toBe(1);
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
    expect(graph.applicableRules(ctx2).length).toBe(1);
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
    const graph = space.dependencyGraph();

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

    space.addRule(`if every(Person.family, member : member.age > 10)
        then Person.hasOldChildren = true
        else Person.hasOldChildren = false
    `);

    expect(space.checkTypes().valid).toBe(true);

    const ctx = space.loadContext({
      Person: {
        name: 'Alice', age: 30,
        family: [{ name: 'Bob', age: 15 }, { name: 'Charlie', age: 25 }, { name: 'David', age: 20 }]
      }
    });
    expect(graph.applicableRules(ctx).length).toBe(1);
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
    const graph = space.dependencyGraph();

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
    // console.debug(space.typeChecker().checkData(ctx.getOutput()));

    expect(graph.applicableRules(ctx).length).toBe(2);
    const ok = space.process(ctx);
    expect(ok).toBe(true);
    const output = ctx.getOutput();
    // console.debug('Output with lambda expression:', output);
    expect(output.Person.ages[0]).toBe(25);
    expect(output.Person.ages[2]).toBe(15);
    expect(output.Person.family[0].age).toBe(15);
    expect(output.Person.family[2].age).toBe(25);

  });


  it('handles array comparison functions', async () => {
    const space = new Workspace({ strict_syntax: true, strict_inputs: true, strict_outputs: true });

    space.typeRegistry().addRootType({
      key: 'numA',
      type: 'number[]',
    });
    space.typeRegistry().addRootType({
      key: 'numB',
      type: 'number[]',
    });
    space.typeRegistry().addRootType({
      key: 'catA',
      type: 'string[]',
    });
    space.typeRegistry().addRootType({
      key: 'catB',
      type: 'string[]',
    });

    let numA = [1, 2, 3];
    let numB = [4, 5, 6];
    let catA = ['S', 'M', 'L'];
    let catB = ['M', 'L', 'XL'];

    // boolean array comparison rules
    space.addRule('if numA and numB then set sameArray = sameArray(numA, numB)');
    space.addRule('if numA and numB then set sameSet = sameSet(numA, numB)');
    space.addRule('if numA and numB then set subsetOf = subsetOf(numA, numB)');
    space.addRule('if numA and numB then set subArrayOf = subArrayOf(numA, numB)');
    space.addRule('if numA and numB then set supersetOf = supersetOf(numA, numB)');
    space.addRule('if numA and numB then set superArrayOf = superArrayOf(numA, numB)');
    space.addRule('if numA and numB then set overlapsWith = overlapsWith(numA, numB)');
    space.addRule('if numA and numB then set disjointFrom = disjointFrom(numA, numB)');

    // numeric array analytical rules
    space.addRule('if numA and numB then set EuclideanDistance = euclidean_distance(numA, numB)');
    space.addRule('if numA and numB then set ManhattanDistance = manhattan_distance(numA, numB)');
    space.addRule('if numA and numB then set ChebyshevDistance = chebyshev_distance(numA, numB)');
    space.addRule('if numA and numB then set MinkowskiDistance = minkowski_distance(numA, numB)');
    space.addRule('if numA and numB then set CosineDistance = cosine_distance(numA, numB)');
    space.addRule('if numA and numB then set JaccardDistance = jaccard_distance(numA, numB)');
    space.addRule('if numA and numB then set HammingDistance = hamming_distance(numA, numB)');
    space.addRule('if numA and numB then set PearsonCorrelation = pearson_correlation(numA, numB)');
    space.addRule('if numA and numB then set SpearmanRankCorrelation = spearman_rank_correlation(numA, numB)');
    space.addRule('if numA and numB then set CrossCorrelation = cross_correlation(numA, numB)');
    space.addRule('if numA and numB then set KendallTauCorrelation = kendall_tau_correlation(numA, numB)');
    space.addRule('if numA and numB then set KolmogorovSmirnovDistance = kolmogorov_smirnov_distance(numA, numB)');
    space.addRule('if numA and numB then set KullbackLeiblerDivergence = kullback_leibler_divergence(numA, numB)');
    space.addRule('if numA and numB then set EarthMoversDistance = earth_movers_distance(numA, numB)');
    space.addRule('if numA and numB then set WassersteinDistance = wasserstein_distance(numA, numB)');
    space.addRule(`if numA and numB 
      then set JensenShannonDivergence = jensen_shannon_divergence(numA, numB)
      `);

    // string array comparison rules
    space.addRule('@salience(2) if catA and catB then set SpearmanRankCorrelation = spearman_rank_correlation(catA, catB)');
    space.addRule('@salience(2) if catA and catB then set JaccardDistance = jaccard_distance(catA, catB)');
    space.addRule('@salience(2) if catA and catB then set HammingDistance = hamming_distance(catA, catB)');

    // Analytical array comparisons

    let ctx = space.loadContext({
      numA: numA,
      numB: numB,
    });

    space.process(ctx);

    console.debug('Final output:', ctx.getOutput());
    expect(ctx.getOutput('EuclideanDistance')).toBeCloseTo(5.196, 3);
    expect(ctx.getOutput('ManhattanDistance')).toEqual(9);
    expect(ctx.getOutput('ChebyshevDistance')).toEqual(3);
    expect(ctx.getOutput('MinkowskiDistance')).toBeCloseTo(4.327, 3);
    expect(ctx.getOutput('CosineDistance')).toBeCloseTo(0.025, 3);
    expect(ctx.getOutput('JaccardDistance')).toEqual(1); // No shared elements
    expect(ctx.getOutput('HammingDistance')).toEqual(3); // All positions differ

    expect(ctx.getOutput('PearsonCorrelation')).toBeCloseTo(1); // Perfect positive correlation
    expect(ctx.getOutput('SpearmanRankCorrelation')).toBeCloseTo(1); // Perfect positive rank correlation
    expect(ctx.getOutput('CrossCorrelation')).toBeCloseTo(1); // Cross-correlation at lag 0
    expect(ctx.getOutput('KendallTauCorrelation')).toBeCloseTo(1); // Perfect agreement in ordering
    expect(ctx.getOutput('KolmogorovSmirnovDistance')).toBeCloseTo(1); // Completely different distributions
    expect(ctx.getOutput('KullbackLeiblerDivergence')).toBeCloseTo(0.033); // KL divergence for normalized vectors
    expect(ctx.getOutput('EarthMoversDistance')).toBeCloseTo(3); // Total "work" to transform A into B
    expect(ctx.getOutput('WassersteinDistance')).toBeCloseTo(3); // Same as Earth Mover's Distance for 1D distributions
    expect(ctx.getOutput('JensenShannonDivergence')).toBeCloseTo(0.008); // Symmetric and bounded version of KL divergence

    // String array comparisons

    let ctx2 = space.loadContext({
      catA: catA,
      catB: catB,
    });

    let ok = space.process(ctx2);
    expect(ok).toBe(true);

    console.debug('Final output with string arrays:', ctx2.getOutput());
    expect(ctx2.getOutput('SpearmanRankCorrelation')).toBeCloseTo(1);
    expect(ctx2.getOutput('JaccardDistance')).toEqual(0.5); // 2 shared elements out of 4 unique elements
    expect(ctx2.getOutput('HammingDistance')).toEqual(3);

    // Boolean array comparisons

    let ctx3 = space.loadContext({
      numA: [1, 2, 3],
      numB: [1, 2, 3],
    });
    space.process(ctx3);
    expect(ctx3.getOutput('sameArray')).toBe(true);
    expect(ctx3.getOutput('sameSet')).toBe(true);
    expect(ctx3.getOutput('subsetOf')).toBe(true);
    expect(ctx3.getOutput('subArrayOf')).toBe(true);
    expect(ctx3.getOutput('supersetOf')).toBe(true);
    expect(ctx3.getOutput('superArrayOf')).toBe(true);
    expect(ctx3.getOutput('overlapsWith')).toBe(true);
    expect(ctx3.getOutput('disjointFrom')).toBe(false);

    ctx3 = space.loadContext({
      numA: [1, 2],
      numB: [2, 1],
    });
    space.process(ctx3);
    expect(ctx3.getOutput('sameArray')).toBe(false);
    expect(ctx3.getOutput('sameSet')).toBe(true);
    expect(ctx3.getOutput('subsetOf')).toBe(true);
    expect(ctx3.getOutput('subArrayOf')).toBe(false);
    expect(ctx3.getOutput('supersetOf')).toBe(true);
    expect(ctx3.getOutput('superArrayOf')).toBe(false);
    expect(ctx3.getOutput('overlapsWith')).toBe(true);
    expect(ctx3.getOutput('disjointFrom')).toBe(false);

    ctx3 = space.loadContext({
      numA: [1, 2, 2],
      numB: [1, 2],
    });
    space.process(ctx3);
    expect(ctx3.getOutput('sameArray')).toBe(false);
    expect(ctx3.getOutput('sameSet')).toBe(true);
    expect(ctx3.getOutput('subsetOf')).toBe(true);
    expect(ctx3.getOutput('subArrayOf')).toBe(false);
    expect(ctx3.getOutput('supersetOf')).toBe(true);
    expect(ctx3.getOutput('superArrayOf')).toBe(true);
    expect(ctx3.getOutput('overlapsWith')).toBe(true);
    expect(ctx3.getOutput('disjointFrom')).toBe(false);

    ctx3 = space.loadContext({
      numA: [1, 2],
      numB: [1, 2, 3],
    });
    space.process(ctx3);
    expect(ctx3.getOutput('sameArray')).toBe(false);
    expect(ctx3.getOutput('sameSet')).toBe(false);
    expect(ctx3.getOutput('subsetOf')).toBe(true);
    expect(ctx3.getOutput('subArrayOf')).toBe(true);
    expect(ctx3.getOutput('supersetOf')).toBe(false);
    expect(ctx3.getOutput('superArrayOf')).toBe(false);
    expect(ctx3.getOutput('overlapsWith')).toBe(true);
    expect(ctx3.getOutput('disjointFrom')).toBe(false);

    ctx3 = space.loadContext({
      numA: [1, 2, 4],
      numB: [1, 2, 3],
    });
    space.process(ctx3);
    expect(ctx3.getOutput('sameArray')).toBe(false);
    expect(ctx3.getOutput('sameSet')).toBe(false);
    expect(ctx3.getOutput('subsetOf')).toBe(false);
    expect(ctx3.getOutput('subArrayOf')).toBe(false);
    expect(ctx3.getOutput('supersetOf')).toBe(false);
    expect(ctx3.getOutput('superArrayOf')).toBe(false);
    expect(ctx3.getOutput('overlapsWith')).toBe(true);
    expect(ctx3.getOutput('disjointFrom')).toBe(false);

    ctx3 = space.loadContext({
      numA: [1, 2, 3],
      numB: [4, 5, 6],
    });
    space.process(ctx3);
    expect(ctx3.getOutput('sameArray')).toBe(false);
    expect(ctx3.getOutput('sameSet')).toBe(false);
    expect(ctx3.getOutput('subsetOf')).toBe(false);
    expect(ctx3.getOutput('subArrayOf')).toBe(false);
    expect(ctx3.getOutput('supersetOf')).toBe(false);
    expect(ctx3.getOutput('superArrayOf')).toBe(false);
    expect(ctx3.getOutput('overlapsWith')).toBe(false);
    expect(ctx3.getOutput('disjointFrom')).toBe(true);
  });

  it('test function factory adding/removing providers', async () => {
    const space = new Workspace({ strict_syntax: true, strict_inputs: false, strict_outputs: false });

    space.addRule('if numA and numB then set EuclideanDistance = euclidean_distance(numA, numB)');

    let ctx = space.loadContext({
      numA: [1, 2, 3],
      numB: [4, 5, 6],
    });

    let ok = space.process(ctx);
    expect(ok).toBe(true);
    expect(ctx.getOutput('EuclideanDistance')).toBeCloseTo(5.196, 3);

    FunctionFactory.unregisterProvider(ArrayAnalyticalFunctionProvider);

    space.clearRules();
    expect(() => {
      space.addRule('if numA and numB then set EuclideanDistance = euclidean_distance(numA, numB)');
    }).toThrow();

    FunctionFactory.registerProvider(ArrayAnalyticalFunctionProvider);

    space.addRule('if numA and numB then set EuclideanDistance = euclidean_distance(numA, numB)');
    ctx = space.loadContext({
      numA: [1, 2, 3],
      numB: [4, 5, 6],
    });
    ok = space.process(ctx);
    expect(ok).toBe(true);
    expect(ctx.getOutput('EuclideanDistance')).toBeCloseTo(5.196, 3);

  });

});