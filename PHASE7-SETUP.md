# Collabor8 Phase 7

## Added
- Maintenance & helpdesk tickets
- Inventory & asset register
- Vendor directory
- Operating expense register (Admin)
- Automation preferences (Admin)
- Server-side email notification endpoint (optional Resend)
- Server-side WhatsApp notification endpoint (optional Twilio WhatsApp)
- PWA manifest + service worker shell for install/offline UI caching
- New Google Sheets tabs: `maintenance`, `inventory`, `vendors`, `expenses`, `automation`, `integrations`

## Optional environment variables
Existing Phase 1-6 variables remain required.

### Email
`RESEND_API_KEY`
`RESEND_FROM`

### WhatsApp
`TWILIO_ACCOUNT_SID`
`TWILIO_AUTH_TOKEN`
`TWILIO_WHATSAPP_FROM`

### Future payment gateway
`RAZORPAY_KEY_ID`
`RAZORPAY_KEY_SECRET`

Do not put provider secrets in frontend JavaScript or Google Sheets.

## Notes
- Phase 7 does not fabricate successful external delivery. If provider credentials are absent, the UI reports that the integration is not configured.
- Expense, automation and integration settings are Admin-only.
- Maintenance, inventory and vendors are available to authenticated staff and admins.
