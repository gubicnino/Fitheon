// PostToolUse hook: after an edit under packages/ or tools/, runs the Vitest suites related to that file.
// Exit code 2 sends the failure output back to Claude; anything else lets the edit stand silently.
import { spawnSync } from 'node:child_process';
import path from 'node:path';

let raw = '';
for await (const chunk of process.stdin) raw += chunk;

let filePath = '';
try {
  const input = JSON.parse(raw);
  filePath = input.tool_input?.file_path ?? input.tool_response?.filePath ?? '';
} catch {
  process.exit(0);
}
if (!filePath) process.exit(0);

// Vitest fails on this machine when the working directory has a lowercase drive letter.
const upperDrive = p => p.replace(/^[a-z]:/, d => d.toUpperCase());
const root = upperDrive(path.resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd()));
const absolute = upperDrive(path.resolve(root, filePath));
const relative = path.relative(root, absolute).replaceAll('\\', '/');

if (!/^(packages|tools)\/.+\.ts$/.test(relative)) process.exit(0);

const result = spawnSync(
  process.execPath,
  [path.join(root, 'node_modules', 'vitest', 'vitest.mjs'), 'related', relative, '--run'],
  { cwd: root, encoding: 'utf8' },
);

if (result.status !== 0) {
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
  console.error(`Tests related to ${relative} failed:\n${output.slice(-6000)}`);
  process.exit(2);
}
