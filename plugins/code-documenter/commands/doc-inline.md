---
description: Add inline comments and docstrings to specific files or functions in your codebase
argument-hint: "[file path or function name] (optional)"
allowed-tools: ["Read", "Write", "Edit", "Grep", "Glob", "Bash", "AskUserQuestion", "mcp__context7__resolve-library-id", "mcp__context7__query-docs"]
---

# Add Inline Documentation

Quickly add inline comments and docstrings to targeted source files or functions.

## Step 1: Determine Target

If `$ARGUMENTS` specifies a file path or function name, use that as the target.

If no arguments provided:
- Default to the **current file open in the user's editor** (check for recently modified files or ask)
- If unclear, ask the user which files or functions to document

The user can specify:
- A single file path (e.g., `src/auth/login.ts`)
- Multiple file paths
- A function or class name (search for it in the codebase using Grep)
- A directory (document all source files within it)

## Step 2: Detect Convention

Before adding any documentation:

1. Scan the target file and surrounding files for existing docstring/comment conventions
2. Identify the language and its standard documentation format (JSDoc, Google-style Python docstrings, Javadoc, XML docs, GoDoc, RustDoc, YARD, PHPDoc, etc.)
3. Look for project-level linting configs that enforce doc styles (e.g., `.eslintrc` with jsdoc plugin, `pyproject.toml` with docstring conventions)

If an existing convention is found, follow it exactly.

If **no convention exists**, ask the user which style they prefer before proceeding. Suggest the most common standard for the detected language.

Also check for user settings at `.claude/code-documenter.local.md` for any configured preferences.

## Step 3: Analyze Code

For each target file:

1. Read the file content
2. Identify all functions, methods, classes, and interfaces that lack documentation
3. Identify complex logic blocks that would benefit from explanatory comments
4. Use Context7 MCP to look up library-specific conventions if the code uses external libraries

## Step 4: Add Documentation

Apply inline documentation using the Edit tool:

- **Functions/methods**: Add full docstrings (summary, parameters, returns, raises/throws)
- **Classes**: Add class-level docstrings (purpose, attributes, usage example)
- **Complex blocks**: Add brief inline comments explaining *why*, not *what*
- **Constants/config**: Add comments explaining purpose and valid values

**Rules:**
- Do not comment obvious code
- Match the indentation and style of surrounding code
- Keep docstrings concise but complete
- Use imperative mood for summary lines ("Fetch", "Calculate", "Process")
- Preserve any existing comments — only add new ones

## Step 5: Summary

After adding documentation:
- List all files modified
- Count of docstrings/comments added
- Note any functions that were too complex to document without more context
