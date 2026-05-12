#!/usr/bin/env node
/**
 * mentor-mode UserPromptSubmit hook.
 *
 * Reads .claude/mentor-mode.local.md from the project directory. If the
 * frontmatter has `enabled: true`, emits a hookSpecificOutput JSON that
 * injects mentor-mode soft-enforcement instructions into Claude's context
 * for the upcoming turn. Otherwise emits nothing (mode is off).
 *
 * Node.js stdlib only — no npm deps. Cross-platform (Windows, macOS, Linux).
 * Targets Node 14+.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const SETTINGS_RELATIVE_PATH = path.join('.claude', 'mentor-mode.local.md');

const MENTOR_INSTRUCTIONS_TEMPLATE = (depth) => `**MENTOR MODE ACTIVE** (default depth: \`${depth}\`)

The user has enabled session-wide mentor mode in this project. Respond as a coach, not a code generator:

- Do NOT write code, file edits, or runnable snippets unless the user explicitly insists after a single push-back.
- Give hints, leading questions, and authoritative doc links instead.
- Match the configured depth:
  - \`hints\` = 2-4 bullet hints + concept names + 2-3 doc links
  - \`socratic\` = a single leading question, no hints, no docs
  - \`deep\` = thorough conceptual explanation, ASCII diagrams if useful, no runnable code
- Use Context7 MCP, WebFetch, WebSearch, GitHub MCP to cite current sources rather than relying on training data alone for library-specific details.
- Soft enforcement: if the user explicitly asks for code generation, push back ONCE — "You're in mentor-mode. Run \`/mentor-off\` if you want code generation. Want hints instead?" If they confirm, comply.

The mentor-mode plugin's \`mentor-mode\` skill (auto-activated on these triggers) contains the full response-format reference for each depth.

To exit mentor mode: run \`/mentor-mode:mentor-off\`.`;

/**
 * Parse YAML-ish frontmatter (between --- markers) into a flat object.
 * Only handles simple key: value pairs on a single line each. Sufficient
 * for our settings file format.
 */
function parseFrontmatter(content) {
  const fmMatch = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n/);
  if (!fmMatch) return {};
  const result = {};
  for (const line of fmMatch[1].split(/\r?\n/)) {
    const kv = line.match(/^\s*([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.*?)\s*$/);
    if (kv) {
      let value = kv[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      result[kv[1].toLowerCase()] = value;
    }
  }
  return result;
}

function readStdinAndDiscard() {
  return new Promise((resolve) => {
    let buf = '';
    process.stdin.on('data', (chunk) => { buf += chunk; });
    process.stdin.on('end', () => resolve(buf));
    process.stdin.on('error', () => resolve(''));
    setTimeout(() => resolve(buf), 1000).unref();
  });
}

async function main() {
  await readStdinAndDiscard();

  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const settingsPath = path.join(projectDir, SETTINGS_RELATIVE_PATH);

  let content;
  try {
    if (!fs.existsSync(settingsPath)) {
      process.exit(0);
    }
    content = fs.readFileSync(settingsPath, 'utf8');
  } catch (e) {
    process.exit(0);
  }

  const fm = parseFrontmatter(content);
  if ((fm.enabled || '').toLowerCase() !== 'true') {
    process.exit(0);
  }

  let depth = (fm.default_depth || 'deep').toLowerCase();
  if (!['hints', 'socratic', 'deep'].includes(depth)) {
    depth = 'deep';
  }

  const output = {
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: MENTOR_INSTRUCTIONS_TEMPLATE(depth),
    },
  };
  process.stdout.write(JSON.stringify(output));
  process.exit(0);
}

main().catch(() => process.exit(0));
