import type { TypedParameter } from "../../types";
import type { Expression } from "../../syntax/expression";
import type { TypeChecker, ValidationResult, WorkingContext } from "../../interfaces";
import { NumericFunctionExpression } from "../../syntax/function.expression";
import { EvaluationError, TypeCheckError } from "../../rules/exception";
import { getReturnType } from "../../type.utils";
import { FunctionCompiler } from "../..";

type ConversionSpec = {
    body: string;
    convert: (value: number) => number;
};

function conversion(body: string, convert: (value: number) => number): ConversionSpec {
    return { body, convert };
}

const CANONICAL_CONVERSIONS: Record<string, ConversionSpec> = {
    // mass/weight
    kg_to_lb: conversion('return x * 2.20462;', x => x * 2.20462),
    lb_to_kg: conversion('return x / 2.20462;', x => x / 2.20462),
    g_to_oz: conversion('return x * 0.035274;', x => x * 0.035274),
    oz_to_g: conversion('return x / 0.035274;', x => x / 0.035274),
    tonne_to_lb: conversion('return x * 2204.62;', x => x * 2204.62),
    lb_to_tonne: conversion('return x / 2204.62;', x => x / 2204.62),
    stone_to_lb: conversion('return x * 14;', x => x * 14),
    lb_to_stone: conversion('return x / 14;', x => x / 14),
    kg_to_stone: conversion('return x * 0.157473;', x => x * 0.157473),
    stone_to_kg: conversion('return x / 0.157473;', x => x / 0.157473),
    carat_to_g: conversion('return x * 0.2;', x => x * 0.2),
    g_to_carat: conversion('return x / 0.2;', x => x / 0.2),

    // distance
    cm_to_in: conversion('return x * 0.393701;', x => x * 0.393701),
    in_to_cm: conversion('return x / 0.393701;', x => x / 0.393701),
    m_to_ft: conversion('return x * 3.28084;', x => x * 3.28084),
    ft_to_m: conversion('return x / 3.28084;', x => x / 3.28084),
    km_to_mile: conversion('return x * 0.621371;', x => x * 0.621371),
    mile_to_km: conversion('return x / 0.621371;', x => x / 0.621371),
    km_to_nautical_mile: conversion('return x * 0.539957;', x => x * 0.539957),
    nautical_mile_to_km: conversion('return x / 0.539957;', x => x / 0.539957),
    mile_to_nautical_mile: conversion('return x * 0.868976;', x => x * 0.868976),
    nautical_mile_to_mile: conversion('return x / 0.868976;', x => x / 0.868976),
    m_to_yard: conversion('return x * 1.09361;', x => x * 1.09361),
    yard_to_m: conversion('return x / 1.09361;', x => x / 1.09361),
    cm_to_pt: conversion('return x * 2.83465;', x => x * 2.83465),
    pt_to_cm: conversion('return x / 2.83465;', x => x / 2.83465),
    mm_to_pt: conversion('return x * 0.283465;', x => x * 0.283465),
    pt_to_mm: conversion('return x / 0.283465;', x => x / 0.283465),
    in_to_pt: conversion('return x * 72;', x => x * 72),
    pt_to_in: conversion('return x / 72;', x => x / 72),
    km_to_lightyear: conversion('return x / 9.461e12;', x => x / 9.461e12),
    lightyear_to_km: conversion('return x * 9.461e12;', x => x * 9.461e12),
    au_to_km: conversion('return x * 149597870.7;', x => x * 149597870.7),
    km_to_au: conversion('return x / 149597870.7;', x => x / 149597870.7),
    parsec_to_lightyear: conversion('return x * 3.26156;', x => x * 3.26156),
    lightyear_to_parsec: conversion('return x / 3.26156;', x => x / 3.26156),

    // area
    square_m_to_square_ft: conversion('return x * 10.7639;', x => x * 10.7639),
    square_ft_to_square_m: conversion('return x / 10.7639;', x => x / 10.7639),
    acre_to_square_m: conversion('return x * 4046.86;', x => x * 4046.86),
    square_m_to_acre: conversion('return x / 4046.86;', x => x / 4046.86),
    hectare_to_square_m: conversion('return x * 10000;', x => x * 10000),
    square_m_to_hectare: conversion('return x / 10000;', x => x / 10000),
    square_km_to_square_mile: conversion('return x * 0.386102;', x => x * 0.386102),
    square_mile_to_square_km: conversion('return x / 0.386102;', x => x / 0.386102),

    // volume
    liter_to_gallon: conversion('return x * 0.264172;', x => x * 0.264172),
    gallon_to_liter: conversion('return x / 0.264172;', x => x / 0.264172),
    gallon_to_cubic_ft: conversion('return x * 0.133681;', x => x * 0.133681),
    cubic_ft_to_gallon: conversion('return x / 0.133681;', x => x / 0.133681),
    ml_to_fluid_oz: conversion('return x * 0.033814;', x => x * 0.033814),
    fluid_oz_to_ml: conversion('return x / 0.033814;', x => x / 0.033814),
    cubic_m_to_cubic_ft: conversion('return x * 35.3147;', x => x * 35.3147),
    cubic_ft_to_cubic_m: conversion('return x / 35.3147;', x => x / 35.3147),

    // speed
    km_per_hour_to_meter_per_second: conversion('return x / 3.6;', x => x / 3.6),
    meter_per_second_to_km_per_hour: conversion('return x * 3.6;', x => x * 3.6),
    mile_per_hour_to_meter_per_second: conversion('return x * 0.44704;', x => x * 0.44704),
    meter_per_second_to_mile_per_hour: conversion('return x / 0.44704;', x => x / 0.44704),
    mile_per_hour_to_km_per_hour: conversion('return x * 1.60934;', x => x * 1.60934),
    km_per_hour_to_mile_per_hour: conversion('return x / 1.60934;', x => x / 1.60934),
    knot_to_mile_per_hour: conversion('return x * 1.15078;', x => x * 1.15078),
    mile_per_hour_to_knot: conversion('return x / 1.15078;', x => x / 1.15078),
    knot_to_meter_per_second: conversion('return x * 0.514444;', x => x * 0.514444),
    meter_per_second_to_knot: conversion('return x / 0.514444;', x => x / 0.514444),

    // temperature
    c_to_f: conversion('return (x * 9 / 5) + 32;', x => (x * 9 / 5) + 32),
    f_to_c: conversion('return (x - 32) * 5 / 9;', x => (x - 32) * 5 / 9),
    k_to_c: conversion('return x - 273.15;', x => x - 273.15),
    c_to_k: conversion('return x + 273.15;', x => x + 273.15),
    f_to_k: conversion('return (x - 32) * 5 / 9 + 273.15;', x => (x - 32) * 5 / 9 + 273.15),
    k_to_f: conversion('return (x - 273.15) * 9 / 5 + 32;', x => (x - 273.15) * 9 / 5 + 32),

    // pressure
    pa_to_psi: conversion('return x * 0.000145038;', x => x * 0.000145038),
    psi_to_pa: conversion('return x / 0.000145038;', x => x / 0.000145038),
    bar_to_psi: conversion('return x * 14.5038;', x => x * 14.5038),
    psi_to_bar: conversion('return x / 14.5038;', x => x / 14.5038),
    atm_to_psi: conversion('return x * 14.6959;', x => x * 14.6959),
    psi_to_atm: conversion('return x / 14.6959;', x => x / 14.6959),
    mmhg_to_pa: conversion('return x * 133.322;', x => x * 133.322),
    pa_to_mmhg: conversion('return x / 133.322;', x => x / 133.322),

    // energy and power
    j_to_cal: conversion('return x * 0.239006;', x => x * 0.239006),
    cal_to_j: conversion('return x / 0.239006;', x => x / 0.239006),
    ev_to_j: conversion('return x * 1.60218e-19;', x => x * 1.60218e-19),
    j_to_ev: conversion('return x / 1.60218e-19;', x => x / 1.60218e-19),
    kwh_to_j: conversion('return x * 3.6e6;', x => x * 3.6e6),
    j_to_kwh: conversion('return x / 3.6e6;', x => x / 3.6e6),
    hp_to_watt: conversion('return x * 745.7;', x => x * 745.7),
    watt_to_hp: conversion('return x / 745.7;', x => x / 745.7),
    j_to_btu: conversion('return x * 0.000947817;', x => x * 0.000947817),
    btu_to_j: conversion('return x / 0.000947817;', x => x / 0.000947817),
    hp_to_btu_per_hour: conversion('return x * 2544.43;', x => x * 2544.43),
    btu_per_hour_to_hp: conversion('return x / 2544.43;', x => x / 2544.43),
};

