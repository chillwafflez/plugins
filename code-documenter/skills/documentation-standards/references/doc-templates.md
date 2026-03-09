# Documentation Templates

Skeleton templates for each documentation output file. Use these as starting structures and fill in based on codebase analysis.

## architecture.md

```markdown
# Architecture

## System Overview

[1-2 paragraph summary of what the system does, its primary purpose, and high-level approach]

## Component Breakdown

### [Component Name]

**Purpose:** [What this component does]
**Location:** `[directory/path]`
**Key files:**
- `[file.ext]` — [purpose]

**Responsibilities:**
- [Responsibility 1]
- [Responsibility 2]

[Repeat for each major component]

## Data Flow

[Describe how data moves through the system, from input to output]

1. [Step 1: e.g., "User submits request via REST API"]
2. [Step 2: e.g., "Controller validates input and delegates to service layer"]
3. [Step 3: ...]

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| [e.g., Frontend] | [e.g., React 18] | [e.g., UI rendering] |
| [e.g., Backend] | [e.g., Node.js + Express] | [e.g., API server] |
| [e.g., Database] | [e.g., PostgreSQL] | [e.g., Persistent storage] |

## Deployment

[Describe deployment topology if applicable — hosting, CI/CD, environments]
```

## README.md

```markdown
# [Project Name]

[One-line description of what this project does]

## Features

- [Key feature 1]
- [Key feature 2]
- [Key feature 3]

## Quick Start

### Prerequisites

- [Runtime/tool] v[version]+
- [Other dependency]

### Installation

\`\`\`bash
[install commands]
\`\`\`

### Usage

\`\`\`bash
[basic usage example]
\`\`\`

## Documentation

- [Architecture](docs/architecture.md)
- [Setup Guide](docs/internal/setup-guide.md)
- [API Reference](docs/api/reference.md)
- [Contributing](docs/internal/contributing.md)

## License

[License type]
```

## setup-guide.md

```markdown
# Setup Guide

## Prerequisites

- [Language runtime] v[minimum version]
- [Package manager]
- [Database/service] (if required)
- [Other tools]

## Getting Started

### 1. Clone the Repository

\`\`\`bash
git clone [repo-url]
cd [project-name]
\`\`\`

### 2. Install Dependencies

\`\`\`bash
[install command]
\`\`\`

### 3. Configure Environment

Copy the example environment file:

\`\`\`bash
cp .env.example .env
\`\`\`

Required environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `[VAR_NAME]` | [Description] | `[example value]` |

### 4. Run Locally

\`\`\`bash
[start command]
\`\`\`

The application will be available at [URL/port].

### 5. Run Tests

\`\`\`bash
[test command]
\`\`\`

## Troubleshooting

### [Common Issue 1]

**Symptom:** [What the user sees]
**Solution:** [How to fix it]
```

## api/reference.md

```markdown
# API Reference

## Base URL

\`\`\`
[base URL or how to determine it]
\`\`\`

## Authentication

[Describe auth mechanism — API keys, JWT, OAuth, etc.]

## Endpoints

### [Resource Name]

#### [HTTP Method] [Path]

[Brief description]

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `[param]` | `[type]` | Yes/No | [Description] |

**Request Body:**

\`\`\`json
{
  "[field]": "[type/example]"
}
\`\`\`

**Response:**

\`\`\`json
{
  "[field]": "[type/example]"
}
\`\`\`

**Status Codes:**

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad request |
| 404 | Not found |

[Repeat for each endpoint]

## Error Format

\`\`\`json
{
  "error": {
    "code": "[error_code]",
    "message": "[Human-readable message]"
  }
}
\`\`\`
```
