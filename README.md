# SecureVault

SecureVault is a college project prototype for a smart vault. It includes a browser dashboard, a local authentication server, and ESP32 firmware for the hardware model.

## What's included

- A responsive dashboard with overview, device, activity, alerts, and user-management screens.
- Admin and user sign-in, password changes, and administrator-managed user accounts.
- A simulator for trying the dashboard without an ESP32.
- ESP32 firmware and a component/price reference for the physical prototype.
- A Render deployment blueprint for a stable public web address.

This is an educational prototype. Do not use it to protect real valuables, credentials, or production systems without a security review and appropriate hardware and backend changes.

## Run the dashboard locally

From `dashboard`, install the packages and start the combined local authentication and dashboard server:

```powershell
npm.cmd ci
npm.cmd run dev:auth
```

Open `http://127.0.0.1:5173`. The authentication data is saved locally under `dashboard/.auth-data/` and is intentionally excluded from Git.

To create a production build locally:

```powershell
npm.cmd run build
npm.cmd start
```

## Deploy a permanent public website

The project includes [`render.yaml`](render.yaml). Connect this public GitHub repository to Render and create a Blueprint instance from the file. It provisions a Node web service in Singapore and a persistent disk for administrator and user accounts. At the current published rate, the 512 MB always-on web service is about US$7/month and the 1 GB disk is about US$0.25/month. Review the total shown in Render before creating the service. Free web services do not support persistent disks, and their local data can be lost on restart.

After Render finishes the first deploy, open the service's `onrender.com` address. The first administrator account is initialized on that server; its one-time password appears in the private deployment logs. Sign in and change that password, then add user accounts from the Users page. The local administrator and user records are not uploaded to GitHub or copied to the new service.

Password-reset emails need `RESEND_API_KEY` and `SECUREVAULT_EMAIL_FROM` to be added as private environment variables in the hosting dashboard. Until configured, an administrator can create accounts and share their temporary passwords privately.

More details: [`docs/deploy-render.md`](docs/deploy-render.md).

## Firmware setup

Before building the firmware, copy `firmware/src/secrets.example.h` to `firmware/src/secrets.h` and set your own Wi-Fi name and password, access point password, API token, and PIN. The real `secrets.h` is ignored by Git. If you use the standalone `SecureVault_Demo.ino` sketch, copy `SecureVault_Demo.secrets.example.h` to `SecureVault_Demo.secrets.h` and enter your own access point password, RFID card UID, and PIN; that local file is ignored too. Enter the same API token in the dashboard's Settings when connecting real hardware.

