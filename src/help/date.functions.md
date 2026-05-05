---
title: Date/Time Functions
---

# Date/Time Functions

## Date and Time Comparison

### `sameInstant(left, right)`
Returns `true` when two dates represent the same instant.

```
if sameInstant(sentAt, receivedAt) then synced = true
```

### `before(left, right)`
Returns `true` when the first date is earlier than the second.

```
if before(now(), dueDate) then stillOpen = true
```

### `after(left, right)`
Returns `true` when the first date is later than the second.

```
if after(now(), expiryDate) then expired = true
```

### `sameYear(left, right)`
Returns `true` when both dates are in the same year.

```
if sameYear(createdAt, now()) then currentYear = true
```

### `sameMonth(left, right)`
Returns `true` when both dates are in the same month of the same year.

```
if sameMonth(invoiceDate, today()) then currentMonth = true
```

### `sameWeek(left, right)`
Returns `true` when both dates fall in the same week.

```
if sameWeek(orderDate, today()) then recentOrder = true
```

### `sameDay(left, right)`
Returns `true` when both dates fall on the same calendar day.

```
if sameDay(createdAt, today()) then newToday = true
```

### `sameHour(left, right)`
Returns `true` when both dates fall in the same hour.

```
if sameHour(startedAt, now()) then currentHour = true
```

### `sameMinute(left, right)`
Returns `true` when both dates fall in the same minute.

```
if sameMinute(sentAt, now()) then justSent = true
```

### `sameSecond(left, right)`
Returns `true` when both dates fall in the same second.

```
if sameSecond(updatedAt, now()) then instantMatch = true
```

## Date and Time Inspection

### `year(date)`
Returns the four-digit year.

```
set yyyy = year(orderDate)
```

### `month(date)`
Returns the month number from `1` to `12`.

```
set mm = month(orderDate)
```

### `week(date)`
Returns the week number within the year.

```
set ww = week(orderDate)
```

### `day(date)`
Returns the day of the month.

```
set dd = day(orderDate)
```

### `hour(date)`
Returns the hour of the day.

```
set hh = hour(createdAt)
```

### `minute(date)`
Returns the minute component.

```
set mi = minute(createdAt)
```

### `second(date)`
Returns the second component.

```
set ss = second(createdAt)
```

## Date and Time Manipulation

### `addYears(date, years)`
Adds years to a date.

```
set renewalDate = addYears(startDate, 1)
```

### `addMonths(date, months)`
Adds months to a date.

```
set dueDate = addMonths(invoiceDate, 1)
```

### `addWeeks(date, weeks)`
Adds weeks to a date.

```
set followUp = addWeeks(today(), 2)
```

### `addDays(date, days)`
Adds days to a date.

```
set deadline = addDays(createdAt, 7)
```

### `addHours(date, hours)`
Adds hours to a date.

```
set expiresAt = addHours(now(), 4)
```

### `addMinutes(date, minutes)`
Adds minutes to a date.

```
set reminderAt = addMinutes(now(), 30)
```

### `addSeconds(date, seconds)`
Adds seconds to a date.

```
set timeoutAt = addSeconds(now(), 45)
```

### `subtractYears(date, years)`
Subtracts years from a date.

```
set lookback = subtractYears(today(), 5)
```

### `subtractMonths(date, months)`
Subtracts months from a date.

```
set previousQuarter = subtractMonths(today(), 3)
```

### `subtractWeeks(date, weeks)`
Subtracts weeks from a date.

```
set priorReview = subtractWeeks(today(), 2)
```

### `subtractDays(date, days)`
Subtracts days from a date.

```
set graceStart = subtractDays(dueDate, 10)
```

### `subtractHours(date, hours)`
Subtracts hours from a date.

```
set openedAt = subtractHours(now(), 1)
```

### `subtractMinutes(date, minutes)`
Subtracts minutes from a date.

```
set warmupStart = subtractMinutes(now(), 15)
```

### `subtractSeconds(date, seconds)`
Subtracts seconds from a date.

```
set retryAt = subtractSeconds(now(), 10)
```

## Date Constants

### `now()`
Returns the current date and time.

```
set createdAt = now()
```

### `today()`
Returns today's date with the time set to midnight.

```
set businessDate = today()
```

### `yearStart()`
Returns the first day of the current year.

```
set fiscalAnchor = yearStart()
```

### `yearEnd()`
Returns the last day of the current year.

```
set periodEnd = yearEnd()
```

### `monthStart()`
Returns the first day of the current month.

```
set statementStart = monthStart()
```

### `monthEnd()`
Returns the last day of the current month.

```
set statementEnd = monthEnd()
```
