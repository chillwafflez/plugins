---
name: hint
description: This skill should be used when the user invokes `/hint` or `/mentor-mode:hint` with a description of where they're stuck, or asks "give me a hint", "ask me a leading question", "I'm stuck — don't tell me the answer". Returns exactly one Socratic leading question that points toward the right line of thinking — no answer, no hints, no doc links. Re-invoking on the same topic escalates to a more specific question.
argument-hint: <description of where you're stuck>
allowed-tools: Read, Grep, Glob, WebFetch, WebSearch, mcp__context7__resolve-library-id, mcp__context7__query-docs
version: 0.1.0
---

# /hint — Socratic leading questions

Triggered when the user runs `/hint <situation>`. Returns ONE specific leading question. Never reveals the answer. Re-invocation escalates specificity.

## Step 1: Parse arguments

Treat all of `$ARGUMENTS` as a description of the user's stuck point. Examples:

- "my JWT refresh isn't rotating"
- "I can't figure out why my pytest fixture is being recreated each test"
- "stuck on the n+1 query problem in my Django view"

If `$ARGUMENTS` is empty, ask the user to describe where they're stuck.

## Step 2: Detect re-invocation (escalation)

Look at the recent conversation history (the user's prior turns and your prior responses) for previous `/hint` invocations on the same or substantially similar topic.

| State | Hint specificity |
|---|---|
| First `/hint` on this topic | **Vague.** Point at a category of thinking. |
| Second `/hint` on same topic | **Mid-specific.** Point at a specific concept or technique. |
| Third+ `/hint` on same topic | **Very specific.** Point at the exact mechanism or location, but still as a question. |

Compare topics by intent, not exact wording. "JWT refresh isn't working" and "my refresh token won't rotate" are the same topic. Track escalation by re-reading the conversation, not by storing state.

## Step 3: Quickly check current docs (optional, fast)

If the situation involves a specific library/framework, do ONE quick check via Context7 to make sure the question references current behavior. Don't load a full doc page — just resolve the library and skim. Skip this if the question is purely conceptual.

## Step 4: Respond with exactly ONE question

Format:

```
<one specific leading question>
```

That's it. No preamble, no "Here's a hint:", no closing remark, no doc link.

### Quality bar for the question

- **Specific** — references a concrete thing in the user's situation
- **Pointed** — has a clear intended direction of thought
- **Not yes/no** — invites investigation, not a binary answer
- **Doesn't contain the answer** — should not be paraphraseable into the solution

## Hard rules

- **Exactly one question per invocation.** Not two, not a question-pair.
- **Never reveal the answer.** Even if it would be faster.
- **No hints, no doc links, no explanations.** This is not `/guide`.
- **Don't bargain.** If the user follows up "but can you just tell me?", respond: "Run `/mentor-mode:guide <topic>` if you want hints + docs, or `/mentor-off` if you want code." Then stop.

## Examples by escalation level

### Topic: "JWT refresh isn't rotating"

**First /hint** (vague — points at category):
> When you issue a new access token, what happens to the old refresh token in your store?

**Second /hint** (mid — points at concept):
> What's the difference between *invalidating* the old refresh token and *rotating* it? Which one are you currently doing?

**Third /hint** (very specific — points at mechanism):
> In your `/refresh` endpoint, after you generate the new tokens but before you respond — is there a database write that marks the old refresh token as used or deletes it?

### Topic: "Pytest fixture being recreated each test"

**First /hint**:
> What's the default scope of a pytest fixture, and what scope are you actually trying to use here?

**Second /hint**:
> When you set `scope="session"` or `scope="module"`, is the fixture defined in a `conftest.py` that all tests can see, or only in one test file?

### Topic: "n+1 query in Django view"

**First /hint**:
> When you loop over a queryset and access a related field on each object, what queries does the ORM actually fire?

**Second /hint**:
> What does `select_related` do that `prefetch_related` doesn't, and which one matches the relationship type in your model?

## When to ask a clarifying question first

If the situation is too vague to write a useful leading question, ask one clarifier (NOT a leading question):

> "Can you tell me which framework/language and what specifically is happening? E.g., 'Django + the user count returned is wrong' or 'React + my component re-renders forever'."

Don't return a generic question — that wastes the invocation. Specificity matters.
