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

## Global Data Collaboration Contract

Sample OS must behave as one connected operating system. Any future change made by the user or by Codex must assume full data linkage by default.

One business fact may have many views, but only one source and one meaning:

- Style identity, customer deadline, brand, season, sample phase, route, location, owner, stage, next action, and release state are shared style/sample facts.
- Measurement values, tolerance results, selected sample phase, remeasure requirement, reason, and evidence must affect the style summary, Issue risk, review decision, and later bulk review where relevant.
- Pattern checks, process checks, IE bottlenecks, and bulk review results must create or update shared Issue/risk/status data instead of living only inside their page.
- Media and files are shared attachments. A file uploaded in one page must be discoverable from the style overview, review media, file center, and any linked Issue where relevant.
- Roles and people are shared assignments. A new person, role assignment, or owner change must be reflected in the overview header, review cards, task ownership, filters, and settings.
- Timeline entries are shared audit facts. Any meaningful workflow change should be represented in `audit_events` or a dedicated timeline source so later pages do not have to infer history from UI state.

No new feature is allowed to keep its own private copy of shared data. Local UI state is allowed only for temporary controls such as the active tab, selected filter, unsaved draft text, or the name of a file before it is uploaded.

## Change Impact Rule

Before adding or changing any field, button, status, table, upload category, Issue type, role, page, or API action, Codex must write down the impacted entities and verify the matching pages.

Required impact checklist:

1. Identify the canonical entity: `style`, `sample`, `review`, `departmentReview`, `issue`, `media`, `person`, `roleTemplate`, `setting`, `auditEvent`, or future dedicated table.
2. Identify the canonical writer: existing `POST /api/sampleos/sync`, media upload APIs, create/delete style APIs, or a new explicit API action.
3. Identify all readers: 款式总览, 尺寸评审, 关键版型, 工艺与参数, IE工序分析, 大货审查, 开发时间轴, Issue管理, 文件中心, plus the old hidden pipeline/review/calendar/settings pages when they still rely on the same data.
4. Define the refresh rule: after a successful write, reload `GET /api/sampleos/snapshot-p0` and render from the server response.
5. Define the failure rule: if persistence fails, show a visible error and do not pretend the local screen is saved.
6. Define the mobile rule: every affected page must still work at a narrow mobile width without page-level horizontal overflow.
7. Define the deployment risk: if the feature is only partly linked or partly persisted, document it in the final response before shipping.

If a new change cannot pass this checklist, it is a prototype only and must not be treated as production-ready Sample OS behavior.

## Derived State Rule

Status badges, risk counts, progress bars, release decisions, Top lists, and next actions are derived data. They must be calculated from shared entities instead of manually maintained per page.

Canonical derived rules:

- Development progress derives from style/sample/review/issue/audit data.
- Shipment release derives from preparation completeness, department reviews, blocking Issues, final decision, owner assignment, and overdue planned ship date.
- Measurement pass rate derives from measurement rows and tolerance rules.
- Pattern/process/IE/bulk risk counts derive from shared checks and Issues.
- Calendar risk derives from the same style/sample/review/issue state used by overview and review pages.
- File counts derive from `sample_media` metadata and recognized categories.

Do not add page-only counters or page-only status strings if the same meaning must appear elsewhere.

## New Data Field Rule

Every new data field must be classified before implementation:

- Permanent business data: add or map to Supabase, sync API, snapshot response, and reload verification.
- Binary file data: store in S3 only, then store metadata in Supabase.
- Workflow history: store in `audit_events` or a future timeline table.
- UI preference: keep in local state only if it does not affect business truth.
- Temporary draft: keep local until the user saves; after save it must become permanent business data.

When a field is temporarily stored in `audit_events.detail` because the schema has no dedicated column yet, the doc or code comment must name the future dedicated column/table expected later.

## Read Flow

1. Page loads.
2. Browser calls `GET /api/sampleos/snapshot-p0`.
3. The returned payload is stored in frontend `state.data`.
4. All views render from `state.data`.
5. If loading fails, the page shows a visible connection error instead of falling back to stale hidden data.

## Feature Collaboration And Cross-page Consistency Rule

Every new Sample OS feature must be collaborative across the whole product, not isolated to one page.

When a new field, status, action, role, brand, media category, Issue behavior, Gate behavior, timeline node, or setting is added, it must be checked against every page that may read or depend on the same data:

- 开发流水线
- 样衣评审
- 样衣日历
- 设置
- 新建 / 编辑款式弹窗
- 上传和媒体预览
- Issue 列表与最终放行
- 后端 snapshot / sync API payloads

