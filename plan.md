# plan.md — KSeF Invoicing App (FastAPI + MongoDB + React)

## 1) Objectives
- Deliver a **full-stack** invoicing system (PL/EN) with **persistent storage**, **per-user isolation**, audit/history, and a **KSeF 2.0 simulation** that mirrors: session → send FA XML → KSeF number → UPO.
- Provide **production-grade UX** for a Polish invoicing SaaS: dense but readable tables, fast navigation, consistent status badges, live preview, and print-ready A4.
- Keep KSeF integration **pluggable**: simulation now, swap to real KSeF 2.0 client later without breaking DB/UI models.
- Ensure correctness of Polish domain logic: **NIP validation**, invoice numbering schemes, **VAT grouping**, **MPP** threshold logic, and **kwota słownie**.

**Current status (high level):**
- Phase 1 POC ✅ complete (32/32 tests passed).
- Phase 2 backend ✅ complete (CRUD + dashboard + reports + tools + demo seeding; verified via curl).
- Phase 2 frontend ✅ complete (all pages + auth + widgets + invoice editor + live A4 preview; verified via screenshots).
- Phase 2 E2E testing 🔄 in progress (testing_agent_v3).

## 2) Implementation Steps

### Phase 1 — Core POC (isolation, must pass 100% before app build)
**Goal:** prove hardest workflow: (auth session + per-user scoping) + (invoice math + FA XML) + (KSeF simulation send→UPO).

**User stories (POC)**
1. As a developer, I can run one script that registers/logs in a user and receives a session_token.
2. As a user, I can create a company and invoice scoped to my user_id and never see another user’s data.
3. As a user, invoice numbering auto-increments by scheme and period.
4. As a user, VAT totals are correct and grouped by VAT rate.
5. As a user, I can “send to KSeF” and receive a KSeF reference number and UPO XML.

**Steps (completed)**
- Backend skeleton (FastAPI `/api`, Mongo via `MONGO_URL`, db name from env), collections + indexes.
- Unified auth/session design:
  - `users` with custom `user_id`, normalized email, optional `password_hash`, `auth_provider`.
  - `user_sessions` with opaque `session_token`, `expires_at` (UTC aware), `created_at`.
  - Endpoints: `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me` (cookie first, then Bearer).
  - Seed admin/test identities; docs: `/app/memory/test_credentials.md` + `/app/auth_testing.md`.
- Core business logic module (`core/`):
  - `validate_nip()` checksum.
  - `generate_invoice_number()` with per-company/per-period counters.
  - `amount_in_words_pl()` with PLN grammar.
  - `calculate_vat_groups(items)` supporting rates: 23/8/5/0/ZW/NP/OO.
  - MPP auto-flag when gross > 15000 PLN.
- KSeF simulation module (`ksef/`):
  - Generate FA XML (schema-aligned structure sufficient for later real validation).
  - Simulated KSeF number format + simulated UPO XML payload.
  - Abstraction: `KsefClient` interface with `SimulationKsefClient` implementation.
- Minimal CRUD proof + strict projection `{"_id": 0}`.
- `poc_test.py` script: validates all above + per-user isolation.

**Testing agent gate:** ✅ passed (POC 32/32).

### Phase 2 — V1 Full App (backend + modular React, all sections)
**Goal:** ship a working end-to-end app with all required sections, PL/EN toggle, dark mode, audit/history, and KSeF simulation wired into UI.

**User stories (V1)**
1. As a user, I can register/login with email+password and stay logged in via secure cookies or Bearer token fallback.
2. As a user, I can login with Google and land directly on the dashboard.
3. As a user, I can create an invoice in a full-screen modal with live A4 preview and correct totals.
4. As a user, I can browse/filter invoices/expenses/clients and quickly find what I need.
5. As a user, I can send an invoice to KSeF (simulated) and see the KSeF number + UPO saved and visible.

**Backend build-out (completed + verified)**
- Complete user-scoped REST APIs:
  - Companies, Clients, Invoices (CRUD + status + duplicate + send KSeF), Expenses, Templates (CRUD + issue), Settings.
  - Dashboard aggregation endpoint (`/api/dashboard/summary`).
  - Reports: revenue, VAT/JPK helper, costs, ledger, export-all JSON.
  - Tools: validate-nip, amount-in-words, VAT calc, scheme preview, GUS lookup (sim), KSeF test.
- Audit log:
  - `audit_events` collection + embedded per-invoice `history[]`.
- Invoice domain rules:
  - “Przeterminowana” computed on read (effective_status).
  - Duplicate invoice endpoint.
  - KSeF send saves: KSeF number, UPO XML, hash, timestamps.
- Google auth (Emergent):
  - Frontend redirect to `https://auth.emergentagent.com/?redirect=<origin>`.
  - `AuthCallback` extracts `#session_id` and calls backend `/api/auth/google/session`.
  - Backend exchanges with `https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data`.
- Demo data seeding per user on register/login.
- Admin seeded: `admin@faktura.pl` / `Admin123!`.

