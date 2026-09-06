# Lab 2 review record

Review date: 2026-09-06. Review type: **AI-assisted source inspection, automated verification and screenshot inspection**. This is not human peer approval.

## Reproduced findings

| Finding | Contract/evidence | Resolution |
| --- | --- | --- |
| Built-server entry point did not exist | `npm.cmd start` failed with MODULE_NOT_FOUND; `results/start-red.txt` | Changed only the start target to `dist/src/index.js`; health and database smoke check passed on 3002. |
| Search left pagination on page 2 until debounce elapsed | UI §14.3; paused-clock browser failure | Reset page immediately; preserve the 300ms request debounce and immediate Enter behavior. |
| Desktop detail information used three columns | UI §12; computed grid assertion | Scoped detail grids to two columns, retaining one column on mobile. |
| LOW palette and HIGH border differed | UI §2.2; computed CSS failures | Applied the specified LOW colors and HIGH border. |
| Read-only icons were generic squares | UI §5.2; missing SVG checks and source inspection | Added lock/user presentation. |
| Picker lacked upload/file icons and red queue removal | UI §5.2; browser assertions | Added small semantic SVGs and accessible red removal control. |
| Initial upload failure discarded its reason | UI §5.3, AC-11; intercepted 415 response | Display the API's public message or a safe network fallback, retaining the ticket and retry destination. |
| Focus fell to the document after successful removal | UI §11, AC-32; browser active-element assertion | Restore the trigger on cancellation; after removal, focus the stable attachments heading. Strict Mode regressions introduced during the fix were caught and corrected. |
| Tablet search shared the dropdown row | UI §12; bounding-box assertions at 820 and 768 widths | Give search the first full row. |
| Mobile breadcrumb link was below 44px | UI §11; measured target at both mobile heights | Apply 44px mobile ticket-link targets. |
| Badge/section sizes and page-heading weight differed | UI §2.3; supplementary CSS RED | Corrected the reproduced values. |

Removal validation styling was investigated and already passed the red-border check. No production change was made for that candidate.

Evidence: [verification record](verification.md), [baseline RED](../../artifacts/lab-02/results/e2e-red.json), [supplemental icon RED](../../artifacts/lab-02/results/e2e-icons-red.json), [typography/focus RED](../../artifacts/lab-02/results/e2e-typography-focus-red.json), and [final E2E](../../artifacts/lab-02/results/e2e-green.json).

## Review boundaries and decisions

The approved API contract takes precedence over stale list-DTO/categories examples. Testing identity remains distinct from authentication. Removal records and private binaries may remain retained. No internal attachment storage/audit IDs were added to DTOs. No authentication, staff workflow, comments, actions taken, administration or later statuses were introduced.

Screenshots and browser checks cover the required viewport sizes, meaningful keyboard focus, mobile card behavior, long filenames, modal usability, active/removed states and selected visual tokens. This is not a certification of every browser/device or a complete accessibility audit.

## Human peer review

The Lab 2 work is reviewed by the following classmates:

| Reviewer | Student ID | GitHub username |
| --- | --- | --- |
| Thu Thu Wai | 67070503486 | `thu734` |
| Sai Bhone Myint Myat | 67070503479 | `Kerris812` |

Both reviewers participated in reviewing the Lab 2 pull requests throughout the staged development workflow.

### Pull-request review record

| Pull Request | Purpose | Review status |
| --- | --- | --- |
| PR #11 | Lab 2 engineering contract and specification documentation | Reviewed |
| PR #12 | Part 1 — Development Requester foundation | Reviewed |
| PR #14 | Part 2 — Requester ticket workflow | Reviewed |
| PR #16 | Part 3 — Requester attachments | Reviewed |
| PR #20 | Part 4 — verification, fixes, E2E tests and evidence | Merged into `lab2-staging` |
| Final `lab2-staging` → `main` PR | Final Lab 2 integration/release | Pending — PR not created yet |

The actual GitHub pull-request pages, review comments, approvals and merge history are the authoritative evidence for peer review.

### Student response to review

Reviewer feedback was considered before pull requests were merged. Where a reviewer identified a change that was required, the implementation was corrected before integration. Review discussions and approvals are retained on the corresponding GitHub pull-request pages.

PR #20 completed the Part 4 verification and delivery-evidence stage and was merged into `lab2-staging`. Final release review evidence will be recorded after the `lab2-staging` → `main` pull request is created and reviewed.

### Review boundary

The AI-assisted verification findings documented above are separate from human peer review and are not represented as human approval.