const CONVERSION_ALIASES: Record<string, string> = {
    sqm_to_sqft: 'square_m_to_square_ft',
    sqft_to_sqm: 'square_ft_to_square_m',
    acre_to_sqm: 'acre_to_square_m',
    sqm_to_acre: 'square_m_to_acre',
    hectare_to_sqm: 'hectare_to_square_m',
    sqm_to_hectare: 'square_m_to_hectare',

    kph_to_mps: 'km_per_hour_to_meter_per_second',
    mps_to_kph: 'meter_per_second_to_km_per_hour',
    mph_to_mps: 'mile_per_hour_to_meter_per_second',
    mps_to_mph: 'meter_per_second_to_mile_per_hour',
    mph_to_kph: 'mile_per_hour_to_km_per_hour',
    kph_to_mph: 'km_per_hour_to_mile_per_hour',
    knot_to_mph: 'knot_to_mile_per_hour',
    mph_to_knot: 'mile_per_hour_to_knot',
    knot_to_mps: 'knot_to_meter_per_second',
    mps_to_knot: 'meter_per_second_to_knot',

    eV_to_j: 'ev_to_j',
    j_to_eV: 'j_to_ev',
    kWh_to_j: 'kwh_to_j',
    j_to_kWh: 'j_to_kwh',
    hp_to_btu: 'hp_to_btu_per_hour',
    btu_to_hp: 'btu_per_hour_to_hp',
};

