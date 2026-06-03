# Special Function Providers

This folder contains non-basic function providers that are either built into the core package or used as a staging area before being split into optional plugin packages.

Core package:

- [@samatawy/rules](https://www.npmjs.com/package/@samatawy/rules)
- [GitHub repository](https://github.com/samatawy/rules)

## Current Folder Contents

Files currently in this folder:

- `array.analytical.functions.ts`
- `unit.conversion.functions.ts`

Current export surface from [index.ts](./index.ts):

- `ArrayAnalyticalFunctionProvider`

`UnitConversionFunctionsProvider` exists in this folder and is registered directly by the core `FunctionFactory`, but it is not currently re-exported from this folder's `index.ts`.

## Built-In Providers In This Folder

### Array Analytical Functions

`ArrayAnalyticalFunctionProvider` provides numerical comparison and similarity metrics for arrays.

Available functions include:

- `euclidean_distance(a, b)`
- `manhattan_distance(a, b)`
- `chebyshev_distance(a, b)`
- `minkowski_distance(a, b)`
- `cosine_distance(a, b)`
- `jaccard_distance(a, b)`
- `hamming_distance(a, b)`
- `pearson_correlation(a, b)`
- `spearman_rank_correlation(a, b)`
- `cross_correlation(a, b)`
- `kendall_tau_correlation(a, b)`
- `kolmogorov_smirnov_distance(a, b)`
- `kullback_leibler_divergence(a, b)`
- `earth_movers_distance(a, b)`
- `wasserstein_distance(a, b)`
- `jensen_shannon_divergence(a, b)`

Example:

```ts
import { FunctionFactory, Workspace } from '@samatawy/rules';
import { ArrayAnalyticalFunctionProvider } from '@samatawy/rules/src/functions/special';

FunctionFactory.registerProvider(ArrayAnalyticalFunctionProvider);

const workspace = new Workspace();
workspace.addRule('if cosine_distance(vecA, vecB) < 0.1 then result.similar = true');
```

### Unit Conversion Functions

`UnitConversionFunctionsProvider` contains built-in numeric conversions for:

- mass and weight
- distance
- area
- volume
- speed
- temperature
- pressure
- energy and power

Examples include:

- `kg_to_lb(x)` / `lb_to_kg(x)`
- `km_to_mile(x)` / `mile_to_km(x)`
- `square_m_to_square_ft(x)` / `square_ft_to_square_m(x)`
- `liter_to_gallon(x)` / `gallon_to_liter(x)`
- `km_per_hour_to_meter_per_second(x)` / `meter_per_second_to_km_per_hour(x)`
- `c_to_f(x)` / `f_to_c(x)`
- `pa_to_psi(x)` / `psi_to_pa(x)`
- `j_to_ev(x)` / `ev_to_j(x)`

Alias names are also supported for some conversions, for example:

- `kph_to_mps(x)`
- `sqm_to_sqft(x)`
- `j_to_eV(x)`

## Plugin Split

Science and geography providers are no longer represented by this folder.

They now live in separate packages:

- `@samatawy/rules-science`
- `@samatawy/rules-world`

That keeps the core package focused while allowing larger domain datasets and domain-specific helpers to evolve independently.

## Notes

- Not every file in this folder is necessarily re-exported from `index.ts`.
- Some providers here are built into the core package through `FunctionFactory` registration.
- Larger domain packages should generally move out of this folder into their own publishable plugin package.
