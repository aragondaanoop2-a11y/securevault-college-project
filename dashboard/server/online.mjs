import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dashboardDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const distDir = resolve(dashboardDir, 'dist');
const localOrigin = 'http://127.0.0.1:8787';
const bundledCloudflared = resolve(dashboardDir, 'tools/cloudflared.exe');
let cloudflared = process.env.CLOUDFLARED_PATH || 'cloudflared.exe';
let tunnelProcess;
let serverProcess;
let stopping = false;

const stop = () => {
  if (stopping) return;
  stopping = true;
  if (serverProcess && serverProcess.exitCode === null) serverProcess.kill();
  if (tunnelProcess && tunnelProcess.exitCode === null) tunnelProcess.kill();
};

const waitForTunnelUrl = (child) => new Promise((resolveUrl, reject) => {
  let output = '';
  let settled = false;
  const timer = setTimeout(() => finish(new Error('Timed out waiting for the temporary public URL.')), 60_000);
  const finish = (error, url) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    if (error) reject(error);
    else resolveUrl(url);
  };
  const inspect = (chunk) => {
    const message = chunk.toString();
    process.stdout.write(message);
    output += message;
    const match = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
    if (match) finish(null, match[0]);
    if (output.length > 12000) output = output.slice(-6000);
  };
  child.stdout.on('data', inspect);
  child.stderr.on('data', inspect);
  child.once('error', (error) => finish(new Error(`Could not start cloudflared: ${error.message}`)));
  child.once('exit', (code) => finish(new Error(`cloudflared exited before creating a link (code ${code ?? 'unknown'}).`)));
});

const waitForServer = async () => {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (serverProcess.exitCode !== null) throw new Error('The SecureVault server stopped during startup.');
    try {
      const response = await fetch(`${localOrigin}/auth/session`, { signal: AbortSignal.timeout(1200) });
      if (response.ok) return;
    } catch {}
    await delay(400);
  }
  throw new Error('SecureVault did not start at 127.0.0.1:8787. Check whether port 8787 is already in use.');
};

try {
  await access(resolve(distDir, 'index.html'));
  if (!process.env.CLOUDFLARED_PATH) {
    try {
      await access(bundledCloudflared);
      cloudflared = bundledCloudflared;
    } catch {}
  }
  tunnelProcess = spawn(cloudflared, ['tunnel', '--url', localOrigin], { cwd: dashboardDir, stdio: ['ignore', 'pipe', 'pipe'] });
  const publicUrl = await waitForTunnelUrl(tunnelProcess);

  serverProcess = spawn(process.execPath, [resolve(dashboardDir, 'server/auth-server.mjs')], {
    cwd: dashboardDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      HOST: '127.0.0.1',
      PORT: '8787',
      SECUREVAULT_APP_URL: publicUrl,
      SECUREVAULT_ALLOWED_ORIGINS: publicUrl,
    },
  });
  serverProcess.once('error', (error) => { console.error(`Could not start SecureVault: ${error.message}`); stop(); });
  serverProcess.once('exit', (code) => { if (!stopping) { console.error(`SecureVault stopped (code ${code ?? 'unknown'}).`); stop(); } });

  await waitForServer();
  console.log('\nSecureVault is online at:');
  console.log(publicUrl);
  console.log('Sign in with an account created by the administrator. Keep this window open while using the link.');
  console.log('This temporary link is reachable by anyone who has the URL; the SecureVault login still protects the dashboard.');
  console.log('The physical ESP32 is not included in this tunnel. Press Ctrl+C to stop the online link.\n');

  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  await new Promise((resolveDone) => {
    const finish = () => resolveDone();
    tunnelProcess.once('exit', finish);
    serverProcess.once('exit', finish);
  });
} catch (error) {
  console.error(`\nSecureVault online launcher: ${error.message}`);
  stop();
  process.exitCode = 1;
}
