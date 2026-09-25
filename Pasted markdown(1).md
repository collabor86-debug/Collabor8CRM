# COLLABOR8 CRM — ONE-DAY PRODUCTION BUILD

You are building the **Collabor8 CRM**, an internal CRM for managing a coworking-space business.

Your goal is to produce a **working MVP today**, not a theoretical architecture.

## IMPORTANT WORKING RULES

1. Do not give long explanations.
2. Do not write tutorials unless specifically requested.
3. Do not repeatedly explain what you are going to do.
4. Inspect the existing project before changing anything.
5. Reuse existing business logic, fields, terminology and UI concepts wherever practical.
6. Do NOT rebuild features that already work unless they need architectural/security improvement.
7. Work incrementally and keep the project runnable after every phase.
8. Do not generate unnecessary files.
9. Do not install unnecessary libraries.
10. Prefer simple React code over complex architecture.
11. Do not use Redux unless absolutely necessary.
12. Do not introduce Firebase.
13. Do not introduce MongoDB.
14. Do not introduce Express unless absolutely required.
15. Backend must use Netlify Functions.
16. Persistent business data must use Google Sheets.
17. Documents must NOT be stored as Base64 inside Google Sheets.
18. Use Google Drive for uploaded documents and store only document metadata/reference in Google Sheets.
19. Never expose Google credentials to the React frontend.
20. Never expose SESSION_SECRET to the frontend.
21. Never put private API credentials inside frontend JavaScript.
22. Do not create fake revenue or fake historical data.
23. Do not hardcode calculated business values where they should come from Google Sheets.
24. Do not delete existing useful functionality without a replacement.
25. Do not spend tokens explaining obvious code.
26. When a phase is complete, give only a short status and continue to the next phase if possible.
27. Do not stop after creating the UI. The important workflows must actually work.
28. Do not ask unnecessary questions. Make reasonable decisions from the existing project and this specification.
29. If an existing implementation conflicts with this specification, preserve the business requirement but improve the technical implementation.
30. Keep the implementation suitable for a small internal coworking CRM.

---

# 1. TECHNOLOGY STACK

Use:

Frontend:

- React
- React Router
- CSS or the existing styling system
- Existing visual design where practical

Backend:

- Netlify Functions

Database:

- Google Sheets

Document storage:

- Google Drive

Hosting:

- Netlify

Authentication:

- Server-side authentication through Netlify Functions
- Secure HttpOnly session cookie

Do not replace this stack.

---

# 2. EXISTING PROJECT

The existing Collabor8 CRM contains the functional baseline.

Existing functionality includes:

- Dashboard
- Floor/cabin management
- Occupants
- Add Occupant
- Vacated Clients
- Virtual Office
- Usage & Bookings
- Payments
- Invoices
- Revenue
- Alerts
- Documents
- Sales
- Quotations
- Data Sync
- Settings
- Admin/Staff access concepts

The existing project also contains business concepts such as:

- First Floor
- Second Floor
- Third Floor
- Cabin IDs
- Seat capacity
- Occupied/Vacant
- Occupant
- Company
- Monthly rent
- Deposit
- Advance
- Parking
- GST
- Lease start/end
- Documents
- Leads
- Quotations
- Payments
- Invoices
- Virtual Office
- Day Pass
- Conference Room
- Event Hall

Preserve these concepts.

Do not invent a completely different CRM.

---

# 3. MAIN APPLICATION STRUCTURE

Create:

```text
src/
  components/
  pages/
  services/
  hooks/
  context/
  utils/
  constants/
  App.jsx
  main.jsx

netlify/
  functions/

```

Keep components reasonably small.

Do not split every tiny element into a separate file.

---

# 4. MAIN PAGES

Create these pages:

```text
/dashboard
/floors
/occupants
/vacated
/virtual-office
/bookings
/payments
/invoices
/revenue
/alerts
/documents
/sales
/quotations
/add-occupant
/data-sync
/settings

```

Use protected routes.

---

# 5. SIDEBAR

Use a professional CRM sidebar.

Sections:

## OPERATIONS

Dashboard

Seating & Floors

Occupants

Vacated Clients

Virtual Office

Usage & Bookings

## FINANCE

Payments

Invoices

Revenue

## MANAGEMENT

Alerts

Documents

Sales Pipeline

Quotations

## SYSTEM

Data Sync

Settings

Logout

Do not overload the sidebar with unnecessary items.

---

# 6. DASHBOARD

