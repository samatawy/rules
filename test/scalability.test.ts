import { describe, expect, it } from 'vitest';
import { Workspace } from '../src/engine/workspace';
import { Logger, Stopwatch } from '../src/logging';

import inspector from 'node:inspector';
import fs from 'node:fs';

import { ExecutableParser, ExpressionParser, type RootType } from '../src';
const session = new inspector.Session();
session.connect();

function generateRules(count: number): string[] {
  const rules = [];
  for (let i = 0; i < count; i++) {
    rules.push(`if Person.children.count() > ${i} then Person.child_count = ${i}`);
  }
  return rules;
}

function generateCandidates(count: number): any[] {
  const candidates = [];
  for (let i = 0; i < count; i++) {
    candidates.push({
      name: `Candidate${i}`,
      age: 20 + (i % 30),
      workload: (i % 10) + 1,
      skills: [`Skill${i % 10}`, `Skill${(i + 1) % 10}`],
      location: `Location${i % 5}`,
    });
  }
  return candidates;
}

const taskType: RootType = {
  key: 'Task',
  properties: {
    title: 'string',
    required_skills: 'string[]',
    location: 'string',
  }
};

const candidatesType: RootType = {
  key: 'Candidates',
  type: 'array',
  items: {
    name: 'string',
    age: 'number',
    workload: 'number',
    skills: 'string[]',
    location: 'string',
  }
};

describe('Scalability tests', () => {

  it('scale with candidate count', async () => {

    Logger.setLogLevel('error'); // Set log level to error to reduce console output during performance test

    const space = new Workspace({ strict_inputs: false, strict_outputs: false });
    const expressionParser = new ExpressionParser({ workspace: space });
    const executableParser = new ExecutableParser({ workspace: space });

    space.typeRegistry().addRootType(candidatesType);
    space.typeRegistry().addRootType(taskType);

    space.addFunction({
      name: 'isEligible',
      parameters: [
        { name: 'candidate', type: candidatesType.items! },
        { name: 'Task', type: taskType.properties! },
      ],
      expression: expressionParser.parse('candidate.skills.any(skill: skill IN Task.required_skills) AND candidate.location == Task.location'),
    });

    space.addFunction({
      name: 'scoredCandidate',
      parameters: [
        { name: 'candidate', type: candidatesType.items! },
        { name: 'Task', type: taskType.properties! },
      ],
      lines: [
        executableParser.parse('SET candidate.score = candidate.age * 0.3 + candidate.workload * 0.7')!
      ],
      expression: expressionParser.parse('candidate')
    });

    space.addRule(`IF Task AND Candidates AND not(Eligible) THEN Eligible = Candidates.filter(candidate: isEligible(candidate, Task))`);
    space.addRule(`IF Eligible AND not(Scored) THEN Scored = Eligible.map(candidate: scoredCandidate(candidate, Task))`);
    space.addRule(`IF Scored AND not(Selected) THEN Selected = Scored.sort(candidate: neg(candidate.score))`);

    for (const candidateCount of [40, 80, 160, 320, 640, 1280, 2560, 5120, 10240]) {
      // for (const candidateCount of [10, 50, 100, 500, 1000, 2500, 5000, 10000]) {
      const iterations = 100;
      let ctx = space.loadContext({});
      let candidates = generateCandidates(candidateCount);

      let stopwatch = Stopwatch.start('error', `Processing with ${candidates.length} candidates for ${iterations} iterations`);
      for (let i = 0; i < iterations; i++) {
        ctx = space.loadContext({
          Task: {
            title: 'Software Engineer',
            required_skills: ['Skill1', 'Skill2'],
            location: 'Location2',
          },
        }, {
          Candidates: candidates,
        });
        space.evaluate('Selected', ctx);
      }
      console.debug(stopwatch.checkpoint().message);
      // console.debug(ctx.getCleanOutput());
      // console.debug(ctx.getOutput().Selected?.length + ' selected');
    }

  });

  it('scale with rule count', async () => {

    Logger.setLogLevel('error'); // Set log level to error to reduce console output during performance test

    const space = new Workspace({ strict_inputs: false, strict_outputs: false });
    const expressionParser = new ExpressionParser({ workspace: space });
    const executableParser = new ExecutableParser({ workspace: space });

    space.typeRegistry().addRootType(candidatesType);
    space.typeRegistry().addRootType(taskType);

    const candidates = generateCandidates(10);
    const iterations = 100;

    for (const ruleCount of [40, 80, 160, 320, 640, 1280, 2560, 5120, 10240]) {
      // for (const ruleCount of [10, 50, 100, 500, 1000, 2500, 5000, 10000]) {
      space.clearRules();
      for (let i = 0; i < ruleCount / 4; i++) {
        space.addRule(`IF Task AND Task.required_skills.every(skill: skill.endsWith("6")) THEN Filtered = Filter`);
        space.addRule(`IF Task2 AND Filter THEN Filtered2 = Filter2`);
        space.addRule(`IF Task.required_skills.any(skill: skill == "Skill1") THEN tax_rate = 0.14`);
        space.addRule(`IF Task AND Task.location.contains("${i}") THEN Location${i} = Task.location.contains("${i}")`);
      }

      let stopwatch = Stopwatch.start('error', `Processing with ${ruleCount} rules for ${iterations} iterations`);
      let ctx = space.loadContext({});
      for (let i = 0; i < iterations; i++) {
        ctx = space.loadContext({
          Task: {
            title: 'Software Engineer',
            required_skills: ['Skill1', 'Skill5'],
            location: `Location${i % 5}`,
          },
          // Filter: i % 2 === 0,
          // InEgypt: i % 3 === 0,
        });
        space.process(ctx);
      }
      // console.debug(perflog.checkpoint().message);
      stopwatch.logCheckpoint();
      // console.debug(ctx.getOutput());
    }

  });

});