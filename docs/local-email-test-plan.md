# Local Email Testing Plan

This document explains how to test the automated reporting system locally using **MailHog** or **Gmail**.

## 1. Testing with MailHog (Local Dev Sink)

MailHog is a developer tool that catches all outgoing emails and displays them in a web interface. It is included in the project's `docker-compose.yml`.

### Setup
Ensure your `.env` file has the following settings (default in `.env.example`):
```env
EMAIL_PROVIDER=smtp
SMTP_HOST=mailhog
SMTP_PORT=1025
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_USE_STARTTLS=false
SMTP_FROM=reports@querylite.ai
```

### How to use
1. Run the stack: `docker compose up -d`
2. Open the MailHog Web UI: [http://localhost:8025](http://localhost:8025)
3. Trigger a scheduled report (or wait for one to run).
4. Any emails sent by the system will appear instantly in the MailHog inbox.

---

## 2. Testing with Gmail (Real Send)

To send real emails through Gmail, you must use an **App Password**.

### Requirements
- A Gmail account with **2-Step Verification** enabled.
- An **App Password** generated from your Google Account Security settings.

### Setup
Update your `.env` file with these settings:
```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USE_STARTTLS=true
SMTP_USERNAME=your-account@gmail.com
SMTP_PASSWORD=your-16-character-app-password
SMTP_FROM=your-account@gmail.com
```

---

## 3. Troubleshooting

### Host vs Container
- **Inside Docker**: When the backend runs in Docker, use `SMTP_HOST=mailhog` to talk to the MailHog service on the same network.
- **On Local Host**: If you are running the backend manually outside of Docker (e.g., `uvicorn`), set `SMTP_HOST=localhost`.

### Connection Refused
- Ensure the MailHog container is running: `docker ps | grep mailhog`.
- Check that port `1025` is mapped correctly in `docker-compose.yml`.

### Gmail Authentication Error
- Ensure you are using a **16-character App Password**, NOT your regular Gmail password.
- Verify that `SMTP_USE_STARTTLS` is set to `true`.
