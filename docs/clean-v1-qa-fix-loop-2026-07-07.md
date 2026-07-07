# Clean V1 QA Fix Loop - 2026-07-07

## Scope

Goal: verify and harden the Sample OS Clean V1 path from style creation to review release, with Supabase persistence and S3 media persistence.

QA style used online: `QA134731`.

## Loop 1 - Test First

| Test Case | Expected Result | Actual Result | Pass / Fail | Fix / Changed File | Remaining Risk |
| --- | --- | --- | --- | --- | --- |
| Case 1: normal style creation | Create style/sample/review and return IDs before UI success | Online `create-style-fast` timed out at Vercel 10s, but the style was still inserted | Fail | `vercel.json`, `api/sampleos/create-style-fast.js` | Must redeploy and retest create response timing |
| Case 5: department review save | Opinions persist after snapshot reload | Business, QC, and process reviews persisted after reload | Pass | None needed | Existing QA row had only 5 default departments from interrupted create |
| Case 6: normal Issue | Non-blocking Issue persists and does not block shipment | `normal` Issue persisted with `shipmentBlocking=false` | Pass | None needed | None |
| Case 7: major Issue blocks Final Approval | Final Approval is rejected while blocking Issue is open | Online old backend allowed `approve_to_send` with open major Issue | Fail | `api/sampleos/sync.js`, `clean-v1/app.js` | Must redeploy and retest backend hard block |
| Case 8: close blocking Issue | Issue can move to verification and close | `pending_verification` then `closed` persisted | Pass | `clean-v1/app.js` adds UI actions | None |
| S3 upload persistence | S3 PUT succeeds, metadata persists in Supabase | Uploaded style cover, customer reference, measurement table, tech pack, BOM; all persisted with signed URLs | Pass | None for happy path | `complete-upload` needed server-side S3 existence verification |

## Loop 2 - P0 Fixes

Implemented:

- Raised Vercel API max duration from 10s to 30s.
- Parallelized default department review backfill in `create-style-fast`.
- Added frontend Final Approval panel.
- Added backend Final Approval hard blocking for open `major` / `critical` / `shipment_blocking` issues.
- Added backend Final Approval hard blocking when department reviews are not all passed.
- Added review summary audit event on final decision.
- Added Issue remediation flow: `整改完成` -> `pending_verification`, then `复核关闭` -> `closed`.
- Added S3 `HeadObject` verification before writing `sample_media` metadata.
- Removed unused demo seeding code from `presign-upload`.
- Added `console.error` details for frontend async failures.

## Loop 3 - Retest

| Test Case | Expected Result | Actual Result | Pass / Fail | Fix / Changed File | Remaining Risk |
| --- | --- | --- | --- | --- | --- |
| Syntax checks | All edited JS parses | Passed for Clean V1 app and API files | Pass | All edited JS | None |
| No legacy hotfix dependency | Clean V1 should not use localStorage, MutationObserver, old hotfix text | Scan returned no matches in Clean V1 / API path | Pass | `clean-v1/app.js` | Legacy files still exist by design |
| Case 10: refresh consistency | QA style, issues, departments, media survive snapshot reload | Verified from `snapshot-p0` | Pass | `snapshot-p0` | Final Approval backend fix still needs deployed retest |
| Case 11: mobile | 390px layout has no horizontal overflow | Browser check: `overflow=false`, material upload grid is `1fr`, Final Approval panel exists | Pass | `clean-v1/style.css` | Needs hands-on mobile smoke after deploy |

## Not Fully Retested Until Deploy

These fixes are in local code but production still ran the old deployment during QA:

- `create-style-fast` no longer timing out.
- `reviewDecision=approve_to_send` blocked by open blocking Issue.
- `complete-upload` refuses metadata insert when S3 object is missing.

## Push Summary

Title: `QA harden Clean V1 review release flow`

Summary:

- Add Final Approval UI and review summary generation.
- Block Final Approval on open blocking Issues or incomplete department reviews.
- Add Issue remediation / verification / close flow.
- Verify S3 object exists before saving media metadata.
- Raise Vercel API timeout and speed up default department backfill.
- Record QA loop results and deployment retest risks.
