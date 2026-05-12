---
name: find-docs
description: This skill should be used when the user invokes `/find-docs` or `/mentor-mode:find-docs` with a topic, or asks "find me docs on", "where can I read about", "links only — no explanation". Returns up to 5 authoritative documentation links with one-line descriptions and absolutely no other prose, explanation, or hints. Maximum token savings.
argument-hint: <topic>
allowed-tools: WebFetch, WebSearch, mcp__context7__resolve-library-id, mcp__context7__query-docs, mcp__github__*
version: 0.1.0
---

# /find-docs — resource finder, no fluff

Triggered when the user runs `/find-docs <topic>`. Returns ONLY links + one-line descriptions. No preamble, no concepts, no hints, no explanations.

## Step 1: Parse arguments

Treat all of `$ARGUMENTS` as the topic. If empty, ask the user for a topic in one sentence and stop.

## Step 2: Identify authoritative sources

Find up to 5 high-quality, current sources for the topic. Use this priority order:

1. **Library/framework docs via Context7** if the topic is library-specific (FastAPI, React, Django, etc.)
2. **Official language/standard docs** (Python.org, MDN, RFCs) for fundamentals
3. **Reputable engineering blogs** (Stripe, Cloudflare, AWS, GitHub blog) for architecture/ops
4. **GitHub real-world repos** (via GitHub MCP if available, else WebFetch on github.com URLs) for examples
5. **WebSearch** for "current best practice for X" articles, only if previous tiers don't cover the topic

Never include:
- AI content farms
- Tutorial sites with no version info
- Stack Overflow answers older than 2 years
- Marketing pages disguised as docs

## Step 3: Output ONLY this format

```
- <URL 1> — <one-line description, max ~12 words>
- <URL 2> — <one-line description>
- <URL 3> — <one-line description>
```

That's the entire response. No headers, no preamble, no closing line.

### Quality of descriptions

- Describe what the link teaches, not what it is. "Official refresh token rotation flow with diagrams" beats "OAuth 2.1 spec page".
- Be honest if a doc covers only one aspect. "Section on testing only — skip the framework parts" is helpful.

## Hard rules

- **No prose outside the bullet list.**
- **No concepts to learn section.**
- **No hints.**
- **No leading questions.**
- **No "let me know if you need more" closer.**
- **Max 5 bullets, prefer 3.**

If the user wants explanation, they'll run `/guide` instead. This skill is the maximum-savings option.

## Examples

### `/find-docs JWT refresh tokens`

```
- https://datatracker.ietf.org/doc/html/rfc6749#section-1.5 — OAuth 2.0 spec on refresh token semantics
- https://www.rfc-editor.org/rfc/rfc6819 — OAuth security threat model, including refresh-token attacks
- https://auth0.com/docs/secure/tokens/refresh-tokens/refresh-token-rotation — Auth0's rotation pattern, applicable to any provider
```

### `/find-docs FastAPI dependency injection`

```
- https://fastapi.tiangolo.com/tutorial/dependencies/ — Official tutorial, covers Depends() and sub-dependencies
- https://fastapi.tiangolo.com/advanced/testing-dependencies/ — Override pattern for tests
- https://fastapi.tiangolo.com/tutorial/dependencies/dependencies-with-yield/ — Resource cleanup with yield
```

### `/find-docs n+1 query problem`

```
- https://docs.djangoproject.com/en/stable/topics/db/optimization/#understanding-querysets — Django's official guide with select_related/prefetch_related
- https://www.sqlalchemy.org/library.html#tutorials — SQLAlchemy joinedload/selectinload patterns
```

## When to ask for clarification

If the topic is so vague that any 3 links would be arbitrary:

> "Topic too broad — narrow it. E.g., 'authentication' → 'OAuth refresh token rotation' or 'session vs JWT auth'."

One sentence, then stop. Don't return a generic list.
