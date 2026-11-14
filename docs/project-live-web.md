# Project management on the main website

The `project-live-staff` page uses the site's existing Google session. The API validates a revoked-token-aware Firebase ID token and reloads the Auth account on every request. This release supports year 2568 only: `6534324223@student.chula.ac.th` is the treasurer; `tuwanon.kimchiang@gmail.com` is the administrator. The year 2569 account is not granted access.

The administrator can edit all available monetary inputs and statuses, inspect history, download backups, suspend/re-enable the treasurer and restore a verified live backup. Formula-derived amounts stay calculated. Project edits retain the actual administrator UID and display name. Access and restore operations are recorded separately in `projectAdminAudit`.

## Data and authorization

`projectLiveConfig/2568` points to the active dataset and a private source object. `projectSystemAdmins/{uid}` controls administrator authorization; the treasurer's dataset-bound grant lives in `projectAccess/2568/members/{uid}`. Client Firestore access remains denied. Never put these documents, source files, credentials or backups in static assets.

The approved original 407-project candidate is immutable and integrity checked. Its snapshot SHA-256 is `fefaef67f6001f35acb2f56adebbabcb27824ba852d93c8580760447a4f3a869`. Current balances remain in the existing live dataset; deployment does not import, reset or overwrite them. Trial checkpoints are not accepted as live backups.

Restore first saves and reads back a safety backup, restores into a new inactive dataset, then atomically switches the active pointer and grant. It rejects concurrent financial changes after the safety backup, preserves suspended access and retains the previous dataset. Old project versions cannot be committed after restore. A failed restore can leave an inactive dataset for investigation; it never silently becomes active.

## Cloud deployment

Node.js 22 is required. Deploy only the two new functions:

```sh
firebase deploy --only functions:projectLiveApi,functions:projectLiveBackup --project departmentwebsite-5aec1
```

Both functions use Singapore (`asia-southeast1`), minimum instances 0, maximum 1. The Bangkok location was rejected by the project Cloud Functions API; the private storage bucket remains in Bangkok. Deployment image cleanup retains 30 days of build artifacts; it does not delete project data or backups. Usage, storage and scheduler charges follow the project's billing plan.

The dedicated bucket `sgcu-project-private-departmentwebsite-5aec1` uses uniform bucket access and enforced public access prevention. It is separate from the Firebase client Storage bucket. The source and backup objects are create-only. The deployed service account needs access to this bucket, Firestore and Firebase Auth.

`projectLiveBackup` runs at midnight and noon Bangkok time. A successful upload is downloaded and validated before writing `projectBackupStatus/2568`. Failed jobs retain failure status and retry. The first cloud backup was verified on 2026-11-14 at 06:46:28 UTC: 407 projects, zero financial audit events, checksum `2ea689657c13b9587b89fd1a7d9f16679facc2ed9716eea35fef0f048a6a4770`. It is an off-device copy in the same cloud project, not an independently administered disaster-recovery account.

The frontend API URL is configured in `js/core/app.config.js`. Publish the website only after deploying and checking the API. Public assets exclude server code and Emulator exports; the service worker excludes authenticated and `/api/` requests.

## Verification

```sh
npm run check
npm run build
npm --prefix functions test
GCLOUD_PROJECT=demo-project-pilot FIRESTORE_EMULATOR_HOST=127.0.0.1:8187 node tools/test-project-live-web.mjs /absolute/private/approved-candidate-directory --browser
```

The integration test creates isolated Emulator documents and deletes only its own fixtures. Browser testing uses a shared-auth stub and blocks external network access; it does not replace real Google-login acceptance testing. Verify both authorized accounts on the published site without making test balance changes.

## Rollback

Disable `projectLive.enabled` and republish to hide the main-site entry. To revoke administrator access set only their `projectSystemAdmins` document's `active` to false. Do not delete datasets or reset grants to roll back a frontend release. Existing local tooling fixed to `year2568-initial` must be pointed at the active dataset after a cloud restore. Preserve verified backups and the immutable source.

## Release workflow

User preference (2026-11-14): keep the project menu in staff navigation only, on both desktop and mobile. Develop on a feature branch, test the actual affected user flow and run the applicable checks before merging into `main`. A push to `main` publishes the website; production must not be the first place a change is tested.
