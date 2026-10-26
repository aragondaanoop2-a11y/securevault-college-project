# SecureVault account access

The dashboard now uses a server-backed sign-in instead of a browser-only password screen. The authentication server stores salted password hashes, issues HttpOnly session cookies, restricts account creation to the administrator, and keeps account records in `dashboard/.auth-data/accounts.json`.

## Run locally

From the `dashboard` folder, run this in PowerShell (the `.cmd` form avoids PowerShell's script-policy block):

```powershell
npm.cmd run dev:auth
```

This starts the Vite dashboard at `http://127.0.0.1:5173` and the local authentication server on port `8787`. On first launch, the server prints a one-time administrator email and temporary password. Sign in with those details and choose a new password; the temporary password is not printed again. Keep the terminal output private.

The server creates normal user accounts from the administrator's **Users** page. It returns a randomly generated temporary password once; share it privately with the user. They must change it at first sign-in. Admin and user accounts use the same login page. Only the administrator can see the Users page or manage accounts.

## Password recovery

Reset links are sent through Resend. Configure these environment variables on the authentication server (never in `VITE_*` variables or browser code):

```text
RESEND_API_KEY=<server-side sending key>
SECUREVAULT_EMAIL_FROM=SecureVault <no-reply@your-domain.example>
SECUREVAULT_APP_URL=https://your-public-domain.example
SECUREVAULT_ALLOWED_ORIGINS=https://your-public-domain.example
```

The sender domain must be authorized with your email provider. Without these settings, the Forgot password screen asks the person to contact the administrator. Password reset links expire after 30 minutes and can be used once.

## Hosting

This is a Node application, not a static-only site. Build the dashboard with `npm run build`, then run the authentication server with `NODE_ENV=production` behind a hosting provider's HTTPS reverse proxy. Set `PORT` if the host supplies one. Keep `dashboard/.auth-data` on persistent private storage; losing it removes the accounts. Store email credentials and the initial administrator password in the host's secret settings.

The login protects the dashboard account area. Before connecting a public deployment to a real ESP32, put device requests behind a separately authenticated HTTPS service; the current firmware's HTTP/WebSocket interface is intended for the local project network.
