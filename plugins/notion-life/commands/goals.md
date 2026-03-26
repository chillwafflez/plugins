---
name: goals
description: View today's scheduled activities and current progress
allowed-tools:
  - mcp__notion__notion-search
  - mcp__notion__notion-fetch
---

Show today's goals and progress against daily targets.

1. Determine today's day of the week (Monday, Tuesday, etc.).

2. Search for "Weekly Schedule" and "Activity Log" databases using notion-search.

3. Fetch the Weekly Schedule to find activities scheduled for today:
   - Check the checkbox property matching today's day name
   - Only include activities where today's checkbox is true

4. Fetch today's Activity Log entries:
   - Filter for entries where Date = today's date

5. For each scheduled activity, calculate:
   - Target duration from Weekly Schedule
   - Logged duration from Activity Log (sum if multiple entries for same activity)
   - Status:
     - "complete" if logged >= target
     - "in progress" if logged > 0 but < target
     - "not started" if no entry

6. Calculate the current streak for each activity (schedule-aware per tracking-patterns.md).

7. Present as a clean checklist:
   ```
   Today's Goals (Wednesday, Mar 5):

   [x] Coding        65/60 min  (complete)       | 12-day streak
   [ ] Drawing        0/30 min  (not started)     | 5-day streak at risk
   [x] Weightlifting 70/60 min  (complete)        | 3 sessions
   [x] Climbing      60/60 min  (complete)        | 4 weeks
   [ ] Reading        0/30 min  (not started)     | 8-day streak at risk

   3/5 goals completed
   ```

8. If all goals are complete, add a congratulatory message.
9. If goals remain, offer encouragement and note which streaks are at risk if not completed today.
