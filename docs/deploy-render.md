# Deploy SecureVault to Render

Render provides a stable `onrender.com` address, so users can visit the dashboard while your PC is off. The deployment runs the Node authentication server and serves the built dashboard from the same web service.

## Create the service

1. Push this project to a public GitHub repository.
2. Sign in to Render and connect the GitHub account that owns the repository.
3. Choose **New → Blueprint**, then select the SecureVault repository and approve the resources described in `render.yaml`.
4. Review the plan and persistent-disk charges shown in Render before confirming. The blueprint uses the paid `0.5c-512mb` web-service plan and a 1 GB persistent disk. At current published rates, that is about US$7.25/month before tax or any usage charges. The disk keeps account data through restarts and deploys.
5. Wait for the first deploy to finish, then open the service's stable `onrender.com` URL.
6. Find the generated first-admin temporary password in the service's private logs, sign in, and change it. Add the intended users from the Users page.

The Render service initializes a new account store on its persistent disk. Local accounts in `dashboard/.auth-data/` are deliberately ignored by Git and are not copied to the hosted service.

## Optional password-reset email

Add `RESEND_API_KEY` and `SECUREVAULT_EMAIL_FROM` as private environment variables in the Render service settings. The server uses Render's public service URL for reset links. Never place these values in `render.yaml`, source files, or GitHub.

## Firmware

The ESP32 is not exposed by this web deployment. Configure it separately on your network. Copy `firmware/src/secrets.example.h` to `firmware/src/secrets.h` and enter your local Wi-Fi and device credentials. The actual `secrets.h` is excluded from Git.
