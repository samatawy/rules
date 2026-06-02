import type { ArrayType, AtomicType, ObjectArrayType, ObjectType, TypedParameter } from "../types";
import type { Expression } from "../syntax/expression";
import type { TypeChecker, ValidationResult, WorkingContext } from "../interfaces";
import { FunctionExpression } from "../syntax/function.expression";
import { EvaluationError, TypeCheckError } from "../rules/exception";

export class ChemistryConstants extends FunctionExpression {

    constructor(name: string, args: Expression[]) {
        super(name, args);
    }

    public expectsParameters(): TypedParameter[] {
        return [{ type: 'string' }];
    }

    public returnsType(checker?: TypeChecker): AtomicType | ArrayType | ObjectType | ObjectArrayType {
        switch (this.name) {
            case 'element_symbols':
                return { type: 'string[]' };
            case 'short_formula':
                return { type: 'string' };
            case 'atomic_number':
            case 'atomic_weight':
            case 'molecular_wt':
            case 'moolecular_mass_unit':
            case 'bohr_radius':
            case 'rydberg_constant':
            case 'stefan_boltzmann_constant':
            case 'elementary_charge':
                return { type: 'number' };

            default:
                throw new TypeCheckError(`Unknown constant function: ${this.name}`);
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

    public evaluate(context: WorkingContext): number | string | string[] {
        const cached = context.getCached(this.syntax);
        if (cached !== undefined) return cached;

        if (this.args.length !== 1) {
            throw new EvaluationError(`Chemical constant functions expect one argument, but got ${this.args.length}`);
        }
        const arg = this.args[0]!.evaluate(context);
        if (typeof arg !== 'string') {
            throw new EvaluationError(`Argument for function ${this.name} must evaluate to a string, but got ${typeof arg}`);
        }

        switch (this.name) {
            case 'element_symbols':
                return Array.from(Object.keys(periodic_table));
            case 'atomic_number':
                return periodic_table[arg]?.an || NaN;
            case 'atomic_weight':
                return periodic_table[arg]?.aw || NaN;
            case 'element_name':

            case 'valency':
                const element = periodic_table[arg];
                if (!element) {
                    throw new EvaluationError(`Unknown element symbol: ${arg}`);
                }
                // Simple valency estimation based on group number (not accurate for transition metals, etc.)
                if (element.an <= 2) return element.an; // H, He
                if (element.an <= 10) return element.an - 2; // Li to Ne
                if (element.an <= 18) return element.an - 10; // Na to Ar
                if (element.an <= 36) return element.an - 18; // K to Kr
                if (element.an <= 54) return element.an - 36; // Rb to Xe
                if (element.an <= 86) return element.an - 54; // Cs to Rn
                return element.an - 86; // Fr to Og

            case 'short_formula':
                return this.short_formula(arg);

            case 'molecular_wt':
                return this.molecular_weight(arg);

            // constants
            case 'moolecular_mass_unit':
                return 1.66053906660e-27;
            case 'bohr_radius':
                return 5.29177210903e-11;
            case 'rydberg_constant':
                return 10973731.568160;
            case 'stefan_boltzmann_constant':
                return 5.670374419e-8;
            case 'elementary_charge':
                return 1.602176634e-19;

            default:
                throw new EvaluationError(`Unknown constant function: ${this.name}`);
        }
    }

    // Formula can have elements followed by optional numbers, e.g. H2O, C6H12O6, etc.
    // A formula can have the same element multiple times, e.g. C2H4O6 is the same as CH3COOH, etc.
    private short_formula(formula: string): string {
        const element_counts: { [key: string]: number } = {};
        const element_symbols = Object.keys(periodic_table);
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

    // Formula can have elements followed by optional numbers, e.g. H2O, C6H12O6, etc.
    // A formula can have the same element multiple times, e.g. C2H4O6 is the same as CH3COOH, etc.
    private molecular_weight(formula: string): number {
        let formula_weight = 0;
        const element_wts = Object.keys(periodic_table).map(el => ({ symbol: el, aw: periodic_table[el]?.aw }));
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
}

type ElementInfo = { an: number, aw: number, valency: number[] };

const periodic_table: { [key: string]: ElementInfo } = {
    'H': { an: 1, aw: 1.008, valency: [1] },
    'He': { an: 2, aw: 4.002602, valency: [0] },
    'Li': { an: 3, aw: 6.94, valency: [1] },
    'Be': { an: 4, aw: 9.0122, valency: [2] },
    'B': { an: 5, aw: 10.81, valency: [3] },
    'C': { an: 6, aw: 12.011, valency: [4] },
    'N': { an: 7, aw: 14.007, valency: [3] },
    'O': { an: 8, aw: 15.999, valency: [2] },
    'F': { an: 9, aw: 18.998403163, valency: [1] },
    'Ne': { an: 10, aw: 20.1797, valency: [0] },
    'Na': { an: 11, aw: 22.98976928, valency: [1] },
    'Mg': { an: 12, aw: 24.305, valency: [2] },
    'Al': { an: 13, aw: 26.9815385, valency: [3] },
    'Si': { an: 14, aw: 28.085, valency: [4] },
    'P': { an: 15, aw: 30.973761998, valency: [3] },
    'S': { an: 16, aw: 32.06, valency: [2] },
    'Cl': { an: 17, aw: 35.45, valency: [1] },
    'Ar': { an: 18, aw: 39.948, valency: [0] },
    'K': { an: 19, aw: 39.0983, valency: [1] },
    'Ca': { an: 20, aw: 40.078, valency: [2] },
    'Sc': { an: 21, aw: 44.955908, valency: [3] },
    'Ti': { an: 22, aw: 47.867, valency: [4] },
    'V': { an: 23, aw: 50.9415, valency: [5] },
    'Cr': { an: 24, aw: 51.9961, valency: [6] },
    'Mn': { an: 25, aw: 54.938044, valency: [7] },
    'Fe': { an: 26, aw: 55.845, valency: [2, 3] },
    'Co': { an: 27, aw: 58.933194, valency: [2, 3] },
    'Ni': { an: 28, aw: 58.6934, valency: [2] },
    'Cu': { an: 29, aw: 63.546, valency: [1, 2] },
    'Zn': { an: 30, aw: 65.38, valency: [2] },
    'Ga': { an: 31, aw: 69.723, valency: [3] },
    'Ge': { an: 32, aw: 72.63, valency: [4] },
    'As': { an: 33, aw: 74.921595, valency: [3] },
    'Se': { an: 34, aw: 78.971, valency: [2] },
    'Br': { an: 35, aw: 79.904, valency: [1] },
    'Kr': { an: 36, aw: 83.798, valency: [0] },
    'Rb': { an: 37, aw: 85.4678, valency: [1] },
    'Sr': { an: 38, aw: 87.62, valency: [2] },
    'Y': { an: 39, aw: 88.90584, valency: [3] },
    'Zr': { an: 40, aw: 91.224, valency: [4] },
    'Nb': { an: 41, aw: 92.90637, valency: [5] },
    'Mo': { an: 42, aw: 95.95, valency: [6] },
    'Tc': { an: 43, aw: 98, valency: [7] },
    'Ru': { an: 44, aw: 101.07, valency: [] },
    'Rh': { an: 45, aw: 102.90550, valency: [] },
    'Pd': { an: 46, aw: 106.42, valency: [] },
    'Ag': { an: 47, aw: 107.8682, valency: [] },
    'Cd': { an: 48, aw: 112.414, valency: [] },
    'In': { an: 49, aw: 114.818, valency: [] },
    'Sn': { an: 50, aw: 118.710, valency: [] },
    'Sb': { an: 51, aw: 121.760, valency: [] },
    'Te': { an: 52, aw: 127.60, valency: [] },
    'I': { an: 53, aw: 126.90447, valency: [] },
    'Xe': { an: 54, aw: 131.293, valency: [] },
    'Cs': { an: 55, aw: 132.90545196, valency: [] },
    'Ba': { an: 56, aw: 137.327, valency: [] },
    'La': { an: 57, aw: 138.90547, valency: [] },
    'Ce': { an: 58, aw: 140.116, valency: [] },
    'Pr': { an: 59, aw: 140.90766, valency: [] },
    'Nd': { an: 60, aw: 144.242, valency: [] },
    'Pm': { an: 61, aw: 145, valency: [] },
    'Sm': { an: 62, aw: 150.36, valency: [] },
    'Eu': { an: 63, aw: 151.964, valency: [] },
    'Gd': { an: 64, aw: 157.25, valency: [] },
    'Tb': { an: 65, aw: 158.92535, valency: [] },
    'Dy': { an: 66, aw: 162.500, valency: [] },
    'Ho': { an: 67, aw: 164.93033, valency: [] },
    'Er': { an: 68, aw: 167.259, valency: [] },
    'Tm': { an: 69, aw: 168.93422, valency: [] },
    'Yb': { an: 70, aw: 173.04, valency: [] },
    'Lu': { an: 71, aw: 174.9668, valency: [] },
    'Hf': { an: 72, aw: 178.49, valency: [] },
    'Ta': { an: 73, aw: 180.94788, valency: [] },
    'W': { an: 74, aw: 183.84, valency: [] },
    'Re': { an: 75, aw: 186.207, valency: [] },
    'Os': { an: 76, aw: 190.23, valency: [] },
    'Ir': { an: 77, aw: 192.217, valency: [] },
    'Pt': { an: 78, aw: 195.084, valency: [] },
    'Au': { an: 79, aw: 196.966569, valency: [] },
    'Hg': { an: 80, aw: 200.592, valency: [] },
    'Tl': { an: 81, aw: 204.38, valency: [] },
    'Pb': { an: 82, aw: 207.2, valency: [] },
    'Bi': { an: 83, aw: 208.98040, valency: [] },
    'Po': { an: 84, aw: 209, valency: [] },
    'At': { an: 85, aw: 210, valency: [] },
    'Rn': { an: 86, aw: 222, valency: [] },
    'Fr': { an: 87, aw: 223, valency: [] },
    'Ra': { an: 88, aw: 226, valency: [] },
    'Ac': { an: 89, aw: 227, valency: [] },
    'Th': { an: 90, aw: 232.0377, valency: [] },
    'Pa': { an: 91, aw: 231.03588, valency: [] },
    'U': { an: 92, aw: 238.02891, valency: [] },
    'Np': { an: 93, aw: 237, valency: [] },
    'Pu': { an: 94, aw: 244, valency: [] },
    'Am': { an: 95, aw: 243, valency: [] },
    'Cm': { an: 96, aw: 247, valency: [] },
    'Bk': { an: 97, aw: 247, valency: [] },
    'Cf': { an: 98, aw: 251, valency: [] },
    'Es': { an: 99, aw: 252, valency: [] },
    'Fm': { an: 100, aw: 257, valency: [] },
    'Md': { an: 101, aw: 258, valency: [] },
    'No': { an: 102, aw: 259, valency: [] },
    'Lr': { an: 103, aw: 262, valency: [] },
    'Rf': { an: 104, aw: 267, valency: [] },
    'Db': { an: 105, aw: 270, valency: [] },
    'Sg': { an: 106, aw: 271, valency: [] },
    'Bh': { an: 107, aw: 270, valency: [] },
    'Hs': { an: 108, aw: 277, valency: [] },
    'Mt': { an: 109, aw: 276, valency: [] },
    'Ds': { an: 110, aw: 281, valency: [] },
    'Rg': { an: 111, aw: 282, valency: [] },
    'Cn': { an: 112, aw: 285, valency: [] },
    'Nh': { an: 113, aw: 284, valency: [] },
    'Fl': { an: 114, aw: 289, valency: [] },
    'Mc': { an: 115, aw: 288, valency: [] },
    'Lv': { an: 116, aw: 293, valency: [] },
    'Ts': { an: 117, aw: 294, valency: [] },
    'Og': { an: 118, aw: 294, valency: [] },
};

export class ChemistryConstantsProvider {

    private static _names = ['atomic_number', 'atomic_weight'];

    public static names(): string[] {
        return this._names;
    }

    public static create(name: string, args: Expression[]): ChemistryConstants | undefined {
        if (!this._names.includes(name)) {
            return undefined;
        }
        if (args.length !== 1) {
            throw new TypeCheckError(`Function ${name} expects one argument, but got ${args.length}`);
        }
        return new ChemistryConstants(name, args);
    }

    public static mock(name: string, args: Expression[]): ChemistryConstants | undefined {
        if (!this._names.includes(name)) {
            return undefined;
        }
        return new ChemistryConstants(name, []);
    }

    public static toJS(name: string): { args: string[], body: string } {
        switch (name) {
            case 'atomic_number':
                return { args: [], body: 'return this.atomic_number;' };
            case 'atomic_weight':
                return { args: [], body: 'return this.atomic_weight;' };

            default:
                throw new TypeCheckError(`Unknown constant number function: ${name}`);
        }
    }
}
