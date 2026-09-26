# COLLABOR8 CRM — Security & Bug Audit
Date: 2026-09-26
Scope: Uploaded `collabor8CRM-main` source archive. Static code review plus JavaScript/config parse checks.

## Executive result

The codebase has a workable server-side architecture, but the original version had several security and data-integrity weaknesses that should be fixed before treating it as a hardened production CRM.

**Security posture before fixes: approximately 4.5/10.**
**Security posture after the fixes in this package: approximately 7.2/10.**

The rating is a code-review estimate, not a penetration-test certification.

## High-impact issues fixed

1. **Session verification accepted a missing SESSION_SECRET**
   - `_session.js` previously used an empty secret when the environment variable was missing.
   - It now fails closed and validates the session role against an allow-list.

2. **Authenticated users could read sensitive Sheets**
   - `settings` and `audit_logs` GET access was not restricted.
   - These reads are now Admin-only.

3. **Audit log direct overwrite**
   - The generic Sheet Store could be used to write `audit_logs`.
   - Direct audit-log writes are now blocked; application audit functions remain responsible for logging.

4. **Document download IDOR**
   - Any authenticated user could request a Drive file by arbitrary Google Drive file ID.
   - Downloads now require the file ID to exist in the CRM's `documents` sheet.

5. **State-changing cross-origin requests**
   - Added same-origin validation for state-changing backend requests.
   - Logout is now POST-only.

6. **Financial invoice mass-assignment**
   - `updateInvoice` previously copied arbitrary request properties onto an invoice, allowing fields such as IDs/status/payment values to be altered.
   - It now updates only an explicit allow-list of invoice-editable fields.

7. **Weak user creation validation**
   - Usernames and passwords now have basic validation, including an 8-character minimum password.

8. **Frontend raw HTML injection points**
   - Floor/cabin quick-view rendering now escapes cabin/floor values before inserting them into HTML.

9. **Empty-sheet synchronization bug**
   - Empty Sheets could leave stale/default frontend data because some arrays were only replaced when the returned array had rows.
   - Cabin/document/settings synchronization now correctly handles an empty sheet as an empty dataset.

10. **Security response headers**
    - Added `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and HSTS in `vercel.json`.

11. **Spreadsheet parser dependency**
    - Updated the browser SheetJS reference from `xlsx 0.18.5` to the official SheetJS `0.20.3` standalone build.
    - SheetJS documents 0.20.3 as the current standalone browser version and identifies 0.18.5 as the outdated npm-registry version. See:
      https://docs.sheetjs.com/docs/getting-started/installation/standalone/
    - The 0.18.5 release has been associated with prototype-pollution and ReDoS advisories when parsing crafted workbooks. This matters because the CRM parses uploaded Excel files.

12. **jsPDF**
    - Updated the browser reference from 2.5.1 to 4.1.0.
    - jsPDF's current security page states that only the latest major/minor versions are supported; the 4.0.0 release also fixed a critical Node.js path-traversal/local-file-inclusion issue.

## Important remaining risks

### 1. Google Sheets is being used as a whole-table database
The application frequently reads an entire sheet, modifies the in-memory array, clears the sheet, and writes it back.

This creates:
- lost-update risk when two users save simultaneously;
- weak transactional guarantees;
- large-sheet performance degradation;
- a larger blast radius for a buggy client.

This is the biggest architectural risk remaining.

### 2. Generic Sheet Store still permits broad dataset replacement
Authenticated users can submit an entire array for several CRM sheets. Authentication and sheet-level role restrictions exist, but the API is still effectively a bulk-replacement API.

A hardened version should move toward:
- server-side record validation;
- record-level create/update/delete operations;
- immutable server-controlled IDs;
- server-controlled audit fields;
- optimistic concurrency/version checks.

### 3. No durable login rate limiting
The authentication endpoint has no Redis/database-backed rate limiter or account lockout policy.

For an internet-facing CRM, add:
- IP + username throttling;
- exponential backoff;
- optional temporary lockout;
- monitoring/alerting.

### 4. Excel/PDF/image libraries are loaded from third-party CDNs
The app loads several browser libraries from external CDNs. The SheetJS version was updated, but a production deployment should preferably vendor critical assets locally and use Subresource Integrity where appropriate.

### 5. Frontend contains many dynamic `innerHTML` renderers
The obvious floor/cabin injection points were fixed, but the application contains many dynamic HTML renderers.

For long-term hardening:
- use `textContent` for plain text;
- use DOM APIs for interactive elements;
- centralize escaping;
- avoid inline `onclick` handlers;
- add a strict Content Security Policy after removing inline event handlers.

### 6. Automated tests are missing
The project contains no meaningful automated unit/integration/security test suite in the supplied archive.

At minimum add tests for:
- login/session expiry;
- role authorization;
- sheet permissions;
- invoice creation/update/payment;
- document authorization;
- user management;
- malicious Excel uploads;
- cross-origin POST rejection;
- empty-sheet synchronization;
- concurrent updates.

## Validation performed

- `node --check app.js` — passed.
- `node --check` on backend function files — passed.
- `node --check` on API wrapper files — passed.
- `vercel.json` JSON parse — passed.
- Static scan for hardcoded API/private-key patterns — no obvious embedded secrets found.
- Static scan identified 76 `innerHTML` uses in `app.js`; only the most obvious raw floor/cabin values were changed in this pass.

## Rating breakdown after fixes

| Area | Rating |
|---|---:|
| Authentication/session handling | 8/10 |
| Authorization/role enforcement | 7/10 |
| Data protection / IDOR resistance | 7.5/10 |
| Input validation | 6.5/10 |
| XSS resistance | 6/10 |
| API/CSRF protection | 7.5/10 |
| Auditability | 7/10 |
| Dependency security | 7/10 |
| Data integrity/concurrency | 5/10 |
| Automated security testing | 3/10 |
| **Overall code-review estimate** | **7.2/10** |

## Production hardening priority

**P0 — do next**
1. Replace whole-sheet writes with record-level APIs + concurrency/version checks.
2. Add durable authentication rate limiting.
3. Finish the XSS audit of every dynamic HTML renderer.
4. Add automated authorization/security tests.
5. Verify the deployed Vercel environment variables and rotate any credentials that may ever have been exposed.

**P1**
6. Vendor or integrity-protect third-party browser libraries.
7. Add centralized input schemas for every API endpoint.
8. Add structured security logging and monitoring.
9. Add backup/versioning strategy for Google Sheets.

## Important limitation

This package has been statically audited and corrected for identifiable issues in the supplied source. It has **not** been subjected to a live penetration test, browser compatibility test across real devices, production Google API test, or concurrent-user load test. Therefore I would not claim that literally every bug has been eliminated.
