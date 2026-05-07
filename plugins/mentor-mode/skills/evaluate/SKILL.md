---
name: evaluate
description: This skill should be used when the user invokes `/evaluate` or `/mentor-mode:evaluate` with a target (file path, git commit SHA, `--diff`, or natural-language description), or asks "review my work", "critique what I wrote", "evaluate this commit", "check my approach". Reviews the user's work with a Strengths / Issues / Concepts to learn / Docs structure. Never rewrites the code — only critiques and points to learning resources.
argument-hint: <file-path | sha | --diff | "description of approach">
allowed-tools: Read, Grep, Glob, Bash, WebFetch, WebSearch, mcp__context7__resolve-library-id, mcp__context7__query-docs, mcp__github__*
version: 0.1.0
---

# /evaluate — review the user's work

Triggered when the user runs `/evaluate <target>`. Detects input mode automatically and returns a structured critique. Does not rewrite the code.

## Step 1: Detect input mode

Inspect `$ARGUMENTS` and decide which of four modes applies:

Apply detection in this exact order — first match wins. This avoids ambiguity for short SHAs that happen to match real paths.

| Order | Mode | Detection | Action |
|---|---|---|---|
| 1 | **Diff mode** | `$ARGUMENTS` starts with `--diff` (optionally followed by a path) | Run `git diff` (or `git diff <path>`) and review the unstaged changes |
| 2 | **File mode** | `$ARGUMENTS` is a path that exists on disk (check with `Glob` or `Read`) | Read the file with the `Read` tool |
| 3 | **Commit mode** | `$ARGUMENTS` looks like a git SHA (7+ hex chars) AND is not an existing path | Run `git show <sha>` and review the commit |
| 4 | **Description mode** | None of the above | Use `$ARGUMENTS` as the user's natural-language description of their approach |

If `$ARGUMENTS` is empty, default to diff mode (`git diff` for current uncommitted changes).

If detection is still ambiguous after applying this order (e.g., a SHA-like string also exists as a real file but the user clearly meant the commit), ask the user to clarify.

## Step 2: Gather context

Before critiquing, gather just enough context:

- **File mode**: Read the file. If it imports/uses other modules in the project, glob/grep for them briefly to understand interfaces. Don't read the whole codebase.
- **Diff/commit mode**: The diff itself shows changes. Optionally read 1–2 surrounding files for context if a change references them.
- **Description mode**: No file context to gather; rely on the description.

For library-specific patterns in the code/description, verify current best practice via Context7 before flagging something as wrong.

## Step 3: Apply mentor-mode philosophy

Read `${CLAUDE_PLUGIN_ROOT}/skills/mentor-mode/SKILL.md` for the rules. The key constraint for `/evaluate`:

- **Critique. Do not rewrite.** Identify issues, name them, point to docs. Do NOT produce corrected code.
- **Pseudocode is allowed sparingly** if it clarifies an algorithmic issue, but only with a `text` fence and a "pseudocode" label.

## Step 4: Output the critique in this exact structure

```markdown
## Strengths
- <2–4 things the user did well, specific to their work>

## Issues
- <each issue: what it is, why it matters, located if file/commit mode>
- <issues should be ranked roughly by severity>

## Concepts to learn
- <pattern, anti-pattern, or technique they should look up to understand the issues>
- <one concept name per bullet — Claude can search for it>

## Docs
- <URL 1> — <one-line description of what this teaches>
- <URL 2> — <one-line description>
```

### Section guidance

**Strengths** (2–4 bullets):
- Be specific. "Good code" is useless. "Clean separation between HTTP handler and business logic in `auth.py`" is useful.
- Skip if the work has nothing notable to praise — but try to find at least one genuine strength.

**Issues** (variable count, prioritized):
- Most severe first (security > correctness > maintainability > style).
- Each issue: state it, locate it (file:line if possible), say why it matters in one sentence.
- Don't list every nitpick — focus on issues that teach something.
- For description mode: critique the design/approach, not specific lines (since there are none).

**Concepts to learn** (2–5 bullets):
- One named concept per bullet. The user should be able to search this term and find canonical material.
- Examples: "Refresh token rotation", "n+1 query problem", "transactional outbox pattern", "OWASP A01 Broken Access Control"
- Prefer named patterns and named anti-patterns over generic phrases.

**Docs** (2–4 links):
- Authoritative sources only — official docs, RFCs, reputable engineering blogs.
- Each with a one-line "what this teaches" description.

## Step 5: End with one offer

After the structured critique, add ONE line:

> "Want a leading question on any of these issues? Run `/mentor-mode:hint <issue>`."

OR

> "Want me to explain any of these concepts in depth? Run `/mentor-mode:guide <concept>`."

## Hard rules

- **Never rewrite the code.** Even partially. Even as a "small example".
- **Never produce a runnable code block.** Pseudocode in `text` fence is the only exception.
- **Never edit the file.** Read-only review.
- **Critique facts, not style preferences.** Don't flag tabs vs. spaces unless the project clearly has a convention. Focus on correctness, security, architecture, and maintainability.

## Mode-specific examples

### File mode: `/evaluate src/auth.py`

> Reads `src/auth.py`, briefly checks imports for context, returns the four sections. Strengths might note clean handler/service separation. Issues might flag a hardcoded JWT secret on line 42 and missing refresh token rotation. Concepts: "Refresh token rotation", "Secrets management". Docs: link to OAuth 2.1 spec and a 12-factor blog post.

### Diff mode: `/evaluate --diff`

> Runs `git diff`, reviews uncommitted changes only. Useful right before committing. Same output structure.

### Commit mode: `/evaluate a1b2c3d`

> Runs `git show a1b2c3d`, reviews that commit. Useful for reviewing your own past work.

### Description mode: `/evaluate I implemented refresh tokens by storing them in Redis with a TTL and checking on each request`

> No code to read. Critiques the design: strengths (TTL-based expiry is good), issues (no rotation strategy described, no mention of revocation on logout), concepts (refresh token rotation, token revocation patterns), docs.

## When to ask for clarification

- If a path is ambiguous: "Did you mean `src/auth.py` or `tests/auth.py`?"
- If the SHA is short and ambiguous: "That SHA matches multiple commits — can you give a longer one?"
- If the description is too vague: "Can you describe the implementation in a bit more detail? E.g., what library, what flow, what storage?"
