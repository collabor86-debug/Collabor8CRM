# COLLABOR8 — Vercel Deployment

## 1. GitHub
Push this project to the GitHub repository connected to Vercel.

## 2. Vercel project
Import the repository into Vercel.

Use the repository root as the Root Directory.

No build command is required. The project is vanilla HTML/CSS/JS plus Vercel Node.js Functions under `api/`.

## 3. Environment variables
Add these in Vercel Project Settings → Environment Variables:

Required:
- GOOGLE_SERVICE_ACCOUNT_EMAIL
- GOOGLE_PRIVATE_KEY
- GOOGLE_SHEET_ID
- SESSION_SECRET
- COLLABOR8_ADMIN_USERNAME
- COLLABOR8_ADMIN_PASSWORD
- COLLABOR8_STAFF_USERNAME
- COLLABOR8_STAFF_PASSWORD

Optional:
- GOOGLE_DRIVE_FOLDER_ID
- RESEND_API_KEY
- RESEND_FROM
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN
- TWILIO_WHATSAPP_FROM
- RAZORPAY_KEY_ID
- RAZORPAY_KEY_SECRET

Apply the required variables to Production and Preview as needed. Redeploy after changing variables.

## 4. Google Sheets
The Google service account must have Editor access to the spreadsheet identified by GOOGLE_SHEET_ID.

Required sheet tabs used by Collabor8 include:
- users
- cabins
- occupants
- payments
- invoices
- leads
- quotations
- virtual_office
- bookings
- documents
- settings
- audit_logs
- vacated_clients
- maintenance
- inventory
- vendors
- expenses
- automation
- integrations

## 5. Google Drive
If GOOGLE_DRIVE_FOLDER_ID is set, uploaded documents are stored in that Drive folder. Otherwise the service account's Drive is used.

## 6. Quick health check
After deployment, open:

`/api/health`

Expected response:

`{"success":true,"service":"collabor8","platform":"vercel",...}`

## 7. Authentication test
Open the root site in a private/incognito window and test:
- Login
- Refresh
- Logout
- 10-minute inactivity timer
- Session expiry

## 8. Do not commit secrets
Never put Google private keys, passwords, session secrets, Resend keys, Twilio keys, or payment secrets in GitHub.
