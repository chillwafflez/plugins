# Tracking Patterns & Analytics

Algorithms and patterns for streak calculation, analytics queries, and trend analysis in the notion-life tracking system.

## Streak Calculation (Schedule-Aware)

### Algorithm

```
streak(activity):
  1. Fetch Weekly Schedule entry for this activity
  2. Determine which days of the week are scheduled (e.g., Mon/Wed/Fri)
  3. Fetch all Activity Log entries for this activity, sorted by date descending
  4. Starting from today (or yesterday if today has no entry yet), walk backwards:
     a. For each calendar day:
        - If this day is NOT scheduled for the activity, skip it
        - If this day IS scheduled:
          - If an Activity Log entry exists for this day -> streak continues
          - If no entry exists -> streak breaks, return count
  5. Return the consecutive scheduled-day count
```

### Edge Cases

- **Today not yet logged**: If today is a scheduled day but no entry exists yet, start streak count from yesterday. Today is "in progress", not a break.
- **Activity never logged**: Streak = 0
- **Activity logged on unscheduled day**: Counts as a bonus but does not affect streak calculation. Streaks only track scheduled days.
- **Schedule changed mid-period**: Use the current schedule for streak calculation. Historical schedule changes are not tracked.

### Example

Climbing is scheduled only on Wednesdays. Entries exist for: Mar 5 (Wed), Feb 26 (Wed), Feb 19 (Wed). No entry for Feb 12 (Wed).
- Streak = 3 (three consecutive Wednesdays)

## Completion Rate

### Daily Completion Rate

```
daily_completion(date):
  1. Get the day of week for the date
  2. Fetch all scheduled activities for that day from Weekly Schedule
  3. For each scheduled activity, check if Activity Log has an entry on that date
  4. Rate = activities_completed / activities_scheduled
```

### Period Completion Rate

```
period_completion(activity, start_date, end_date):
  1. Count scheduled days for this activity in the date range
  2. Count Activity Log entries for this activity in the date range
  3. Rate = entries_logged / scheduled_days
  4. Express as percentage
```

### Overall Completion Rate

```
overall_completion(start_date, end_date):
  1. For each activity, calculate period_completion
  2. Overall = sum(all_entries_logged) / sum(all_scheduled_days)
```

## Analytics Query Patterns

### Fetching Activity Data for a Period

1. Search for "Activity Log" using `notion-search`
2. Use `notion-fetch` with the database URL to get all entries
3. Filter entries client-side by date range and activity type

Note: The Notion MCP may return paginated results. Process all returned entries.

### Weekly Totals

```
weekly_totals(week_start):
  For each activity:
    Sum duration (min) of all Activity Log entries
    where date >= week_start AND date < week_start + 7 days
  Return map of activity -> total_minutes
```

### Monthly Trends

```
monthly_trends(month):
  Split month into weeks (Week 1-4/5)
  For each week:
    Calculate weekly_totals
  Return weekly breakdown per activity for trend visualization
```

### Best/Worst Periods

```
best_worst_week(activity, month):
  Calculate weekly_totals for each week in the month
  Return week with highest and lowest total for the activity
```

## Trend Analysis

### Trend Direction

Compare the current period to the previous period of the same length:

```
trend(activity, period_length):
  current = total_minutes(activity, now - period_length, now)
  previous = total_minutes(activity, now - 2*period_length, now - period_length)

  if current > previous * 1.1: return "improving"
  if current < previous * 0.9: return "declining"
  return "steady"
```

### Consistency Score

Measures how regularly an activity is performed on scheduled days:

```
consistency(activity, period):
  scheduled_days = count scheduled days in period
  logged_days = count days with at least one entry in period
  return logged_days / scheduled_days as percentage
```

A high consistency score (>80%) with low total minutes suggests the habit is established but sessions are short. A low consistency with high total minutes suggests sporadic but intense sessions.

## Proactive Insight Triggers

Proactively surface insights when these conditions are detected:

### Positive Triggers
- **New streak record**: Current streak exceeds the longest known streak for an activity
- **Perfect week**: 100% completion rate for all scheduled activities in a 7-day span
- **PR proximity**: Current working weight is within 10% of a PR (from Workout Log data)
- **Book completion**: Pages Read approaches Pages Total in Reading List
- **Milestone durations**: Total hours for an activity crosses 10, 50, 100, 500 hour marks

### Attention Triggers
- **Broken streak**: A streak of 7+ days was just broken
- **Declining trend**: Activity minutes dropped >30% compared to previous period
- **Missed scheduled day**: A scheduled activity was not logged yesterday
- **Neglected activity**: No entries for a scheduled activity in 7+ days
- **Stalled book**: A book in "Reading" status with no reading logged in 14+ days

## Display Formatting

### Summary Table Format

```
Activity     | This Week | Target | Rate  | Streak
-------------|-----------|--------|-------|-------
Coding       | 320 min   | 420    | 76%   | 5 days
Drawing      | 210 min   | 210    | 100%  | 12 days
Weightlifting| 180 min   | 180    | 100%  | 3 sessions
Climbing     | 60 min    | 60     | 100%  | 4 weeks
Drums        | 60 min    | 90     | 67%   | 2 days
Reading      | 150 min   | 210    | 71%   | 3 days
```

### Goals Display Format

```
Today's Goals (Wednesday, Mar 5):

[x] Coding       45/60 min  (in progress)
[ ] Drawing       0/30 min  (not started)
[x] Weightlifting 65/60 min (complete!)
[x] Climbing     60/60 min  (complete!)
[ ] Reading       0/30 min  (not started)

3/5 goals completed | Current best streak: Drawing (12 days)
```

### PR Display Format

```
Personal Records:
Exercise          | Current PR | Date       | Previous
------------------|-----------|------------|----------
Bench Press       | 185 lbs   | Mar 3, 2026| 175 lbs (+10)
Incline Bench     | 155 lbs   | Feb 28     | 145 lbs (+10)
Squat             | 225 lbs   | Mar 1      | 215 lbs (+10)
Leg Press         | 405 lbs   | Feb 25     | 385 lbs (+20)
```
