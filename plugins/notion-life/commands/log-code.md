---
name: log-code
description: Log a coding/learning session with duration in minutes
argument-hint: "<minutes> [notes]"
allowed-tools:
  - mcp__notion__notion-search
  - mcp__notion__notion-create-pages
---

Log a coding session to the Activity Log database.

1. Parse the duration in minutes from the first argument. If no argument provided, ask the user how long they coded.
2. Any remaining text after the duration is treated as notes (optional).
3. Search Notion for the "Activity Log" database using notion-search.
4. Create a new page in the database with:
   - Title: "Coding - {today's date formatted as Mon D, YYYY}" (e.g., "Coding - Mar 5, 2026")
   - Date: today's date in ISO format
   - Activity: "Coding"
   - Duration (min): the provided minutes
   - Notes: any additional text provided
5. Confirm the entry was logged. Include the duration and any notes.
6. If the notion-life skill is loaded, check if there's a notable streak or milestone to mention.