Create a clean business dashboard.

Top KPI cards:

```text
Total Seats
Occupied Seats
Vacant Seats
Occupancy %
Monthly Revenue
Outstanding Amount

```

Second area:

```text
Floor Occupancy

```

Show:

```text
First Floor
Second Floor
Third Floor

```

with:

- total seats
- occupied seats
- vacant seats
- occupancy percentage

Charts:

```text
Occupancy
Revenue Trend

```

IMPORTANT:

Revenue charts must use actual payment/invoice data from Google Sheets.

Do NOT generate fake historical revenue.

Additional dashboard sections:

```text
Payment Alerts
Lease Expiry Alerts
Recent Occupants

```

---

# 7. SEATING & FLOORS

Support:

```text
First Floor
Second Floor
Third Floor

```

Each floor should show:

- total seats
- occupied seats
- vacant seats
- occupancy percentage
- cabin count

Provide:

```text
Search
All
Occupied
Vacant
Add Cabin

```

Cabin cards/grid should show:

```text
Cabin ID
Seat capacity
Status

```

Clicking a cabin opens a modal.

Modal:

```text
Cabin ID
Floor
Capacity
Status
Occupant
Company
Monthly Rent

```

Actions:

```text
View Occupant
Edit
Mark Vacant

```

IMPORTANT:

Do not allow a user to manually make a leased cabin vacant while leaving the lease active.

Vacating should happen through the Vacated Client workflow.

---

# 8. OCCUPANTS

Main table:

```text
Client
Company
Cabin
Seats
Rent
Lease End
Payment
Documents
Status
Actions

```

Do not put too many columns into the table.

Clicking an occupant opens a profile.

Profile sections:

```text
Client Details
Contact Details
Company Details

LEASE
Cabin
Seats
Start Date
End Date
Lock-in

FINANCIAL
Monthly Rent
GST
Deposit
Advance
Parking

PAYMENTS
Paid
Pending
Overdue

DOCUMENTS
Aadhaar
PAN
GST Certificate
NOC
Agreement

```

Statuses:

```text
Active
Expiring
Expired

```

---

# 9. ADD OCCUPANT

Use a simple 5-step workflow.

## Step 1 — Space

```text
Floor
Cabin
Seats

```

Only show available cabins.

## Step 2 — Client

```text
Full Name *
Company *
Phone *
Email
Address
GSTIN
State

```

## Step 3 — Lease

```text
Start Date *
End Date *
Monthly Rent *
Security Deposit
Advance
Parking
Escalation %

```

## Step 4 — Documents

```text
Aadhaar
PAN
GST Certificate
NOC
Signed Agreement

```

Upload documents to Google Drive.

## Step 5 — Review

Show:

```text
Client
Company
Cabin
Seats
Rent
Deposit
Advance
Parking
GST
Total

```

Button:

```text
Save Lease

```

After successful save:

1. Create occupant
2. Assign cabin
3. Update cabin status
4. Save documents
5. Create audit entry
6. Refresh dashboard

All operations must use backend validation.

---

# 10. FINANCIAL CALCULATION

Create one centralized calculation utility.

Do not calculate money separately in multiple components.

Calculation:

```text
Base Rent
+
Parking
+
Other Charges
=
Subtotal

Subtotal × GST %
=
GST

Subtotal + GST
=
Grand Total

```

Use the same calculation everywhere.

---

# 11. PAYMENTS

Payment statuses:

```text
PAID
PARTIAL
DUE
OVERDUE
WAIVED

```

Payment fields:

```text
Payment ID
Occupant ID
Invoice ID
Billing Month
Base Amount
Parking Amount
Other Charges
GST Rate
GST Amount
Total Amount
Due Date
Paid Date
Payment Method
Transaction Reference
Status
Notes
Created At
Updated At

```

Payment methods:

```text
UPI
Bank Transfer
Cash
Cheque
Other

```

Never silently overwrite important payment history.

---

# 12. INVOICES

Invoice statuses:

```text
DRAFT
SENT
PARTIALLY PAID
PAID
CANCELLED

```

Invoice fields should support:

```text
Invoice Number
Invoice Date
Buyer Name
Buyer GSTIN
Buyer State
Agreement Reference
Invoice Period
HSN
Items
Subtotal
GST Rate
CGST
SGST
Total
Payment Status

```

Actions:

```text
View
Edit
Print
Download PDF
Download Excel
Record Payment
Cancel

```