**Frontend (completed + verified by screenshots)**
- Foundation:
  - `api` client with cookie + Bearer fallback; formatters (PL money/date), NIP validation, VAT helpers, amount-in-words.
  - Contexts: Theme (dark mode), I18n (PL/EN), Auth, AppData store.
  - UI kit primitives: Button/Input/Select/Modal/Tabs/Badge/Checkbox/Switch.
- Layout:
  - AppShell with dark sidebar (240px) + responsive mobile drawer.
  - Topbar: Ctrl+K entry, Notifications bell, language toggle PL/EN, theme toggle, user menu.
- Charts:
  - Bar chart (revenue vs expenses, 6 months), pie chart donut, financial health gauge.
- Widgets:
  - NotificationsBell (overdue/upcoming/cyclic), CommandPalette (Ctrl+K), floating VAT calculator.
- Invoices:
  - Invoice list with filters/search/sort and actions.
  - Fullscreen InvoiceEditorModal (two-column form + live A4 preview; VAT summary grouped; MPP banner).
  - InvoiceDetailModal with KSeF panel (UPO show/download), history timeline, print.
  - A4InvoicePreview (print CSS supported).
- Forms:
  - Client (NIP validation + GUS lookup), Company (multi bank accounts + scheme preview), Expense (scan upload UI), Template (cyclic settings).
- Pages:
  - Login/Register (with Google button), Dashboard, Invoices, Expenses, Clients, Companies, Templates, Reports (tabs + CSV export), Settings (tabs + export/import).
- i18n: PL/EN toggle; dark mode across the app.

**Testing agent gate:** 🔄 in progress
- Run full E2E via `testing_agent_v3`:
  - Auth (register/login, cookie/Bearer fallback).
  - CRUD flows across all major entities.
  - Invoice creation → totals/preview → KSeF send → UPO visible.
  - Reports load and CSV exports.
  - Settings (theme/lang/export/import).
  - Command palette + VAT widget + notifications presence.
- Fix any failures and re-run until green.

### Phase 3 — Extras + polish (production UX)
**Goal:** raise UX quality, ensure strict adherence to the provided design system, and complete remaining “spec extras” with regression coverage.

**User stories (Extras/Polish)**
1. As a user, Ctrl+K command palette feels complete: create/search across invoices/clients/expenses quickly.
2. As a user, notifications are accurate (overdue/upcoming/cyclic) and actionable.
3. As a user, cyclic invoices have clearer scheduling UX (preview next issue, manual “issue now”, upcoming list).
4. As a user, print/PDF output is consistent and clean.
5. As a user, exports (CSV/JSON) are accountant-friendly and stable.

**Steps**
- Cyclic invoices UX:
  - Add “planned issues” list derived from template `frequency/first_date`.
  - Add “Issue now” + “Mark as issued” interactions.
- Reports polish:
  - Expand CSV exports where needed; ensure locale formatting and stable columns.
- Design pass:
  - Ensure full compliance with `/app/design_guidelines.md` across every page (spacing, hover/focus, dense tables).
  - Dark mode visual QA.
- Accessibility pass:
  - aria-label for icon-only buttons, keyboard navigation, focus rings.
- **Testing agent gate:** regression across all flows.

### Phase 4 — Real KSeF 2.0 integration (post-token)
**Goal:** replace simulation with real KSeF 2.0 API calls once credentials/token are available.

**User stories (Real KSeF)**
1. As a user, I can enter a KSeF token and verify connection.
2. As a user, sending an invoice returns a **real** KSeF number and **real** UPO.
3. As a user, I can retry failed sends and see error diagnostics.
4. As a user, I can switch Test/Prod environments safely.
5. As a user, I can view transmission statuses and logs.

**Steps**
- Implement `RealKsefClient` in `ksef/client.py` (keep `KsefClient` interface unchanged).
- Token storage and environment selection:
  - Use Settings (`ksef_token`, `ksef_env`) to configure client.
- Robustness:
  - Add retries, idempotency keys, structured error logging and user-visible diagnostics.
- Testing:
  - Manual verification with provided token + automated coverage for error paths.

## 3) Next Actions
1. Run `testing_agent_v3` full E2E across login/register, CRUD flows, invoice editor + KSeF send + UPO, reports, settings, theme/lang.
2. Fix any E2E failures, re-run until fully green.
3. Phase 3 polish: cyclic scheduling UX improvements + design/accessibility pass + regression tests.
4. When a KSeF token is available: implement Phase 4 (`RealKsefClient`) and verify real UPO lifecycle.

## 4) Success Criteria
- Phase 1 ✅: `poc_test.py` passes NIP, numbering, words, VAT grouping, FA XML, KSeF simulation (KSeF id + UPO), session auth, and strict per-user isolation.
- Phase 2 ✅ (build) / 🔄 (E2E): Full app usable end-to-end with PL/EN, dark mode, all sections, history/audit, export/import, KSeF send simulated.
- Phase 3: UX polish completed (cyclic invoices UX, print quality, exports), full design guideline compliance, a11y improvements, no regressions.
- Phase 4: After token provided, real KSeF send + UPO works via pluggable client without breaking UI/DB models.
