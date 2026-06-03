---
title: Array Functions
---

# Array Functions

Use snake_case names in new rules. Where a camelCase compatibility alias exists, it is listed below the heading.

## Array Inspection

### `count(array)`
Returns the number of items in an array.

```
set childCount = count(Person.children)
```

### `sum(numbers) ... total(numbers)`
Returns the sum of a numeric array.

```
set totalSales = sum(Order.amounts)
```

### `avg(numbers) ... average(numbers) ... mean(numbers)`
Returns the arithmetic mean of a numeric array.

```
set averageAge = avg(Students.age)
```

### `median(numbers)`
Returns the median value from a numeric array, i.e. the number in the middle.

```
set median = median(Exam.scores)
```

### `min(numbers)`
Returns the smallest value in a numeric array.

```
set youngestAge = min(Family.ages)
```

### `max(numbers)`
Returns the largest value in a numeric array. It can also be called with multiple numeric arguments.

```
set highestScore = max(Exam.scores)
```

### `range(numbers)`
Returns `max - min` for a numeric array. It can also be called with multiple numeric arguments.

```
set spread = range(Person.ages)
```

## Array Collection

### `concat(strings)`
Concatenates string items into a single string.

```
set fullName = concat(firstName, " ", lastName)
```

### `join(strings, separator)`
Joins string items using the provided separator.

```
set csv = tags.join(", ")
```

## Array Lambda Operations

### `every(array, item : predicate)`
Returns `true` when every array item satisfies the lambda condition.

```
if every(Person.family, member : member.age >= 18) then Person.allAdults = true
```

### `any(array, item : predicate) ... some(array, item: predicate)`
Returns `true` when at least one item satisfies the lambda condition.

```
if Person.family.any(member : member.age < 18) then Person.hasMinor = true
```

### `sort(array, item : predicate)`
Returns a sorted array sorted by the expression returned by each item.

```
set youngest_to_oldest = sort(Person.family, member : member.age)

set mostExpensive = Store.products.sort(product: neg(product.price));
```

### `filter(array, item : predicate)`
Returns a filtered array containing only matching items.

```
set adultFamily = Person.family.filter(member : member.age >= 18)
```

### `map(array, item : expression)`
Projects each item into a new array.

```
set familyNames = map(Person.family, member : member.name)
```

## Statistical Functions

### `percentile(numbers, percentile)`
Returns the requested percentile from a numeric array. The second argument should be a number between `0` and `100`.

```
set p90Latency = Api.response_times.percentile(90)
```

### `stdev(numbers) | standard_deviation(numbers)`
Returns the standard deviation of a numeric array.

```
set scoreSpread = Exam.scores.stdev()
```

### `variance(numbers)`
Returns the variance of a numeric array.

```
set scoreVariance = Exam.scores.variance()
```

### `gini_coefficient(numbers)`
Returns the Gini coefficient of a numeric array.

```
set incomeInequality = gini_coefficient(Households.income)
```

### `harmonic_mean(numbers)`
Returns the harmonic mean of a numeric array.

```
set averageRate = harmonic_mean(Sensors.sample_rates)
```

### `geometric_mean(numbers)`
Returns the geometric mean of a numeric array.

```
set compoundGrowth = geometric_mean(Portfolio.growth_factors)
```

## Array Comparison

These functions compare one array against another.

### `same_array(arrayA, arrayB)`
Alternative syntax: `sameArray(arrayA, arrayB)`.

Returns `true` when both arrays have the same items in the same order.

```
if Order.requested_skus.same_array(Order.packed_skus) then Order.is_exact_match = true
```

### `same_set(arrayA, arrayB)`
Alternative syntax: `sameSet(arrayA, arrayB)`.

Returns `true` when both arrays contain the same values regardless of order.

```
if User.roles.same_set(Access.required_roles) then Access.role_match = true
```

### `subset_of(arrayA, arrayB)`
Alternative syntax: `subsetOf(arrayA, arrayB)`.

Returns `true` when every item in the first array appears in the second array.

```
if User.permissions.subset_of(Role.permissions) then User.permissions_valid = true
```

### `sub_array_of(arrayA, arrayB)`
Alternative syntax: `subArrayOf(arrayA, arrayB)`.

Returns `true` when the first array appears as a contiguous slice inside the second array.

```
if ["VIP", "PRIORITY"].sub_array_of(Ticket.tags) then Ticket.fast_track = true
```

### `superset_of(arrayA, arrayB)`
Alternative syntax: `supersetOf(arrayA, arrayB)`.

Returns `true` when the first array contains every item from the second array.

```
if User.permissions.superset_of(Role.minimum_permissions) then User.can_administer = true
```

### `super_array_of(arrayA, arrayB)`
Alternative syntax: `superArrayOf(arrayA, arrayB)`.

Returns `true` when the second array appears as a contiguous slice inside the first array.