Do not create fake invoice data.

---

# 13. REVENUE

Show:

```text
Monthly Revenue
Collected
Outstanding
GST Collected
Parking Revenue
Virtual Office Revenue
Day Pass Revenue
Conference Revenue
Event Hall Revenue

```

Revenue should come from actual records.

Do not use mathematical assumptions to generate historical revenue.

---

# 14. VACATED CLIENTS

Create a proper vacating workflow:

```text
Active Client
      ↓
Start Vacating
      ↓
Check Outstanding
      ↓
Enter Damage
      ↓
Enter Unpaid Amount
      ↓
Calculate Settlement
      ↓
Review
      ↓
Confirm Vacated

```

Calculate:

```text
Deposit
+
Advance
-
Unpaid Amount
-
Damage
-
Other Deductions
=
Final Refund / Final Settlement

```

When confirmed:

1. Mark occupant inactive
2. Release cabin
3. Preserve occupant history
4. Move record into Vacated Clients
5. Save settlement
6. Create audit log

Never permanently delete the client's financial history.

---

# 15. VIRTUAL OFFICE

Fields:

```text
Client
Company
Contact
Email
Address
Plan
Start Date
End Date
Annual Fee
GST
Total
Renewal Date
Status
Payment
Documents

```

Statuses:

```text
Active
Expiring
Expired

```

---

# 16. USAGE & BOOKINGS

Booking types:

```text
Day Pass
Conference Room
Event Hall

```

Fields:

```text
Booking ID
Customer
Company
Phone
Email
Type
Date
Start Time
End Time
People
Space
Amount
GST
Payment Status
Booking Status
Notes

```

Booking statuses:

```text
BOOKED
CONFIRMED
COMPLETED
CANCELLED
NO-SHOW

```

Show:

```text
Today's Bookings
Upcoming
Completed
Pending Payments

```

---

# 17. SALES PIPELINE

Stages:

```text
NEW
CONTACTED
FOLLOW-UP
QUOTATION
NEGOTIATION
CONVERTED
LOST

```

Lead sources:

```text
Cold Call
Instagram
Facebook
Google
LinkedIn
WhatsApp
Website
Agency
Justdial
Referral
Walk-in
Other

```

Lead fields:

```text
Lead ID
Name
Company
Phone
Email
Source
Agency Name
Required Seats
Budget
Expected Start Date
Stage
Next Follow-up
Notes
Created At
Updated At

```

Provide:

```text
Search
Filter
Add Lead
Edit Lead
Move Stage

```

---

# 18. QUOTATIONS

Support:

```text
Quotation Number
Date
Lead
Company
Seats
Cabin
Base Rent
Parking
Other Charges
GST
Total
Valid Until
Status
Notes

```

Statuses:

```text
DRAFT
SENT
ACCEPTED
REJECTED
EXPIRED

```

---

# 19. DOCUMENT STORAGE

CRITICAL:

Do NOT store document Base64 data in Google Sheets.

Use:

```text
Google Drive

```

for actual files.

Google Sheets should contain only metadata:

```text
Document ID
Occupant ID
Document Type
File Name
Google Drive File ID
Google Drive URL
Uploaded By
Uploaded At
Status

```

Allowed document types:

```text
Aadhaar
PAN
GST Certificate
NOC
Agreement
Other

```

Allowed file types:

```text
PDF
JPG
JPEG
PNG

```

Maximum file size:

```text
5 MB

```

Validate files on the backend.

---

# 20. GOOGLE SHEETS

Create/maintain these tabs:

```text
users
settings
cabins
occupants
vacated_clients
payments
invoices
virtual_office
bookings
leads
quotations
documents
audit_logs

```

Use consistent IDs.

Example:

```text
OCC-0001
PAY-0001
INV-0001
LEAD-0001
BOOK-0001
DOC-0001

```

---

# 21. IMPORTANT GOOGLE SHEETS RULE

Do not expose Google Sheets credentials to React.

React:

```text
React
 ↓
Netlify Function
 ↓
Google Sheets

```

NOT:

```text
React
 ↓
Google Sheets

```

All sensitive operations must go through Netlify Functions.

---

# 22. API DESIGN

Create a simple API/service layer.

Operations should support:

```text
GET
CREATE
UPDATE
DELETE

```

for appropriate resources.

Resources:

```text
auth
cabins
occupants
vacated
payments
invoices
bookings
virtual-office
leads
quotations
documents
settings
audit

```

