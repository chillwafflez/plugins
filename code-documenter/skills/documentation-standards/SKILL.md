---
name: Documentation Standards
description: This skill should be used when the user asks to "document code", "add documentation", "write docstrings", "generate docs", "create API reference", "write a README", "add inline comments", "document architecture", "create setup guide", "write onboarding docs", "add JSDoc", "document this function", "write CHANGELOG", or "generate API docs". It also applies when the user mentions documentation standards, coding conventions documentation, documentation best practices, or wants to update existing documentation to match code changes.
---

# Documentation Standards

Comprehensive guidance for generating and maintaining four types of software documentation: low-level (inline), high-level (architecture), internal (team), and external (user-facing).

## Documentation Types

### Low-Level (Inline) Documentation

Inline comments and docstrings that explain specific lines, blocks, or functions directly in source code.

**When to add inline docs:**
- Functions/methods with non-obvious logic
- Complex algorithms or business rules
- Workarounds or hack explanations
- Public API surfaces (always)
- Type-heavy or generic code

**Convention detection:** Before adding docstrings, scan the existing codebase for established patterns. Look for:
- Existing docstring formats (JSDoc, Google/NumPy/Sphinx Python docstrings, Javadoc, XML docs, GoDoc, RustDoc)
- Comment style (block vs line, placement conventions)
- Level of detail in existing comments

If no convention exists, ask the user for their preferred style before proceeding.

**Language-specific conventions quick reference:**

| Language | Standard | Example marker |
|----------|----------|---------------|
| Python | Google-style docstrings | `"""Summary.\n\nArgs:..."""` |
| JavaScript/TypeScript | JSDoc | `/** @param {type} name */` |
| Java | Javadoc | `/** @param name description */` |
| C# | XML Documentation | `/// <summary>...</summary>` |
| Go | GoDoc | `// FuncName does X.` |
| Rust | RustDoc | `/// Summary line` |
| Ruby | YARD | `# @param name [Type]` |
| PHP | PHPDoc | `/** @param type $name */` |

For detailed conventions per language, consult `references/language-conventions.md`.

**Principles for inline docs:**
- Explain *why*, not *what* — the code shows what, comments explain reasoning
- Keep docstrings concise but complete (params, returns, raises/throws)
- Do not comment obvious code (`i += 1  # increment i` is noise)
- Use consistent voice and tense within a file
- Place comments above the code they describe, not beside it (except short annotations)

### High-Level Documentation

Architecture overviews, workflow descriptions, and design principle documents. Output as multiple files in `docs/`:

- `docs/architecture.md` — System architecture, component diagram descriptions, technology stack
- `docs/workflows.md` — Key user and data flows, sequence descriptions
- `docs/design-principles.md` — Design decisions, patterns used, trade-offs made

**Structure for architecture.md:**
1. System overview (1-2 paragraphs)
2. Component breakdown (each major module/service)
3. Data flow between components
4. Technology stack and rationale
5. Deployment topology (if applicable)

**Structure for workflows.md:**
1. List key workflows (user journeys, data pipelines)
2. Step-by-step flow for each
3. Error/edge case handling per flow
4. Cross-references to relevant components

**Structure for design-principles.md:**
1. Core design decisions and rationale
2. Patterns used (MVC, event-driven, etc.) and why
3. Trade-offs acknowledged
4. Conventions and standards adopted

### Internal Documentation

Team-facing docs for onboarding, consistency, and process. Output to `docs/internal/`:

- `docs/internal/setup-guide.md` — Environment setup, dependencies, local development
- `docs/internal/coding-standards.md` — Style guide, naming conventions, patterns to follow/avoid
- `docs/internal/contributing.md` — PR process, branch naming, commit conventions
- `docs/internal/processes.md` — Release process, deployment, incident response (if applicable)

**Setup guide essentials:**
1. Prerequisites (runtime versions, tools)
2. Clone and install steps
3. Environment variables / config files
4. Running locally
5. Running tests
6. Common troubleshooting

### External Documentation

User-facing and developer-facing docs. Output to project root and `docs/api/`:

- `README.md` — Project overview, quick start, badges, links
- `docs/api/reference.md` — API endpoints, parameters, responses, examples
- `docs/api/integration-guide.md` — How to integrate with the software
- `docs/api/changelog.md` — Version history and breaking changes

**README essentials:**
1. Project name and one-line description
2. Key features (bullet list)
3. Quick start / installation
4. Basic usage example
5. Links to full documentation
6. License and contributing info

## Output Destination

Documentation can be output to two destinations:

### docs/ Folder (Default)
Create organized markdown files in the project's `docs/` directory. Follow the file structures described above. Always create the directory if it doesn't exist.

### Notion
When the user chooses Notion as the output destination:
1. Ask which Notion page or database to write to using the Notion MCP search tool
2. Create pages using the Notion MCP create-pages tool
3. Organize with clear headings and structure
4. Link related pages together

If Notion MCP is not available, fall back to the docs/ folder and inform the user.

## Fresh vs Update Mode

### Fresh Generation
Generate documentation from scratch by analyzing the full codebase. Overwrite existing doc files if present (confirm with user first).

### Update Mode
Use `git diff` to identify what changed since docs were last generated:
1. Run `git diff --name-only HEAD~N` or compare against a tag/commit
2. Identify which documentation sections are affected by the changes
3. Update only the relevant sections
4. Add changelog entries if applicable

The user may also manually specify what changed instead of relying on git diff.

## Excluded Directories

Skip these directories when analyzing codebases:
- `node_modules/`, `vendor/`, `dist/`, `build/`, `.git/`
- `__pycache__/`, `.venv/`, `venv/`, `.tox/`
- `.next/`, `.nuxt/`, `out/`, `coverage/`
- Any directory in `.gitignore`

## Using Context7

When generating documentation, use Context7 MCP to look up library-specific documentation conventions:
1. Resolve library IDs with `mcp__context7__resolve-library-id`
2. Query docs with `mcp__context7__query-docs` for accurate API descriptions
3. Ensure documented APIs match actual library signatures

If Context7 MCP is not available, proceed using codebase analysis and existing knowledge to document APIs accurately.

This is especially valuable for external/API documentation accuracy.

## Tone and Audience

Adjust documentation tone based on the type:
- **Inline** — Terse, technical, assumes deep familiarity with the codebase
- **High-level** — Professional, clear, assumes familiarity with the domain but not the codebase internals
- **Internal** — Practical, step-oriented, assumes a new team member audience
- **External** — Welcoming, thorough, assumes no prior knowledge of the project

## Documentation Quality

After generating documentation, verify:
1. All referenced files, functions, and endpoints actually exist in the codebase
2. Parameter types and return types match actual signatures
3. No placeholder text remains (e.g., "TODO", "TBD")
4. Cross-references between documents are consistent
5. For languages with doc-tests (Python doctests, Rust doc tests), ensure examples are runnable

## Additional Resources

### Reference Files

For detailed conventions and templates:
- **`references/language-conventions.md`** — Complete docstring/comment conventions for all major languages
- **`references/doc-templates.md`** — Skeleton templates for architecture.md, README.md, setup-guide.md, and API reference
