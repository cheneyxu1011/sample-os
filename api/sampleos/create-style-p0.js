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
  next.hint = error?.hint || null;
  next.details = error?.details || null;
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

async function ensureDepartment(supabase, orgId, name) {
  const { data: existing, error: existingError } = await supabase.from("departments").select("id").eq("org_id", orgId).eq("name", name).maybeSingle();
  if (existingError) throw syncError("check departments", existingError, { name });
  if (existing?.id) return existing.id;
  const { data, error } = await supabase.from("departments").insert({ org_id: orgId, name }).select("id").single();
  if (error) throw syncError("insert departments", error, { name });
  return data.id;
}

function defaultReviewTemplates() {
  return [
    { department: "业务部", role: "业务负责人", focusTags: ["客户需求", "技术包/物料清单", "寄样需求"] },
    { department: "版师", role: "版型评审员", focusTags: ["版型", "尺寸", "纸样一致"] },
    { department: "品质部", role: "质量评审员", focusTags: ["外观", "历史问题", "测试/复验"] },
    { department: "工艺部", role: "工艺评审员", focusTags: ["工艺可行", "压胶稳定", "技术包一致"] },
    { department: "IE 部", role: "IE 评审员", focusTags: ["工时", "瓶颈", "量产产能"] },
    { department: "打样部", role: "打样反馈人", focusTags: ["打样异常", "资料清晰", "制作困难"] },
  ];
}

async function ensureDefaultDepartmentReviews(supabase, orgId, reviewId) {
  for (const row of defaultReviewTemplates()) {
    const departmentId = await ensureDepartment(supabase, orgId, row.department);
    const { data: existing, error: existingError } = await supabase
      .from("review_department_reviews")
      .select("id")
      .eq("org_id", orgId)
      .eq("review_id", reviewId)
      .eq("department_id", departmentId)
      .maybeSingle();
    if (existingError) throw syncError("check default department review", existingError, { reviewId, department: row.department });
    if (existing?.id) continue;
    const { error } = await supabase.from("review_department_reviews").insert({
      org_id: orgId,
      review_id: reviewId,
      department_id: departmentId,
      reviewer_id: null,
      role_name: row.role,
      status: "pending",
      opinion: "",
      focus_tags: row.focusTags,
    });
    if (error) throw syncError("insert default department review", error, { reviewId, department: row.department });
  }
}

function preparationChecklistDetail(body) {
  return {
    items: [
      { name: "客户资料已收到", state: "待确认", owner: body.businessOwnerId || null },
      { name: "TP / 技术包已收到", state: "待确认", owner: body.businessOwnerId || null },
      { name: "版子准备", state: "待确认", owner: body.patternOwnerId || null },
      { name: "面料准备", state: "待确认", owner: body.fabricOwnerId || null },
      { name: "辅料准备", state: "待确认", owner: body.trimOwnerId || null },
      { name: "原样 / 样衣参考确认", state: "待确认", owner: body.prepOwnerId || null },
      { name: "打样资料待王部长确认", state: "待确认", owner: body.prepOwnerId || null },
    ],
  };
}

async function ensureStyleAuditEvent(supabase, orgId, styleId, action, detail) {
  const { data: existing, error: existingError } = await supabase
    .from("audit_events")
    .select("id")
    .eq("org_id", orgId)
    .eq("entity_type", "style")
    .eq("entity_id", styleId)
    .eq("action", action)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existingError) throw syncError(`check audit_events ${action}`, existingError, { styleId });
  if (existing?.id) return;
  const { error } = await supabase.from("audit_events").insert({ org_id: orgId, entity_type: "style", entity_id: styleId, action, detail });
  if (error) throw syncError(`insert audit_events ${action}`, error, { styleId, detail });
}