Use consistent JSON:

Success:

```json
{
  "success": true,
  "data": {}
}

```

Error:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "User-friendly message"
  }
}

```

---

# 23. AUTHENTICATION

Implement:

```text
Login
Session Check
Logout

```

Use:

```text
HttpOnly
Secure
SameSite

```

session cookie.

Session must expire.

Never store authentication secrets in localStorage.

Never store plaintext passwords.

---

# 24. ROLES

Support:

```text
ADMIN
STAFF

```

Suggested permissions:

| FeatureADMINSTAFF |     |         |
| ----------------- | --- | ------- |
| Dashboard         | Yes | Yes     |
| Floors            | Yes | Yes     |
| Occupants         | Yes | Yes     |
| Add Occupant      | Yes | Yes     |
| Vacate            | Yes | Yes     |
| Virtual Office    | Yes | Yes     |
| Bookings          | Yes | Yes     |
| Payments          | Yes | Yes     |
| Invoices          | Yes | Yes     |
| Alerts            | Yes | Yes     |
| Documents         | Yes | Limited |
| Sales             | Yes | Yes     |
| Revenue           | Yes | No      |
| Data Sync         | Yes | No      |
| User Management   | Yes | No      |
| Settings          | Yes | Limited |

IMPORTANT:

Hiding a menu item is NOT security.

Netlify Functions must check the authenticated user's role before performing restricted operations.

---

# 25. ENVIRONMENT VARIABLES

Server-side only:

```text
GOOGLE_SERVICE_ACCOUNT_EMAIL
GOOGLE_PRIVATE_KEY
GOOGLE_SHEET_ID
GOOGLE_DRIVE_FOLDER_ID
SESSION_SECRET
SITE_URL

```

Never expose these through React.

---

# 26. AUDIT LOG

Create:

```text
audit_logs

```

Fields:

```text
ID
Timestamp
User ID
Username
Action
Entity
Entity ID
Old Value
New Value

```

Log important actions:

```text
Login
Logout
Create
Update
Vacate
Payment
Invoice
Document Upload
Delete
Settings Change

```

Do not log sensitive document contents or passwords.

---

# 27. SECURITY REQUIREMENTS

Before considering the application complete, verify:

- No Google credentials in frontend
- No service account private key in frontend
- No SESSION_SECRET in frontend
- No plaintext passwords
- HttpOnly session cookie
- Secure cookie
- Session expiry
- Backend authorization
- Role validation
- Request validation
- File type validation
- File size validation
- No sensitive data in URL parameters
- No sensitive data in console logs
- CORS restricted
- Destructive actions require confirmation
- Financial records should be cancelled/voided instead of silently deleted
- Audit logs for important operations

---

# 28. UI DESIGN

Preserve the existing Collabor8 CRM visual identity.

Use:

- Dark CRM interface
- Existing gold/teal/violet accent system
- Clean cards
- Rounded corners
- Subtle borders
- Compact professional tables
- Clear status badges

Do not redesign into a completely different visual identity.

---

# 29. RESPONSIVE DESIGN

Desktop:

```text
Sidebar
+
Main Content

```

Mobile:

```text
Top Navigation
+
Content

```

Tables must be responsive.

On mobile, use cards or horizontal scrolling where appropriate.

Do not allow the entire page to overflow horizontally.

---

# 30. COMPONENTS

Create reusable components for:

```text
Sidebar
Topbar
MetricCard
StatusBadge
DataTable
SearchBar
FilterBar
Modal
ConfirmDialog
Toast
LoadingState
EmptyState
Pagination
FormField
DateField
CurrencyField

```

Do not duplicate the same UI code across every page.

---

# 31. ERROR HANDLING

Never leave the user with a blank screen.

Show:

```text
Loading...

```

while loading.

Show:

```text
No records found

```

when empty.

Show toast messages:

```text
Success
Warning
Error

```

Do not use browser alert() for normal application notifications.

Use confirmation dialogs for destructive actions.

---

# 32. DATA VALIDATION

Validate required fields.

Examples:

```text
Phone
Email
GSTIN
Date
Rent
Deposit
Seats
Invoice amount

```

Prevent:

```text
Negative rent
Negative seats
End date before start date
Duplicate cabin IDs
Duplicate invoice numbers
Duplicate payment IDs
Assigning occupied cabin

```

---

# 33. DATA CONSISTENCY

When assigning a cabin:

Backend must check the latest cabin state.

If already occupied:

```text
Reject operation.

