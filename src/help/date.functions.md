---
title: Date/Time Functions
---

# Date/Time Functions

## Date and Time Comparison

### `sameInstant(left, right)`
Returns `true` when two dates represent the same instant.

```txt
if sameInstant(sentAt, receivedAt) then synced = true
```

### `before(left, right)`
Returns `true` when the first date is earlier than the second.

```txt
if before(now(), dueDate) then stillOpen = true
```

### `after(left, right)`
Returns `true` when the first date is later than the second.

```txt
if after(now(), expiryDate) then expired = true
```

### `sameYear(left, right)`
Returns `true` when both dates are in the same year.

```txt
if sameYear(createdAt, now()) then currentYear = true
```

### `sameMonth(left, right)`
Returns `true` when both dates are in the same month of the same year.

```txt
if sameMonth(invoiceDate, today()) then currentMonth = true
```

### `sameWeek(left, right)`
Returns `true` when both dates fall in the same week.

```txt
if sameWeek(orderDate, today()) then recentOrder = true
```

### `sameDay(left, right)`
Returns `true` when both dates fall on the same calendar day.

```txt
if sameDay(createdAt, today()) then newToday = true
```

### `sameHour(left, right)`
Returns `true` when both dates fall in the same hour.

```txt
if sameHour(startedAt, now()) then currentHour = true
```

### `sameMinute(left, right)`
Returns `true` when both dates fall in the same minute.

```txt
if sameMinute(sentAt, now()) then justSent = true
```

### `sameSecond(left, right)`
Returns `true` when both dates fall in the same second.

```txt
if sameSecond(updatedAt, now()) then instantMatch = true
```

## Date and Time Inspection

### `year(date)`
Returns the four-digit year.

```txt
set yyyy = year(orderDate)
```

### `month(date)`
Returns the month number from `1` to `12`.

```txt
set mm = month(orderDate)
```

### `week(date)`
Returns the week number within the year.

```txt
set ww = week(orderDate)
```

### `day(date)`
Returns the day of the month.

```txt
set dd = day(orderDate)
```

### `hour(date)`
Returns the hour of the day.

```txt
set hh = hour(createdAt)
```

### `minute(date)`
Returns the minute component.

```txt
set mi = minute(createdAt)
```

### `second(date)`
Returns the second component.

```txt
set ss = second(createdAt)
```

## Date and Time Manipulation

### `addYears(date, years)`
Adds years to a date.

```txt
set renewalDate = addYears(startDate, 1)
```

### `addMonths(date, months)`
Adds months to a date.

```txt
set dueDate = addMonths(invoiceDate, 1)
```

### `addWeeks(date, weeks)`
Adds weeks to a date.

```txt
set followUp = addWeeks(today(), 2)
```

### `addDays(date, days)`
Adds days to a date.

```txt
set deadline = addDays(createdAt, 7)
```

### `addHours(date, hours)`
Adds hours to a date.

```txt
set expiresAt = addHours(now(), 4)
```

### `addMinutes(date, minutes)`
Adds minutes to a date.

```txt
set reminderAt = addMinutes(now(), 30)
```

### `addSeconds(date, seconds)`
Adds seconds to a date.

```txt
set timeoutAt = addSeconds(now(), 45)
```

### `subtractYears(date, years)`
Subtracts years from a date.

```txt
set lookback = subtractYears(today(), 5)
```

### `subtractMonths(date, months)`
Subtracts months from a date.

```txt
set previousQuarter = subtractMonths(today(), 3)
```

### `subtractWeeks(date, weeks)`
Subtracts weeks from a date.

```txt
set priorReview = subtractWeeks(today(), 2)
```

### `subtractDays(date, days)`
Subtracts days from a date.

```txt
set graceStart = subtractDays(dueDate, 10)
```

### `subtractHours(date, hours)`
Subtracts hours from a date.

```txt
set openedAt = subtractHours(now(), 1)
```

### `subtractMinutes(date, minutes)`
Subtracts minutes from a date.

```txt
set warmupStart = subtractMinutes(now(), 15)
```

### `subtractSeconds(date, seconds)`
Subtracts seconds from a date.

```txt
set retryAt = subtractSeconds(now(), 10)
```

## Date Constants

### `now()`
Returns the current date and time.

```txt
set createdAt = now()
```

### `today()`
Returns today's date with the time set to midnight.

```txt
set businessDate = today()
```

### `yearStart()`
Returns the first day of the current year.

```txt
set fiscalAnchor = yearStart()
```

### `yearEnd()`
Returns the last day of the current year.

```txt
set periodEnd = yearEnd()
```

### `monthStart()`
Returns the first day of the current month.

```txt
set statementStart = monthStart()
```

### `monthEnd()`
Returns the last day of the current month.

```txt
set statementEnd = monthEnd()
```
