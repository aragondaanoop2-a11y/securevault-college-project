# Open SecureVault from outside your home network

For a quick college-project demonstration, use the Windows launcher in `dashboard/Start SecureVault Online.cmd`.

## One-time setup

1. Install Cloudflare's Windows `cloudflared` utility from the [official downloads page](https://developers.cloudflare.com/tunnel/downloads/).
2. Open a new Command Prompt and run `cloudflared --version` to confirm it is on PATH.
3. Double-click `dashboard/Start SecureVault Online.cmd`.
4. Keep the black launcher window open. It prints the temporary public URL after the production server starts.
5. Visit that URL and sign in with a SecureVault account. The administrator can add users from the Users page.

The launcher builds the production dashboard, runs the authenticated Node server on loopback, and places a Cloudflare Quick Tunnel in front of that server. It sets the allowed browser origin to the generated URL. It does not publish the ESP32.

## Limits

Quick Tunnel URLs are temporary and change when the launcher is restarted. The link stops working when the window closes, and the computer must stay on and connected to the Internet. Anyone who learns the URL can reach the sign-in page, but must still have a SecureVault account to enter the dashboard. Share the link only with intended users. Quick Tunnels are for testing and development, not a permanent hosting service; see [Cloudflare Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).

Forgot-password email needs `RESEND_API_KEY` and `SECUREVAULT_EMAIL_FROM` configured on the server. Until then, the administrator can add users and provide their one-time temporary passwords privately. For a stable public address, move the Node server to a permanent HTTPS host with persistent storage for `dashboard/.auth-data`; a static-only Vite deployment cannot run the login server. Vite's `preview` server is also only for local preview, not production hosting ([Vite deployment guide](https://vite.dev/guide/static-deploy)).
