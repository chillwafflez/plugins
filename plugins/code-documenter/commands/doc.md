---
description: Generate documentation for your codebase — choose doc type, output destination, and fresh vs update mode
argument-hint: "[inline|architecture|internal|external|all] (optional)"
allowed-tools: ["Read", "Write", "Edit", "Grep", "Glob", "Bash", "Agent", "Skill", "AskUserQuestion", "mcp__context7__resolve-library-id", "mcp__context7__query-docs", "mcp__notion__notion-search", "mcp__notion__notion-create-pages", "mcp__notion__notion-fetch"]
---

# Generate Documentation

Generate documentation for the current codebase. If `$ARGUMENTS` specifies a documentation type, skip the type selection step and proceed directly.

## Step 1: Determine Documentation Type

If no type specified in `$ARGUMENTS`, ask the user to choose one or more:

1. **Inline** — Add comments and docstrings to source files
2. **Architecture** — High-level system architecture, workflows, design principles
3. **Internal** — Setup guides, coding standards, contributing guides, processes
4. **External** — README, API reference, integration guide, changelog
5. **All** — Generate all four types

## Step 2: Determine Output Destination

For **inline** docs: output goes directly into source files (no choice needed).

For **architecture**, **internal**, and **external** docs, ask the user:

- **docs/ folder** (default) — Create organized markdown files in the project's `docs/` directory
- **Notion** — Write documentation to Notion pages

If the user chooses Notion:
1. Use `mcp__notion__notion-search` to help the user find the target Notion page or database
2. Ask which page/database to write to
3. Use `mcp__notion__notion-create-pages` to create documentation pages

## Step 3: Determine Mode

Ask the user:

- **Fresh** — Generate documentation from scratch by analyzing the full codebase
- **Update** — Detect changes via `git diff` and update only affected docs

If the user chooses **Update**:
1. Run `git diff --name-only` against the appropriate baseline (last tag, N commits ago, or a specific commit)
2. Ask the user for the baseline if unclear
3. Identify which documentation sections are affected
4. Update only the relevant sections
5. Also allow the user to manually specify what changed if they prefer

## Step 4: Analyze the Codebase

Before generating any documentation:

1. Read the project structure using Glob to understand the directory layout
2. Identify the primary programming language(s) and frameworks
3. Skip excluded directories: `node_modules/`, `vendor/`, `dist/`, `build/`, `.git/`, `__pycache__/`, `.venv/`, `venv/`, `.tox/`, `.next/`, `.nuxt/`, `out/`, `coverage/`, and anything in `.gitignore`
4. Check for existing documentation to avoid overwriting without confirmation
5. Use Context7 MCP (`mcp__context7__resolve-library-id` and `mcp__context7__query-docs`) to look up library-specific documentation conventions for accurate API descriptions

Also check for user settings at `.claude/code-documenter.local.md` and apply any configured preferences.

## Step 5: Generate Documentation

Follow the documentation-standards skill for best practices on each documentation type.

### For Inline Docs:
- Detect the existing docstring/comment convention in the codebase
- If no convention exists, ask the user for their preferred style
- Add docstrings to functions, classes, and methods
- Add inline comments only where logic is non-obvious
- Explain *why*, not *what*

### For Architecture Docs:
Generate these files in `docs/` (or Notion):
- `architecture.md` — System overview, component breakdown, data flow, tech stack
- `workflows.md` — Key user and data flows with step-by-step descriptions
- `design-principles.md` — Design decisions, patterns, trade-offs

### For Internal Docs:
Generate these files in `docs/internal/` (or Notion):
- `setup-guide.md` — Prerequisites, install steps, env config, running locally
- `coding-standards.md` — Style guide, naming conventions, patterns
- `contributing.md` — PR process, branch naming, commit conventions
- `processes.md` — Release, deployment, incident response (if applicable)

### For External Docs:
Generate these files:
- `README.md` at project root — Overview, quick start, features, links
- `docs/api/reference.md` — API endpoints/functions, parameters, responses
- `docs/api/integration-guide.md` — How to integrate with the software
- `docs/api/changelog.md` — Version history

## Step 6: Summary

After generation, present a summary:
- List all files created or updated
- Note any sections that need manual review or additional context
- Suggest next steps (e.g., "Run `/doc-update` after your next set of changes")
