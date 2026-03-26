---
name: pr
description: Record a weightlifting personal record (1RM)
argument-hint: "<exercise> <weight in lbs>"
allowed-tools:
  - mcp__notion__notion-search
  - mcp__notion__notion-fetch
  - mcp__notion__notion-create-pages
  - AskUserQuestion
---

Record a new 1RM personal record.

1. Parse the exercise name and weight from arguments.
   - Supported exercises: Bench Press, Incline Bench Press, Squat, Leg Press
   - Common aliases:
     - "bench" -> Bench Press
     - "incline", "incline bench" -> Incline Bench Press
     - "squat", "squats" -> Squat
     - "leg press" -> Leg Press
   - If exercise not recognized, ask for clarification using AskUserQuestion.
   - If weight not provided, ask for it.

2. Search for "Personal Records" database using notion-search.

3. Fetch existing entries using notion-fetch to find the current PR for this exercise.
   - Look for the most recent entry matching the exercise name.

4. If a previous PR exists:
   - Store the old weight as Previous PR
   - Create a new entry:
     - Title: "{Exercise} PR - {today's date formatted as Mon D, YYYY}"
     - Exercise: the exercise name (select)
     - Weight (lbs): the new weight
     - Date: today's date
     - Previous PR (lbs): the old PR weight
   - Confirm with improvement: "New Bench Press PR: 185 lbs! (+10 lbs from 175 lbs)"

5. If no previous PR exists:
   - Create the first entry with Previous PR = 0
   - Confirm: "First Bench Press PR recorded: 185 lbs!"

6. If the new weight is LOWER than the existing PR, warn the user:
   "Your current Bench Press PR is 185 lbs. The new weight (175 lbs) is lower. Do you still want to record this?"
