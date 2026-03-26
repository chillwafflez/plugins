---
name: notion-life
description: This skill should be used when the user asks to "log an activity", "track my goals", "check my streaks", "record a PR", "save tech notes", "set up my tracker", "view my schedule", "check my progress", "how am I doing", "add a workout", "log a reading session", "what's my PR", mentions daily goal tracking, personal development habits, workout logging, reading tracking, or references the notion-life tracking system databases (Activity Log, Workout Log, Personal Records, Reading List, Tech Notes, Weekly Schedule).
version: 0.1.0
---

# Notion Life Tracker

A personal daily goal tracking system built on Notion. Tracks six core activities (Coding, Drawing, Weightlifting, Climbing, Drums, Reading) with schedule-aware goal tracking, streak calculation, weightlifting PR records, tech note storage, and proactive analytics.

## System Architecture

The system uses six Notion databases, all created under a parent page via the `/setup` command. When performing any operation, first search for the database by name using `notion-search`.

| Database | Purpose | Key Properties |
|----------|---------|----------------|
| Activity Log | All daily activity entries | date, activity type (select), duration (min), notes, book title |
| Workout Log | Detailed exercise entries per session | date, exercise (select), sets, reps, weight (lbs) |
| Personal Records | 1RM personal records for key lifts | exercise, weight (lbs), date, previous PR |
| Reading List | Book tracking with progress | title, author, status, pages total/read, dates |
| Tech Notes | Technology learning notes | title, topic tags, source, date, content in page body |
| Weekly Schedule | Day-specific activity targets | activity name, Mon-Sun checkboxes, target minutes |

For complete property definitions and types, consult **`references/database-schemas.md`**.

## Core Activities

| Activity | Default Target | Schedule | Details |
|----------|---------------|----------|---------|
| Coding | 60 min/day | Daily (Mon-Sun) | Side projects, learning new tech skills |
| Drawing | 30 min/day | Daily (Mon-Sun) | Traditional and digital art |
| Weightlifting | 60 min/day | Mon/Wed/Fri | Detailed exercise tracking in Workout Log |
| Climbing | 60 min/day | Wed only | Rock climbing sessions |
| Drums | 30 min/day | Mon/Thu/Sat | Practice and learning drums |
| Reading | 30 min/day | Daily (Mon-Sun) | Book reading with title tracking in Reading List |

The schedule is user-configurable via the `/schedule` command and stored in the Weekly Schedule database.

## Core Operations

### Logging an Activity

1. Search for "Activity Log" database using `notion-search`
2. Create a new page with `notion-create-pages`:
   - Title: "{Activity} - {Mon D, YYYY}" (e.g., "Coding - Mar 5, 2026")
   - Date: today's date (ISO format)
   - Activity: select value matching the activity type
   - Duration (min): number of minutes
   - Notes: optional context
   - Book Title: for reading entries only

### Logging a Workout Session

1. Log to Activity Log with Activity = "Weightlifting" and total session duration
2. For each exercise performed, create a separate row in "Workout Log":
   - Title: "{Exercise} - {Mon D, YYYY}"
   - Date, Exercise (select), Sets, Reps, Weight (lbs), Notes

### Recording a Personal Record

1. Search for "Personal Records" database
2. Fetch existing entries to find current PR for the exercise
3. Create new entry with new weight, date, and old weight as Previous PR
4. Default PR exercises: Bench Press, Incline Bench Press, Squat, Leg Press. Additional exercises can be added to the Personal Records select options as needed.

### Saving Tech Notes

1. Search for "Tech Notes" database
2. Create a new page with title, topic tags (multi-select), source, and date
3. Write the note content as rich text blocks in the page body (not as a property)

### Querying for Analytics

1. Search for relevant databases (Activity Log, Weekly Schedule)
2. Fetch database contents with `notion-fetch` using the database URL
3. Process results to calculate metrics (see tracking patterns below)

## Schedule-Aware Logic

The Weekly Schedule database defines which activities are assigned to which days. This affects all analytics:

- **Streaks**: Count consecutive *scheduled* days with a logged entry. Unscheduled days are invisible to streak calculation.
- **Completion rate**: `days_completed / days_scheduled` (not total calendar days)
- **Daily goals**: Only show activities scheduled for the current day of the week
- **A streak breaks** only when a scheduled day passes with no Activity Log entry for that activity

Example: If Climbing is only on Wednesdays, logging every Wednesday maintains a perfect streak regardless of other days.

For detailed algorithms and query patterns, consult **`references/tracking-patterns.md`**.

## MCP Tool Reference

| Operation | Tool | Notes |
|-----------|------|-------|
| Find a database | `notion-search` | Search by database name |
| Read database rows | `notion-fetch` | Pass the database URL |
| Add a log entry/row | `notion-create-pages` | Set parent to database ID |
| Update an entry | `notion-update-page` | Pass page ID and new properties |
| Create a database | `notion-create-database` | Used by /setup only |

When creating pages with properties, use the Notion API property format:
- Select: `{"select": {"name": "Value"}}`
- Number: `{"number": 30}`
- Date: `{"date": {"start": "2026-03-05"}}`
- Rich text: `{"rich_text": [{"text": {"content": "value"}}]}`
- Checkbox: `{"checkbox": true}`

## Natural Language Parsing

When processing natural language via `/log`, map common phrases:
- "coded", "programming", "side project" -> Coding
- "drew", "sketched", "digital art", "traditional art" -> Drawing
- "lifted", "gym", "workout", "weights" -> Weightlifting
- "climbed", "bouldering", "climbing gym" -> Climbing
- "drums", "practiced drums", "drumming" -> Drums
- "read", "reading", "book" -> Reading

Duration parsing: "30 min", "an hour" (60), "2 hours" (120), "half hour" (30), "45 minutes" (45).

## Setup

The `/setup` command initializes the entire tracking system. It creates a parent "Life Tracker" page (or uses an existing page) and builds all six databases underneath it with the correct property schemas. After creating the databases, it populates the Weekly Schedule with default entries for all six activities. Run `/setup` once before using any other commands. If `notion-search` returns no results for a database name, the system has not been set up yet — prompt the user to run `/setup` first.

## Error Handling

- **Database not found**: If searching for a database returns no results, the tracking system has not been initialized. Suggest running `/setup`.
- **Duplicate entries**: If logging for an activity that already has an entry today, create a second entry. The analytics system sums all entries for the same activity on the same date.
- **Unknown activity in natural language**: If the parsed activity does not match any of the six tracked activities, ask the user for clarification rather than guessing.

## Additional Resources

### Reference Files

- **`references/database-schemas.md`** - Complete property definitions, types, select options, and defaults for all six databases
- **`references/tracking-patterns.md`** - Streak calculation algorithms, analytics query patterns, schedule-aware logic, trend analysis, and completion rate formulas

### Example Files

- **`examples/sample-operations.md`** - Example MCP tool call patterns for common logging, querying, and setup operations
