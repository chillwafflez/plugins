---
name: log-read
description: Log a reading session with duration and optional book title
argument-hint: "<minutes> [book title]"
allowed-tools:
  - mcp__notion__notion-search
  - mcp__notion__notion-create-pages
  - mcp__notion__notion-fetch
  - mcp__notion__notion-update-page
---

Log a reading session to the Activity Log database, with book title tracking.

1. Parse the duration in minutes from the first argument. If no argument provided, ask the user how long they read.
2. Everything after the duration is treated as the book title (optional but encouraged).
   - Example: `/log-read 25 Designing Data-Intensive Applications`
   - If no book title, ask "What were you reading?"
3. Search Notion for the "Activity Log" database using notion-search.
4. Create a new page in the database with:
   - Title: "Reading - {today's date formatted as Mon D, YYYY}"
   - Date: today's date in ISO format
   - Activity: "Reading"
   - Duration (min): the provided minutes
   - Book Title: the book title
5. Optionally check the "Reading List" database:
   - Search for the book title in Reading List
   - If found and status is "Reading", note it in confirmation
   - If not found, ask if the user wants to add it to the Reading List
6. Confirm the entry was logged with duration and book title.