```
if Log.event_codes.super_array_of([500, 501]) then Log.has_known_error_sequence = true
```

### `overlaps_with(arrayA, arrayB)`
Alternative syntax: `overlapsWith(arrayA, arrayB)`.

Returns `true` when the two arrays share at least one value.

```
if User.groups.overlaps_with(Feature.allowed_groups) then Feature.is_visible = true
```

### `disjoint_from(arrayA, arrayB)`
Alternative syntax: `disjointFrom(arrayA, arrayB)`.

Returns `true` when the two arrays share no values.

```
if User.groups.disjoint_from(Feature.blocked_groups) then Feature.is_eligible = true
```

## Array Set Operations

These functions return arrays derived from two input arrays.

### `union(arrayA, arrayB)`
Returns one array containing values from both arrays.

```
set allTags = union(Order.tags, Customer.tags)
```

### `intersect(arrayA, arrayB) | intersection(arrayA, arrayB)`
Returns the values that appear in both arrays.

```
set sharedRoles = intersect(User.roles, Feature.allowed_roles)

set commonTags = intersection(Order.tags, Campaign.target_tags)
```

### `difference(arrayA, arrayB)`
Returns the values from the first array that do not appear in the second array.

```
set remainingPermissions = difference(User.permissions, Revoked.permissions)
```

### `symmetric_difference(arrayA, arrayB)`
Returns the values that appear in only one of the two arrays.

```
set changedFields = symmetric_difference(Record.previous_keys, Record.current_keys)
```

## Array Analytical Functions

These functions compare two arrays and return a numeric similarity, distance, or divergence metric.

### Distance metrics

### `euclidean_distance(numbersA, numbersB)`
Returns the straight-line distance between two numeric arrays.

```
set similarity_gap = euclidean_distance(Model.expected_vector, Model.actual_vector)
```

### `manhattan_distance(numbersA, numbersB)`
Returns the sum of absolute element-wise differences.

```
set city_block_gap = manhattan_distance(Model.expected_vector, Model.actual_vector)
```

### `chebyshev_distance(numbersA, numbersB)`
Returns the largest absolute element-wise difference.

```
set max_component_gap = chebyshev_distance(Model.expected_vector, Model.actual_vector)
```

### `minkowski_distance(numbersA, numbersB)`
Returns the Minkowski distance using the engine's default exponent.

```
set generalized_gap = minkowski_distance(Model.expected_vector, Model.actual_vector)
```

### `cosine_distance(numbersA, numbersB)`
Returns the cosine distance between two numeric arrays.

```
set directional_gap = cosine_distance(Model.expected_vector, Model.actual_vector)
```

### `jaccard_distance(arrayA, arrayB)`
Returns the Jaccard distance between two arrays treated as sets.

```
set tag_distance = jaccard_distance(User.tags, Campaign.target_tags)
```

### `hamming_distance(arrayA, arrayB)`
Returns the number of positions where two arrays differ.

```
set mismatch_count = hamming_distance(Device.expected_bits, Device.actual_bits)
```

### Correlation metrics

### `pearson_correlation(numbersA, numbersB)`
Returns the Pearson correlation coefficient between two numeric arrays.

```
set sales_correlation = pearson_correlation(RegionA.monthly_sales, RegionB.monthly_sales)
```

### `spearman_rank_correlation(arrayA, arrayB)`
Returns the Spearman rank correlation between two arrays.

```
set ranking_similarity = spearman_rank_correlation(SearchA.results, SearchB.results)
```

### `cross_correlation(numbersA, numbersB)`
Returns the cross-correlation between two numeric arrays.

```
set signal_alignment = cross_correlation(Signal.reference, Signal.current)
```

### `kendall_tau_correlation(numbersA, numbersB)`
Returns the Kendall tau rank correlation between two numeric arrays.

```
set ordering_agreement = kendall_tau_correlation(RankingA.scores, RankingB.scores)
```

### Distribution and divergence metrics

### `kolmogorov_smirnov_distance(numbersA, numbersB)`
Returns the maximum distance between two empirical cumulative distributions.

```
set distribution_gap = kolmogorov_smirnov_distance(Baseline.values, Candidate.values)
```

### `kullback_leibler_divergence(numbersA, numbersB)`
Returns the Kullback-Leibler divergence between two numeric distributions.

```
set divergence = kullback_leibler_divergence(Model.expected_distribution, Model.observed_distribution)
```

### `earth_movers_distance(numbersA, numbersB) | wasserstein_distance(numbersA, numbersB)`
Returns the Wasserstein distance between two numeric distributions.

```
set transport_cost = earth_movers_distance(Inventory.expected_distribution, Inventory.actual_distribution)
```

### `jensen_shannon_divergence(numbersA, numbersB)`
Returns the Jensen-Shannon divergence between two numeric distributions.

```
set symmetric_divergence = jensen_shannon_divergence(Model.expected_distribution, Model.observed_distribution)
```
