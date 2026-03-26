---
description: Update existing documentation to reflect recent code changes using git diff or manual input
argument-hint: "[commit/tag to diff against] (optional)"
allowed-tools: ["Read", "Write", "Edit", "Grep", "Glob", "Bash", "Agent", "AskUserQuestion", "mcp__context7__resolve-library-id", "mcp__context7__query-docs", "mcp__notion__notion-search", "mcp__notion__notion-create-pages", "mcp__notion__notion-fetch", "mcp__notion__notion-update-page"]
---

# Update Existing Documentation

Update documentation to reflect recent code changes. Detect changes automatically via git diff or accept manual input.

## Step 1: Determine What Changed

**Automatic detection (default):**

If `$ARGUMENTS` provides a commit hash, tag, or ref, use it as the baseline:
```bash
git diff --name-only $ARGUMENTS
```

If no argument provided:
1. Check for documentation-related tags or recent commits
2. Try `git log --oneline -20` to show recent history
3. Ask the user which commit or tag to diff against
4. Run `git diff --name-only <baseline>` to get changed files
5. Run `git diff <baseline>` on relevant files to understand the nature of changes

**Manual specification:**
If the user prefers, allow them to manually describe what changed instead of using git diff. Ask: "Would you like to tell me what changed, or should I detect it from git?"

## Step 2: Map Changes to Documentation

Analyze the changed files and determine which documentation needs updating:

| Change Type | Affected Documentation |
|-------------|----------------------|
| New files/modules | Architecture docs, README |
| Modified function signatures | Inline docs, API reference |
| New API endpoints | API reference, integration guide |
| Config/env changes | Setup guide |
| New dependencies | Setup guide, architecture |
| Workflow changes | Workflows doc |
| Deleted features | All relevant docs, changelog |
| Bug fixes | Changelog |

Also check for user settings at `.claude/code-documenter.local.md` for preferences.

## Step 3: Identify Existing Documentation

Search for existing documentation:
1. Check `docs/` directory for markdown files
2. Check `README.md` at project root
3. Check inline docstrings in changed files
4. If docs were previously written to Notion, ask the user for the Notion page location

## Step 4: Update Documentation

For each affected documentation file:

1. Read the existing content
2. Identify the specific sections that need updating
3. Use the Edit tool to update only the relevant sections
4. Preserve the existing structure and style
5. Add new sections if the changes introduce entirely new concepts

**For inline docs in changed files:**
- Check if modified functions have outdated docstrings
- Update parameter lists, return types, and descriptions
- Add docs to any new functions introduced

**For architecture/workflow docs:**
- Update component descriptions if architecture changed
- Add new workflow descriptions for new features
- Update data flow diagrams/descriptions

**For API reference:**
- Update endpoint descriptions for modified APIs
- Add entries for new endpoints
- Mark removed endpoints as deprecated

**For changelog:**
- Add entries under appropriate version/date heading
- Categorize changes (Added, Changed, Fixed, Removed, Deprecated)
- Follow Keep a Changelog format if existing changelog uses it

## Step 5: Summary

Present a summary of all updates:
- Files modified with brief description of changes
- Any documentation gaps found (sections that may need manual review)
- Suggest reviewing the updated docs for accuracy
