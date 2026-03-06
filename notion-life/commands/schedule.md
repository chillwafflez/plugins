---
name: schedule
description: View or modify the weekly activity schedule
argument-hint: "[view | modification like 'set climbing to mon wed']"
allowed-tools:
  - mcp__notion__notion-search
  - mcp__notion__notion-fetch
  - mcp__notion__notion-update-page
  - mcp__notion__notion-create-pages
  - AskUserQuestion
---

View or modify the weekly activity schedule stored in the Weekly Schedule database.

1. Search for "Weekly Schedule" database using notion-search.
2. Fetch all entries using notion-fetch.

**If no arguments or argument is "view":**

3. Display the current schedule as a formatted table:
   ```
   Weekly Schedule:

   Activity      | Mon | Tue | Wed | Thu | Fri | Sat | Sun | Target
   --------------|-----|-----|-----|-----|-----|-----|-----|-------
   Coding        |  x  |  x  |  x  |  x  |  x  |  x  |  x  | 60 min
   Drawing       |  x  |  x  |  x  |  x  |  x  |  x  |  x  | 30 min
   Weightlifting |  x  |     |  x  |     |  x  |     |     | 60 min
   Climbing      |     |     |  x  |     |     |     |     | 60 min
   Drums         |  x  |     |     |  x  |     |  x  |     | 30 min
   Reading       |  x  |  x  |  x  |  x  |  x  |  x  |  x  | 30 min
   ```

**If modification is requested:**

3. Parse the requested change. Examples:
   - "set climbing to monday and wednesday" -> Update Climbing: Mon=true, Wed=true, all others=false
   - "add drums on friday" -> Update Drums: Fri=true (keep existing days)
   - "remove weightlifting from monday" -> Update Weightlifting: Mon=false
   - "change coding target to 90 minutes" -> Update Coding: Target=90
   - "add yoga 45 min on tue thu sat" -> Create new activity entry

4. For modifications to existing activities:
   - Find the page ID for the activity entry
   - Use notion-update-page to update the relevant properties
   - When "set to" is used, replace ALL day assignments (explicit list)
   - When "add on" is used, add days without removing existing ones
   - When "remove from" is used, only uncheck the specified days

5. For adding a new activity:
   - Create a new entry in Weekly Schedule with notion-create-pages
   - Also note that the new activity name should be added as a select option in the Activity Log database

6. Confirm the change and display the updated schedule table.

7. If a modification significantly changes the schedule (e.g., removing most days), ask for confirmation first:
   "This will change Climbing from 3 days/week to 1 day/week. Proceed?"
