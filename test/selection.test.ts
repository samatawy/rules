import { describe, expect, it } from 'vitest';
import { Workspace } from '../src/engine/workspace';
import { WorkLogger } from '../src/logging/work.logger';

describe('Selection tests', () => {

    it('select candidate using eligibility criteria', async () => {

        WorkLogger.setLogLevel('info'); // Set log level to info to see detailed output during test

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

        let started = Date.now().valueOf();

        let ctx = space.loadContext({
            Candidates: candidates,
            Task: payload.Task,
        });

        space.process(ctx);
        let ended = Date.now().valueOf();
        console.log(`Time taken to select by eligibility: ${ended - started} ms`);

        console.debug('Final output:', ctx.getOutput());
        // console.debug('Nearby candidates:', ctx.getOutput('Nearby'));
        // console.debug('Eligible candidates:', ctx.getOutput('Eligible'));
        // console.debug('Selected candidate:', ctx.getOutput('Selected'));
        expect(ctx.getOutput('Selected')[0].name).toEqual('Alice');

        ctx = space.loadContext({
            Candidates: candidates,
            Task: { name: 'Task2', skill: 'SkillD', location: 'Location1' },
        });
        space.process(ctx);
        console.debug('Final output for Task2:', ctx.getOutput());
        // console.debug('Nearby candidates for Task2:', ctx.getOutput('Nearby'));
        // console.debug('Eligible candidates for Task2:', ctx.getOutput('Eligible'));
        // console.debug('Selected candidate for Task2:', ctx.getOutput('Selected'));
        expect(ctx.getOutput('Selected').length).toEqual(0);
        expect(ctx.getOutput('Message')).toEqual("Nobody is eligible for the task");
    });

    it('select candidate using scoring factors', async () => {

        WorkLogger.setLogLevel('info'); // Set log level to info to see detailed output during test

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

        space.addFunction(`scoreCandidate(candidate: { name: string, seniority: number, current_workload: number }) {
            SET candidate.score = candidate.seniority * 0.7 - candidate.current_workload * 0.3;
            return candidate;
        }`);

        space.addRule('if Task and not(BySeniority) then BySeniority = Candidates.sort(candidate : neg(candidate.seniority))');
        space.addRule('if Task and not(ByMostFree) then ByLeastBusy = Candidates.sort(candidate : candidate.current_workload).map(candidate : candidate.name)');
        space.addRule(`if Candidates and not(Scored) 
            then set Scored = Candidates.map(candidate : scoreCandidate(candidate))
                                        .sort(candidate : neg(candidate.score))
        `);

        let started = Date.now().valueOf();

        let ctx = space.loadContext({
            Candidates: candidates,
            Task: payload.Task,
        });

        space.process(ctx);
        let ended = Date.now().valueOf();
        console.log(`Time taken to select by score: ${ended - started} ms`);

        console.debug('Final output:', ctx.getOutput());
        expect(ctx.getOutput('BySeniority')[0].name).toEqual('Bob');
        expect(ctx.getOutput('ByLeastBusy')[0]).toEqual('Charlie');
        expect(ctx.getOutput('Scored')[0].name).toEqual('Bob');
    });

    it('select candidate using target distribution', async () => {

        WorkLogger.setLogLevel('info'); // Set log level to info to see detailed output during test

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

        space.addFunction(`scoreCandidate(candidate: { name: string, seniority: number, current_workload: number }) {
            SET candidate.score = candidate.seniority * 0.7 - candidate.current_workload * 0.3;
            return candidate
        }`);

        space.addFunction(`projectWorkload(candidate: { name: string, current_workload: number, target_workload: number }, task: { name: string }) {
            SET candidate.projected_workload = candidate.current_workload + 1;
            return candidate
        }`);

        space.addRule('if Task and not(Projected) then Projected = Candidates.map(candidate : projectWorkload(candidate, Task)).sort(candidate : candidate.projected_workload)');
        space.addRule('if Projected then Ranked = Projected.sort(candidate : abs(candidate.target_workload - candidate.projected_workload))');


        let started = Date.now().valueOf();

        let ctx = space.loadContext({
            Candidates: candidates,
            Task: payload.Task,
        });

        space.process(ctx);
        let ended = Date.now().valueOf();
        console.log(`Time taken to select by target distribution: ${ended - started} ms`);

        console.debug('Final output:', ctx.getOutput());
        expect(ctx.getOutput('Ranked')[0].name).toBeOneOf(['Alice', 'Charlie']);
    });

});