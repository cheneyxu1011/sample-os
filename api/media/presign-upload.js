import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const ALLOWED_MEDIA_KINDS = new Set(["photo", "video", "document"]);
const DEFAULT_MAX_BYTES = 500 * 1024 * 1024;

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

function sanitizeFileName(fileName) {
  return String(fileName || "upload.bin")
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120) || "upload.bin";
}

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1];
}

async function getProfile(req) {
  const supabase = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });

  async function defaultProfile() {
    const { data: orgs, error: orgsError } = await supabase
      .from("organizations")
      .select("id, name")
      .order("created_at", { ascending: true })
      .limit(1);
    if (orgsError) throw orgsError;
    if (orgs?.[0]) return { id: null, org_id: orgs[0].id };

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({ name: "万誉" })
      .select("id, name")
      .single();
    if (orgError) throw orgError;
    return { id: null, org_id: org.id };
  }

  const token = getBearerToken(req);
  if (!token) return defaultProfile();

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return defaultProfile();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, org_id")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (profileError || !profile) return defaultProfile();
  return profile;
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
    const profile = await getProfile(req);
    if (!profile) return json(res, 401, { error: "Unauthorized" });

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
      fileName,
      label = null,
      fileCategory = null,
      mediaCategory = null,
      mimeType,
      byteSize,
    } = body;

    const maxBytes = Number(process.env.S3_UPLOAD_MAX_BYTES || DEFAULT_MAX_BYTES);
    if ((!styleId && !styleExternalRef) || (!sampleId && !sampleExternalRef)) {
      return json(res, 400, { error: "styleId/styleExternalRef and sampleId/sampleExternalRef are required" });
    }
    if (!ALLOWED_MEDIA_KINDS.has(mediaKind)) return json(res, 400, { error: "Invalid mediaKind" });
    if (!mimeType || !String(mimeType).includes("/")) return json(res, 400, { error: "mimeType is required" });
    if (!Number.isSafeInteger(byteSize) || byteSize <= 0 || byteSize > maxBytes) {
      return json(res, 400, { error: `byteSize must be between 1 and ${maxBytes}` });
    }

    const region = requireEnv("AWS_REGION");
    const bucket = requireEnv("AWS_S3_BUCKET");
    const supabase = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false },
    });
    let resolvedStyleId = await resolveEntityId(supabase, "styles", profile.org_id, styleId, styleExternalRef);
    let resolvedSampleId = await resolveEntityId(supabase, "samples", profile.org_id, sampleId, sampleExternalRef);
    let resolvedReviewId = await resolveEntityId(supabase, "reviews", profile.org_id, reviewId, reviewExternalRef);
    const resolvedIssueId = await resolveEntityId(supabase, "issues", profile.org_id, issueId, issueExternalRef);
    if (!resolvedStyleId || !resolvedSampleId) {
      return json(res, 400, { error: "Style or sample has not been seeded in Supabase yet" });
    }
    const date = new Date();
    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
    const objectKey = [
      "org",
      profile.org_id,
      "styles",
      resolvedStyleId,
      "samples",
      resolvedSampleId,
      String(yyyy),
      mm,
      `${crypto.randomUUID()}-${sanitizeFileName(fileName)}`,
    ].join("/");

    const s3 = new S3Client({ region });
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      ContentType: mimeType,
      Metadata: {
        org_id: profile.org_id,
        style_id: resolvedStyleId,
        sample_id: resolvedSampleId,
        review_id: resolvedReviewId || "",
        issue_id: resolvedIssueId || "",
        uploaded_by: profile.id || "",
        media_kind: mediaKind,
        file_category: String(fileCategory || ""),
        media_category: String(mediaCategory || ""),
      },
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

    return json(res, 200, {
      uploadUrl,
      method: "PUT",
      expiresIn: 300,
      headers: { "content-type": mimeType },
      media: {
        orgId: profile.org_id,
        styleId: resolvedStyleId,
        sampleId: resolvedSampleId,
        reviewId: resolvedReviewId,
        issueId: resolvedIssueId,
        styleExternalRef: styleExternalRef || (isUuid(styleId) ? null : styleId),
        sampleExternalRef: sampleExternalRef || (isUuid(sampleId) ? null : sampleId),
        reviewExternalRef: reviewExternalRef || (isUuid(reviewId) ? null : reviewId),
        issueExternalRef: issueExternalRef || (isUuid(issueId) ? null : issueId),
        mediaKind,
        label: label || fileName,
        fileCategory,
        mediaCategory,
        s3Bucket: bucket,
        s3Region: region,
        s3ObjectKey: objectKey,
        mimeType,
        byteSize,
        uploadedBy: profile.id,
      },
    });
  } catch (error) {
    return json(res, 500, { error: "Could not create upload URL", detail: error.message });
  }
}
