# mentor-mode

A coaching companion for Claude Code. When you're working on a feature and you want to learn instead of delegate, mentor-mode shifts Claude from "code generator" to "mentor" — giving you hints, leading questions, and authoritative doc links instead of generated code.

**Two goals:**
1. **Save tokens** — less generation, more pointing to resources you read yourself
2. **Sharpen your skills** — force yourself to think, look things up, and write the code by hand

## How it works

mentor-mode has two modes of operation:

- **One-shot**: Run a slash command (e.g., `/guide`, `/hint`, `/evaluate`) when you want guidance on a specific question. Self-contained, no behavioral lock-in.
- **Session-wide**: Run `/mentor-on` to lock the entire session into mentor mode. A `UserPromptSubmit` hook injects "no code generation" guidance on every turn until you `/mentor-off`.

## Slash commands

| Command | What it does | Example |
|---|---|---|
| `/guide <topic>` | One-shot tips + doc links on a topic | `/guide FastAPI dependency injection` |
| `/hint <situation>` | Leading question only — no answer. Re-invoke for a more specific question. | `/hint my JWT refresh isn't rotating` |
| `/evaluate <target>` | Reviews your work (file, git diff, commit, or description) | `/evaluate src/auth.py` |
| `/find-docs <topic>` | Resource links only — no explanation, max token savings | `/find-docs JWT refresh tokens` |
| `/mentor-on` | Enable session-wide mentor mode | `/mentor-on` |
| `/mentor-off` | Disable session-wide mentor mode | `/mentor-off` |

## Knowledge sources

mentor-mode is configured to use these sources for up-to-date information:

- **Context7 MCP** — library/framework API docs (must be installed separately)
- **WebFetch** (built-in) — for pulling specific URLs
- **WebSearch** (built-in) — for finding current articles
- **GitHub MCP** — for reading real-world code examples (optional, see Setup)

## Prerequisites

- Claude Code installed
- (Optional) Context7 MCP installed globally — recommended for library docs
- (Optional) GitHub MCP installed with a Personal Access Token — required if you want real-world code examples from public repos

## Installation

### As a local plugin

```bash
cc --plugin-dir <path-to-mentor-mode>
```

### Or copy to your Claude Code plugins directory

Follow your standard plugin install path.

## GitHub MCP setup (optional)

If you want `/evaluate` and `/guide` to surface real-world code examples from public repos, set a GitHub Personal Access Token:

```powershell
# Create a fine-grained PAT with public_repo read access at:
# https://github.com/settings/tokens?type=beta
$env:GITHUB_TOKEN = "ghp_yourTokenHere"
```

The plugin's `.mcp.json` reads `GITHUB_TOKEN` from the environment.

## Settings

mentor-mode stores per-project state in `.claude/mentor-mode.local.md`:

```markdown
---
enabled: false
default_depth: deep
---
```

- `enabled` — `true` if `/mentor-on` is active
- `default_depth` — `hints`, `socratic`, or `deep` (default: `deep`)

This file is gitignored by default.

## License

MIT
