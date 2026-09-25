# Collabor8 Phase 6 setup

## Required environment variables

Existing variables remain required:
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_SHEET_ID`
- `SESSION_SECRET`

Add initial login credentials for first-time setup:
- `COLLABOR8_ADMIN_USERNAME`
- `COLLABOR8_ADMIN_PASSWORD`
- `COLLABOR8_STAFF_USERNAME`
- `COLLABOR8_STAFF_PASSWORD`

On the first successful login, the authentication function creates the `users` sheet and seeds any configured admin/staff accounts. Passwords are stored as PBKDF2 hashes, not plaintext.

## Phase 6 additions

- Server-side login/session validation
- HttpOnly signed session cookie with 8-hour lifetime
- Logout endpoint
- Admin-only Users & Roles management
- Admin-only Reports & Analytics endpoint
- Server-side role restrictions for Settings and Audit Sheets
- Existing finance/document/audit authorization retained

## Google Sheets

A `users` tab is created automatically when initial credentials are configured. Existing tabs are preserved.

## Deployment

Deploy the project directory as the Netlify site root. Do not put Google credentials in frontend JavaScript.
