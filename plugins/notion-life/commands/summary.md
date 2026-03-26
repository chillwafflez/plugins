---
name: summary
description: View activity analytics with streaks, completion rates, and trends
argument-hint: "[today|week|month|year]"
allowed-tools:
  - mcp__notion__notion-search
  - mcp__notion__notion-fetch
---

Generate an analytics summary for the specified time period.

1. Parse the time period from arguments. Default to "today" if not specified.
   - "today" or no argument: current day
   - "week": last 7 days
   - "month": last 30 days
   - "year": last 365 days

2. Search for "Activity Log", "Weekly Schedule", and "Personal Records" databases using notion-search.

3. Fetch data from all relevant databases using notion-fetch.

4. Calculate and present analytics based on the time period:

**For "today":**
- List each activity scheduled for today (check Weekly Schedule for today's day of week)
- Show logged duration vs target for each
- Show completion status (complete / in progress / not started)
- Overall daily completion percentage

**For "week" (last 7 days):**
- Total minutes per activity
- Days completed vs days scheduled per activity
- Current streak for each activity (schedule-aware)
- Completion rate per activity (percentage)
- Highlight best performing activity and one needing attention
- Format as a table:
  ```
  Activity      | Minutes | Completed | Rate  | Streak
  --------------|---------|-----------|-------|--------
  Coding        | 320     | 6/7 days  | 86%   | 6 days
  ```

**For "month" (last 30 days):**
- Weekly breakdown (minutes per week per activity)
- Overall completion rate per activity
- Best and worst weeks
- Trend direction per activity (improving / declining / steady)
- PRs hit this month (from Personal Records)
- Books in progress or completed (from Reading List if applicable)
- Monthly highlights and areas for improvement

**For "year" (last 365 days):**
- Monthly breakdown (total hours per month per activity)
- Yearly completion rate per activity
- Total hours invested per activity
- All PRs recorded throughout the year
- Books completed
- Longest streaks achieved
- Year-over-year trends if data exists

5. Refer to the notion-life skill's references/tracking-patterns.md for streak calculation algorithms and display formatting.

6. End with 1-2 actionable insights:
   - Celebrate achievements (streaks, high completion, PRs)
   - Gently flag areas to improve (broken streaks, declining trends)
