import { createClient } from "@supabase/supabase-js";
import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";

const ALLOWED_MEDIA_KINDS = new Set(["photo", "video", "document"]);

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1];
}

async function getSupabaseAndProfile(req) {
  const supabase = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });

  async function defaultContext() {
    const { data: orgs, error: orgsError } = await supabase
      .from("organizations")
      .select("id, name")
      .order("created_at", { ascending: true })
      .limit(1);
    if (orgsError) throw orgsError;
    if (orgs?.[0]) return { supabase, profile: { id: null, org_id: orgs[0].id } };

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({ name: "万誉" })
      .select("id, name")
      .single();
    if (orgError) throw orgError;
    return { supabase, profile: { id: null, org_id: org.id } };
  }

  const token = getBearerToken(req);
  if (!token) return defaultContext();

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return defaultContext();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, org_id")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (profileError || !profile) return defaultContext();
  return { supabase, profile };
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

async function resolveEntityId(supabase, table, orgId, id, externalRef) {
  if (isUuid(id)) return id;
  const ref = externalRef || id;
  if (!ref) return null;
  const { data, error } = await supabase
    .from(table)
    .select("id")
    .eq("org_id", orgId)
    .eq("external_ref", ref)
    .maybeSingle();
  if (error) throw error;
  return data?.id || null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("allow", "POST");
    return json(res, 405, { error: "Method not allowed" });
  }

  try {
    const context = await getSupabaseAndProfile(req);
    if (!context) return json(res, 401, { error: "Unauthorized" });

    const { supabase, profile } = context;
    const body = await readJson(req);
    const {
      styleId,
      sampleId,
      reviewId = null,
      issueId = null,
      styleExternalRef = null,
      sampleExternalRef = null,
      reviewExternalRef = null,
      issueExternalRef = null,
      mediaKind,
      label = null,
      s3Bucket,
      s3Region,
      s3ObjectKey,
      mimeType = null,
      byteSize = null,
      checksumSha256 = null,
    } = body;

    if ((!styleId && !styleExternalRef) || (!sampleId && !sampleExternalRef) || !s3Bucket || !s3Region || !s3ObjectKey) {
      return json(res, 400, { error: "styleId/styleExternalRef, sampleId/sampleExternalRef, s3Bucket, s3Region, and s3ObjectKey are required" });
    }
    if (!ALLOWED_MEDIA_KINDS.has(mediaKind)) return json(res, 400, { error: "Invalid mediaKind" });

    const resolvedStyleId = await resolveEntityId(supabase, "styles", profile.org_id, styleId, styleExternalRef);
    const resolvedSampleId = await resolveEntityId(supabase, "samples", profile.org_id, sampleId, sampleExternalRef);
    const resolvedReviewId = await resolveEntityId(supabase, "reviews", profile.org_id, reviewId, reviewExternalRef);
    const resolvedIssueId = await resolveEntityId(supabase, "issues", profile.org_id, issueId, issueExternalRef);
    if (!resolvedStyleId || !resolvedSampleId) return json(res, 400, { error: "Style or sample has not been seeded in Supabase yet" });

    try {
      const s3 = new S3Client({ region: s3Region });
      await s3.send(new HeadObjectCommand({ Bucket: s3Bucket, Key: s3ObjectKey }));
    } catch (headError) {
      console.error("S3 object verification failed before metadata insert", {
        s3Bucket,
        s3Region,
        s3ObjectKey,
        message: headError.message,
        name: headError.name,
      });
      return json(res, 400, { error: "S3 upload verification failed", detail: headError.message });
    }

    const { data, error } = await supabase
      .from("sample_media")
      .insert({
        org_id: profile.org_id,
        style_id: resolvedStyleId,
        sample_id: resolvedSampleId,
        review_id: resolvedReviewId,
        issue_id: resolvedIssueId,
        media_kind: mediaKind,
        label,
        s3_bucket: s3Bucket,
        s3_region: s3Region,
        s3_object_key: s3ObjectKey,
        mime_type: mimeType,
        byte_size: byteSize,
        checksum_sha256: checksumSha256,
        uploaded_by: profile.id,
      })
      .select("id, s3_object_key, created_at")
      .single();

    if (error) return json(res, 400, { error: "Could not save media metadata", detail: error.message });
    return json(res, 201, { media: data });
  } catch (error) {
    return json(res, 500, { error: "Could not complete upload", detail: error.message });
  }
}
