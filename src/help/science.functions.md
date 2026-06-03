---
title: Science Functions
---

# Science Functions

These functions are available from `@samatawy/rules-science` and are not built into the core `@samatawy/rules` package.

Install the science package alongside the core engine:

```bash
npm install @samatawy/rules @samatawy/rules-science
```

Register one or more science providers before using the functions in rules:

```ts
import { FunctionFactory } from '@samatawy/rules';
import {
  CommonChemistryFunctionsProvider,
  PhysicsConstantsProvider,
} from '@samatawy/rules-science';

FunctionFactory.registerProvider(CommonChemistryFunctionsProvider);
FunctionFactory.registerProvider(PhysicsConstantsProvider);
```

You can also register both together:

```ts
import { registerScienceProviders } from '@samatawy/rules-science';

registerScienceProviders();
```

## Physics Functions

These currently expose physical constants.

### `c()` or `speed_of_light()`
Returns the speed of light in meters per second.

```
set lightSpeed = c()
```

### `g()`
Returns standard gravity.

```
set gravity = g()
```

### `avogadro()`
Returns Avogadro's constant.

```
set particlesPerMole = avogadro()
```

### `planck()`
Returns Planck's constant.

```
set planckValue = planck()
```

### `electron_mass()`
Returns the electron rest mass.

```
set mass = electron_mass()
```

### `proton_mass()`
Returns the proton rest mass.

```
set mass = proton_mass()
```

### `neutron_mass()`
Returns the neutron rest mass.

```
set mass = neutron_mass()
```

### `boltzmann()`
Returns the Boltzmann constant.

```
set k = boltzmann()
```

### `gas_constant()`
Returns the universal gas constant.

```
set r = gas_constant()
```

### `faraday()`
Returns the Faraday constant.

```
set chargePerMole = faraday()
```

### `gravitational_constant()`
Returns the gravitational constant.

```
set gConst = gravitational_constant()
```

### `molecular_mass_unit()`
Returns the unified atomic mass unit in kilograms.

```
set amu = molecular_mass_unit()
```

### `bohr_radius()`
Returns the Bohr radius in meters.

```
set radius = bohr_radius()
```

### `rydberg_constant()`
Returns the Rydberg constant.

```
set rydberg = rydberg_constant()
```

### `stefan_boltzmann_constant()`
Returns the Stefan-Boltzmann constant.

```
set sigma = stefan_boltzmann_constant()
```

### `elementary_charge()`
Returns the elementary charge in coulombs.

```
set charge = elementary_charge()
```

## Chemistry Functions

These functions expose common element lookups and formula helpers.

A listing of known values is included for 118 elements. Every effort was made to keep accuracy but the possibility of errors is not zero.

### `short_formula(formula)`
Compacts a formula by combining repeated element counts.

```
set compact = short_formula("C2H4O2")
```

### `molecular_weight(formula)`
Returns the molecular weight derived from the formula.

```
set mw = molecular_weight("H2SO4")
```

### `atoms_of_element(element, formula)`
Returns how many atoms of an element appear in a formula.

```
set oxygenCount = atoms_of_element("O", "C6H12O6")
```

### `fractional_weight_of_element(element, formula)`
Returns the mass fraction contributed by an element in a formula.

```
set oxygenFraction = fractional_weight_of_element("O", "H2O")
```

### `element_symbols()`
Returns the available periodic-table symbols.

```
set symbols = element_symbols()
```

### `atomic_number(symbol)`
Returns the atomic number for an element symbol.

```
set z = atomic_number("O")
```

### `atomic_weight(symbol)`
Returns the atomic weight for an element symbol.

```
set wt = atomic_weight("Fe")
```

### `element_name(symbol)`
Returns the element name for a symbol.

```
set name = element_name("Na")
```

### `electron_configuration(symbol)`
Returns the electron configuration text for a symbol.

```
set config = electron_configuration("Cl")
```

### `valence_electrons(symbol)`
Returns the number of valence electrons when known.

```
set valence = valence_electrons("C")
```

### `common_oxidation_states(symbol)`
Returns the common oxidation states.

```
set states = common_oxidation_states("Mn")
```

### `electronegativity(symbol)`
Returns the Pauling electronegativity when known.

```
set en = electronegativity("O")
```

### `atomic_radius_pm(symbol)`
Returns the atomic radius in picometers when known.

```
set radius = atomic_radius_pm("Si")
```

### `ionization_energy_kj_mol(symbol)`
Returns the first ionization energy in kilojoules per mole when known.

```
set ie = ionization_energy_kj_mol("Ne")
```

### `electron_affinity_kj_mol(symbol)`
Returns the electron affinity in kilojoules per mole when known.

```
set ea = electron_affinity_kj_mol("F")
```

### `phase_at_stp(symbol)`
Returns the standard phase at STP.

```
set phase = phase_at_stp("Br")
```

### `melting_point_k(symbol)`
Returns the melting point in kelvin when known.

```
set melt = melting_point_k("Al")
```

### `boiling_point_k(symbol)`
Returns the boiling point in kelvin when known.

```
set boil = boiling_point_k("N")
```

### `density_g_cm3(symbol)`
Returns the density in grams per cubic centimeter when known.

```
set density = density_g_cm3("Cu")
```
