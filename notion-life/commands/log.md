---
name: log
description: Log activities using natural language input
argument-hint: "<natural language description of what you did>"
allowed-tools:
  - mcp__notion__notion-search
  - mcp__notion__notion-create-pages
  - mcp__notion__notion-fetch
  - mcp__notion__notion-update-page
  - AskUserQuestion
---

Parse natural language input and log one or more activities to the Activity Log.

1. Parse the argument to identify activities and durations. Map common phrases to activities:
   - "coded", "programming", "side project", "learning tech" -> Coding
   - "drew", "sketched", "digital art", "traditional art" -> Drawing
   - "lifted", "gym", "workout", "weights" -> Weightlifting
   - "climbed", "bouldering", "climbing gym" -> Climbing
   - "drums", "practiced drums", "drumming" -> Drums
   - "read", "reading", "book" -> Reading

2. Parse durations from natural language:
   - "30 min", "30 minutes" -> 30
   - "an hour", "1 hour" -> 60
   - "2 hours" -> 120
   - "half hour", "half an hour" -> 30
   - "hour and a half", "1.5 hours" -> 90

3. If any activity is recognized but duration is missing, ask using AskUserQuestion: "How long did you {activity} for?"

4. If no activities are recognized, ask: "I couldn't identify the activities. What did you do and for how long?"

5. For each identified activity:
   - Search for "Activity Log" database
   - Create an entry following the standard format (Title: "{Activity} - {date}", etc.)
   - For Reading: extract book title if mentioned
   - For Weightlifting: ask if they want to log exercise details (follow /log-lift pattern)

6. Confirm all entries with a summary:
   ```
   Logged 3 activities:
   - Drawing: 30 min
   - Reading: 60 min (Designing Data-Intensive Applications)
   - Coding: 45 min
   ```

Example inputs and expected parsing:
- "drew for 30 min and read DDIA for an hour" -> Drawing 30min, Reading 60min (book: DDIA)
- "coded for 2 hours on my side project" -> Coding 120min
- "went climbing for an hour then practiced drums for 20 min" -> Climbing 60min, Drums 20min
- "hit the gym for an hour, did bench and squats" -> Weightlifting 60min (offer exercise details)
