import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const children = [
  spawn(process.execPath, [resolve(projectDir, 'server/auth-server.mjs')], { cwd: projectDir, stdio: 'inherit', env: process.env }),
  spawn(process.execPath, [resolve(projectDir, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1'], { cwd: projectDir, stdio: 'inherit', env: process.env }),
];

let shuttingDown = false;
const shutdown = (code = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) if (!child.killed) child.kill();
  setTimeout(() => process.exit(code), 150).unref();
};

for (const child of children) {
  child.on('error', (error) => { console.error(error.message); shutdown(1); });
  child.on('exit', (code) => { if (!shuttingDown) shutdown(code || 0); });
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
