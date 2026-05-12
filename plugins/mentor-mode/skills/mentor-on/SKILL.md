---
name: mentor-on
description: This skill should be used when the user invokes `/mentor-on` or `/mentor-mode:mentor-on`, or says "enable mentor mode", "turn on mentor mode for this session", "lock me into learning mode". Writes `enabled: true` to `.claude/mentor-mode.local.md` so the session-wide hook activates no-code-generation behavior on every turn until `/mentor-off`. Also adds `.claude/*.local.md` to the project's `.gitignore` if one exists.
argument-hint: [hints|socratic|deep]
allowed-tools: Read, Write, Edit, Bash
version: 0.1.0
---

# /mentor-on — enable session-wide mentor mode

Triggered when the user runs `/mentor-on [depth]`. Writes the toggle and depth preference to the per-project settings file. The `UserPromptSubmit` hook will read this file every turn and inject mentor-mode instructions.

## Step 1: Parse the optional depth argument

`$ARGUMENTS` may contain one of: `hints`, `socratic`, `deep`. If anything else (or empty), use `deep` as the default.

Validate: only accept these three values. Any other value → respond with the valid options and stop.

## Step 2: Ensure `.claude/` directory exists

The settings file lives at `.claude/mentor-mode.local.md` relative to the current working directory (the user's project root, NOT the plugin).

Check if `.claude/` exists. If not, create it with `mkdir -p .claude`.

## Step 3: Write the settings file

Write `.claude/mentor-mode.local.md` with this exact content:

```markdown
---
enabled: true
default_depth: <chosen-depth>
---

# mentor-mode session settings

This file is written by the `/mentor-on` and `/mentor-off` skills in the mentor-mode plugin.

- `enabled: true` means the session-wide hook is active and Claude must respond as a mentor (hints + docs, not code).
- `default_depth` controls the response style when no per-turn flag is given.

To disable: run `/mentor-off`.
To change depth: run `/mentor-on <depth>` again with `hints`, `socratic`, or `deep`.
```

If the file already exists, OVERWRITE it. Do not preserve old content — the toggle is idempotent.

## Step 4: Confirm to the user

Output exactly this confirmation (substituting depth):

```
Mentor mode: ON
Default depth: <chosen-depth>

From this turn forward, I'll respond as a mentor — hints, leading questions, and doc links instead of code. To disable, run `/mentor-off`. To override depth on a single turn, pass a flag to `/guide` (e.g., `/guide <topic> --hints`).
```

## Step 5: Add `.claude/*.local.md` to `.gitignore` (optional, idempotent)

Check if a `.gitignore` exists in the project root. If yes, check if `.claude/*.local.md` is already in it. If not, append it. If `.gitignore` doesn't exist, do nothing — don't create one (that's the user's call).

This prevents the user accidentally committing their per-project mentor-mode state.

## Hard rules

- **Always write `enabled: true`.** This skill never disables — that's `/mentor-off`'s job.
- **Always overwrite the file.** Don't preserve stale fields.
- **Don't run any other mentor-mode skills.** Just write the file and confirm.
- **Don't try to enforce mentor mode in this turn.** The hook handles that on the *next* user turn.

## Examples

### `/mentor-on`

> Writes `enabled: true, default_depth: deep` to `.claude/mentor-mode.local.md`. Confirms.

### `/mentor-on hints`

> Writes `enabled: true, default_depth: hints` to `.claude/mentor-mode.local.md`. Confirms.

### `/mentor-on banana`

> Responds: "Invalid depth. Valid values: `hints`, `socratic`, `deep`. Try `/mentor-on deep`." Does NOT write the file.

## Edge cases

- **Already on**: If `enabled: true` already, just overwrite (with the new depth if provided) and confirm. No special "already enabled" message — idempotent is fine.
- **Read-only filesystem**: If write fails, report the error to the user and suggest checking permissions.
- **Inside a non-project directory**: If there's no obvious project root (no `.git`, no `package.json`, no `pyproject.toml`, etc.), still write to `.claude/` in the current working directory. The hook reads from CWD, so this is correct.
