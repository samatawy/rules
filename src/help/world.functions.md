---
title: World Functions
---

# World Functions

These functions are available from `@samatawy/rules-world` and are not built into the core `@samatawy/rules` package.

Install the world package alongside the core engine:

```bash
npm install @samatawy/rules @samatawy/rules-world
```

Register the geography provider before using the functions in rules:

```ts
import { FunctionFactory } from '@samatawy/rules';
import { CommonGeographyFunctionsProvider } from '@samatawy/rules-world';

FunctionFactory.registerProvider(CommonGeographyFunctionsProvider);
```

You can also register the provider through the package helper:

```ts
import { registerWorldProviders } from '@samatawy/rules-world';

registerWorldProviders();
```

## Geography Functions

These functions expose country metadata and lookup helpers based on the packaged world dataset.

**N.B.** Unless otherwise specified, functions require 2-letter country codes as the country parameter.

### `country_codes()`
Returns the available canonical country codes.

```
set codes = country_codes()
```

### `currency_codes()`
Returns the distinct currency codes present in the dataset.

```
set codes = currency_codes()
```

### `languages()`
Returns the distinct language names present in the dataset.

```
set langs = languages()
```

### `continents()`
Returns the distinct continent names present in the dataset.

```
set values = continents()
```

### `timezones()`
Returns the distinct timezones present in the dataset.

```
set zones = timezones()
```

### `country_code(value)`
Resolves a country 2-letter code from a country name, official name, alias, or ISO code when uniquely identifiable.

```
set code = country_code("Canada")
```

Two-letter country codes are required to access all other functions. It is recommended to always resolve that code from any input data before using other functions.

### `country_name(code)`
Returns the common country name for a code.

```
set name = country_name("CA")
```

### `official_country_name(code)`
Returns the official country name for a code.

```
set official = official_country_name("CA")
```

### `capital_of(code)`
Returns the capital city for a country code.

```
set capital = capital_of("JP")
```

### `continent_of(code)`
Returns the continent for a country code.

```
set continent = continent_of("BR")
```

### `country_subregion(code)`
Returns the subregion for a country code.

```
set subregion = country_subregion("EG")
```

### `currency_of(code)`
Returns the currency code used by the country.

```
set currency = currency_of("CH")
```

### `currency_name_of(code)`
Returns the currency name used by the country.

```
set currencyName = currency_name_of("CH")
```

### `currency_symbol_of(code)`
Returns the currency symbol used by the country when available.

```
set symbol = currency_symbol_of("CH")
```

### `driving_side(code)`
Returns the driving side for the country.

```
set side = driving_side("AU")
```

### `two_letter_code(code)`
Returns the 2-letter country code.

```
set iso2 = two_letter_code("CA")
```

### `three_letter_code(code)`
Returns the 3-letter country code.

```
set iso3 = three_letter_code("CA")
```

### `system_of_government(code)`
Returns the system of government when the dataset provides it.

```
set gov = system_of_government("CA")
```

### `country_calling_codes(code)`
Returns the calling codes associated with the country.

```
set calling = country_calling_codes("CA")
```

### `country_tlds(code) | country_top_level_domains(code)`
Returns the country top-level domains.

```
set tlds = country_top_level_domains("CA")
```

### `country_languages(code)`
Returns the languages listed for the country.

```
set langs = country_languages("IN")
```

### `country_member_of(code)`
Returns organizations or group memberships recorded for the country.

```
set memberships = country_member_of("FR")
```

### `country_part_of(code)`
Returns broader regional groupings recorded for the country.

```
set groups = country_part_of("MX")
```

### `country_timezones(code)`
Returns the timezones associated with the country.

```
set zones = country_timezones("US")
```

### `country_is_independent(code)`
Returns whether the country is marked as independent.

```
set independent = country_is_independent("NZ")
```

### `country_is_un_member(code)`
Returns whether the country is marked as a United Nations member.

```
set unMember = country_is_un_member("NZ")
```

### `countries_in_continent(continent)`
Returns country names in the given continent.

```
set countries = countries_in_continent("Europe")
```

### `countries_in_subregion(subregion)`
Returns country names in the given subregion.

```
set countries = countries_in_subregion("Western Asia")
```

### `countries_in_timezone(timezone)`
Returns country names that include the given timezone.

```
set countries = countries_in_timezone("UTC+01:00")
```

### `member_countries(group)`
Returns country names that are members of the given organization or group.

```
set countries = member_countries("United Nations")
```

### `countries_part_of(group)`
Returns country names that are recorded as part of the given region or grouping.

```
set countries = countries_part_of("Caribbean")
```

### `countries_speaking_language(language)`
Returns country names that list the given language.

```
set countries = countries_speaking_language("Arabic")
```

### `countries_using_currency(currency)`
Returns country names that use the given currency code.

```
set countries = countries_using_currency("EUR")
```

### `country_is_member_of(code, group)`
Returns whether the country is a member of the given organization or group.

```
set member = country_is_member_of("FR", "United Nations")
```

### `country_is_part_of(code, group)`
Returns whether the country is recorded as part of the given region or grouping.

```
set inGroup = country_is_part_of("MX", "North America")
```

### `country_has_tld(code, tld)`
Returns whether the country has the given top-level domain.

```
set hasTld = country_has_tld("CA", ".ca")
```

### `country_uses_currency(code, currency)`
Returns whether the country uses the given currency code, symbol, or currency name.

```
set uses = country_uses_currency("CH", "CHF")
```

### `country_has_calling_code(code, callingCode)`
Returns whether the country includes the given calling code.

```
set hasCalling = country_has_calling_code("CA", "+1")
```

### `country_speaks_language(code, language)`
Returns whether the country lists the given language.

```
set speaks = country_speaks_language("EG", "Arabic")
```

### `country_in_continent(code, continent)`
Returns whether the country is in the given continent.

```
set inContinent = country_in_continent("BR", "South America")
```

### `country_in_timezone(code, timezone)`
Returns whether the country includes the given timezone.

```
set inZone = country_in_timezone("US", "UTC-05:00")
```

## Notes

The dataset is intended to be broadly useful, but country metadata can evolve over time and some fields are intentionally conservative.

In particular:

- membership data is currently limited to values included in the packaged dataset
- `system_of_government` may be unavailable for many countries
- reverse lookups such as `country_code(value)` return `Unknown` when the input is ambiguous rather than picking an arbitrary match
