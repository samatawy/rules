import type { ArrayType, AtomicType, ObjectArrayType, ObjectType, TypedParameter } from "../../types";
import type { Expression } from "../../syntax/expression";
import type { TypeChecker, ValidationResult, WorkingContext } from "../../interfaces";
import { FunctionExpression } from "../../syntax/function.expression";
import { EvaluationError, TypeCheckError } from "../../rules/exception";
import { PeriodicTable } from "./periodic.table";

export class CommonChemistryFunction extends FunctionExpression {

    constructor(name: string, args: Expression[]) {
        super(name, args);
    }

    public expectsParameters(): TypedParameter[] {
        if (['short_formula', 'molecular_weight',
            'atomic_number', 'atomic_weight', 'element_name', 'electron_configuration',
            'valence_electrons', 'common_oxidation_states', 'electronegativity', 'atomic_radius_pm',
            'ionization_energy_kj_mol', 'electron_affinity_kj_mol',
            'phase_at_stp', 'melting_point_k', 'boiling_point_k', 'density_g_cm3'].includes(this.name)) {
            return [{ type: 'string' }];
        } else if (['fractional_weight_of_element', 'atoms_of_element'].includes(this.name)) {
            return [{ type: 'string' }, { type: 'string' }];
        }

        throw new TypeCheckError(`Unknown chemistry function: ${this.name}`);
    }

    public returnsType(checker?: TypeChecker): AtomicType | ArrayType | ObjectType | ObjectArrayType {
        switch (this.name) {
            case 'element_name':
            case 'electron_configuration':
            case 'phase_at_stp':
            case 'short_formula':
                return { type: 'string' };
            case 'element_symbols':
                return { type: 'string[]' };

            case 'atomic_number':
            case 'atomic_weight':
            case 'molecular_wt':
            case 'valence_electrons':
            case 'electronegativity':
            case 'atomic_radius_pm':
            case 'ionization_energy_kj_mol':
            case 'electron_affinity_kj_mol':
            case 'melting_point_k':
            case 'boiling_point_k':
            case 'density_g_cm3':
                return { type: 'number' };
            case 'common_oxidation_states':
                return { type: 'number[]' };

            case 'molecular_mass_unit':
            case 'bohr_radius':
            case 'rydberg_constant':
            case 'stefan_boltzmann_constant':
            case 'elementary_charge':
                return { type: 'number' };

            default:
                throw new TypeCheckError(`Unknown chemistry function: ${this.name}`);
        }
    }

    public checkTypes(checker?: TypeChecker): ValidationResult {
        return (this.args.length === 1) ? {
            valid: true,
        } : {
            valid: false,
            errors: [`Chemical constant functions expect one argument, but got ${this.args.length}`],
        };
    }

    public evaluate(context: WorkingContext): number | number[] | string | string[] {
        const cached = context.getCached(this.syntax);
        if (cached !== undefined) return cached;

        const expectedArgs = this.expectsParameters();
        if (this.args.length !== expectedArgs.length) {
            throw new EvaluationError(`Function ${this.name} expects ${expectedArgs.length} arguments, but got ${this.args.length}`);
        }
        const arg = this.args[0]!.evaluate(context);
        if (typeof arg !== 'string') {
            throw new EvaluationError(`Argument for function ${this.name} must evaluate to a string, but got ${typeof arg}`);
        }
        const extra_args = this.args.slice(1).map(a => a.evaluate(context));
        const second_arg = extra_args[0];

        switch (this.name) {
            // Lookups
            case 'element_symbols':
                return Array.from(Object.keys(PeriodicTable));
            case 'atomic_number':
                return PeriodicTable[arg]?.atomicNumber || NaN;
            case 'atomic_weight':
                return PeriodicTable[arg]?.atomicWeight || NaN;
            case 'element_name':
                return PeriodicTable[arg]?.name || 'Unknown element';
            case 'electron_configuration':
                return PeriodicTable[arg]?.electronConfiguration || 'Unknown configuration';
            case 'valence_electrons':
                return PeriodicTable[arg]?.valenceElectrons || NaN;
            case 'common_oxidation_states':
                return PeriodicTable[arg]?.commonOxidationStates || [];
            case 'electronegativity':
                return PeriodicTable[arg]?.electronegativity || NaN;
            case 'atomic_radius_pm':
                return PeriodicTable[arg]?.atomicRadiusPm || NaN;
            case 'ionization_energy_kj_mol':
                return PeriodicTable[arg]?.ionizationEnergy1kJMol || NaN;
            case 'electron_affinity_kj_mol':
                return PeriodicTable[arg]?.electronAffinitykJMol || NaN;
            case 'phase_at_stp':
                return PeriodicTable[arg]?.phaseAtSTP || 'unknown';
            case 'melting_point_k':
                return PeriodicTable[arg]?.meltingPointK || NaN;
            case 'boiling_point_k':
                return PeriodicTable[arg]?.boilingPointK || NaN;
            case 'density_g_cm3':
                return PeriodicTable[arg]?.densityGcm3 || NaN;

            // Calculations
            case 'short_formula':
                return this.short_formula(arg);

            case 'molecular_weight':
                return this.molecular_weight(arg);

            case 'atoms_of_element':
                return this.atoms_of_element(second_arg, arg);
            case 'fractional_weight_of_element':
                const total_atoms = this.atoms_of_element(second_arg, arg);
                const atomic_wt = PeriodicTable[arg]?.atomicWeight || NaN;
                const molecular_weight = this.molecular_weight(second_arg);
                return total_atoms * atomic_wt / molecular_weight;

            default:
                throw new EvaluationError(`Unknown chemistry function: ${this.name}`);
        }
    }

