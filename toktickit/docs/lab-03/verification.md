# Lab 3 integrated verification record

Verification date: **2026-09-24** (Asia/Bangkok). Base commit: `d8c0e0829c4bd163157a9b4bfed4eb92c7b65f5f` (`lab3-staging`). Results include uncommitted Feature 14 evidence-test and documentation changes.

## Environment and isolation

- Windows PowerShell; Node 24.14.0; npm 11.9.0; Prisma 5.22.0; Vitest 2.1.9; Playwright 1.63.0; Chromium; Vite 6.4.3.
- API tests used only the verified `localhost:5432/toktickit_test` target.
- E2E used only `toktickit_e2e_test`, API port 3001, client port 5174 and `toktickit-attachments-test-e2e-*` temporary storage.
- Migration verification created only guarded `toktickit_feature10_*_test` databases, then removed them. It exercised a fresh chain and a representative Lab 2 upgrade without mutating development.
- No `.env` value or credential is recorded here. No development migration, seed, reset or cleanup was run.

## Results

- Prisma validate/generate: passed.
- Server build: passed. Client production build: passed (49 modules).
- Server: **176 passed, 1 justified legacy skip** across 14 files.
- Client: **55 passed, 0 skipped** across 15 files.
- Migration/seed harness: passed `API-MIG-01` and `API-SEED-01`, including attachment bytes, IDs/relationships/timestamps, edited-value invariance, case-insensitive email collision rollback and fresh deployment.
- Browser discovery selected Lab 2 and Lab 3 specs. The initial unchanged suite passed **46/46** with no skips. A new evidence test then exposed two locator-only harness errors; both were corrected. The final complete suite passed **47/47 with no skips**.
- Responsive browser assertions passed at 375×812, 768×1024 and 1440×900. Keyboard focus, modal trap/restoration, plain-text rendering and mutation error recovery passed.

## Evidence reviewed

All images were captured from the isolated real client/API/database stack and visually inspected on 2026-09-24. Password fields are blank and no cookie or secret is shown.

- [Authentication](../../artifacts/lab-03/screenshots/desktop-authentication.png)
- [Password change](../../artifacts/lab-03/screenshots/desktop-password-change.png)
- [Requester ticket detail](../../artifacts/lab-03/screenshots/desktop-requester-ticket-detail.png)
- [Staff queue](../../artifacts/lab-03/screenshots/desktop-staff-queue.png)
- [Staff operational detail](../../artifacts/lab-03/screenshots/desktop-staff-ticket-detail.png)
- [Administrator user management](../../artifacts/lab-03/screenshots/desktop-administrator-users.png)
- [Mobile administrator layout](../../artifacts/lab-03/screenshots/mobile-administrator-users.png)
- Machine-readable final browser result: `../../artifacts/lab-03/results/e2e-final.json`

## Defects and limitations

No product contract defect was reproduced after integrated review. The only Feature 14 corrections were to the new evidence automation: it initially treated the Change Password button as a link and expected the ticket number in the requester-detail heading. Those harness locators were corrected and are not product defects.

The original Lab 3 handout was not available in the workspace, so handout-only report, packaging, grading or submission requirements are unverified. Chromium is the only browser verified. This is automated and AI-assisted review, not independent human approval or a complete accessibility certification.

## Three-role demonstration checklist

1. Requester: sign in; if prompted, replace the temporary password; create a ticket with a synthetic attachment; open its detail; add a public comment; mark it as appearing resolved.
2. Staff: find that ticket in Ticket Queue; claim it; set IT priority; transition status; add a public comment and a confidential internal note; confirm requester-visible and staff-only content boundaries and the documented resolution reset.
3. Administrator: create/edit a synthetic user; reset its temporary password and confirm old sessions stop working; test deactivation on a non-self account; demonstrate the self/last-admin safeguards. Remove or deactivate only synthetic demonstration accounts according to the agreed cleanup procedure.

Human reviewers should use synthetic data, avoid displaying passwords, and record their own identity/date/comments separately.
