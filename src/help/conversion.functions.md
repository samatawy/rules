---
title: Conversion Functions
---

# Conversion Functions

Conversion functions transform a single numeric value from one unit to another.

When there is no direct conversion for the exact pair you need, chain conversions through a common unit:

```
set distance_parsec = distance_km.km_to_lightyear().lightyear_to_parsec()

set area_sqft = area_acres.acre_to_square_m().square_m_to_square_ft()
```

The first example converts kilometers to parsecs through lightyears. The second converts acres to square feet through square meters. Neither is available as a single built-in conversion.

## Mass And Weight

### `kg_to_lb(number)`
Converts kilograms to pounds.

### `lb_to_kg(number)`
Converts pounds to kilograms.

### `g_to_oz(number)`
Converts grams to ounces.

### `oz_to_g(number)`
Converts ounces to grams.

### `tonne_to_lb(number)`
Converts metric tonnes to pounds.

### `lb_to_tonne(number)`
Converts pounds to metric tonnes.

### `stone_to_lb(number)`
Converts stone to pounds.

### `lb_to_stone(number)`
Converts pounds to stone.

### `kg_to_stone(number)`
Converts kilograms to stone.

### `stone_to_kg(number)`
Converts stone to kilograms.

### `carat_to_g(number)`
Converts carats to grams.

### `g_to_carat(number)`
Converts grams to carats.

---

## Distance

### `cm_to_in(number)`
Converts centimeters to inches.

### `in_to_cm(number)`
Converts inches to centimeters.

### `m_to_ft(number)`
Converts meters to feet.

### `ft_to_m(number)`
Converts feet to meters.

### `km_to_mile(number)`
Converts kilometers to miles.

### `mile_to_km(number)`
Converts miles to kilometers.

### `km_to_nautical_mile(number)`
Converts kilometers to nautical miles.

### `nautical_mile_to_km(number)`
Converts nautical miles to kilometers.

### `mile_to_nautical_mile(number)`
Converts miles to nautical miles.

### `nautical_mile_to_mile(number)`
Converts nautical miles to miles.

### `m_to_yard(number)`
Converts meters to yards.

### `yard_to_m(number)`
Converts yards to meters.

### `cm_to_pt(number)`
Converts centimeters to points.

### `pt_to_cm(number)`
Converts points to centimeters.

### `mm_to_pt(number)`
Converts millimeters to points.

### `pt_to_mm(number)`
Converts points to millimeters.

### `in_to_pt(number)`
Converts inches to points.

### `pt_to_in(number)`
Converts points to inches.

### `km_to_lightyear(number)`
Converts kilometers to lightyears.

### `lightyear_to_km(number)`
Converts lightyears to kilometers.

### `au_to_km(number)`
Converts astronomical units to kilometers.

### `km_to_au(number)`
Converts kilometers to astronomical units.

### `parsec_to_lightyear(number)`
Converts parsecs to lightyears.

### `lightyear_to_parsec(number)`
Converts lightyears to parsecs.

---

## Area

### `square_m_to_square_ft(number)`
Converts square meters to square feet. Alias: `sqm_to_sqft(number)`.

### `square_ft_to_square_m(number)`
Converts square feet to square meters. Alias: `sqft_to_sqm(number)`.

### `acre_to_square_m(number)`
Converts acres to square meters. Alias: `acre_to_sqm(number)`.

### `square_m_to_acre(number)`
Converts square meters to acres. Alias: `sqm_to_acre(number)`.

### `hectare_to_square_m(number)`
Converts hectares to square meters. Alias: `hectare_to_sqm(number)`.

### `square_m_to_hectare(number)`
Converts square meters to hectares. Alias: `sqm_to_hectare(number)`.

### `square_km_to_square_mile(number)`
Converts square kilometers to square miles.

### `square_mile_to_square_km(number)`
Converts square miles to square kilometers.

---

## Volume

### `liter_to_gallon(number)`
Converts liters to gallons.

### `gallon_to_liter(number)`
Converts gallons to liters.

### `gallon_to_cubic_ft(number)`
Converts gallons to cubic feet.

