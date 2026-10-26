import { createServer } from 'node:http';
import { promises as fs } from 'node:fs';
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const scrypt = promisify(scryptCallback);
const projectDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const dataDir = resolve(process.env.SECUREVAULT_DATA_DIR || resolve(projectDir, '.auth-data'));
const storePath = resolve(dataDir, 'accounts.json');
const distDir = resolve(projectDir, 'dist');
const production = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || (production ? '0.0.0.0' : '127.0.0.1');
const sessionTtlMs = 8 * 60 * 60 * 1000;
const rememberTtlMs = 14 * 24 * 60 * 60 * 1000;
const sessions = new Map();
const limits = new Map();
const resetTtlMs = 30 * 60 * 1000;
let store = { users: [], resets: [] };

const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  ...(process.env.SECUREVAULT_ALLOWED_ORIGINS || '').split(',').map((value) => value.trim()).filter(Boolean),
]);
const configuredAppUrl = process.env.SECUREVAULT_APP_URL || process.env.RENDER_EXTERNAL_URL;
if (configuredAppUrl) allowedOrigins.add(configuredAppUrl.replace(/\/$/, ''));

const passwordHash = async (password, salt = randomBytes(16).toString('hex')) => ({
  salt,
  hash: (await scrypt(password, salt, 64)).toString('hex'),
});

const checkPassword = async (password, salt, expectedHex) => {
  const actual = await scrypt(password, salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
};

const saveStore = async () => {
  await fs.mkdir(dataDir, { recursive: true });
  const tempPath = `${storePath}.${process.pid}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(store, null, 2), { mode: 0o600 });
  await fs.rename(tempPath, storePath);
};

const initialize = async () => {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    store = JSON.parse(await fs.readFile(storePath, 'utf8'));
    if (!Array.isArray(store.users) || !Array.isArray(store.resets)) throw new Error('Invalid auth store');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    store = { users: [], resets: [] };
  }

  const existingAdmin = store.users.find((user) => user.role === 'admin');
  const configuredAdminEmail = process.env.SECUREVAULT_ADMIN_EMAIL?.trim().toLowerCase();
  if (existingAdmin && configuredAdminEmail && existingAdmin.email !== configuredAdminEmail) {
    if (store.users.some((user) => user.email === configuredAdminEmail && user.id !== existingAdmin.id)) {
      throw new Error('SECUREVAULT_ADMIN_EMAIL is already assigned to another account.');
    }
    existingAdmin.email = configuredAdminEmail;
    await saveStore();
  }

  if (!existingAdmin) {
    const email = configuredAdminEmail || 'admin@securevault.local';
    const suppliedPassword = process.env.SECUREVAULT_ADMIN_PASSWORD;
    const initialPassword = suppliedPassword || randomBytes(18).toString('base64url');
    const pass = await passwordHash(initialPassword);
    store.users.push({
      id: randomBytes(12).toString('hex'),
      email,
      name: 'SecureVault Admin',
      role: 'admin',
      active: true,
      mustChangePassword: !suppliedPassword,
      passwordSalt: pass.salt,
      passwordHash: pass.hash,
      createdAt: new Date().toISOString(),
    });
    await saveStore();
    console.log('\nSecureVault first administrator created');
    console.log(`Email: ${email}`);
    console.log(`Temporary password: ${initialPassword}`);
    console.log('Sign in and choose a new password. This password is shown only during first setup.\n');
  }
};

const json = (response, status, payload, headers = {}) => {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  response.end(JSON.stringify(payload));
};

const getCookies = (request) => Object.fromEntries((request.headers.cookie || '').split(';').map((part) => {
  const separator = part.indexOf('=');
  return separator < 0 ? ['', ''] : [part.slice(0, separator).trim(), decodeURIComponent(part.slice(separator + 1).trim())];
}));

const safeRequest = (request) => {
  const origin = request.headers.origin;
  if (origin && !allowedOrigins.has(origin.replace(/\/$/, ''))) return false;
  return request.headers['content-type']?.includes('application/json');
};

const readJson = async (request) => {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 16_384) throw new Error('Request is too large');
  }
  return body ? JSON.parse(body) : {};
};

const sessionFor = (request) => {
  const token = getCookies(request).sv_session;
  if (!token) return null;
  const session = sessions.get(token);
  if (!session || session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }
  const user = store.users.find((item) => item.id === session.userId && item.active);
  return user ? { token, session, user } : null;
};

const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  active: user.active,
  mustChangePassword: user.mustChangePassword,
  createdAt: user.createdAt,
});

const requireUser = (request, response) => {
  const current = sessionFor(request);
  if (!current) {
    json(response, 401, { error: 'Please sign in to continue.' });
    return null;
  }
  return current;
};

const checkRate = (key, max, windowMs) => {
  const now = Date.now();
  const old = limits.get(key);
  const record = !old || now - old.startedAt >= windowMs ? { startedAt: now, count: 0 } : old;
  record.count += 1;
  limits.set(key, record);
  return record.count <= max;
};

const clearUserSessions = (userId, keepToken = '') => {
  for (const [token, session] of sessions) {
    if (session.userId === userId && token !== keepToken) sessions.delete(token);
  }
};

const setSessionCookie = (response, token, maxAgeSeconds) => {
  const secure = production ? '; Secure' : '';
  response.setHeader('Set-Cookie', `sv_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSeconds}${secure}`);
};

const expireSessionCookie = (response) => {
  response.setHeader('Set-Cookie', `sv_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${production ? '; Secure' : ''}`);
};

const sendResetEmail = async (user, token) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.SECUREVAULT_EMAIL_FROM;
  const appUrl = (process.env.SECUREVAULT_APP_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5173').replace(/\/$/, '');
  if (!apiKey || !from) return false;

  const resetUrl = `${appUrl}/?reset=${encodeURIComponent(token)}`;
  const escapedName = user.name.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const result = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [user.email],
      subject: 'Reset your SecureVault password',
      html: `<p>Hello ${escapedName},</p><p>Use the link below to choose a new SecureVault password. It expires in 30 minutes.</p><p><a href="${resetUrl}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>`,
    }),
  });
  return result.ok;
};

