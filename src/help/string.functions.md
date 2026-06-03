---
title: String Functions
---

# String Functions

Use snake_case names in new rules. Where a camelCase compatibility alias exists, it is listed below the heading.

## String Comparison

### `equals(left, right)`
Returns `true` when two strings are exactly equal.

```
if status.equals("OPEN") then active = true
```

### `equals_ignore_case(left, right)`
Alternative syntax: `equalsIgnoreCase(left, right)`.

Returns `true` when two strings are the same, ignoring upper/lower case differences.

```
if country.equals_ignore_case("US") then is_american = true
```

### `includes(text, part) | contains(text, part)`
Returns `true` when the left string contains the right string.

```
if email.contains("@") then valid_shape = true
```

### `includes_ignore_case(text, part) | contains_ignore_case(text, part)`
Alternative syntax: `includesIgnoreCase(text, part)` or `containsIgnoreCase(text, part)`.

Returns `true` when the left string contains the right string, ignoring upper/lower case differences.

```
if email.contains_ignore_case("@example.com") then internal_email = true
```

### `starts_with(text, prefix)`
Alternative syntax: `startsWith(text, prefix)`.

Returns `true` when the string starts with the given prefix.

```
if account_id.starts_with("VIP-") then priority = true
```

### `starts_with_ignore_case(text, prefix)`
Alternative syntax: `startsWithIgnoreCase(text, prefix)`.

Returns `true` when the string starts with the given prefix, ignoring upper/lower case differences.

```
if product_code.starts_with_ignore_case("sku-") then normalized = true
```

### `ends_with(text, suffix)`
Alternative syntax: `endsWith(text, suffix)`.

Returns `true` when the string ends with the given suffix.

```
if file_name.ends_with(".pdf") then is_pdf = true
```

### `ends_with_ignore_case(text, suffix)`
Alternative syntax: `endsWithIgnoreCase(text, suffix)`.

Returns `true` when the string ends with the given suffix, ignoring upper/lower case differences.

```
if file_name.ends_with_ignore_case(".pdf") then is_pdf = true
```

### `like(text, pattern)`
Returns `true` when the string matches the wildcard pattern.

```
if mobile_number.like("010*") then mobile_operator = "Vodafone"
```

- Wildcards include `_` representing a single character, and `%` representing zero or more characters. Regex patterns using `matches()` offer more powerful control.

### `like_ignore_case(text, pattern)`
Alternative syntax: `likeIgnoreCase(text, pattern)`.

Returns `true` when the string matches the wildcard pattern, ignoring upper/lower case differences.

```
if mobile_number.like_ignore_case("010*") then mobile_operator = "Vodafone"
```

### `matches(text, pattern)`
Returns `true` when the string matches the regular expression pattern.

```
if zip_code.matches("^[0-9]{5}$") then zip_valid = true
```

- See `extract()` for more regex functionality.

### `matches_ignore_case(text, pattern)`
Alternative syntax: `matchesIgnoreCase(text, pattern)`.

Returns `true` when the string matches the regular expression pattern, ignoring upper/lower case differences.

```
if zip_code.matches_ignore_case("^[a-z]{2}[0-9]{2}$") then zip_valid = true
```

## String Inspection

### `length(text)`
Returns the number of characters in the string.

```
set size = description.length()
```

### `count_of(text, part)`
Alternative syntax: `countOf(text, part)`.
Counts how many times a substring appears.

```
set comma_count = csv.count_of(",")
```

### `index_of(text, part)`
Alternative syntax: `indexOf(text, part)`.

Returns the first index of the substring, or `-1` if missing.

```
set at_pos = email.index_of("@")
```

### `last_index_of(text, part)`
Alternative syntax: `lastIndexOf(text, part)`.

Returns the last index of the substring, or `-1` if missing.

```
set slash_pos = path.last_index_of("/")
```

## String Manipulation

### `substring(text, start, end?)`
Returns the substring between the start and optional end positions.

```
set prefix = account_id.substring(0, 3)
```

### `first_chars(text, count)`
Alternative syntax: `firstChars(text, count)`.
Returns the first `count` characters.

```
set initials = name.first_chars(2)
```

### `last_chars(text, count)`
Alternative syntax: `lastChars(text, count)`.
Returns the last `count` characters.

```
set suffix = account_id.last_chars(4)
```

### `append(text, suffix)`
Appends one string to another.

```
set label = code.append("-archived")
```

### `replace(text, search, replacement)`
Replaces the first matching substring.

```
set normalized = phone.replace("-", " ")
```

### `upper_case(text)`
Alternative syntax: `upperCase(text)`.
Converts text to uppercase.

```
set code = country.upper_case()
```

### `lower_case(text)`
Alternative syntax: `lowerCase(text)`.
Converts text to lowercase.

```
set email_key = email.lower_case()
```

### `capitalize(text)`
Turns the first letter only to capital (upperCase), and the rest to small (lowerCase).

```
set title = Person.job_title.capitalize()
```

### `capitalize_words(text)`
Alternative syntax: `capitalizeWords(text)`.

Turns the first letter of every word to capital (upperCase), and the rest of every word to small (lowerCase).

```
set display_name = Person.full_name.capitalize_words()
```

### `extract(text, pattern)`
Extract a required part of a string matching a regex capture group.

```
// assuming this rule
if Formula.includes("C") then carbon_atoms = extract(Formula, ".*C(\\d+).*")

// We can do this:
const ctx = space.loadContext({ Formula: "C6H12O6" })

space.process(ctx);
ctx.getOutput('carbon_atoms');      // This should be 6, extracted from the formula.
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
set csv = join(tags, ", ")
```
