# Special Function Providers

This folder is intended as the basis for an optional plugin package for the core rules engine.

Core package:

- [@samatawy/rules](https://www.npmjs.com/package/@samatawy/rules)
- [GitHub repository](https://github.com/samatawy/rules)

The goal is to keep the core rules package focused while allowing domain-oriented providers to be published separately and registered only when needed.

Current providers in this folder:

- `CommonChemistryFunctionsProvider`
- `PhysicsConstantsProvider`

Possible future additions:

- array analytical functions
- array statistical functions
- other science or engineering oriented providers

## How It Plugs In

Providers integrate through the core package `FunctionFactory`.

Once a provider is registered, its functions become available to rule parsing and evaluation across all workspaces.

```ts
import { FunctionFactory } from '@samatawy/rules';
import {
	CommonChemistryFunctionsProvider,
	PhysicsConstantsProvider,
} from '@samatawy/rules-special';

FunctionFactory.registerProvider(CommonChemistryFunctionsProvider);
FunctionFactory.registerProvider(PhysicsConstantsProvider);
```

If the package is published under a different name, replace `@samatawy/rules-special` with that package name.

You can register one provider or several, depending on the functions you want to expose.

## Simple Example

```ts
import { FunctionFactory, Workspace } from '@samatawy/rules';
import {
	CommonChemistryFunctionsProvider,
	PhysicsConstantsProvider,
} from '@samatawy/rules-special';

FunctionFactory.registerProvider(CommonChemistryFunctionsProvider);
FunctionFactory.registerProvider(PhysicsConstantsProvider);

const workspace = new Workspace();

workspace.addRule(`IF molecular_weight("H2O") > 18 THEN sample.kind = "waterlike"`);
workspace.addRule(`IF electronegativity("O") > electronegativity("H") THEN bond.is_polar = true`);
workspace.addRule(`IF avogadro() > 1e23 THEN constants.ready = true`);
```

The main idea is:

- import the provider from the plugin package
- register it once on startup
- use the functions in rules exactly like built-in functions

## Available Functions

### Common Chemistry Functions

- `short_formula(formula)`
- `molecular_weight(formula)`
- `atoms_of_element(element, formula)`
- `fractional_weight_of_element(element, formula)`
- `atomic_number(symbol)`
- `atomic_weight(symbol)`
- `element_name(symbol)`
- `electron_configuration(symbol)`
- `valence_electrons(symbol)`
- `common_oxidation_states(symbol)`
- `electronegativity(symbol)`
- `atomic_radius_pm(symbol)`
- `ionization_energy_kj_mol(symbol)`
- `electron_affinity_kj_mol(symbol)`
- `phase_at_stp(symbol)`
- `melting_point_k(symbol)`
- `boiling_point_k(symbol)`
- `density_g_cm3(symbol)`

### Physics Constants

- `c()` or `speed_of_light()`
- `g()`
- `golden_ratio()`
- `avogadro()`
- `planck()`
- `electron_mass()`
- `proton_mass()`
- `neutron_mass()`
- `boltzmann()`
- `gas_constant()`
- `faraday()`
- `gravitational_constant()`
- `molecular_mass_unit()`
- `bohr_radius()`
- `rydberg_constant()`
- `stefan_boltzmann_constant()`
- `elementary_charge()`

## Notes

- These providers are intended for optional registration, not automatic inclusion in the core package.
- The README is intentionally concise so the plugin can stay self-contained.
- If more providers are added later, they can follow the same registration pattern and be listed here without needing a separate documentation site.