const mimeTypes = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json', '.json': 'application/json; charset=utf-8',
};

const serveStatic = async (request, response, pathname) => {
  if (!production || (request.method !== 'GET' && request.method !== 'HEAD')) return json(response, 404, { error: 'Not found' });
  const decoded = decodeURIComponent(pathname);
  const candidate = resolve(distDir, `.${decoded}`);
  if (candidate !== distDir && !candidate.startsWith(`${distDir}${sep}`)) return json(response, 404, { error: 'Not found' });
  let filePath = candidate;
  try {
    if (!(await fs.stat(filePath)).isFile()) throw new Error('Not a file');
  } catch {
    filePath = resolve(distDir, 'index.html');
  }
  try {
    const content = await fs.readFile(filePath);
    response.writeHead(200, { 'Content-Type': mimeTypes[extname(filePath)] || 'application/octet-stream', 'Cache-Control': filePath.endsWith('index.html') ? 'no-cache' : 'public, max-age=3600' });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch {
    json(response, 404, { error: 'Build the dashboard before starting the production server.' });
  }
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', 'http://localhost');
    const path = url.pathname;

    if (path.startsWith('/auth/')) {
      if (request.method !== 'GET' && !safeRequest(request)) return json(response, 403, { error: 'This request was rejected.' });

      if (path === '/auth/session' && request.method === 'GET') {
        const current = sessionFor(request);
        return json(response, 200, { user: current ? publicUser(current.user) : null });
      }

      if (path === '/auth/login' && request.method === 'POST') {
        const body = await readJson(request);
        const email = String(body.email || '').trim().toLowerCase();
        const limitKey = `${request.socket.remoteAddress}:${email}`;
        if (!checkRate(limitKey, 8, 15 * 60 * 1000)) return json(response, 429, { error: 'Too many sign-in attempts. Please wait and try again.' });
        const user = store.users.find((item) => item.email === email);
        const valid = user ? await checkPassword(String(body.password || ''), user.passwordSalt, user.passwordHash) : false;
        if (!user || !valid || !user.active) return json(response, 401, { error: 'Email or password is incorrect.' });
        const token = randomBytes(32).toString('base64url');
        const ttl = body.remember ? rememberTtlMs : sessionTtlMs;
        sessions.set(token, { userId: user.id, expiresAt: Date.now() + ttl });
        setSessionCookie(response, token, Math.floor(ttl / 1000));
        return json(response, 200, { user: publicUser(user) });
      }

      if (path === '/auth/logout' && request.method === 'POST') {
        const current = sessionFor(request);
        if (current) sessions.delete(current.token);
        expireSessionCookie(response);
        return json(response, 200, { ok: true });
      }

      if (path === '/auth/password/change' && request.method === 'POST') {
        const current = requireUser(request, response);
        if (!current) return;
        const body = await readJson(request);
        const password = String(body.password || '');
        if (password.length < 12) return json(response, 400, { error: 'Use at least 12 characters for your new password.' });
        const pass = await passwordHash(password);
        current.user.passwordSalt = pass.salt;
        current.user.passwordHash = pass.hash;
        current.user.mustChangePassword = false;
        await saveStore();
        clearUserSessions(current.user.id, current.token);
        return json(response, 200, { user: publicUser(current.user) });
      }

      if (path === '/auth/password/forgot' && request.method === 'POST') {
        const body = await readJson(request);
        const email = String(body.email || '').trim().toLowerCase();
        if (!checkRate(`reset:${request.socket.remoteAddress}:${email}`, 3, 60 * 60 * 1000)) return json(response, 429, { error: 'Please wait before requesting another reset email.' });
        const user = store.users.find((item) => item.email === email && item.active);
        if (user) {
          const token = randomBytes(32).toString('base64url');
          store.resets = store.resets.filter((item) => item.userId !== user.id);
          store.resets.push({ userId: user.id, tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: Date.now() + resetTtlMs });
          await saveStore();
          const sent = await sendResetEmail(user, token);
          if (!sent) return json(response, 503, { error: 'Password reset email is not configured yet. Ask the administrator for help.' });
        }
        return json(response, 200, { message: 'If the account is active, password reset instructions have been sent.' });
      }

      if (path === '/auth/password/reset' && request.method === 'POST') {
        const body = await readJson(request);
        const tokenHash = createHash('sha256').update(String(body.token || '')).digest('hex');
        const reset = store.resets.find((item) => item.tokenHash === tokenHash && item.expiresAt > Date.now());
        const password = String(body.password || '');
        if (!reset) return json(response, 400, { error: 'This reset link is invalid or expired. Request a new one.' });
        if (password.length < 12) return json(response, 400, { error: 'Use at least 12 characters for your new password.' });
        const user = store.users.find((item) => item.id === reset.userId && item.active);
        if (!user) return json(response, 400, { error: 'This reset link is invalid or expired. Request a new one.' });
        const pass = await passwordHash(password);
        user.passwordSalt = pass.salt;
        user.passwordHash = pass.hash;
        user.mustChangePassword = false;
        store.resets = store.resets.filter((item) => item !== reset);
        await saveStore();
        clearUserSessions(user.id);
        return json(response, 200, { message: 'Password changed. You can now sign in.' });
      }

      if (path === '/auth/users' && request.method === 'GET') {
        const current = requireUser(request, response);
        if (!current) return;
        if (current.user.role !== 'admin') return json(response, 403, { error: 'Administrator access is required.' });
        return json(response, 200, { users: store.users.map(publicUser) });
      }

      if (path === '/auth/users' && request.method === 'POST') {
        const current = requireUser(request, response);
        if (!current) return;
        if (current.user.role !== 'admin') return json(response, 403, { error: 'Administrator access is required.' });
        const body = await readJson(request);
        const email = String(body.email || '').trim().toLowerCase();
        const name = String(body.name || '').trim();
        if (!/^\S+@\S+\.\S+$/.test(email) || !name) return json(response, 400, { error: 'Enter a name and valid email address.' });
        if (store.users.some((item) => item.email === email)) return json(response, 409, { error: 'An account with that email already exists.' });
        const temporaryPassword = randomBytes(15).toString('base64url');
        const pass = await passwordHash(temporaryPassword);
        const user = { id: randomBytes(12).toString('hex'), email, name, role: 'user', active: true, mustChangePassword: true, passwordSalt: pass.salt, passwordHash: pass.hash, createdAt: new Date().toISOString() };
        store.users.push(user);
        await saveStore();
        return json(response, 201, { user: publicUser(user), temporaryPassword });
      }

      const activeMatch = path.match(/^\/auth\/users\/([a-f0-9]+)\/active$/);
      if (activeMatch && request.method === 'PATCH') {
        const current = requireUser(request, response);
        if (!current) return;
        if (current.user.role !== 'admin') return json(response, 403, { error: 'Administrator access is required.' });
        const body = await readJson(request);
        const target = store.users.find((item) => item.id === activeMatch[1] && item.role === 'user');
        if (!target) return json(response, 404, { error: 'User account not found.' });
        target.active = Boolean(body.active);
        if (!target.active) clearUserSessions(target.id);
        await saveStore();
        return json(response, 200, { user: publicUser(target) });
      }

      return json(response, 404, { error: 'Authentication route not found.' });
    }

    return serveStatic(request, response, path);
  } catch (error) {
    console.error('SecureVault server request failed:', error?.message || error);
    if (!response.headersSent) json(response, 500, { error: 'The request could not be completed.' });
    else response.end();
  }
});

await initialize();
server.listen(port, host, () => {
  console.log(`SecureVault authentication server listening at http://${host}:${port}${production ? '' : ' (local only)'}`);
});

const shutdown = () => server.close(() => process.exit(0));
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
