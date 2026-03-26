---
name: setup
description: Create all Notion databases for the life tracking system
allowed-tools:
  - mcp__notion__notion-search
  - mcp__notion__notion-create-database
  - mcp__notion__notion-create-pages
  - mcp__notion__notion-fetch
  - AskUserQuestion
---

Initialize the complete notion-life tracking system by creating all required Notion databases.

IMPORTANT: Read the database schemas from the notion-life skill's references/database-schemas.md for complete property definitions before creating databases.

1. Ask the user where to create the databases using AskUserQuestion:
   "Where in your Notion workspace should I create the tracking databases? You can:
   - Provide the name or URL of an existing page to use as parent
   - Say 'new' and I'll create a fresh 'Life Tracker' parent page

   Where should I set them up?"

2. If the user says "new" or similar:
   - Search Notion for a suitable top-level location
   - Create a "Life Tracker" parent page with a brief description

3. If the user provides a page name or URL:
   - Search for or fetch the specified page
   - Use it as the parent for all databases

4. Create each database under the parent page with the properties defined in references/database-schemas.md:

   **Database 1: Activity Log**
   - Properties: Date (date), Activity (select with options: Coding, Drawing, Weightlifting, Climbing, Drums, Reading), Duration (min) (number), Notes (rich_text), Book Title (rich_text)

   **Database 2: Workout Log**
   - Properties: Date (date), Exercise (select with options: Bench Press, Incline Bench Press, Squat, Leg Press, Deadlift, Overhead Press, Barbell Row, Pull-up, Dip, Curl, Lateral Raise, Tricep Extension, Leg Curl, Leg Extension, Calf Raise), Sets (number), Reps (number), Weight (lbs) (number), Notes (rich_text)

   **Database 3: Personal Records**
   - Properties: Exercise (select with options: Bench Press, Incline Bench Press, Squat, Leg Press), Weight (lbs) (number), Date (date), Previous PR (lbs) (number)

   **Database 4: Reading List**
   - Properties: Author (rich_text), Status (select with options: Reading, Completed, Want to Read), Pages Total (number), Pages Read (number), Start Date (date), End Date (date), Notes (rich_text)

   **Database 5: Tech Notes**
   - Properties: Topic (multi_select), Source (rich_text), Date (date)

   **Database 6: Weekly Schedule**
   - Properties: Target (min) (number), Monday (checkbox), Tuesday (checkbox), Wednesday (checkbox), Thursday (checkbox), Friday (checkbox), Saturday (checkbox), Sunday (checkbox)

5. After creating the Weekly Schedule database, populate it with the default schedule entries:

   | Activity | Target | Mon | Tue | Wed | Thu | Fri | Sat | Sun |
   |----------|--------|-----|-----|-----|-----|-----|-----|-----|
   | Coding | 60 | true | true | true | true | true | true | true |
   | Drawing | 30 | true | true | true | true | true | true | true |
   | Weightlifting | 60 | true | false | true | false | true | false | false |
   | Climbing | 60 | false | false | true | false | false | false | false |
   | Drums | 30 | true | false | false | true | false | true | false |
   | Reading | 30 | true | true | true | true | true | true | true |

6. Confirm completion with a summary:
   ```
   Life Tracker setup complete! Created 6 databases:
   - Activity Log (daily activity tracking)
   - Workout Log (exercise details)
   - Personal Records (1RM PRs)
   - Reading List (book tracking)
   - Tech Notes (learning notes)
   - Weekly Schedule (daily targets configured)

   Your default schedule has been set. Use /schedule to view or modify it.
   Start logging with /log-code, /log-draw, /log-lift, /log-climb, /log-drums, /log-read, or /log.
   ```
