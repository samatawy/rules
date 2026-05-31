import type { BooleanExpression, Expression, NumericExpression } from "../../syntax/expression";
import { Workspace } from "../workspace";
import { WorkingMemory } from "../working.memory";
import type { FunctionDefinition, ObjectType } from "../../types";
import { ExpressionParser } from "../../parser/expression.parser";
import { ExecutableParser } from "../../parser/executable.parser";

export type EligibilityFunction<C, T> = (candidate: C, task: T) => boolean;

export type ScoringFunction<C, T> = (candidate: C, task: T) => number;

export interface EligibilityDefinition extends FunctionDefinition {
    parameters: [
        { name: 'candidate', type: ObjectType },
        { name: 'task', type: ObjectType }
    ];
    expression: BooleanExpression;
}

export interface ScoringDefinition extends FunctionDefinition {
    parameters: [
        { name: 'candidate', type: ObjectType },
        { name: 'task', type: ObjectType }
    ];
    expression: NumericExpression;
}

export class SelectionContext<C, T> extends WorkingMemory {
    constructor(task: T, candidates: C[], workspace: Workspace) {
        super({
            Task: task,
        }, workspace, {
            Candidates: candidates
        });
    }

    public getTask(): T {
        return this.getData('Task');
    }

    public getSelected(): C[] {
        return this.getOutput('Selected') || [];
    }
}

export class SelectionSpace<C, T> {

    private workspace: Workspace;

    private task_type?: ObjectType;

    private candidate_type?: ObjectType;

    private candidates: C[] = [];

    private inclusion_defs: Map<string, EligibilityDefinition> = new Map();

    private scoring_defs: Map<string, ScoringDefinition> = new Map();

    private inclusion_map: Map<string, EligibilityFunction<C, T>> = new Map();

    private scoring_map: Map<string, ScoringFunction<C, T>> = new Map();

    constructor(workspace?: Workspace) {
        this.workspace = workspace || new Workspace();
    }

    // Manage types:

    public setTaskType(type: ObjectType): void {
        this.task_type = type;
    }

    public taskType(): ObjectType | undefined {
        return this.task_type;
    }

    public setCandidateType(type: ObjectType): void {
        this.candidate_type = type;
    }

    public candidateType(): ObjectType | undefined {
        return this.candidate_type;
    }

    // Manage candidates:

    public addCandidate(candidate: C): void {
        this.candidates.push(candidate);
    }

    public addCandidates(candidates: C[]): void {
        this.candidates.push(...candidates);
    }

    public removeCandidate(candidate: C): boolean {
        const index = this.candidates.indexOf(candidate);
        if (index !== -1) {
            this.candidates.splice(index, 1);
            return true;
        }
        return false;
    }

    public clearCandidates(): void {
        this.candidates = [];
    }

    public getCandidates(): C[] {
        return this.candidates;
    }

    // Manage eligibility:

    public addEligibilityDefinition(func: EligibilityDefinition): void {
        if (this.inclusion_defs.has(func.name)) {
            throw new Error(`An eligibility definition with the name '${func.name}' is already registered.`);
        }
        this.inclusion_defs.set(func.name, func);
    }

    // Manage scoring:

    public addScoringDefinition(func: ScoringDefinition): void {
        if (this.scoring_defs.has(func.name)) {
            throw new Error(`A scoring definition with the name '${func.name}' is already registered.`);
        }
        this.scoring_defs.set(func.name, func);
    }

    public expression(syntax: string): Expression {
        const expressionParser = new ExpressionParser({ workspace: this.workspace });
        return expressionParser.parse(syntax);
    }

    // Native eligibility functions:

    public addEligibilityFunction(keyword: string, func: EligibilityFunction<C, T>): void {
        if (this.inclusion_map.has(keyword)) {
            throw new Error(`An eligibility function with the keyword '${keyword}' is already registered.`);
        }
        this.inclusion_map.set(keyword, func);
        this
    }

    public removeEligibilityFunction(keyword: string): boolean {
        return this.inclusion_map.delete(keyword);
    }

    public clearEligibilityFunctions(): void {
        this.inclusion_map.clear();
    }

