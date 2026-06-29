# Media Upload Flow

Photos and videos are uploaded directly to S3. Supabase stores only metadata.

## Required Vercel environment variables

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
AWS_REGION
AWS_S3_BUCKET
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
S3_UPLOAD_MAX_BYTES
```

`SUPABASE_SERVICE_ROLE_KEY`, `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY` must be server-only Vercel environment variables.

## API flow

1. Browser calls `GET /api/runtime-config` to discover public runtime settings.
2. Authenticated browser calls `POST /api/media/presign-upload` with a Supabase access token.
3. The API verifies the token, loads the user's `profiles` row, and returns a 5-minute S3 PUT URL.
4. Browser uploads the file directly to S3 using that URL.
5. Browser calls `POST /api/media/complete-upload` with the returned metadata.
6. The API inserts one `sample_media` row in Supabase.

The browser helper lives at `window.SampleOSBackend`. It stores the Supabase access token in `localStorage` under `sampleos.supabaseAccessToken` until the real login UI is wired in.

```js
window.SampleOSBackend.setAccessToken("supabase access token");

await window.SampleOSBackend.bootstrapProfile({
  orgName: "万誉",
  displayName: "张部长",
  department: "管理层",
  roleName: "后台管理员"
});

await window.SampleOSBackend.seedDemoData();

await window.SampleOSBackend.uploadFile(file, {
  styleId: "style uuid",
  sampleId: "sample uuid",
  reviewId: "review uuid"
});
```

## Presign request

```json
{
  "styleId": "uuid",
  "sampleId": "uuid",
  "reviewId": "uuid",
  "issueId": null,
  "mediaKind": "photo",
  "fileName": "front.jpg",
  "mimeType": "image/jpeg",
  "byteSize": 348221
}
```

## Complete request

Use the `media` object returned by `presign-upload`, plus optional `checksumSha256`.

```json
{
  "styleId": "uuid",
  "sampleId": "uuid",
  "reviewId": "uuid",
  "issueId": null,
  "mediaKind": "photo",
  "label": "front.jpg",
  "s3Bucket": "sample-os-media",
  "s3Region": "ap-northeast-1",
  "s3ObjectKey": "org/.../front.jpg",
  "mimeType": "image/jpeg",
  "byteSize": 348221,
  "checksumSha256": null
}
```

## S3 CORS

The S3 bucket needs CORS that allows uploads from the production domain:

```json
[
  {
    "AllowedOrigins": ["https://sample-os.vanwellgroup.com"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```
