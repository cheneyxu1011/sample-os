import { createClient } from "@supabase/supabase-js";

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

async function firstOrg(supabase) {
  const { data, error } = await supabase.from("organizations").select("id").order("created_at", { ascending: true }).limit(1);
  if (error) throw error;
  if (!data?.[0]?.id) throw new Error("organization not found");
  return data[0];
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("allow", "POST");
    return json(res, 405, { error: "Method not allowed" });
  }

  let body = {};
  try {
    body = await readJson(req);
    const styleId = body.styleId;
    if (!isUuid(styleId)) return json(res, 400, { error: "styleId is required" });

    const supabase = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
    const org = await firstOrg(supabase);

    const { data: samples, error: sampleLoadError } = await supabase.from("samples").select("id").eq("org_id", org.id).eq("style_id", styleId);
    if (sampleLoadError) throw sampleLoadError;
    const sampleIds = (samples || []).map((item) => item.id);

    const { data: reviews, error: reviewLoadError } = await supabase.from("reviews").select("id").eq("org_id", org.id).eq("style_id", styleId);
    if (reviewLoadError) throw reviewLoadError;
    const reviewIds = (reviews || []).map((item) => item.id);

    if (reviewIds.length) {
      await supabase.from("review_department_reviews").delete().eq("org_id", org.id).in("review_id", reviewIds);
    }
    if (sampleIds.length) {
      await supabase.from("sample_media").delete().eq("org_id", org.id).in("sample_id", sampleIds);
    }
    await supabase.from("issues").delete().eq("org_id", org.id).eq("style_id", styleId);
    await supabase.from("reviews").delete().eq("org_id", org.id).eq("style_id", styleId);
    await supabase.from("samples").delete().eq("org_id", org.id).eq("style_id", styleId);
    await supabase.from("audit_events").delete().eq("org_id", org.id).eq("entity_type", "style").eq("entity_id", styleId);

    const { error: styleDeleteError } = await supabase.from("styles").delete().eq("org_id", org.id).eq("id", styleId);
    if (styleDeleteError) throw styleDeleteError;

    return json(res, 200, { ok: true, styleId });
  } catch (error) {
    console.error("Fast delete style failed", { message: error.message, payload: body });
    return json(res, 500, { error: "删除失败，请稍后重试或联系管理员。", detail: error.message });
  }
}
