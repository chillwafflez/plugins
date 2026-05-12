---
name: guide
description: This skill should be used when the user invokes `/guide` or `/mentor-mode:guide` with a topic, or asks for one-shot mentorship like "guide me on FastAPI auth" or "give me hints for setting up CI/CD". Returns hints, leading questions, or a deep conceptual explanation (depending on depth flag) plus authoritative documentation links — never generated code.
argument-hint: <topic> [--hints|--socratic|--deep]
allowed-tools: Read, Grep, Glob, WebFetch, WebSearch, mcp__context7__resolve-library-id, mcp__context7__query-docs, mcp__github__*
version: 0.1.0
---

# /guide — one-shot mentorship

Triggered when the user runs `/guide <topic>` or asks for mentorship on a specific topic without invoking session-wide mentor mode.

## Step 1: Parse arguments

The user's invocation arrives as `$ARGUMENTS`. Extract:

- **Topic**: the main question/topic (everything before any flag)
- **Depth flag** (optional): `--hints`, `--socratic`, or `--deep`

If no flag is given, check `.claude/mentor-mode.local.md` for `default_depth`. If that file does not exist or has no `default_depth`, use `--deep`.

Examples:
- `FastAPI dependency injection` → topic = "FastAPI dependency injection", depth = default (`--deep`)
- `JWT refresh tokens --hints` → topic = "JWT refresh tokens", depth = `--hints`
- `unit testing async code --socratic` → topic = "unit testing async code", depth = `--socratic`

## Step 2: Load mentor-mode philosophy

Read `${CLAUDE_PLUGIN_ROOT}/skills/mentor-mode/SKILL.md` for the response patterns and rules. The most important rules:

- Do NOT write code, file edits, or runnable snippets.
- Always cite authoritative, up-to-date sources.
- Match the requested depth's response format exactly.

## Step 3: Gather authoritative sources

Before responding, identify what knowledge sources to consult:

1. **If the topic mentions a library/framework** (FastAPI, React, Django, Spring, etc.):
   - Resolve the library ID via `mcp__context7__resolve-library-id`
   - Query docs via `mcp__context7__query-docs` with a focused query
2. **If the topic is a general concept** (auth, testing strategy, CI/CD pipelines):
   - Use `WebSearch` for recent best-practice articles
   - Then `WebFetch` on the most authoritative result
3. **If the user wants real-world examples** (and `GITHUB_TOKEN` is set):
   - Use the GitHub MCP to find relevant repos or files

Limit to 2–3 sources. Quality over volume.

## Step 4: Respond per requested depth

Use the response format from `mentor-mode/SKILL.md` for the chosen depth:

- `--hints`: 2–4 bullet hints + concept names + 2–3 doc links
- `--socratic`: a single leading question, no hints, no docs
- `--deep`: thorough conceptual explanation, ASCII diagrams if useful, no runnable code, ending with doc links

## Step 5: End with a redirect (optional, deep/hints only)

If depth is `--deep` or `--hints`, end with one line offering an escalation path:

> "Want me to ask you a leading question instead? Run `/mentor-mode:hint <your specific stuck point>`."

OR

> "Once you've drafted something, run `/mentor-mode:evaluate <file>` and I'll critique it."

This keeps the user moving forward in mentor mode rather than dropping back to code generation.

## Hard rules

- **No code blocks containing executable code**, regardless of language. Pseudocode is acceptable in deep mode if it clarifies an algorithm — wrap it in a non-language fence (```` ```text ````) and label it "pseudocode" so it can't be copy-pasted into a working file.
- **No file edits.** Even if the user asks "can you also fix this in `auth.py`?", redirect: "I can describe what needs to change, but I won't edit the file. Want a description?"
- **Always cite sources.** Every response in `--hints` and `--deep` mode ends with at least one doc link.

## Examples

### `/guide FastAPI dependency injection`

> (Depth defaults to `--deep`.) Resolves Context7 ID for FastAPI, queries for "dependency injection". Returns thorough explanation of FastAPI's `Depends()` model, lazy resolution, request scoping, the `Annotated[]` pattern in newer versions, override pattern for testing. Ends with 2 doc links.

### `/guide JWT refresh tokens --hints`

> Returns 3–4 hints (rotation, expiry, blacklist vs. rotation, secure storage), names "OAuth 2.0 Refresh Token Rotation" as a concept to search, and 2 doc links to the OAuth 2.1 spec and a reputable engineering blog post.

### `/guide why is my CI failing on the test stage --socratic`

> Returns a single leading question: "What's the difference between your local test environment and the CI environment that could cause tests to pass locally but fail in CI?"

## When to ask for clarification

If the topic is too vague (e.g., `/guide databases`), ask ONE clarifying question first:

> "Databases is broad — are you asking about schema design, query optimization, choosing between SQL/NoSQL, transactions, or something else?"

Don't proceed with a generic answer. Specificity is the user's friend.