async function createStyle(supabase, orgId, body) {
  const styleNo = String(body.styleNo || "").trim();
  const styleName = String(body.styleName || "").trim();
  if (!styleNo || !styleName) throw new Error("styleNo and styleName are required");

  const samplePhase = body.samplePhase || "first_sample";
  const plannedShipDate = body.plannedShipDate || null;
  const now = new Date().toISOString();
  const sampleVariants = Array.isArray(body.sampleVariants)
    ? body.sampleVariants.map((item) => ({ color: String(item?.color || "").trim(), size: String(item?.size || "").trim(), quantity: Math.max(1, Number(item?.quantity || 1)) })).filter((item) => item.color || item.size || item.quantity > 0)
    : [];
  const quantity = sampleVariants.reduce((sum, item) => sum + item.quantity, 0) || Math.max(1, Number(body.quantity || 1));
  const gateOwnerId = profileIdOrNull(body.reviewOwnerId);
  const finalApproverId = profileIdOrNull(body.finalApproverId);
  let wasExisting = false;

  let { data: style, error: existingStyleError } = await supabase.from("styles").select("*").eq("org_id", orgId).eq("style_no", styleNo).maybeSingle();
  if (existingStyleError) throw syncError("check existing style", existingStyleError, { styleNo });

  if (style) {
    wasExisting = true;
  } else {
    const stylePayload = {
      org_id: orgId,
      external_ref: externalRefFor("style", styleNo),
      style_no: styleNo,
      brand: body.brand || "未指定品牌",
      season: body.season || "",
      style_name: styleName,
      category: body.category || "",
      route: body.route || "normal",
      current_gate: "preparation_gate",
      sample_phase: samplePhase,
      risk_status: body.highRisk ? "approaching_due" : "normal",
      planned_ship_date: plannedShipDate,
      gate_owner_id: gateOwnerId,
      final_approver_id: finalApproverId,
      sample_variants: sampleVariants,
      quantity,
      next_action: "准备材料齐套后由负责人确认",
      blocker_summary: "准备闸口未完成",
      created_at: now,
      updated_at: now,
    };
    let { data: insertedStyle, error: styleError } = await supabase.from("styles").insert(stylePayload).select("*").single();
    if (styleError && /sample_variants|quantity/i.test(styleError.message || "")) {
      const { sample_variants: _sampleVariants, quantity: _quantity, ...legacyPayload } = stylePayload;
      const legacyResult = await supabase.from("styles").insert(legacyPayload).select("*").single();
      insertedStyle = legacyResult.data;
      styleError = legacyResult.error;
    }
    if (styleError?.code === "23505" || /duplicate key/i.test(styleError?.message || "")) {
      const duplicateResult = await supabase.from("styles").select("*").eq("org_id", orgId).eq("style_no", styleNo).single();
      insertedStyle = duplicateResult.data;
      styleError = duplicateResult.error;
      wasExisting = true;
    }
    if (styleError) throw syncError("insert styles", styleError, stylePayload);
    style = insertedStyle;
  }

  let { data: sample, error: existingSampleError } = await supabase
    .from("samples")
    .select("*")
    .eq("org_id", orgId)
    .eq("style_id", style.id)
    .eq("sample_phase", samplePhase)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existingSampleError) throw syncError("check existing sample", existingSampleError, { styleId: style.id, styleNo, samplePhase });

  if (!sample) {
    const { data: insertedSample, error: sampleError } = await supabase.from("samples").insert({
      org_id: orgId,
      external_ref: externalRefFor("sample", `${styleNo}_${samplePhase}`),
      style_id: style.id,
      sample_phase: samplePhase,
      version_name: body.versionName || "一次样",
      status: "preparation_blocked",
      location: body.sampleLocation || "未设置",
      planned_ship_date: plannedShipDate,
      created_at: now,
      updated_at: now,
    }).select("*").single();
    if (sampleError) throw syncError("insert samples", sampleError, { styleId: style.id, styleNo, samplePhase });
    sample = insertedSample;
  }

  let { data: review, error: existingReviewError } = await supabase
    .from("reviews")
    .select("*")
    .eq("org_id", orgId)
    .eq("style_id", style.id)
    .eq("sample_id", sample.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existingReviewError) throw syncError("check existing reviews", existingReviewError, { styleId: style.id, sampleId: sample.id });

  if (!review) {
    let { data: insertedReview, error: reviewError } = await supabase.from("reviews").insert({
      org_id: orgId,
      external_ref: externalRefFor("review", `${styleNo}_${samplePhase}`),
      style_id: style.id,
      sample_id: sample.id,
      review_no: `SR-${styleNo}`,
      status: "not_started",
      gate_owner_id: gateOwnerId,
      final_approver_id: finalApproverId,
      final_decision: "none",
      created_at: now,
      updated_at: now,
    }).select("*").single();
    if (reviewError?.code === "23505" || /duplicate key/i.test(reviewError?.message || "")) {
      const duplicateReview = await supabase.from("reviews").select("*").eq("org_id", orgId).eq("review_no", `SR-${styleNo}`).single();
      insertedReview = duplicateReview.data;
      reviewError = duplicateReview.error;
    }
    if (reviewError) throw syncError("insert reviews", reviewError, { styleId: style.id, sampleId: sample.id, reviewNo: `SR-${styleNo}` });
    review = insertedReview;
  }

  if (sampleVariants.length) await ensureStyleAuditEvent(supabase, orgId, style.id, "sample_variants", { sampleVariants, quantity });
  await ensureStyleAuditEvent(supabase, orgId, style.id, "preparation_checklist", preparationChecklistDetail(body));
  await ensureDefaultDepartmentReviews(supabase, orgId, review.id);

  return {
    existing: wasExisting,
    message: wasExisting ? "该款号已存在，已打开现有款式。" : "款式已创建并同步到 Supabase，进入详情页继续补资料",
    styleId: style.id,
    sampleId: sample.id,
    reviewId: review.id,
    style: { id: style.id, external_ref: style.external_ref, style_no: style.style_no, planned_ship_date: style.planned_ship_date, route: style.route, sample_location: sample.location, gate_owner_id: style.gate_owner_id, final_approver_id: style.final_approver_id },
    sample: { id: sample.id, external_ref: sample.external_ref, planned_ship_date: sample.planned_ship_date, location: sample.location },
    review: { id: review.id, external_ref: review.external_ref, gate_owner_id: review.gate_owner_id, final_approver_id: review.final_approver_id },
  };
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
    const result = await createStyle(supabase, org.id, body);
    return json(res, 200, { ok: true, result });
  } catch (error) {
    console.error("P0 create style failed", { message: error.message, stage: error.stage, code: error.code, hint: error.hint, details: error.details, payload: error.payload || body });
    const businessMessage = /insert samples|insert reviews|default department review|review_department_reviews/i.test(error.stage || error.message || "")
      ? "款式已创建，但样衣评审任务创建失败，请联系管理员。"
      : "款式保存失败，请稍后重试或联系管理员。";
    return json(res, 500, { error: businessMessage, detail: error.message, stage: error.stage, code: error.code, hint: error.hint, payload: error.payload || body });
  }
}
