---
title: String Functions
---

# String Functions

## String Comparison

### `equals(left, right)`
Returns `true` when two strings are exactly equal.

```
if equals(status, "OPEN") then active = true
```

### `equalsIgnoreCase(left, right)`
Returns `true` when two strings are the same, ignoring upper/lower case differences.

```
if equalsIgnoreCase(country, "US") then isAmerican = true
```

### `contains(text, part)`
Returns `true` when the left string contains the right string.

```
if contains(email, "@") then validShape = true
```

### `containsIgnoreCase(text, part)`
Returns `true` when the left string contains the right string, ignoring upper/lower case differences.

### `startsWith(text, prefix)`
Returns `true` when the string starts with the given prefix.

```
if startsWith(accountId, "VIP-") then priority = true
```

### `startsWithIgnoreCase(text, prefix)`
Returns `true` when the string starts with the given prefix, ignoring upper/lower case differences.

### `endsWith(text, suffix)`
Returns `true` when the string ends with the given suffix.

```
if endsWith(fileName, ".pdf") then isPdf = true
```

### `endsWithIgnoreCase(text, suffix)`
Returns `true` when the string ends with the given suffix, ignoring upper/lower case differences.

### `like(text, pattern)`
Returns `true` when the string matches the wildcard pattern.

```
if like(mobile_number, "010*") then mobile_operator = "Vodafone"
```

- Wildcards include `_` representing a single character, and `%` representing zero or more characters. Regex patterns using `match()` offer more powerful control.

### `likeIgnoreCase(text, pattern)`
Returns `true` when the string matches the wildcard pattern, ignoring upper/lower case differences.

### `matches(text, pattern)`
Returns `true` when the string matches the regular expression pattern.

```
if matches(zipCode, "^[0-9]{5}$") then zipValid = true
```

### `matchesIgnoreCase(text, pattern)`
Returns `true` when the string matches the regular expression pattern, ignoring upper/lower case differences.

## String Inspection

### `length(text)`
Returns the number of characters in the string.

```
set size = length(description)
```

### `countOf(text, part)`
Counts how many times a substring appears.

```
set commaCount = countOf(csv, ",")
```

### `indexOf(text, part)`
Returns the first index of the substring, or `-1` if missing.

```
set atPos = indexOf(email, "@")
```

### `lastIndexOf(text, part)`
Returns the last index of the substring, or `-1` if missing.

```
set slashPos = lastIndexOf(path, "/")
```

## String Manipulation

### `substring(text, start, end?)`
Returns the substring between the start and optional end positions.

```
set prefix = substring(accountId, 0, 3)
```

### `firstChars(text, count)`
Returns the first `count` characters.

```
set initials = firstChars(name, 2)
```

### `lastChars(text, count)`
Returns the last `count` characters.

```
set suffix = lastChars(accountId, 4)
```

### `append(text, suffix)`
Appends one string to another.

```
set label = append(code, "-archived")
```

### `replace(text, search, replacement)`
Replaces the first matching substring.

```
set normalized = replace(phone, "-", " ")
```

### `upperCase(text)`
Converts text to uppercase.

```
set code = upperCase(country)
```

### `lowerCase(text)`
Converts text to lowercase.

```
set emailKey = lowerCase(email)
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
