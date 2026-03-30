---
name: lint
description: "This skill should be used when the user asks to \"set up linting\", \"configure ruff\", \"add mypy\", \"set up pre-commit hooks\", \"fastapi lint\", \"add code quality tools\", or mentions linting, formatting, type checking, or code quality for a FastAPI/Python project."
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
---

# Set Up Linting and Code Quality Tools

Configure ruff (linting and formatting), mypy (type checking), and pre-commit hooks for a FastAPI Python project. All configuration lives in `pyproject.toml` to keep the project root clean.

## Workflow

### 1. Analyze Existing Configuration

Before generating anything, scan the project for existing tool configuration:

- Read `pyproject.toml` for any existing `[tool.ruff]`, `[tool.mypy]`, or `[tool.pytest]` sections.
- Check for standalone config files: `.ruff.toml`, `mypy.ini`, `.flake8`, `setup.cfg`.
- Check for an existing `.pre-commit-config.yaml`.
- Read the `[project.dependencies]` and `[project.optional-dependencies]` or `[tool.uv]` sections to understand the dependency management approach.

If configuration already exists for a tool, **update it** rather than overwriting. Notify the user of any conflicts with existing settings.

### 2. Add Ruff Configuration

Add or update the ruff section in `pyproject.toml`:

```toml
[tool.ruff]
target-version = "py312"
line-length = 100

[tool.ruff.lint]
select = [
    "E",      # pycodestyle errors
    "W",      # pycodestyle warnings
    "F",      # pyflakes
    "I",      # isort
    "N",      # pep8-naming
    "UP",     # pyupgrade
    "B",      # flake8-bugbear
    "SIM",    # flake8-simplify
    "ASYNC",  # flake8-async
    "S",      # flake8-bandit (security)
    "T20",    # flake8-print
    "RUF",    # ruff-specific rules
]
ignore = [
    "E501",   # line length (handled by formatter)
    "S101",   # assert usage (allowed in tests)
]

[tool.ruff.lint.per-file-ignores]
"tests/**/*.py" = ["S101", "S106"]

[tool.ruff.lint.isort]
known-first-party = ["app"]

[tool.ruff.format]
quote-style = "double"
indent-style = "space"
```

### 3. Add Mypy Configuration

Add or update the mypy section in `pyproject.toml`:

```toml
[tool.mypy]
python_version = "3.12"
strict = true
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true

plugins = []

[[tool.mypy.overrides]]
module = "tests.*"
disallow_untyped_defs = false

[[tool.mypy.overrides]]
module = ["uvicorn.*", "celery.*"]
ignore_missing_imports = true
```

If SQLAlchemy is a project dependency, add `"sqlalchemy.ext.mypy.plugin"` to the plugins list. If Pydantic is present (it will be in any FastAPI project), ensure the mypy strict mode works well with Pydantic by adding appropriate overrides.

### 4. Add Dev Dependencies

Add linting tools to the dev dependency group in `pyproject.toml`. The exact format depends on the dependency manager detected:

**For uv/pip (pyproject.toml with optional-dependencies):**
```toml
[project.optional-dependencies]
dev = [
    "ruff>=0.8.0",
    "mypy>=1.13.0",
    "pre-commit>=4.0.0",
]
```

**For uv (dependency-groups):**
```toml
[dependency-groups]
dev = [
    "ruff>=0.8.0",
    "mypy>=1.13.0",
    "pre-commit>=4.0.0",
]
```

Preserve any existing dev dependencies when adding the new ones.

### 5. Create Pre-commit Configuration

Create `.pre-commit-config.yaml` at the project root:

```yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v5.0.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files

  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.8.6
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.13.0
    hooks:
      - id: mypy
        additional_dependencies:
          - pydantic
          - fastapi
        pass_filenames: false
```

### 6. Install Pre-commit Hooks

Run the following command to install the git hooks:

```bash
uv run pre-commit install
```

If `uv` is not available, fall back to:

```bash
pre-commit install
```

If neither command succeeds (pre-commit not installed), note this in the summary and instruct the user to install dependencies first.

### 7. Run Initial Check (Optional)

After setup, run ruff against the codebase to report any existing issues:

```bash
uv run ruff check .
uv run ruff format --check .
```

Do not auto-fix unless the user explicitly requests it. Report the number of issues found so the user knows what to expect.

### Post-Generation Summary

After completing the setup, print a summary that includes:

- All files created or modified.
- The tool versions configured.
- Commands to run each tool manually:
  ```
  uv run ruff check .          # lint
  uv run ruff format .         # format
  uv run mypy .                # type check
  uv run pre-commit run --all  # run all hooks
  ```
- The number of existing lint issues found (if the initial check was run).
- A note that pre-commit hooks will now run automatically on every `git commit`.
