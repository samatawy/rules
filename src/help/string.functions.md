---
title: String Functions
---

# String Functions

## String Comparison

### `equals(left, right)`
Returns `true` when two strings are exactly equal.

```txt
if equals(status, "OPEN") then active = true
```

### `equalsIgnoreCase(left, right)`
Returns `true` when two strings are the same, ignoring upper/lower case differences.

```txt
if equalsIgnoreCase(country, "US") then isAmerican = true
```

### `contains(text, part)`
Returns `true` when the left string contains the right string.

```txt
if contains(email, "@") then validShape = true
```

### `containsIgnoreCase(text, part)`
Returns `true` when the left string contains the right string, ignoring upper/lower case differences.

### `startsWith(text, prefix)`
Returns `true` when the string starts with the given prefix.

```txt
if startsWith(accountId, "VIP-") then priority = true
```

### `startsWithIgnoreCase(text, prefix)`
Returns `true` when the string starts with the given prefix, ignoring upper/lower case differences.

### `endsWith(text, suffix)`
Returns `true` when the string ends with the given suffix.

```txt
if endsWith(fileName, ".pdf") then isPdf = true
```

### `endsWithIgnoreCase(text, suffix)`
Returns `true` when the string ends with the given suffix, ignoring upper/lower case differences.

### `matches(text, pattern)`
Returns `true` when the string matches the regular expression pattern.

```txt
if matches(zipCode, "^[0-9]{5}$") then zipValid = true
```

### `matchesIgnoreCase(text, pattern)`
Returns `true` when the string matches the regular expression pattern, ignoring upper/lower case differences.

## String Inspection

### `length(text)`
Returns the number of characters in the string.

```txt
set size = length(description)
```

### `countOf(text, part)`
Counts how many times a substring appears.

```txt
set commaCount = countOf(csv, ",")
```

### `indexOf(text, part)`
Returns the first index of the substring, or `-1` if missing.

```txt
set atPos = indexOf(email, "@")
```

### `lastIndexOf(text, part)`
Returns the last index of the substring, or `-1` if missing.

```txt
set slashPos = lastIndexOf(path, "/")
```

## String Manipulation

### `substring(text, start, end?)`
Returns the substring between the start and optional end positions.

```txt
set prefix = substring(accountId, 0, 3)
```

### `firstChars(text, count)`
Returns the first `count` characters.

```txt
set initials = firstChars(name, 2)
```

### `lastChars(text, count)`
Returns the last `count` characters.

```txt
set suffix = lastChars(accountId, 4)
```

### `append(text, suffix)`
Appends one string to another.

```txt
set label = append(code, "-archived")
```

### `replace(text, search, replacement)`
Replaces the first matching substring.

```txt
set normalized = replace(phone, "-", " ")
```

### `toUpperCase(text)`
Converts text to uppercase.

```txt
set code = toUpperCase(country)
```

### `toLowerCase(text)`
Converts text to lowercase.

```txt
set emailKey = toLowerCase(email)
```

## Array Collection

### `concat(strings)`
Concatenates string items into a single string.

```txt
set fullName = concat(firstName, " ", lastName)
```

### `join(strings, separator)`
Joins string items using the provided separator.

```txt
set csv = join(tags, ", ")
```
