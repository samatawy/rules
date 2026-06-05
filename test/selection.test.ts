import { describe, expect, it } from 'vitest';
import { Workspace } from '../src/engine/workspace';
import { Logger } from '../src/logging';
import { SelectionSpace } from '../src/engine/special/selection.workspace';
import { ExecutableParser, ExpressionParser, garbageCollect } from '../src';
import { Stopwatch } from '../src/logging';

import inspector from 'node:inspector';
import fs from 'node:fs';

const session = new inspector.Session();
session.connect();

describe('Selection tests', () => {

    it('select candidate using eligibility criteria', async () => {

        Logger.setLogLevel('info'); // Set log level to info to see detailed output during test

        const space = new Workspace({ strict_inputs: false, strict_outputs: false });
        // space.typeRegistry().addRootType({
        //     key: 'Candidate',
        //     properties: {
        //         name: 'string',
        //         skills: 'string[]',
        //         location: 'string',
        //     }
        // });

        space.typeRegistry().addRootType({
            key: 'Candidates',
            type: 'array',
            // items: 'Candidate'
            items: {
                name: 'string',
                skills: 'string[]',
                location: 'string',
            }
        });

        space.typeRegistry().addRootType({
            key: 'Task',
            properties: {
                name: 'string',
                skill: 'string',
                location: 'string',
            }
        });

        const candidates = [
            { name: 'Alice', skills: ['SkillA', 'SkillB'], location: 'Location1' },
            { name: 'Bob', skills: ['SkillB'], location: 'Location1' },
            { name: 'Charlie', skills: ['SkillA', 'SkillC'], location: 'Location2' },
        ]
        const payload = {
            Task: { name: 'Task1', skill: 'SkillA', location: 'Location1' },
        };

        space.addRule('if Task and not(Nearby) then Nearby = Candidates.filter(candidate : candidate.location == Task.location)');
        space.addRule('if Task and Nearby and not(Eligible) then set Eligible = Nearby.filter(candidate : candidate.skills.any(skill: skill.equalsIgnoreCase(Task.skill)))');
        space.addRule('if Task and Eligible and not(Selected) then set Selected = Eligible');
        space.addRule('if Selected.count() == 0 then Message = "Nobody is eligible for the task" else Message = concat("Selected ", Selected.count(), " candidates")');

        let stopwatch = Stopwatch.start('error', 'Eligibility-based selection');

        let ctx = space.loadContext({
            Task: payload.Task,
        }, {
            Candidates: candidates,
        });

        space.process(ctx);
        // console.debug(perflog.checkpoint().message);
        stopwatch.logCheckpoint();

        // console.debug('Final output:', ctx.getOutput());
        // console.debug('Nearby candidates:', ctx.getOutput('Nearby'));
        // console.debug('Eligible candidates:', ctx.getOutput('Eligible'));
        // console.debug('Selected candidate:', ctx.getOutput('Selected'));
        expect(ctx.getOutput('Selected')[0].name).toEqual('Alice');

        ctx = space.loadContext({
            Task: { name: 'Task2', skill: 'SkillD', location: 'Location1' },
        }, {
            Candidates: candidates,
        });
        space.process(ctx);
        // console.debug('Final output for Task2:', ctx.getOutput());
        // console.debug('Nearby candidates for Task2:', ctx.getOutput('Nearby'));
        // console.debug('Eligible candidates for Task2:', ctx.getOutput('Eligible'));
        // console.debug('Selected candidate for Task2:', ctx.getOutput('Selected'));
        expect(ctx.getOutput('Selected').length).toEqual(0);
        expect(ctx.getOutput('Message')).toEqual("Nobody is eligible for the task");
    });

    it('select candidate using scoring factors', async () => {

        Logger.setLogLevel('info'); // Set log level to info to see detailed output during test

        const space = new Workspace({ strict_inputs: false, strict_outputs: false });

        space.typeRegistry().addRootType({
            key: 'Candidates',
            type: 'array',
            items: {
                name: 'string',
                skills: 'string[]',
                seniority: 'number',
                current_workload: 'number',
                location: 'string',
            }
        });

        space.typeRegistry().addRootType({
            key: 'Task',
            properties: {
                name: 'string',
                skill: 'string',
                location: 'string',
            }
        });

        const candidates = [
            { name: 'Alice', skills: ['SkillA', 'SkillB'], seniority: 23, current_workload: 5 },
            { name: 'Bob', skills: ['SkillB'], seniority: 30, current_workload: 7 },
            { name: 'Charlie', skills: ['SkillA', 'SkillC'], seniority: 25, current_workload: 3 },
        ]
        const payload = {
            Task: { name: 'Task1', skill: 'SkillA', location: 'Location1' },
        };

        space.addFunction(`scoredCandidate(candidate: { name: string, seniority: number, current_workload: number }) {
            SET candidate.score = candidate.seniority * 0.7 - candidate.current_workload * 0.3;
            return candidate;
        }`);

        space.addRule('if Task and not(BySeniority) then BySeniority = Candidates.sort(candidate : neg(candidate.seniority))');
        space.addRule('if Task and not(ByMostFree) then ByLeastBusy = Candidates.sort(candidate : candidate.current_workload).map(candidate : candidate.name)');
        space.addRule(`if Candidates and not(Scored) 
            then set Scored = Candidates.map(candidate : scoredCandidate(candidate))
                                        .sort(candidate : neg(candidate.score))
        `);

        let stopwatch = Stopwatch.start('error', 'Scoring-based selection');
        let ctx = space.loadContext({
            Task: payload.Task,
        }, {
            Candidates: candidates,
        });

        space.process(ctx);
        // console.debug(perflog.checkpoint().message);
        stopwatch.logCheckpoint();

        // console.debug('Final output:', ctx.getOutput());
        expect(ctx.getOutput('BySeniority')[0].name).toEqual('Bob');
        expect(ctx.getOutput('ByLeastBusy')[0]).toEqual('Charlie');
        expect(ctx.getOutput('Scored')[0].name).toEqual('Bob');
    });

    it('select candidate using target distribution', async () => {

        Logger.setLogLevel('info'); // Set log level to info to see detailed output during test

        const space = new Workspace({ strict_inputs: false, strict_outputs: false });

        space.typeRegistry().addRootType({
            key: 'Candidates',
            type: 'array',
            items: {
                name: 'string',
                skills: 'string[]',
                seniority: 'number',
                location: 'string',
                current_workload: 'number',
                target_workload: 'number',
            }
        });

        space.typeRegistry().addRootType({
            key: 'Task',
            properties: {
                name: 'string',
                skill: 'string',
                location: 'string',
            }
        });

        const candidates = [
            { name: 'Alice', skills: ['SkillA', 'SkillB'], seniority: 23, current_workload: 5, target_workload: 5 },
            { name: 'Bob', skills: ['SkillB'], seniority: 30, current_workload: 7, target_workload: 10 },
            { name: 'Charlie', skills: ['SkillA', 'SkillC'], seniority: 25, current_workload: 3, target_workload: 5 },
        ]
        const payload = {
            Task: { name: 'Task1', skill: 'SkillA', location: 'Location1' },
        };

        space.addFunction(`scoredCandidate(candidate: { name: string, seniority: number, current_workload: number }) {
            SET candidate.score = candidate.seniority * 0.7 - candidate.current_workload * 0.3;
            return candidate
        }`);

        space.addFunction(`projectWorkload(candidate: { name: string, current_workload: number, target_workload: number }, task: { name: string }) {
            SET candidate.projected_workload = candidate.current_workload + 1;
            return candidate
        }`);

        space.addRule('if Task and not(Projected) then Projected = Candidates.map(candidate : projectWorkload(candidate, Task)).sort(candidate : candidate.projected_workload)');
        space.addRule('if Projected then Ranked = Projected.sort(candidate : abs(candidate.target_workload - candidate.projected_workload))');


        let stopwatch = Stopwatch.start('error', 'Target distribution-based selection');

        let ctx = space.loadContext({
            Task: payload.Task,
        }, {
            Candidates: candidates,
        });

        space.process(ctx);
        stopwatch.logCheckpoint();

        // console.debug('Final output:', ctx.getOutput());
        expect(ctx.getOutput('Ranked')[0].name).toBeOneOf(['Alice', 'Charlie']);
    });

    it('handles selection with large candidate pool efficiently', async () => {

        Logger.setLogLevel('warn'); // Set log level to warn to reduce output during test

        const space = new Workspace({ strict_inputs: false, strict_outputs: false });

        space.typeRegistry().addRootType({
            key: 'Candidates',
            type: 'array',
            items: {
                name: 'string',
                skills: 'string[]',
                seniority: 'number',
                location: 'string',
            }
        });

        space.typeRegistry().addRootType({
            key: 'Task',
            properties: {
                name: 'string',
                skill: 'string',
                location: 'string',
            }
        });

        const candidates = Array.from({ length: 100_000 }, (_, i) => ({
            name: `Candidate${i}`,
            skills: [`Skill${i % 10}`],
            seniority: Math.floor(Math.random() * 30),
            location: `Location${i % 5}`,
        }));

        const payload = {
            Task: { name: 'Task1', skill: 'Skill2', location: 'Location2' },
        };

        space.addRule('if Task and not(Nearby) then Nearby = Candidates.filter(candidate : candidate.location == Task.location)');
        space.addRule('if Task and Nearby and not(Eligible) then set Eligible = Nearby.filter(candidate : candidate.skills.any(skill: skill.equalsIgnoreCase(Task.skill)))');
        space.addRule('if Task and Eligible and not(Selected) then set Selected = Eligible');
        space.addRule('if Selected.count() == 0 then Message = "Nobody is eligible for the task" else Message = concat("Selected ", Selected.count(), " candidates")');

        let stopwatch = Stopwatch.start('error', 'Select from large candidate pool');

        let ctx = space.loadContext({
            Task: payload.Task,
        }, {
            Candidates: candidates,
        });

        space.process(ctx);
        stopwatch.logCheckpoint();

        // console.debug('Final output:', JSON.stringify(ctx.getOutput(), null, '    '));
        console.debug('Nearby candidates:', ctx.getOutput('Nearby').length);
        console.debug('Eligible candidates:', ctx.getOutput('Eligible').length);
        console.debug('Selected candidates:', ctx.getOutput('Selected').length);
        expect(ctx.getOutput('Selected').length).toBeGreaterThan(0);
    });

    it('handles selection using special workspace', async () => {
        // // Start recording the CPU activity
        session.post('Profiler.enable');
        session.post('Profiler.start');

        Logger.setLogLevel('error'); // Set log level to info to see detailed output during test

        const space = new SelectionSpace();

        space.setCandidateType({
            name: 'string',
            skills: 'string[]',
            seniority: 'number',
            location: 'string',
            current_workload: 'number',
        });

        space.setTaskType({
            name: 'string',
            skill: 'string',
            location: 'string',
        });

        const candidates = [
            { name: 'Alice', skills: ['SkillA', 'SkillB'], seniority: 23, current_workload: 5, location: 'Location1' },
            { name: 'Bob', skills: ['SkillB'], seniority: 30, current_workload: 7, location: 'Location1' },
            { name: 'Charlie', skills: ['SkillA', 'SkillC'], seniority: 25, current_workload: 3, location: 'Location2' },
        ]
        const payload = {
            Task: { name: 'Task1', skill: 'SkillA', location: 'Location1' },
        };

        space.addCandidates(candidates);

        space.addEligibilityDefinition({
            name: 'ByLocation',
            parameters: [
                { name: 'candidate', type: space.candidateType()! },
                { name: 'task', type: space.taskType()! },
            ],
            expression: space.expression(`candidate.location == task.location`)
        });

        space.addEligibilityDefinition({
            name: 'BySkill',
            parameters: [
                { name: 'candidate', type: space.candidateType()! },
                { name: 'task', type: space.taskType()! },
            ],
            expression: space.expression(`candidate.skills.any(skill: skill.equalsIgnoreCase(task.skill))`)
        });

        space.addScoringDefinition({
            name: 'BySeniority',
            parameters: [
                { name: 'candidate', type: space.candidateType()! },
                { name: 'task', type: space.taskType()! },
            ],
            expression: space.expression(`candidate.seniority`)
        });

        space.addEligibilityFunction('ByLocation', (candidate: any, task: any) => {
            return candidate.location === task.location;
        });

        space.addEligibilityFunction('BySkill', (candidate: any, task: any) => {
            return candidate.skills.some((skill: string) => skill.toLowerCase() === task.skill.toLowerCase());
        });

        space.addScoringFunction('BySeniority', (candidate: any, task: any) => {
            return candidate.seniority;
        });
        space.buildWorkspace();

        const iterations = 10_000;

        let stopwatch = Stopwatch.start('error', `Selecting from pool with ${candidates.length} candidates ${iterations} times using special workspace`);
        let ctx = space.loadContext(payload.Task);

        for (let i = 0; i < iterations; i++) {
            ctx = space.loadContext(payload.Task);
            space.process(ctx);
        }
        stopwatch.logCheckpoint();

        // console.log(ctx.getOutput());
        console.log('Selected candidates:', ctx.getSelected());

        space.clearEligibilityFunctions();
        space.clearScoringFunctions();

        space.addEligibilityFunction('ByLocation', (candidate: any, task: any) => {
            return candidate.location === task.location;
        });

        space.addEligibilityFunction('BySkill', (candidate: any, task: any) => {
            return candidate.skills.some((skill: string) => skill.toLowerCase() === task.skill.toLowerCase());
        });

        space.addScoringFunction('BySeniority', (candidate: any, task: any) => {
            return candidate.seniority;
        });
        space.buildWorkspace();

        stopwatch = Stopwatch.start('error', `Selecting from pool with ${candidates.length} candidates ${iterations} times using native functions`);

        let eligible: any[] = [];
        let scored: any[] = [];
        let selected: any[] = [];
        for (let i = 0; i < iterations; i++) {
            eligible = candidates.filter(candidate => space.isEligible(candidate, payload.Task));
            scored = eligible.map(candidate => ({ ...candidate, score: space.score(candidate, payload.Task) }));
            selected = scored.sort((a, b) => b.score - a.score);
        }

        stopwatch.logCheckpoint();
        console.debug('Selected candidates (native):', selected);

        // ===========================================
        // Testing with large number of candidates

        // WLogger.setLogLevel('info'); // Set log level to info to reduce output during test

        const largeCandidates = Array.from({ length: 10_000 }, (_, i) => ({
            name: `Candidate${i}`,
            skills: [`Skill${i % 10}`],
            seniority: Math.floor(Math.random() * 30),
            location: `Location${i % 5}`,
            current_workload: Math.floor(Math.random() * 10),
        }));

        const largeTask = { name: 'Task1', skill: 'Skill2', location: 'Location2' };

        space.clearCandidates();
        space.addCandidates(largeCandidates);

        const poolIterations = 100;
        garbageCollect(); // Force garbage collection before starting the test to get a cleaner memory profile
        let peakHeap = 0;
        let initialHeap = process.memoryUsage().heapUsed;

        stopwatch = Stopwatch.start('error', `Selection from pool with ${largeCandidates.length} candidates ${poolIterations} times using workspace functions`);

        for (let i = 0; i < poolIterations; i++) {
            ctx = space.loadContext(largeTask);
            space.process(ctx);

            if (i % 10 === 0) {
                const currentHeap = process.memoryUsage().heapUsed;
                if (currentHeap > peakHeap) {
                    peakHeap = currentHeap;
                }
            }
        }
        // console.debug(perflog.checkpoint().message);
        stopwatch.logCheckpoint();

        let finalHeap = process.memoryUsage().heapUsed;
        console.log(`Memory usage - Initial: ${(initialHeap / 1024 / 1024).toFixed(2)} MB, Peak: ${(peakHeap / 1024 / 1024).toFixed(2)} MB, Final: ${(finalHeap / 1024 / 1024).toFixed(2)} MB`);
        console.debug('Selected candidates (workspace):', ctx.getSelected().length);
        garbageCollect();
        console.log('After GC - Memory usage:', (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2), 'MB');

        // Comparing with native functions

        garbageCollect();
        peakHeap = 0;
        initialHeap = process.memoryUsage().heapUsed;
        stopwatch = Stopwatch.start('error', `Selection from pool with ${largeCandidates.length} candidates ${poolIterations} times using native functions`);

        for (let i = 0; i < poolIterations; i++) {
            eligible = largeCandidates.filter(candidate => space.isEligible(candidate, largeTask));
            scored = eligible.map(candidate => ({ ...candidate, score: space.score(candidate, largeTask) }));
            selected = scored.sort((a, b) => b.score - a.score);

            if (i % 10 === 0) {
                const currentHeap = process.memoryUsage().heapUsed;
                if (currentHeap > peakHeap) {
                    peakHeap = currentHeap;
                }
            }
        }
        finalHeap = process.memoryUsage().heapUsed;

        // console.debug(perflog.checkpoint().message);
        stopwatch.logCheckpoint();

        stopwatch.logMetrics();

        // console.log(`Time taken to select from pool with ${largeCandidates.length} candidates ${poolIterations} times using native functions: ${ended - started} ms`);
        console.log(`Memory usage - Initial: ${(initialHeap / 1024 / 1024).toFixed(2)} MB, Peak: ${(peakHeap / 1024 / 1024).toFixed(2)} MB, Final: ${(finalHeap / 1024 / 1024).toFixed(2)} MB`);
        console.debug('Selected candidates (native):', selected.length);

        garbageCollect();
        console.log('After GC - Memory usage:', (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2), 'MB');

        // Stop recording and save the physical profile directly to disk
        session.post('Profiler.stop', (err, { profile }) => {
            if (!err && profile) {
                fs.writeFileSync('./selection_test.cpuprofile', JSON.stringify(profile));
                console.log('Successfully selection_test.cpuprofile!');
            }
        });
    });

});