The same business data must have one shared meaning across all pages. Do not create page-only data that cannot be read elsewhere. If a value is shown in one page and affects workflow, the matching pages must either:

- display it,
- use it in status calculation,
- expose a clear edit path,
- or intentionally document why it is not relevant there.

Before finishing any feature, Codex must verify cross-page consistency:

1. Identify which shared entities are affected: style, sample, review, department review, issue, media, brand, role, gate rule, route, location, or setting.
2. Confirm the data is written to the real source of truth, not only temporary frontend state.
3. Confirm snapshot reload can return the new or updated data.
4. Confirm all relevant pages render the same updated value after refresh.
5. Confirm mobile layout still works where the feature appears.
6. Confirm no page keeps stale labels, missing buttons, hidden technical wording, or mismatched status logic.

If a feature cannot yet be fully persisted or shared, the UI must make that limitation visible and the final response must list it as a remaining risk. Do not silently ship isolated page behavior.

## Role And Person Assignment Rules

Role templates are fixed business roles. People are the configurable resource.

- Do not create a new role just because a new employee is added.
- People can be maintained in the settings person library before they are selected during style creation.
- Role template cards are the primary place to assign or remove people for a role.
- Role template cards must allow editing key permissions, final release permission, exception release permission, and current assigned people.
- Role template edits must persist through `sample_settings.key = roleTemplates` and reload through `snapshot-p0`.
- Deleting a person record must remove the person from every role template assignment before or during `deletePerson`.
- Style creation owner fields must use configured people dropdowns, not free-text inputs.
- Owner dropdowns must filter by role, brand scope, route scope, and enabled status.
- Default fallback people are allowed only to keep the workflow usable before settings are fully configured.
- When a person is assigned to a role in settings, the role template view, person assignment view, create/edit style dialog, review header, and pipeline status must remain consistent after refresh.

## Sample Location Rules

Sample location options are shared workflow data.

- Location options must be reusable by create/edit style, development pipeline cards, roadmap nodes, review header, calendar summaries, and settings.
- The frontend must normalize both string and object location settings into a display label before rendering.
- Default location options include: 开发车间, 样衣间, 如东工厂, 新长江工厂, 事务所, 万航工厂, 外协工厂, 掘港工厂, 已寄出, 待返修.
- New styles must choose sample location from the shared location options instead of free text.

## Brand Rules

Brand options are shared settings data.

- Brand management must persist through `sample_settings.key = brands` and reload through `snapshot-p0`.
- Brand options must be reused by create/edit style, review filters, personnel scope, pipeline cards, calendar summaries, and settings.
- New styles must choose brand from the shared brand options instead of free text.

## Calendar Filter Rules

Calendar filters must use shared style fields:

- brand from shared brand settings and existing style data
- season from style season
- sample stage from canonical sample stage labels

Filtering must update both the list cards and the month calendar.

## Review Page Workflow Rules

The sample review page is reviewer-first.

- The default view must prioritize: current style summary, review media, my review task, department progress, Issue list, and final decision.
- The review page must not show global create-style or manual refresh controls in the main reviewer workflow.
- Style switching must stay collapsed by default so reviewers do not lose the first screen to search controls.
- Review media selection is shared with quick Issue creation.
- When a reviewer clicks `转为 Issue`, the Issue draft must carry the current department, reviewer, review opinion, role focus, selected media, media label, and media part label.
- Department review cards must render from the shared role template / style owner data. If settings assign multiple people to a default review role, the review page must show all of them as reviewer chips.
- Other departments should render as progress/status by default; detailed draft opinions remain hidden until submitted, unless the current reviewer owns that row.
- Gate Owner / review owner cards may show release judgment, but regular reviewers should see only the tasks they need to complete.
- Any new review-page control must write through the shared sync APIs or explicitly show that it is temporary.

## Pipeline Page Workflow Rules

The development pipeline page is manager-first.

- Pipeline cards must keep a consistent information structure across all styles: identity, current status, blockers, ownership / next step, and key dates.
- Pipeline status wording must distinguish preparation gaps, review blockers, severe Issue pauses, Gate Owner judgment, and ready-to-send states.
- Pipeline top status must summarize all visible styles instead of duplicating the selected style risk and release pills.
- Destructive style actions must stay behind a secondary menu and keep the existing delete confirmation.
- Roadmaps should default to a compact current-state summary and only show the full eight-step route after user expansion.
- Compact list view must use the same shared style, sample, review, issue, and owner data as card view.
- Any pipeline control that opens review, materials, editing, or deletion must keep `selectedStyleId` and snapshot reload behavior consistent with the review page.

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
- capture customer deadline, order meeting date, review objective, and text owner fallback data in `audit_events.action = style_profile` until dedicated columns exist
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

