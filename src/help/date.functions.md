---
title: Date/Time Functions
---

# Date/Time Functions

Use snake_case names in new rules. Where a camelCase compatibility alias exists, it is listed below the heading.

## Date and Time Comparison

### `same_instant(left, right)`
Alternative syntax: `sameInstant(left, right)`.

Returns `true` when two dates represent the same instant.

```
if sent_at.same_instant(received_at) then synced = true
```

### `before(left, right)`
Returns `true` when the first date is earlier than the second.

```
if now().before(due_date) then still_open = true
```

- This can be confusing, so using the syntax `date1 BEFORE date2` is highly advisable.

### `after(left, right)`
Returns `true` when the first date is later than the second.

```
if now().after(expiry_date) then expired = true
```

- This can be confusing, so using the syntax `date2 AFTER date1` is highly advisable.

### `same_year(left, right)`
Alternative syntax: `sameYear(left, right)`.

Returns `true` when both dates are in the same year.

```
if sameYear(createdAt, now()) then currentYear = true
```

### `same_month(left, right)`
Alternative syntax: `sameMonth(left, right)`.

Returns `true` when both dates are in the same month of the same year.

```
if sameMonth(invoiceDate, today()) then currentMonth = true
```

### `same_week(left, right)`
Alternative syntax: `sameWeek(left, right)`.

Returns `true` when both dates fall in the same week.

```
if sameWeek(orderDate, today()) then recentOrder = true
```

### `same_day(left, right)`
Alternative syntax: `sameDay(left, right)`.

Returns `true` when both dates fall on the same calendar day.

```
if sameDay(createdAt, today()) then newToday = true
```

### `same_hour(left, right)`
Alternative syntax: `sameHour(left, right)`.

Returns `true` when both dates fall in the same hour.

```
if sameHour(startedAt, now()) then currentHour = true
```

### `same_minute(left, right)`
Alternative syntax: `sameMinute(left, right)`.

Returns `true` when both dates fall in the same minute.

```
if sameMinute(sentAt, now()) then justSent = true
```

### `same_second(left, right)`
Alternative syntax: `sameSecond(left, right)`.

Returns `true` when both dates fall in the same second.

```
if sameSecond(updatedAt, now()) then instantMatch = true
```

## Date and Time Inspection

### `year(date)`
Returns the four-digit year.

```
set yyyy = order_date.year()
```

### `month(date)`
Returns the month number from `1` to `12`.

Provided constants include `JAN`, `FEB`, etc. Use these to make your declarations more readable.
```
IF month(today()) IN [JAN, FEB, NOV, DEC] THEN season = 'winter'
```

### `week(date)`
Returns the week number within the year.

```
set ww = order_date.week()
```

### `day(date)`
Returns the day of the month.

```
set dd = day(orderDate)
```

### `weekday(date)`
Returns the day of week from 1 to 7.

Provided constants include `MON`, `TUE`, etc. Use these to make your declarations more readable.
```
IF weekday(today()) IN [SAT, SUN] THEN weekend = TRUE 
```

### `hour(date)`
Returns the hour of the day.

```
set hh = created_at.hour()
```

### `minute(date)`
Returns the minute component.

```
set mi = created_at.minute()
```

### `second(date)`
Returns the second component.

```
set ss = created_at.second()
```

### `instant(date) | timestamp(date)`
Return the UNIX timestamp, i.e. milliseconds that have passed since the Unix Epoch (January 1, 1970, 00:00:00 UTC).

```
set exactly_when = created_at.instant()
```

## Date and Time Manipulation

### `add_years(date, years)`
Alternative syntax: `addYears(date, years)`.
Adds years to a date.

```
set renewal_date = start_date.add_years(1)
```

### `add_months(date, months)`
Alternative syntax: `addMonths(date, months)`.
Adds months to a date.

```
set due_date = invoice_date.add_months(1)
```

### `add_weeks(date, weeks)`
Alternative syntax: `addWeeks(date, weeks)`.
Adds weeks to a date.

```
set follow_up = today().add_weeks(2)
```

### `add_days(date, days)`
Alternative syntax: `addDays(date, days)`.
Adds days to a date.

```
set deadline = created_at.add_days(7)
```

### `add_hours(date, hours)`
Alternative syntax: `addHours(date, hours)`.
Adds hours to a date.

```
set expires_at = now().add_hours(4)
```

### `add_minutes(date, minutes)`
Alternative syntax: `addMinutes(date, minutes)`.
Adds minutes to a date.

```
set reminder_at = now().add_minutes(30)
```

### `add_seconds(date, seconds)`
Alternative syntax: `addSeconds(date, seconds)`.
Adds seconds to a date.

```
set timeout_at = now().add_seconds(45)
```

### `subtract_years(date, years)`
Alternative syntax: `subtractYears(date, years)`.
Subtracts years from a date.

```
set lookback = today().subtract_years(5)
```

### `subtract_months(date, months)`
Alternative syntax: `subtractMonths(date, months)`.
Subtracts months from a date.

```
set previous_quarter = today().subtract_months(3)
```

### `subtract_weeks(date, weeks)`
Alternative syntax: `subtractWeeks(date, weeks)`.
Subtracts weeks from a date.

```
set prior_review = today().subtract_weeks(2)
```

### `subtract_days(date, days)`
Alternative syntax: `subtractDays(date, days)`.
Subtracts days from a date.

```
set grace_start = due_date.subtract_days(10)
```

### `subtract_hours(date, hours)`
Alternative syntax: `subtractHours(date, hours)`.
Subtracts hours from a date.

```
set opened_at = now().subtract_hours(1)
```

### `subtract_minutes(date, minutes)`
Alternative syntax: `subtractMinutes(date, minutes)`.
Subtracts minutes from a date.

```
set warmup_start = now().subtract_minutes(15)
```

### `subtract_seconds(date, seconds)`
Alternative syntax: `subtractSeconds(date, seconds)`.
Subtracts seconds from a date.

```
set retry_at = now().subtract_seconds(10)
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