const CONVERSION_NAMES = [...Object.keys(CANONICAL_CONVERSIONS), ...Object.keys(CONVERSION_ALIASES)];

function getConversion(name: string): ConversionSpec | undefined {
    const canonicalName = CONVERSION_ALIASES[name] ?? name;
    return CANONICAL_CONVERSIONS[canonicalName];
}

export class UnitConversionFunctions extends NumericFunctionExpression {

    constructor(name: string, args: Expression[]) {
        super(name, args);
    }

    public expectsParameters(): TypedParameter[] {
        return [{ type: 'number' }];
    }

    public checkTypes(checker?: TypeChecker): ValidationResult {
        if (this.args.length !== 1) {
            return {
                valid: false,
                errors: [`Function ${this.name} expects exactly 1 argument, but got ${this.args.length}`],
            };
        }
        const argType = getReturnType(this.args[0]!, checker);
        if (argType !== 'number') {
            return {
                valid: false,
                errors: [`Argument for function ${this.name} must be a number, but got ${argType}`],
            };
        }
        return { valid: true };
    }

    public evaluate(context: WorkingContext): number {
        const cached = context.getCached(this.syntax);
        if (cached !== undefined) return cached;

        const evaluatedArgs = this.args.map(arg => arg.evaluate(context));
        const targetValue = evaluatedArgs[0];
        if (typeof targetValue !== 'number') {
            throw new EvaluationError(`Argument for function ${this.name} did not evaluate to a number`);
        }

        if (FunctionCompiler.enabled) {
            const compiled = (globalThis as any)[this.name] as Function;
            if (typeof compiled === 'function') {
                return compiled(targetValue, ...evaluatedArgs, context);
            }
        }

        const spec = getConversion(this.name);
        if (!spec) {
            throw new EvaluationError(`Unknown unit conversion function: ${this.name}`);
        }

        return spec.convert(targetValue);
    }
}

export class UnitConversionFunctionsProvider {

    private static _names = CONVERSION_NAMES;

    public static names(): string[] {
        return this._names;
    }

    public static create(name: string, args: Expression[]): UnitConversionFunctions | undefined {
        if (!this._names.includes(name)) {
            return undefined;
        }
        if (args.length !== 1) {
            throw new TypeCheckError(`Function ${name} expects exactly 1 argument, but got ${args.length}`);
        }
        return new UnitConversionFunctions(name, args);
    }

    public static mock(name: string, args: Expression[]): UnitConversionFunctions | undefined {
        if (!this._names.includes(name)) {
            return undefined;
        }
        return new UnitConversionFunctions(name, args);
    }

    public static toJS(name: string): { args: string[], body: string } {
        const spec = getConversion(name);
        if (!spec) {
            throw new TypeCheckError(`Unknown unit conversion function: ${name}`);
        }
        return { args: ['x'], body: spec.body };
    }
}
