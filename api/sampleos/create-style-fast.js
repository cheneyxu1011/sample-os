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

function profileIdOrNull(value) {
  return isUuid(value) ? String(value) : null;
}

function externalRefFor(prefix, value) {
  const clean = String(value || "").trim().replace(/[^\w.-]+/g, "_").replace(/^_+|_+$/g, "");
  return `${prefix}_${clean || Date.now()}`;
}

function syncError(stage, error, payload = {}) {
  const next = new Error(`${stage}: ${error?.message || String(error)}`);
  next.stage = stage;
  next.code = error?.code || null;
  next.payload = payload;
  return next;
}

async function firstOrg(supabase) {
  const { data, error } = await supabase.from("organizations").select("id, name").order("created_at", { ascending: true }).limit(1);
  if (error) throw error;
  if (data?.[0]) return data[0];
  const { data: org, error: insertError } = await supabase.from("organizations").insert({ name: "万誉" }).select("id, name").single();
  if (insertError) throw insertError;
  return org;
}

async function getOrCreateStyle(supabase, orgId, body, now) {
  const styleNo = String(body.styleNo || "").trim();
  const styleName = String(body.styleName || "").trim();
  if (!styleNo || !styleName) throw new Error("styleNo and styleName are required");

  const { data: existing, error: existingError } = await supabase.from("styles").select("*").eq("org_id", orgId).eq("style_no", styleNo).maybeSingle();
  if (existingError) throw syncError("check existing style", existingError, { styleNo });
  if (existing) return { style: existing, existing: true };

  const sampleVariants = Array.isArray(body.sampleVariants)
    ? body.sampleVariants.map((item) => ({ color: String(item?.color || "").trim(), size: String(item?.size || "").trim(), quantity: Math.max(1, Number(item?.quantity || 1)) })).filter((item) => item.color || item.size || item.quantity > 0)
    : [];
  const quantity = sampleVariants.reduce((sum, item) => sum + item.quantity, 0) || Math.max(1, Number(body.quantity || 1));
  const payload = {
    org_id: orgId,
    external_ref: externalRefFor("style", styleNo),
    style_no: styleNo,
    brand: body.brand || "未指定品牌",
    season: body.season || "",
    style_name: styleName,
    category: body.category || "",
    route: body.route || "normal",
    current_gate: "preparation_gate",
    sample_phase: body.samplePhase || "first_sample",
    risk_status: body.highRisk ? "approaching_due" : "normal",
    planned_ship_date: body.plannedShipDate || null,
    gate_owner_id: profileIdOrNull(body.reviewOwnerId),
    final_approver_id: profileIdOrNull(body.finalApproverId),
    sample_variants: sampleVariants,
    quantity,
    next_action: "准备材料齐套后由负责人确认",
    blocker_summary: "准备闸口未完成",
    created_at: now,
    updated_at: now,
  };

  let { data, error } = await supabase.from("styles").insert(payload).select("*").single();
  if (error && /sample_variants|quantity/i.test(error.message || "")) {
    const { sample_variants, quantity: _quantity, ...legacyPayload } = payload;
    const legacy = await supabase.from("styles").insert(legacyPayload).select("*").single();
    data = legacy.data;
    error = legacy.error;
  }
  if (error?.code === "23505" || /duplicate key/i.test(error?.message || "")) {
    const duplicate = await supabase.from("styles").select("*").eq("org_id", orgId).eq("style_no", styleNo).single();
    if (duplicate.error) throw syncError("load duplicate style", duplicate.error, { styleNo });
    return { style: duplicate.data, existing: true };
  }
  if (error) throw syncError("insert styles", error, payload);
  return { style: data, existing: false };
}

async function getOrCreateSample(supabase, orgId, style, body, now) {
  const samplePhase = body.samplePhase || style.sample_phase || "first_sample";
  const { data: existing, error: existingError } = await supabase.from("samples").select("*").eq("org_id", orgId).eq("style_id", style.id).eq("sample_phase", samplePhase).order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (existingError) throw syncError("check existing sample", existingError, { styleId: style.id, samplePhase });
  if (existing) return existing;

  const { data, error } = await supabase.from("samples").insert({
    org_id: orgId,
    external_ref: externalRefFor("sample", `${style.style_no}_${samplePhase}`),
    style_id: style.id,
    sample_phase: samplePhase,
    version_name: body.versionName || "一次样",
    status: "preparation_blocked",
    location: body.sampleLocation || "未设置",
    planned_ship_date: body.plannedShipDate || style.planned_ship_date || null,
    created_at: now,
    updated_at: now,
  }).select("*").single();
  if (error) throw syncError("insert samples", error, { styleId: style.id, samplePhase });
  return data;
}

async function getOrCreateReview(supabase, orgId, style, sample, body, now) {
  const { data: existing, error: existingError } = await supabase.from("reviews").select("*").eq("org_id", orgId).eq("style_id", style.id).eq("sample_id", sample.id).order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (existingError) throw syncError("check existing reviews", existingError, { styleId: style.id, sampleId: sample.id });
  if (existing) return existing;

  let { data, error } = await supabase.from("reviews").insert({
    org_id: orgId,
    external_ref: externalRefFor("review", `${style.style_no}_${sample.sample_phase}`),
    style_id: style.id,
    sample_id: sample.id,
    review_no: `SR-${style.style_no}`,
    status: "not_started",
    gate_owner_id: profileIdOrNull(body.reviewOwnerId),
    final_approver_id: profileIdOrNull(body.finalApproverId),
    final_decision: "none",
    created_at: now,
    updated_at: now,
  }).select("*").single();
  if (error?.code === "23505" || /duplicate key/i.test(error?.message || "")) {
    const duplicate = await supabase.from("reviews").select("*").eq("org_id", orgId).eq("review_no", `SR-${style.style_no}`).single();
    data = duplicate.data;
    error = duplicate.error;
  }
  if (error) throw syncError("insert reviews", error, { styleId: style.id, sampleId: sample.id });
  return data;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("allow", "POST");
    return json(res, 405, { error: "Method not allowed" });
  }

  let body = {};
  try {
    body = await readJson(req);
    const supabase = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
    const org = await firstOrg(supabase);
    const now = new Date().toISOString();
    const { style, existing } = await getOrCreateStyle(supabase, org.id, body, now);
    const sample = await getOrCreateSample(supabase, org.id, style, body, now);
    const review = await getOrCreateReview(supabase, org.id, style, sample, body, now);
    return json(res, 200, {
      ok: true,
      result: {
        existing,
        message: existing ? "该款号已存在，已打开现有款式。" : "款式已创建并同步到 Supabase，进入详情页继续补资料",
        styleId: style.id,
        sampleId: sample.id,
        reviewId: review.id,
        style: { id: style.id, external_ref: style.external_ref, style_no: style.style_no, planned_ship_date: style.planned_ship_date, route: style.route, sample_location: sample.location, gate_owner_id: style.gate_owner_id, final_approver_id: style.final_approver_id },
        sample: { id: sample.id, external_ref: sample.external_ref, planned_ship_date: sample.planned_ship_date, location: sample.location },
        review: { id: review.id, external_ref: review.external_ref, gate_owner_id: review.gate_owner_id, final_approver_id: review.final_approver_id },
      },
    });
  } catch (error) {
    console.error("Fast create style failed", { message: error.message, stage: error.stage, code: error.code, payload: error.payload || body });
    return json(res, 500, { error: "款式保存失败，请稍后重试或联系管理员。", detail: error.message, stage: error.stage, code: error.code, payload: error.payload || body });
  }
}
