---
name: mentor-off
description: This skill should be used when the user invokes `/mentor-off` or `/mentor-mode:mentor-off`, or says "disable mentor mode", "turn off mentor mode", "exit mentor mode", "I want code generation back". Writes `enabled: false` to `.claude/mentor-mode.local.md` so the session-wide hook stops injecting mentor-mode instructions.
allowed-tools: Read, Write, Edit, Bash
version: 0.1.0
---

# /mentor-off — disable session-wide mentor mode

Triggered when the user runs `/mentor-off`. Writes `enabled: false` to the per-project settings file so the hook becomes a no-op on subsequent turns.

## Step 1: Check if the settings file exists

Look for `.claude/mentor-mode.local.md` relative to the current working directory.

| Case | Action |
|---|---|
| File exists with `enabled: true` | Update to `enabled: false` (preserve `default_depth`) |
| File exists with `enabled: false` already | Idempotent — confirm "already off" without rewriting |
| File doesn't exist | Mentor mode was never on. Just confirm "mentor mode is off" — don't create the file unnecessarily |

## Step 2: Update the file (if needed)

If updating, write this content (preserving the existing `default_depth` if any):

```markdown
---
enabled: false
default_depth: <existing-or-deep>
---

# mentor-mode session settings

This file is written by the `/mentor-on` and `/mentor-off` skills in the mentor-mode plugin.

- `enabled: false` means the session-wide hook is inactive. Claude responds normally.
- To re-enable: run `/mentor-on` (optionally with `hints`, `socratic`, or `deep`).
```

Use the `Edit` tool on the existing file (replace `enabled: true` with `enabled: false`) rather than rewriting from scratch — preserves the `default_depth` field cleanly.

## Step 3: Confirm to the user

Output exactly this:

```
Mentor mode: OFF

I'll respond normally from the next turn forward — I can write code, edit files, and act as a regular assistant. To re-enable, run `/mentor-on`.
```

For the "already off" case, output:

```
Mentor mode is already off. Nothing changed.
```

For the "file doesn't exist" case, output:

```
Mentor mode is off (it was never enabled in this project). To turn it on, run `/mentor-on`.
```

## Hard rules

- **Always write `enabled: false`.** This skill never enables — that's `/mentor-on`'s job.
- **Don't try to mentor in this turn.** Just disable and confirm. Don't end with a leading question.
- **Don't delete the file.** Setting `enabled: false` is enough; the user might `/mentor-on` again later.
- **Idempotent.** Running it multiple times in a row should produce the same end state.

## Examples

### `/mentor-off` (with mentor mode currently on)

> Edits `.claude/mentor-mode.local.md` to set `enabled: false`. Confirms.

### `/mentor-off` (already off)

> Reads file, sees `enabled: false`, responds with "already off" message. No file change.

### `/mentor-off` (file doesn't exist)

> Responds with "was never enabled" message. No file created.

## Edge cases

- **File is malformed YAML**: If the file exists but the frontmatter is corrupt, overwrite it with the canonical `enabled: false, default_depth: deep` content and inform the user that the file was reset.
- **Read-only filesystem**: Report the error and suggest checking permissions.