### `cubic_ft_to_gallon(number)`
Converts cubic feet to gallons.

### `ml_to_fluid_oz(number)`
Converts milliliters to fluid ounces.

### `fluid_oz_to_ml(number)`
Converts fluid ounces to milliliters.

### `cubic_m_to_cubic_ft(number)`
Converts cubic meters to cubic feet.

### `cubic_ft_to_cubic_m(number)`
Converts cubic feet to cubic meters.

---

## Speed

### `km_per_hour_to_meter_per_second(number)`
Converts kilometers per hour to meters per second. Alias: `kph_to_mps(number)`.

### `meter_per_second_to_km_per_hour(number)`
Converts meters per second to kilometers per hour. Alias: `mps_to_kph(number)`.

### `mile_per_hour_to_meter_per_second(number)`
Converts miles per hour to meters per second. Alias: `mph_to_mps(number)`.

### `meter_per_second_to_mile_per_hour(number)`
Converts meters per second to miles per hour. Alias: `mps_to_mph(number)`.

### `km_per_hour_to_mile_per_hour(number)`
Converts kilometers per hour to miles per hour. Alias `kph_to_mph(number)`

### `mile_per_hour_to_km_per_hour(number)`
Converts miles per hour to kilometers per hour. Alias: `mph_to_kph(number)`.

### `knot_to_mile_per_hour(number)`
Converts knots to miles per hour. Alias: `knot_to_mph(number)`.

### `mile_per_hour_to_knot(number)`
Converts miles per hour to knots. Alias: `mph_to_knot(number)`.

### `knot_to_meter_per_second(number)`
Converts knots to meters per second. Alias: `knot_to_mps(number)`.

### `meter_per_second_to_knot(number)`
Converts meters per second to knots. Alias: `mps_to_knot(number)`.

---

## Temperature

### `c_to_f(number)`
Converts degrees Celsius to degrees Fahrenheit.

### `f_to_c(number)`
Converts degrees Fahrenheit to degrees Celsius.

### `k_to_c(number)`
Converts kelvin to degrees Celsius.

### `c_to_k(number)`
Converts degrees Celsius to kelvin.

### `f_to_k(number)`
Converts degrees Fahrenheit to kelvin.

### `k_to_f(number)`
Converts kelvin to degrees Fahrenheit.

---

## Pressure

### `pa_to_psi(number)`
Converts pascals to pounds per square inch.

### `psi_to_pa(number)`
Converts pounds per square inch to pascals.

### `bar_to_psi(number)`
Converts bar to pounds per square inch.

### `psi_to_bar(number)`
Converts pounds per square inch to bar.

### `atm_to_psi(number)`
Converts standard atmospheres to pounds per square inch.

### `psi_to_atm(number)`
Converts pounds per square inch to standard atmospheres.

### `mmhg_to_pa(number)`
Converts millimeters of mercury to pascals.

### `pa_to_mmhg(number)`
Converts pascals to millimeters of mercury.

---

## Energy And Power

### `j_to_cal(number)`
Converts joules to calories.

### `cal_to_j(number)`
Converts calories to joules.

### `ev_to_j(number)`
Converts electronvolts to joules. Alias: `eV_to_j(number)`.

### `j_to_ev(number)`
Converts joules to electronvolts. Alias: `j_to_eV(number)`.

### `kwh_to_j(number)`
Converts kilowatt-hours to joules. Alias: `kWh_to_j(number)`.

### `j_to_kwh(number)`
Converts joules to kilowatt-hours. Alias: `j_to_kWh(number)`.

### `hp_to_watt(number)`
Converts horsepower to watts.

### `watt_to_hp(number)`
Converts watts to horsepower.

### `j_to_btu(number)`
Converts joules to BTU.

### `btu_to_j(number)`
Converts BTU to joules.

### `hp_to_btu_per_hour(number)`
Converts horsepower to BTU per hour. Alias: `hp_to_btu(number)`.

### `btu_per_hour_to_hp(number)`
Converts BTU per hour to horsepower. Alias: `btu_to_hp(number)`.
