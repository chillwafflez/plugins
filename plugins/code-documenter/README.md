# code-documenter

Generate and maintain documentation for your codebases. Supports four documentation types with output to a local `docs/` folder or Notion.

## Features

- **Inline docs** — Add comments and docstrings to source files (any language)
- **Architecture docs** — System overview, workflows, design principles
- **Internal docs** — Setup guides, coding standards, contributing guides
- **External docs** — README, API reference, integration guides
- **Dual output** — Write docs to `docs/` folder or Notion
- **Fresh or update** — Generate from scratch or update based on git diff
- **Language-agnostic** — Auto-detects docstring conventions for any language
- **Context7 integration** — Looks up library docs for accuracy

## Commands

| Command | Description |
|---------|-------------|
| `/doc` | Main documentation command — choose type, destination, and mode |
| `/doc-inline` | Quick shortcut for adding inline comments/docstrings to specific files |
| `/doc-update` | Update existing docs based on recent code changes |

## Agent

**codebase-documenter** — Triggered when you ask to "document this project" or need comprehensive codebase documentation. Autonomously explores the codebase and generates all four doc types.

## Configuration

Optionally create `.claude/code-documenter.local.md` in your project to set preferences:

```markdown
---
default_output: docs
docstring_style: google
excluded_dirs: ["node_modules", "dist", ".git", "vendor", "__pycache__"]
---

# Project-Specific Notes

Any additional context about this project's documentation preferences.
```

### Settings

| Field | Values | Default | Description |
|-------|--------|---------|-------------|
| `default_output` | `docs`, `notion` | `docs` | Where to write documentation |
| `docstring_style` | `google`, `numpy`, `sphinx`, `jsdoc`, `javadoc`, etc. | auto-detect | Preferred docstring format |
| `excluded_dirs` | Array of directory names | Common defaults | Directories to skip |

**Note:** After creating or editing the settings file, restart Claude Code for changes to take effect.

Add `.claude/*.local.md` to your `.gitignore` to keep settings local.

## Prerequisites

This plugin references tools from external MCP servers. Ensure these are configured in your environment for full functionality:

- **Context7 MCP** — Used to look up library-specific documentation conventions for accuracy. Documentation generation still works without it, but API docs may be less precise.
- **Notion MCP** — Required only if you want to write documentation to Notion. Not needed for docs/ folder output.

## Installation

```bash
claude --plugin-dir /path/to/code-documenter
```

## Usage Examples

```
# Generate all documentation types
/doc all

# Add inline docs to a specific file
/doc-inline src/auth/login.ts

# Update docs after code changes
/doc-update HEAD~5

# Let the agent document your whole project
"Document this entire project for me"
```