```

Do not trust the frontend's availability status.

When vacating:

```text
Occupant status → inactive
Cabin status → vacant

```

These operations must remain consistent.

---

# 34. DO NOT OVERENGINEER

This is a one-day MVP.

Do NOT add:

- Microservices
- Redux
- Docker
- Kubernetes
- Firebase
- MongoDB
- PostgreSQL
- GraphQL
- WebSockets
- Complex state-management frameworks
- Unnecessary animations
- AI features
- Payment gateway integration unless already available
- Unnecessary third-party services

Keep it simple.

---

# 35. ONE-DAY IMPLEMENTATION ORDER

Work in this exact order.

## PHASE 1 — FOUNDATION

Build:

```text
React setup
Routing
Global layout
Sidebar
Topbar
Theme
Responsive structure
API service
Authentication

```

Then make sure the application runs.

---

## PHASE 2 — CORE OPERATIONS

Build:

```text
Dashboard
Floors
Occupants
Add Occupant
Vacated Clients

```

Test this workflow:

```text
Cabin
 ↓
Occupant
 ↓
Lease
 ↓
Cabin becomes occupied
 ↓
Dashboard updates
 ↓
Vacate
 ↓
Cabin becomes vacant

```

---

## PHASE 3 — FINANCE

Build:

```text
Payments
Invoices
Revenue

```

Test:

```text
Occupant
 ↓
Invoice
 ↓
Payment
 ↓
Revenue
 ↓
Dashboard

```

---

## PHASE 4 — BUSINESS OPERATIONS

Build:

```text
Virtual Office
Bookings
Sales
Quotations

```

---

## PHASE 5 — SUPPORT

Build:

```text
Documents
Alerts
Data Sync
Settings
Audit Logs

```

---

# 36. TOKEN-SAVING RULE

Claude Free token usage is important.

Therefore:

DO NOT output the entire project repeatedly.

When modifying an existing file:

1. Read the file.
2. Identify the exact section.
3. Modify only what is necessary.
4. Do not rewrite unrelated files.
5. Do not paste huge files into chat unless necessary.
6. Prefer targeted edits.
7. Reuse existing components and styles.
8. Keep responses short.
9. Do not explain every line.
10. After implementation, report only:

- changed files
- completed feature
- test result
- next phase

---

# 37. TEST AFTER EACH PHASE

After every phase:

```text
npm run build

```

Fix build errors immediately.

Then test the relevant workflow.

Do not continue building on top of broken code.

---

# 38. FINAL TEST

Before declaring the project complete, test:

### Authentication

```text
Login
Logout
Session expiry
Admin
Staff

```

### Seating

```text
View floor
Add cabin
Edit cabin
Search cabin
Assign cabin
Vacate cabin

```

### Occupants

```text
Create
View
Edit
Search
Filter

```

### Finance

```text
Invoice
Payment
Revenue

```

### Documents

```text
Upload
View

```

### Sales

```text
Lead
Stage
Quotation

```

### Bookings

```text
Create
Edit
Complete
Cancel

```

### Security

```text
Staff cannot access Admin-only API
Google credentials not exposed
Session protected

```

---

# 39. DEFINITION OF DONE

The project is considered complete for today's MVP only when:

```text
✓ React application runs
✓ Netlify build succeeds
✓ Login works
✓ Logout works
✓ Dashboard works
✓ Floors work
✓ Cabins work
✓ Occupants work
✓ Add Occupant works
✓ Vacating works
✓ Payments work
✓ Invoices work
✓ Revenue uses real data
✓ Virtual Office works
✓ Bookings work
✓ Sales works
✓ Quotations work
✓ Documents use Google Drive
✓ Google Sheets stores CRM data
✓ Admin/Staff permissions work
✓ Backend authorization works
✓ Audit logs work
✓ Responsive layout works
✓ No frontend secrets
✓ No fake business data
✓ No major console errors

```

---

# 40. START NOW

First inspect the existing project.

Do not immediately rewrite everything.

Determine:

1. What files currently exist.
2. What functionality can be reused.
3. What needs to move into React.
4. What needs to move into Netlify Functions.
5. What existing Google Sheets structure can be preserved.
6. What authentication code can be preserved.
7. What needs to be replaced for security.

Then begin **PHASE 1**.

Do not give me a long explanation.

Start by creating the React foundation and application shell, then continue phase-by-phase toward the working MVP.