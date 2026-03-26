---
name: log-drums
description: Log a drums practice session with duration in minutes
argument-hint: "<minutes> [notes]"
allowed-tools:
  - mcp__notion__notion-search
  - mcp__notion__notion-create-pages
---

Log a drums practice session to the Activity Log database.

1. Parse the duration in minutes from the first argument. If no argument provided, ask the user how long they practiced.
2. Any remaining text after the duration is treated as notes (optional).
3. Search Notion for the "Activity Log" database using notion-search.
4. Create a new page in the database with:
   - Title: "Drums - {today's date formatted as Mon D, YYYY}"
   - Date: today's date in ISO format
   - Activity: "Drums"
   - Duration (min): the provided minutes
   - Notes: any additional text provided
5. Confirm the entry was logged with the duration.
6. If the notion-life skill is loaded, check if there's a notable streak or milestone to mention.
