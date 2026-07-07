# Clean V1 Data Sync Rules

## Goal

Clean V1 is the clean replacement path for Sample OS. It keeps the new frontend independent from the legacy `app-zh.js` runtime while reconnecting to the existing Supabase and S3 backend.

## Source Of Truth

Supabase is the source of truth for all business data:

- styles
- samples
- reviews
- department review opinions
- issues
- people, workers, settings, gate rules
- sample media metadata

S3 is the source of truth for binary media only:

- photos
- videos
- documents

The browser must not store permanent business data except short-lived UI state.

## Read Flow

1. Page loads.
2. Browser calls `GET /api/sampleos/snapshot-p0`.
3. The returned payload is stored in frontend `state.data`.
4. All views render from `state.data`.
5. If loading fails, the page shows a visible connection error instead of falling back to stale hidden data.

## Write Flow

All business writes go through `POST /api/sampleos/sync`.

Supported actions used by Clean V1:

- `departmentReview`
- `createIssue`
- `issueStatus`

Existing backend actions available for later expansion:

- `sampleLocation`
- `reviewDecision`
- `createStyle`
- `deleteStyle`
- `createPerson`
- `createWorker`
- `deletePerson`
- `deleteWorker`
- `updateGateRule`
- `updateSetting`
- `updateMediaLabel`
- `deleteMedia`

After every successful write, Clean V1 reloads `GET /api/sampleos/snapshot-p0` and lets the server response replace local UI state.

## P0 Persistence Rules

Clean V1 must preserve the P0 data loop that has already been verified online.

Current canonical P0 endpoints:

- `GET /api/sampleos/snapshot-p0`
- `POST /api/sampleos/create-style-fast`
- `POST /api/sampleos/delete-style-fast`

New style creation must:

- check duplicate styles by `org_id + style_no`
- open the existing style instead of inserting a duplicate
- show `该款号已存在，已打开现有款式。`
- create or backfill `styles`, `samples`, `reviews`
- create or backfill default department review rows
- create or backfill preparation checklist audit data
- capture customer deadline, comment source, review objective, and text owner fallback data in `audit_events.action = style_profile` until dedicated columns exist
- never create a `LOCAL` style in the real workflow

The create dialog is a style development initialization entry, not a database form. It must use现场文案:

- title: `新建样衣评审款式`
- primary button: `创建款式`
- progress: `正在创建款式...`
- success toast: `款式创建成功，已进入评审页面`

Uploads must require real Supabase IDs:

- `style.id`
- `sample.id`
- `review.id`

If any of those IDs is missing or not a UUID, the UI must show:

`当前款式尚未保存到数据库，无法上传媒体。`

Style deletion must use `delete-style-fast` so related samples, reviews, issues, media metadata, and audit events are cleaned together.

## Upload Flow

1. Browser lets the user select images or videos.
2. Browser shows a local preview with `URL.createObjectURL`.
3. Browser calls `POST /api/media/presign-upload`.
4. Browser uploads the file directly to S3 using the returned signed URL.
5. Browser calls `POST /api/media/complete-upload`.
6. Backend inserts one `sample_media` metadata row.
7. Browser reloads `GET /api/sampleos/snapshot-p0`.

Supabase must never store photo or video binary content.

## Style Cover And File Categories

Style cover media and review media must remain separate.

- Header cover image reads only category `style_cover` or legacy label `款式图`.
- Review media excludes style cover files.
- If no style cover exists, the header shows `请上传样衣正面图`.
- New uploads pass file category to S3 metadata.
- Until Supabase has dedicated `file_category` and `media_category` columns, Clean V1 writes category prefixes into `sample_media.label`, for example `[style_cover] 款式主图`.

Recommended SQL migration when the schema is ready:

```sql
alter table sample_media
  add column if not exists file_category text,
  add column if not exists media_category text,
  add column if not exists is_active boolean not null default true,
  add column if not exists replaced_by uuid null references sample_media(id);

create index if not exists sample_media_style_category_idx
  on sample_media (org_id, style_id, file_category, media_category, is_active);
```

## ID Rules

Supabase UUIDs are canonical IDs.

Legacy-compatible external references are allowed only as lookup helpers:

- `style_212`
- `sample_212_second`
- `review_212_second`

Frontend code should prefer UUIDs from snapshot responses. External refs are passed only when API compatibility requires them.

## Issue Blocking Rules

- `minor`: does not block shipment.
- `normal`: does not block shipment, but should show risk.
- `major`: blocks shipment unless exception release is approved.
- `critical`: blocks shipment and requires rework verification.

The frontend can display blocking state, but backend data must remain authoritative through `issues.shipment_blocking` and issue status.

## Shipment Release Rules

The UI must not show `可寄样` only because there are no blocking issues.

Clean V1 computes two visible states:

- current risk state
- shipment release state

Release state values:

- `ready_to_send`
- `pending_final_approval`
- `blocked_by_issue`
- `blocked_by_department_review`
- `blocked_by_owner_missing`
- `blocked_by_preparation`
- `overdue_pending_confirm`

If `planned_ship_date` is earlier than today and `final_decision` is not `approve_to_send`, release state must be `overdue_pending_confirm`.

The automatic next step order is:

1. save style basic info
2. assign Gate Owner
3. assign Final Approver
4. complete preparation materials
5. complete all required department reviews
6. rework and verify blocking issues
7. verify previous round changes
8. final approval
9. generate shipment record and notify business owner

## Media Replacement Rules

Do not overwrite S3 objects.

Every upload creates a new object key. For replacement behavior, add metadata fields later instead of deleting files immediately:

- `is_active boolean default true`
- `replaced_by uuid null`

Until those fields exist, deleting media should remove or hide only the Supabase metadata row. S3 hard-delete should be an admin cleanup task.

## Security Rules

Frontend code must never contain:

- `SUPABASE_SERVICE_ROLE_KEY`
- AWS access keys
- S3 bucket write credentials

Production writes should require authenticated users. The current fallback-to-default-org behavior in the API is acceptable for internal testing, but should be removed before broad production use.

## Deployment Rules

Do not point `/` to Clean V1 until `/clean-v1/` has been deployed and verified on desktop and mobile.

Recommended rollout:

1. Deploy `/clean-v1/`.
2. Verify snapshot read.
3. Verify department review save.
4. Verify Issue create and close.
5. Verify S3 upload and media display.
6. Change the root redirect from `/clean-v0/` to `/clean-v1/`.

## Push Summary Rule

After every code or document change that is ready to commit, Codex must provide a concise push summary for GitHub Desktop.

The summary should include:

- one short commit title
- a brief bullet list of changed behavior
- any deployment or verification note the user should know before pushing