    // Compact a given formula by combining counts of the same element. For example, C2H4O6 becomes CH3COOH, etc.
    // Formula can have elements followed by optional numbers, e.g. H2O, C6H12O6, etc.
    // A formula can have the same element multiple times, e.g. C2H4O6 is the same as CH3COOH, etc.
    private short_formula(formula: string): string {
        const element_counts: { [key: string]: number } = {};
        const element_symbols = Object.keys(PeriodicTable);
        element_symbols.map(el => {
            const regex = new RegExp(`${el}(\\d*)`, 'g');
            let match;
            while ((match = regex.exec(formula)) !== null) {
                const count = match[1] ? parseInt(match[1]) : 1;
                element_counts[el] = (element_counts[el] || 0) + count;
            }
        });
        return Object.entries(element_counts).map(([el, count]) => `${el}${count > 1 ? count : ''}`).join('');
    }

    // Calculate the molecular weight of a formula by summing the atomic weights of its elements multiplied by their counts. 
    // For example, H2O has a molecular weight of 2*1.008 + 15.999 = 18.015, etc.
    // Formula can have elements followed by optional numbers, e.g. H2O, C6H12O6, etc.
    // A formula can have the same element multiple times, e.g. C2H4O6 is the same as CH3COOH, etc.
    private molecular_weight(formula: string): number {
        let formula_weight = 0;
        const element_wts = Object.keys(PeriodicTable).map(el => ({ symbol: el, aw: PeriodicTable[el]?.atomicWeight }));
        element_wts.map(el => {
            const regex = new RegExp(`${el.symbol}(\\d*)`, 'g');
            let match;
            while ((match = regex.exec(formula)) !== null) {
                const count = match[1] ? parseInt(match[1]) : 1;
                formula_weight += (el.aw || 0) * count;
            }
        });
        return formula_weight;
    }

    // Find the number of atoms of a given element in a formula.
    // Formula can have elements followed by optional numbers, e.g. H2O, C6H12O6, etc.
    // A formula can have the same element multiple times, e.g. C2H4O6 is the same as CH3COOH, etc.
    private atoms_of_element(formula: string, element: string): number {
        const shortFormula = this.short_formula(formula);
        const regex = new RegExp(`${element}(\\d*)`, 'g');
        let match;
        let count = 0;
        while ((match = regex.exec(shortFormula)) !== null) {
            count += match[1] ? parseInt(match[1]) : 1;
        }
        return count;
    }
}

export class CommonChemistryFunctionsProvider {

    private static _names = [
        'short_formula', 'molecular_weight', 'fractional_weight_of_element', 'atoms_of_element',
        'atomic_number', 'atomic_weight', 'element_name', 'electron_configuration',
        'valence_electrons', 'common_oxidation_states', 'electronegativity', 'atomic_radius_pm',
        'ionization_energy_kj_mol', 'electron_affinity_kj_mol',
        'phase_at_stp', 'melting_point_k', 'boiling_point_k', 'density_g_cm3',
    ];

    public static names(): string[] {
        return this._names;
    }

    public static create(name: string, args: Expression[]): CommonChemistryFunction | undefined {
        if (!this._names.includes(name)) {
            return undefined;
        }
        if (args.length !== 1) {
            throw new TypeCheckError(`Function ${name} expects one argument, but got ${args.length}`);
        }
        return new CommonChemistryFunction(name, args);
    }

    public static mock(name: string, args: Expression[]): CommonChemistryFunction | undefined {
        if (!this._names.includes(name)) {
            return undefined;
        }
        return new CommonChemistryFunction(name, []);
    }

    public static toJS(name: string): { args: string[], body: string } {
        return {
            args: [],
            body: '',
        }
    }
}
