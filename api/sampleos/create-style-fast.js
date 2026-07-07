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

function textOrNull(value) {
  const text = String(value || "").trim();
  return text || null;
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

async function ensureDepartment(supabase, orgId, name) {
  const departmentName = name || "未指定部门";
  const { data: existing, error: existingError } = await supabase
    .from("departments")
    .select("id")
    .eq("org_id", orgId)
    .eq("name", departmentName)
    .maybeSingle();
  if (existingError) throw syncError("check department", existingError, { departmentName });
  if (existing?.id) return existing.id;

  const { data, error } = await supabase
    .from("departments")
    .insert({ org_id: orgId, name: departmentName })
    .select("id")
    .single();
  if (error) throw syncError("insert department", error, { departmentName });
  return data.id;
}

async function ensureDefaultDepartmentReviews(supabase, orgId, review, now) {
  const defaults = [
    { department: "业务部", role: "业务负责人", focusTags: ["客户需求", "技术包/物料清单", "寄样需求"] },
    { department: "打版组", role: "版型评审员", focusTags: ["版型", "尺寸", "纸样一致"] },
    { department: "品质部", role: "质量评审员", focusTags: ["外观", "历史问题", "测试/复验"] },
    { department: "工艺部", role: "工艺评审员", focusTags: ["工艺可行", "压胶稳定", "技术包一致"] },
    { department: "IE 部", role: "IE 评审员", focusTags: ["工时", "瓶颈", "量产产能"] },
    { department: "打样部", role: "打样反馈人", focusTags: ["打样异常", "资料清晰", "制作困难"] },
  ];

  await Promise.all(defaults.map(async (item) => {
    const departmentId = await ensureDepartment(supabase, orgId, item.department);
    const { data: existing, error: existingError } = await supabase
      .from("review_department_reviews")
      .select("id")
      .eq("org_id", orgId)
      .eq("review_id", review.id)
      .eq("department_id", departmentId)
      .maybeSingle();
    if (existingError) throw syncError("check default department review", existingError, { reviewId: review.id, department: item.department });
    if (existing?.id) return;

    const { error } = await supabase.from("review_department_reviews").insert({
      org_id: orgId,
      review_id: review.id,
      department_id: departmentId,
      role_name: item.role,
      status: "pending",
      opinion: "",
      focus_tags: item.focusTags,
      reviewed_at: null,
      created_at: now,
    });
    if (error) throw syncError("insert default department review", error, { reviewId: review.id, department: item.department });
  }));
}

async function ensurePreparationChecklist(supabase, orgId, style, body) {
  const { data: existing, error: existingError } = await supabase
    .from("audit_events")
    .select("id")
    .eq("org_id", orgId)
    .eq("entity_type", "style")
    .eq("entity_id", style.id)
    .eq("action", "preparation_checklist")
    .maybeSingle();
  if (existingError) throw syncError("check preparation checklist", existingError, { styleId: style.id });
  if (existing?.id) return;

  const items = [
    { id: "customer_info", label: "客户信息", done: Boolean(body.brand && body.styleNo) },
    { id: "tech_pack", label: "技术包 / 款式资料", done: false },
    { id: "bom", label: "面辅料 / BOM", done: false },
    { id: "sample_route", label: "打样路线", done: Boolean(body.route) },
    { id: "ship_date", label: "预计寄样日期", done: Boolean(body.plannedShipDate) },
  ];

  const { error } = await supabase.from("audit_events").insert({
    org_id: orgId,
    entity_type: "style",
    entity_id: style.id,
    action: "preparation_checklist",
    detail: { items },
  });
  if (error) throw syncError("insert preparation checklist", error, { styleId: style.id, items });
}

async function ensureSampleVariantsAudit(supabase, orgId, style, body) {
  const sampleVariants = Array.isArray(body.sampleVariants) ? body.sampleVariants : [];
  if (!sampleVariants.length) return;

  const { data: existing, error: existingError } = await supabase
    .from("audit_events")
    .select("id")
    .eq("org_id", orgId)
    .eq("entity_type", "style")
    .eq("entity_id", style.id)
    .eq("action", "sample_variants")
    .maybeSingle();
  if (existingError) throw syncError("check sample variants audit", existingError, { styleId: style.id });
  if (existing?.id) return;

  const quantity = sampleVariants.reduce((sum, item) => sum + Math.max(1, Number(item?.quantity || 1)), 0) || Math.max(1, Number(body.quantity || 1));
  const { error } = await supabase.from("audit_events").insert({
    org_id: orgId,
    entity_type: "style",
    entity_id: style.id,
    action: "sample_variants",
    detail: { sampleVariants, quantity },
  });
  if (error) throw syncError("insert sample variants audit", error, { styleId: style.id, sampleVariants });
}

async function ensureStyleProfileAudit(supabase, orgId, style, sample, review, body) {
  const detail = {
    customer: textOrNull(body.customer),
    customerDeadline: textOrNull(body.customerDeadline),
    customerCommentSource: textOrNull(body.customerCommentSource),
    reviewObjective: textOrNull(body.reviewObjective),
    owners: {
      businessOwner: textOrNull(body.businessOwner),
      sampleOwner: textOrNull(body.sampleOwner),
      gateOwner: textOrNull(body.gateOwner),
      finalApprover: textOrNull(body.finalApprover) || "杨总",
      patternOwner: textOrNull(body.patternOwner),
      processOwner: textOrNull(body.processOwner),
      qcOwner: textOrNull(body.qcOwner),
      bondingOwner: textOrNull(body.bondingOwner),
    },
    styleId: style.id,
    sampleId: sample.id,
    reviewId: review.id,
  };

  const hasUsefulDetail = detail.customer || detail.customerDeadline || detail.customerCommentSource || detail.reviewObjective || Object.values(detail.owners).some(Boolean);
  if (!hasUsefulDetail) return;

  const { data: existing, error: existingError } = await supabase
    .from("audit_events")
    .select("id, detail")
    .eq("org_id", orgId)
    .eq("entity_type", "style")
    .eq("entity_id", style.id)
    .eq("action", "style_profile")
    .maybeSingle();
  if (existingError) throw syncError("check style profile audit", existingError, { styleId: style.id });

  if (existing?.id) {
    const mergedOwners = { ...(existing.detail?.owners || {}), ...detail.owners };
    const mergedDetail = { ...(existing.detail || {}), ...detail, owners: mergedOwners };
    const { error } = await supabase.from("audit_events").update({ detail: mergedDetail }).eq("id", existing.id);
    if (error) throw syncError("update style profile audit", error, { styleId: style.id });
    return;
  }

  const { error } = await supabase.from("audit_events").insert({
    org_id: orgId,
    entity_type: "style",
    entity_id: style.id,
    action: "style_profile",
    detail,
  });
  if (error) throw syncError("insert style profile audit", error, { styleId: style.id });
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
    await ensureDefaultDepartmentReviews(supabase, org.id, review, now);
    await ensurePreparationChecklist(supabase, org.id, style, body);
    await ensureSampleVariantsAudit(supabase, org.id, style, body);
    await ensureStyleProfileAudit(supabase, org.id, style, sample, review, body);
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
