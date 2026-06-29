# Sample OS Deployment and Data Architecture

## Hosting

The current app is a static site. GitHub Pages can publish it from a dedicated `gh-pages` branch that contains only the static frontend files.

Expected public URL after Pages is enabled:

```text
https://cheneyxu1011.github.io/sample-os/
```

If the site is not visible yet, open the repository settings and set Pages source to **Deploy from a branch**, then select `gh-pages` and `/ (root)`.

## Data split

Media files go to S3:

- sample photos
- review evidence photos
- sample videos
- original customer reference files when they are binary assets

Supabase stores text and relational data:

- users, departments, roles, permissions
- style records and lifecycle gates
- samples, sample locations, shipment decisions
- reviews, department opinions, issues, approvals
- media metadata only: S3 bucket, object key, MIME type, size, checksum, owner, and linked business object

Do not store binary photo or video data in Supabase Postgres.

## Upload flow

1. Browser asks a server-side endpoint for a presigned S3 upload URL.
2. Server validates the current Supabase user and target object ownership.
3. Server returns a short-lived presigned URL and a generated object key.
4. Browser uploads the file directly to S3.
5. Browser or server writes one row to `sample_media` with the S3 metadata.

The presigning endpoint can be a Supabase Edge Function, Vercel Function, Netlify Function, or a small backend service. AWS credentials and Supabase service-role keys must only live there, never in static frontend files.

## S3 object key convention

```text
org/{org_id}/styles/{style_id}/samples/{sample_id}/{yyyy}/{mm}/{uuid}-{safe_filename}
```

Example:

```text
org/8f.../styles/212/samples/sample_212_2/2026/06/7b...-front.jpg
```

## Access model

S3 bucket should be private. The app should display media using short-lived signed download URLs, or a CDN in front of S3 with signed URLs/cookies.

Supabase Row Level Security should control which authenticated users can see the media metadata rows. S3 policies should not make the bucket public.
