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
  const token = getBearerToken(req);
  if (!token) return null;

  const supabase = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, org_id")
    .eq("user_id", userData.user.id)
    .single();

  if (profileError || !profile) return null;
  return profile;
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
      mediaKind,
      fileName,
      mimeType,
      byteSize,
    } = body;

    const maxBytes = Number(process.env.S3_UPLOAD_MAX_BYTES || DEFAULT_MAX_BYTES);
    if (!styleId || !sampleId) return json(res, 400, { error: "styleId and sampleId are required" });
    if (!ALLOWED_MEDIA_KINDS.has(mediaKind)) return json(res, 400, { error: "Invalid mediaKind" });
    if (!mimeType || !String(mimeType).includes("/")) return json(res, 400, { error: "mimeType is required" });
    if (!Number.isSafeInteger(byteSize) || byteSize <= 0 || byteSize > maxBytes) {
      return json(res, 400, { error: `byteSize must be between 1 and ${maxBytes}` });
    }

    const region = requireEnv("AWS_REGION");
    const bucket = requireEnv("AWS_S3_BUCKET");
    const date = new Date();
    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
    const objectKey = [
      "org",
      profile.org_id,
      "styles",
      styleId,
      "samples",
      sampleId,
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
        style_id: styleId,
        sample_id: sampleId,
        review_id: reviewId || "",
        issue_id: issueId || "",
        uploaded_by: profile.id,
        media_kind: mediaKind,
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
        styleId,
        sampleId,
        reviewId,
        issueId,
        mediaKind,
        label: fileName,
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
