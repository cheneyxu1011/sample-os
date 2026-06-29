function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "s-maxage=60, stale-while-revalidate=300");
  res.end(JSON.stringify(body));
}

export default function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("allow", "GET");
    return json(res, 405, { error: "Method not allowed" });
  }

  return json(res, 200, {
    supabaseUrl: process.env.SUPABASE_URL || null,
    supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || null,
    uploadMaxBytes: Number(process.env.S3_UPLOAD_MAX_BYTES || 500 * 1024 * 1024),
    mediaEnabled: Boolean(
      process.env.SUPABASE_URL
        && process.env.SUPABASE_SERVICE_ROLE_KEY
        && process.env.AWS_REGION
        && process.env.AWS_S3_BUCKET
        && process.env.AWS_ACCESS_KEY_ID
        && process.env.AWS_SECRET_ACCESS_KEY,
    ),
  });
}