    public isEligible(candidate: C, task: T, keyword?: string): boolean {
        if (keyword) {
            const func = this.inclusion_map.get(keyword);
            if (!func) {
                throw new Error(`No eligibility function found for keyword '${keyword}'.`);
            }
            return func(candidate, task);
        }

        for (const func of this.inclusion_map.values()) {
            if (!func(candidate, task)) {
                return false;
            }
        }
        return true;
    }

    // Native scoring functions:

    public addScoringFunction(keyword: string, func: ScoringFunction<C, T>): void {
        if (this.scoring_map.has(keyword)) {
            throw new Error(`A scoring function with the keyword '${keyword}' is already registered.`);
        }
        this.scoring_map.set(keyword, func);
    }

    public removeScoringFunction(keyword: string): boolean {
        return this.scoring_map.delete(keyword);
    }

    public clearScoringFunctions(): void {
        this.scoring_map.clear();
    }

    public score(candidate: C, task: T, keyword?: string): number {
        if (keyword) {
            const func = this.scoring_map.get(keyword);
            if (!func) {
                throw new Error(`No scoring function found for keyword '${keyword}'.`);
            }
            return func(candidate, task);
        }

        let total_score = 0;
        for (const func of this.scoring_map.values()) {
            total_score += func(candidate, task);
        }
        return total_score;
    }

    // Processing:

    public loadContext(task: T): SelectionContext<C, T> {
        return new SelectionContext<C, T>(task, this.candidates, this.workspace);
    }

    public process(context: SelectionContext<C, T>): boolean {
        if (!this.taskType) {
            throw new Error('Task type is not defined for the selection space.');
        }
        if (!this.candidateType) {
            throw new Error('Candidate type is not defined for the selection space.');
        }

        const result = this.workspace.evaluate('Selected', context as WorkingMemory);

        return result;
    }

    public buildWorkspace(): void {
        if (!this.task_type) {
            throw new Error('Task type is not defined for the selection space.');
        }
        if (!this.candidate_type) {
            throw new Error('Candidate type is not defined for the selection space.');
        }

        const expressionParser = new ExpressionParser({ workspace: this.workspace });
        const executableParser = new ExecutableParser({ workspace: this.workspace });

        const typeRegistry = this.workspace.typeRegistry();
        typeRegistry.addRootType({ key: 'Task', properties: this.task_type });
        typeRegistry.addRootType({ key: 'Candidates', type: 'array', items: this.candidate_type });

        const functionRegistry = this.workspace.functionRegistry();
        functionRegistry.clear();
        for (const [name, func] of this.inclusion_defs.entries()) {
            functionRegistry.addFunction(func);
        }
        for (const [name, func] of this.scoring_defs.entries()) {
            functionRegistry.addFunction(func);
        }

        let expr: string[] = [];
        for (const keyword of this.inclusion_defs.keys()) {
            expr.push(`${keyword}(candidate, task)`);
        }
        const composeEligibility = expressionParser.parse(expr.join(' AND '));
        functionRegistry.addFunction({
            name: 'isEligible',
            parameters: [
                { name: 'candidate', type: this.candidate_type },
                { name: 'task', type: this.task_type }
            ],
            expression: composeEligibility
        });

        expr = [];
        for (const keyword of this.scoring_defs.keys()) {
            expr.push(`${keyword}(candidate, task)`);
        }
        const composeScoring = expressionParser.parse(expr.join(' + '));
        functionRegistry.addFunction({
            name: 'scoredCandidate',
            parameters: [
                { name: 'candidate', type: this.candidate_type },
                { name: 'task', type: this.task_type }
            ],
            lines: [
                executableParser.parse(`SET candidate.score = ${composeScoring}`)!
            ],
            expression: expressionParser.parse('candidate')
        });

        this.workspace.clearRules();
        this.workspace.addRule(`IF Task AND Candidates AND not(Eligible) THEN Eligible = Candidates.filter(candidate: isEligible(candidate, Task))`);
        this.workspace.addRule(`IF Eligible AND not(Scored) THEN Scored = Eligible.map(candidate: scoredCandidate(candidate, Task))`);
        this.workspace.addRule(`IF Scored AND not(Selected) THEN Selected = Scored.sort(candidate: neg(candidate.score))`);
    }

}