import type { TypedParameter } from "../../types";
import type { Expression } from "../../syntax/expression";
import type { TypeChecker, ValidationResult, WorkingContext } from "../../interfaces";
import { NumericFunctionExpression } from "../../syntax/function.expression";
import { EvaluationError, TypeCheckError } from "../../rules/exception";

export class PhysicsConstants extends NumericFunctionExpression {

    constructor(name: string) {
        super(name, []);
    }

    public expectsParameters(): TypedParameter[] {
        return [];
    }

    public checkTypes(checker?: TypeChecker): ValidationResult {
        return (this.args.length === 0) ? {
            valid: true,
        } : {
            valid: false,
            errors: [`Constant numbers do not accept arguments, but got ${this.args.length}`],
        };
    }

    public evaluate(context: WorkingContext): number {
        switch (this.name) {
            case 'c':
            case 'speed_of_light':
                return 299792458;
            case 'g':
                return 9.80665;
            case 'golden_ratio':
                return (1 + Math.sqrt(5)) / 2;
            case 'avogadro':
                return 6.02214076e23;
            case 'planck':
                return 6.62607015e-34;
            case 'electron_mass':
                return 9.10938356e-31;
            case 'proton_mass':
                return 1.6726219e-27;
            case 'neutron_mass':
                return 1.674927471e-27;
            case 'boltzmann':
                return 1.380649e-23;
            case 'gas_constant':
                return 8.314462618;
            case 'faraday':
                return 96485.33212;
            case 'gravitational_constant':
                return 6.67430e-11;

            case 'molecular_mass_unit':
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
}

export class PhysicsConstantsProvider {

    private static _names = ['c', 'speed_of_light', 'g', 'golden_ratio', 'avogadro', 'planck', 'electron_mass', 'proton_mass', 'neutron_mass', 'boltzmann', 'gas_constant', 'faraday', 'gravitational_constant', 'molecular_mass_unit', 'bohr_radius', 'rydberg_constant', 'stefan_boltzmann_constant', 'elementary_charge'];

    public static names(): string[] {
        return this._names;
    }

    public static create(name: string, args: Expression[]): PhysicsConstants | undefined {
        if (!this._names.includes(name)) {
            return undefined;
        }
        if (args.length !== 0) {
            throw new TypeCheckError(`Function ${name} expects no arguments, but got ${args.length}`);
        }
        return new PhysicsConstants(name);
    }

    public static mock(name: string, args: Expression[]): PhysicsConstants | undefined {
        if (!this._names.includes(name)) {
            return undefined;
        }
        return new PhysicsConstants(name);
    }

    public static toJS(name: string): { args: string[], body: string } {
        switch (name) {
            case 'pi':
                return { args: [], body: 'return Math.PI;' };
            case 'e':
                return { args: [], body: 'return Math.E;' };
            case 'phi':
                return { args: [], body: 'return (1 + Math.sqrt(5)) / 2;' };
            case 'tau':
                return { args: [], body: 'return 2 * Math.PI;' };
            case 'c':
            case 'speed_of_light':
                return { args: [], body: 'return 299792458;' };
            case 'g':
                return { args: [], body: 'return 9.80665;' };
            case 'golden_ratio':
                return { args: [], body: 'return (1 + Math.sqrt(5)) / 2;' };
            case 'avogadro':
                return { args: [], body: 'return 6.02214076e23;' };
            case 'planck':
                return { args: [], body: 'return 6.62607015e-34;' };
            case 'electron_mass':
                return { args: [], body: 'return 9.10938356e-31;' };
            case 'proton_mass':
                return { args: [], body: 'return 1.6726219e-27;' };
            case 'neutron_mass':
                return { args: [], body: 'return 1.674927471e-27;' };
            case 'boltzmann':
                return { args: [], body: 'return 1.380649e-23;' };
            case 'gas_constant':
                return { args: [], body: 'return 8.314462618;' };
            case 'faraday':
                return { args: [], body: 'return 96485.33212;' };
            case 'gravitational_constant':
                return { args: [], body: 'return 6.67430e-11;' };
            case 'molecular_mass_unit':
                return { args: [], body: 'return 1.66053906660e-27;' };
            case 'bohr_radius':
                return { args: [], body: 'return 5.29177210903e-11;' };
            case 'rydberg_constant':
                return { args: [], body: 'return 10973731.568160;' };
            case 'stefan_boltzmann_constant':
                return { args: [], body: 'return 5.670374419e-8;' };
            case 'elementary_charge':
                return { args: [], body: 'return 1.602176634e-19;' };

            default:
                throw new TypeCheckError(`Unknown constant number function: ${name}`);
        }
    }
}