Style cover uploads must be globally recognizable across the style form, review header, review media list, and pipeline cards.

- New uploads should label style cover files with the `style_cover` category.
- Pipeline cards should keep clear actions: `编辑`, `打开评审`, `款式资料`, and `删除`. The style modal must separate `编辑` and `款式资料` into tabs instead of mixing basic fields and the document library in one long page.
- The `款式资料` tab is the shared document library for all customer materials before and after review, including customer references, measurement tables, tech packs, BOM files, customer comments, and other attachments.
- The UI and snapshot API must also recognize older Chinese labels such as `款式主图`, `款式图`, and `样衣正面图` as style cover media.
- Review media and style cover media share the same `sample_media` source, but the cover slot must filter by category instead of taking any random uploaded image.
- Review photo/video uploads should start immediately after file selection. Do not require a second "upload selected files" confirmation.
- Uploaded media names must be editable from the media card and saved back to Supabase `sample_media.label` while preserving the hidden category prefix.
- Review image annotations must be saved as shared data, not local-only UI state. Clean V1 stores lightbox draw/text annotations in `audit_events` with `entity_type = media` and `action = media_annotations`, keyed by `sample_media.id`.
- Image review tools must support practical review actions: zoom levels `1x / 3x / 5x / 10x`, visible pen strokes, draggable text notes, delete selected note, undo latest annotation, and explicit save to shared data.
- After saving image annotations, the UI must immediately update the current media item and then reload `snapshot-p0` to verify persistence. If the saved media cannot be found, show a readable error instead of silently pretending the annotation synced.
- Zoomed image review must allow hand-drag panning so reviewers can inspect details at `3x / 5x / 10x`. Annotation coordinates must be calculated from the rendered image bounds, not from the outer lightbox container.

## Role Owner Rules

New and edit style forms must read owners from the shared role template configuration.

- Default review roles are shown directly as owner selects.
- Optional/on-demand roles stay collapsed until the user expands them.
- Owner selections are saved as `roleOwners` and mirrored to legacy owner fields such as `businessOwner`, `gateOwner`, `qcOwner`, and `bondingOwner` for compatibility.
- Any future owner-related feature must verify the pipeline card, review header, department cards, settings role templates, and refresh-after-save path all read the same owner data.
- Department review cards must resolve reviewer names from the current style `roleOwners` before falling back to `review_department_reviews.reviewer_id`. Creating a style should also seed department review rows with matching reviewer IDs when the selected person exists in `sample_people`.
- Saving or assigning a person must update both `sample_people` and `sample_settings.roleTemplates`. The people library, role template cards, style owner selectors, and review department cards must not maintain separate unsynced role membership.
- Department review cards must be generated from default review role templates, not only from existing `review_department_reviews` rows. If a default role such as Business PM, Sample Feedback Owner, or Sample Review Gate Owner has assigned people, every assigned person must appear on the review card as a blue chip.
- Role template responsibility/focus text is the source for department review textarea placeholder guidance. Review cards should show the role-specific checking prompt before falling back to generic department text.
- Optional/on-demand review roles must stay collapsed under the department review area and can be added to the current style review temporarily. Once the added optional card is saved, it must persist through Supabase like other department review rows.
- The "我的评审任务" reviewer selector must be generated from the same department review rows and role-owner data used by the department progress cards. It may switch the current UI focus, but it must not maintain a separate unsynced reviewer list.

## New Feature Sync Rules

Every new tool or feature added to Clean V1 must be designed as shared, persistent data before UI work is considered complete.

- Before adding a feature, identify the source of truth table or API field and confirm which pages must read the same data.
- A feature is not complete if it only updates local UI state, temporary arrays, or one isolated page.
- Every new write action must save through the official API, reload `snapshot-p0`, and verify the refreshed UI still shows the saved result.
- Every new feature must be checked across all affected pages, including pipeline cards, style material modal, review header, department cards, media library, calendar, settings, and mobile layout when relevant.
- If a feature creates, edits, deletes, annotates, assigns, uploads, or changes status, it must show clear success and failure messages in the UI and log detailed errors with `console.error`.
- Do not add another shortcut script or one-off patch path when the data belongs in the Clean V1 main flow.
- Calendar and deadline views must be derived from the same shared style/sample/review/issue snapshot used by the pipeline and review pages. Do not add separate calendar demo data; planned ship date, brand, style number, sample stage, Gate, location, owner, risk state, and next action must all come from shared Clean V1 data.

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
