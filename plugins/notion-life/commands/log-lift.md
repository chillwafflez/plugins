---
name: log-lift
description: Log a weightlifting session with detailed exercise tracking
allowed-tools:
  - mcp__notion__notion-search
  - mcp__notion__notion-create-pages
  - AskUserQuestion
---

Log a weightlifting session interactively, tracking each exercise performed.

1. Greet the user and ask for their first exercise using AskUserQuestion:
   "What exercises did you do today? Enter them one at a time, or list them all at once. Format: exercise name, sets x reps, weight (lbs). Example: bench press, 4x8, 155"

2. Parse each exercise entry to extract:
   - Exercise name (match to known exercises: Bench Press, Incline Bench Press, Squat, Leg Press, Deadlift, Overhead Press, Barbell Row, Pull-up, Dip, Curl, Lateral Raise, Tricep Extension, Leg Curl, Leg Extension, Calf Raise)
   - Sets (number)
   - Reps (number)
   - Weight in lbs (number)

3. If the user provided one exercise, ask "Any more exercises?" using AskUserQuestion. Repeat until they say they're done (e.g., "done", "that's it", "no more").

4. Ask for total session duration: "How long was your session in minutes?" (or estimate from exercise count: ~10 min per exercise as default suggestion).

5. Search Notion for "Activity Log" and "Workout Log" databases.

6. Create an Activity Log entry:
   - Title: "Weightlifting - {today's date formatted as Mon D, YYYY}"
   - Date: today's date
   - Activity: "Weightlifting"
   - Duration (min): total session duration
   - Notes: brief summary (e.g., "4 exercises: bench, squat, rows, curls")

7. For each exercise, create a Workout Log entry:
   - Title: "{Exercise Name} - {today's date formatted as Mon D, YYYY}"
   - Date: today's date
   - Exercise: the exercise name (select)
   - Sets: number of sets
   - Reps: reps per set
   - Weight (lbs): weight used
   - Notes: any notes for this exercise

8. Present a summary of the full session:
   ```
   Logged: Weightlifting (75 min)
   - Bench Press: 4x8 @ 155 lbs
   - Squat: 4x5 @ 205 lbs
   - Barbell Row: 3x10 @ 135 lbs
   - Curl: 3x12 @ 35 lbs
   ```

9. If any weight is close to or exceeds a known PR, mention it and ask if they want to record a new PR.
