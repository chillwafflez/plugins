---
name: note
description: Save tech notes from the current conversation to Notion
argument-hint: "<topic>"
allowed-tools:
  - mcp__notion__notion-search
  - mcp__notion__notion-create-pages
  - AskUserQuestion
---

Save technology/learning notes from the current conversation context to the Tech Notes database.

1. Use the argument as the note topic/title. If no argument provided, ask using AskUserQuestion: "What topic should this note be titled?"

2. Gather note content from the current conversation:
   - Look for recent technical explanations, summaries, or knowledge that Claude provided in this conversation
   - Look for content the user shared or discussed
   - Synthesize the relevant content into a clean, well-structured note
   - If no clear technical content is found in the conversation, ask: "What would you like to include in this note? You can describe it and I'll format it."

3. Determine topic tags by analyzing the content. Extract technology names, concepts, and domains (e.g., "Kubernetes", "Networking", "React", "Database Design").

4. Search for "Tech Notes" database using notion-search.

5. Create a new page with:
   - Title: the topic (e.g., "Kubernetes Pod Networking")
   - Topic: multi-select with relevant tags
   - Source: "Claude conversation"
   - Date: today's date
   - Page body: the note content formatted as rich blocks:
     - Use heading_2 for sections
     - Use paragraph blocks for explanations
     - Use bulleted_list_item for key points
     - Use code blocks for any code snippets
     - Use callout blocks for important warnings or tips

6. Confirm the note was saved: "Saved note: '{title}' with tags: {tags}. {word count} words."
