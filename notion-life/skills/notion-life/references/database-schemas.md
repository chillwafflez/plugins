# Database Schemas

Complete property definitions for all six notion-life databases.

## 1. Activity Log

The primary tracking database. Every logged activity creates one row here.

| Property | Type | Details |
|----------|------|---------|
| Name | title | Auto-format: "{Activity} - {Mon D, YYYY}" |
| Date | date | The date the activity was performed |
| Activity | select | Options: Coding, Drawing, Weightlifting, Climbing, Drums, Reading |
| Duration (min) | number | Duration in minutes |
| Notes | rich_text | Optional context or details |
| Book Title | rich_text | Only populated for Reading entries |

**Select option colors (suggested):**
- Coding: blue
- Drawing: purple
- Weightlifting: red
- Climbing: green
- Drums: orange
- Reading: yellow

## 2. Workout Log

Detailed exercise tracking for weightlifting sessions. Each exercise in a session gets its own row.

| Property | Type | Details |
|----------|------|---------|
| Name | title | Auto-format: "{Exercise} - {Mon D, YYYY}" |
| Date | date | The date of the workout |
| Exercise | select | Options: Bench Press, Incline Bench Press, Squat, Leg Press, Deadlift, Overhead Press, Barbell Row, Pull-up, Dip, Curl, Lateral Raise, Tricep Extension, Leg Curl, Leg Extension, Calf Raise |
| Sets | number | Number of sets performed |
| Reps | number | Reps per set (use average if varied) |
| Weight (lbs) | number | Weight in pounds |
| Notes | rich_text | Optional notes (e.g., "felt easy", "failed last rep") |

## 3. Personal Records

Tracks 1RM personal records for key compound lifts.

| Property | Type | Details |
|----------|------|---------|
| Name | title | Auto-format: "{Exercise} PR - {Mon D, YYYY}" |
| Exercise | select | Options: Bench Press, Incline Bench Press, Squat, Leg Press |
| Weight (lbs) | number | The new PR weight |
| Date | date | Date the PR was achieved |
| Previous PR (lbs) | number | The previous PR weight (0 if first entry) |

When recording a new PR, always look up the most recent entry for that exercise to populate Previous PR.

## 4. Reading List

Tracks books being read, completed, or on the wishlist.

| Property | Type | Details |
|----------|------|---------|
| Name | title | Book title |
| Author | rich_text | Book author |
| Status | select | Options: Reading, Completed, Want to Read |
| Pages Total | number | Total pages in the book |
| Pages Read | number | Pages read so far |
| Start Date | date | When reading began |
| End Date | date | When reading was completed (null if in progress) |
| Notes | rich_text | Thoughts, quotes, or highlights |

**Status colors (suggested):**
- Reading: blue
- Completed: green
- Want to Read: gray

When a reading session is logged via `/log-read`, also update the corresponding Reading List entry's Pages Read if pages were specified.

## 5. Tech Notes

Stores technology learning notes, often captured from Claude conversations.

| Property | Type | Details |
|----------|------|---------|
| Name | title | Note title (the topic) |
| Topic | multi_select | Technology tags (e.g., Kubernetes, React, Rust, Networking) |
| Source | rich_text | Where the note came from (e.g., "Claude conversation", "Documentation") |
| Date | date | Date the note was created |

**Note:** The actual note content goes in the page body as rich text blocks, NOT as a property. This allows for full formatting with headings, code blocks, lists, etc.

## 6. Weekly Schedule

Defines which activities are scheduled on which days and their target durations.

| Property | Type | Details |
|----------|------|---------|
| Name | title | Activity name (must match Activity Log select options) |
| Target (min) | number | Daily target duration in minutes |
| Monday | checkbox | Whether activity is scheduled on Monday |
| Tuesday | checkbox | Whether activity is scheduled on Tuesday |
| Wednesday | checkbox | Whether activity is scheduled on Wednesday |
| Thursday | checkbox | Whether activity is scheduled on Thursday |
| Friday | checkbox | Whether activity is scheduled on Friday |
| Saturday | checkbox | Whether activity is scheduled on Saturday |
| Sunday | checkbox | Whether activity is scheduled on Sunday |

**Default schedule entries:**

| Activity | Target | Mon | Tue | Wed | Thu | Fri | Sat | Sun |
|----------|--------|-----|-----|-----|-----|-----|-----|-----|
| Coding | 60 | x | x | x | x | x | x | x |
| Drawing | 30 | x | x | x | x | x | x | x |
| Weightlifting | 60 | x | | x | | x | | |
| Climbing | 60 | | | x | | | | |
| Drums | 30 | x | | | x | | x | |
| Reading | 30 | x | x | x | x | x | x | x |

## Database Naming Convention

All databases use exact names (case-sensitive) for reliable lookup:
- "Activity Log"
- "Workout Log"
- "Personal Records"
- "Reading List"
- "Tech Notes"
- "Weekly Schedule"

Always search using these exact names with `notion-search` to find the correct database.
