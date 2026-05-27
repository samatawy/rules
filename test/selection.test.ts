import { describe, expect, it } from 'vitest';
import { Workspace } from '../src/engine/workspace';
import { WorkLogger } from '../src';

describe('Selection tests', () => {

    it('select candidate using eligibility criteria', async () => {

        WorkLogger.setLogLevel('info'); // Set log level to info to see detailed output during test

        const space = new Workspace({ strict_inputs: false, strict_outputs: false });
        space.typeRegistry().addRootType({
            key: 'Candidate',
            properties: {
                name: 'string',
                skills: 'string[]',
                location: 'string',
            }
        });

        space.typeRegistry().addRootType({
            key: 'Candidates',
            type: 'array',
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
        // space.addRule('if Selected == [] OR Selected.count() == 0 then Message = "Nobody is eligible for the task"');
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
        expect(ctx.getOutput('Message')).toEqual("Nobody is eligible for the task");
    });

});