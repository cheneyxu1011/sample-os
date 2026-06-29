import { createClient } from "@supabase/supabase-js";

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

async function firstOrg(supabase) {
  const { data, error } = await supabase
    .from("organizations")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();
  if (error) throw error;
  return data.id;
}

async function ensureDepartment(supabase, orgId, name) {
  const departmentName = name || "未指定部门";
  const { data: existing, error: existingError } = await supabase
    .from("departments")
    .select("id")
    .eq("org_id", orgId)
    .eq("name", departmentName)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return existing.id;

  const { data, error } = await supabase
    .from("departments")
    .insert({ org_id: orgId, name: departmentName })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function updateDepartmentReview(supabase, orgId, body) {
  const departmentId = await ensureDepartment(supabase, orgId, body.department);
  const payload = {
    org_id: orgId,
    review_id: body.reviewId,
    department_id: departmentId,
    reviewer_id: /^[0-9a-f-]{36}$/i.test(String(body.reviewerId || "")) ? body.reviewerId : null,
    role_name: body.role || "评审员",
    status: body.status || "pending",
    opinion: body.opinion || "",
    focus_tags: body.focusTags || [],
    reviewed_at: body.opinion || body.status !== "pending" ? new Date().toISOString() : null,
  };

  const { data: existing, error: existingError } = await supabase
    .from("review_department_reviews")
    .select("id")
    .eq("org_id", orgId)
    .eq("review_id", body.reviewId)
    .eq("department_id", departmentId)
    .maybeSingle();
  if (existingError) throw existingError;

  const query = existing
    ? supabase.from("review_department_reviews").update(payload).eq("id", existing.id)
    : supabase.from("review_department_reviews").insert(payload);
  const { data, error } = await query.select("id").single();
  if (error) throw error;
  return { id: data.id };
}

async function updateSampleLocation(supabase, orgId, body) {
  const { data: previous, error: previousError } = await supabase
    .from("samples")
    .select("location")
    .eq("org_id", orgId)
    .eq("id", body.sampleId)
    .single();
  if (previousError) throw previousError;

  const { error } = await supabase
    .from("samples")
    .update({ location: body.location, updated_at: new Date().toISOString() })
    .eq("org_id", orgId)
    .eq("id", body.sampleId);
  if (error) throw error;

  const { error: eventError } = await supabase
    .from("sample_location_events")
    .insert({
      org_id: orgId,
      sample_id: body.sampleId,
      from_location: previous.location,
      to_location: body.location,
      reason: body.reason || "页面更新",
    });
  if (eventError) throw eventError;
  return { sampleId: body.sampleId, location: body.location };
}

async function updateReviewDecision(supabase, orgId, body) {
  const status = body.finalDecision === "hold_shipment" ? "rework_verification" : "shipment_decision";
  const { error } = await supabase
    .from("reviews")
    .update({
      final_decision: body.finalDecision || "none",
      status,
      exception_reason: body.exceptionReason || null,
      exception_risk_note: body.exceptionRiskNote || null,
      exception_approval_status: body.exceptionApprovalStatus || null,
      customer_notified: Boolean(body.customerNotified),
      updated_at: new Date().toISOString(),
    })
    .eq("org_id", orgId)
    .eq("id", body.reviewId);
  if (error) throw error;
  return { reviewId: body.reviewId, finalDecision: body.finalDecision || "none", status };
}

async function updateIssueStatus(supabase, orgId, body) {
  const { error } = await supabase
    .from("issues")
    .update({ status: body.status || "closed", updated_at: new Date().toISOString() })
    .eq("org_id", orgId)
    .eq("id", body.issueId);
  if (error) throw error;
  return { issueId: body.issueId, status: body.status || "closed" };
}

async function createIssue(supabase, orgId, body) {
  const sourceDepartmentId = body.sourceDepartment ? await ensureDepartment(supabase, orgId, body.sourceDepartment) : null;
  const level = body.level || "normal";
  const shipmentBlocking = body.shipmentBlocking ?? ["major", "critical"].includes(level);
  const { data, error } = await supabase
    .from("issues")
    .insert({
      org_id: orgId,
      style_id: body.styleId,
      sample_id: body.sampleId || null,
      review_id: body.reviewId || null,
      title: body.title || "新增问题",
      description: body.description || "",
      source_department_id: sourceDepartmentId,
      related_area: body.relatedArea || "",
      level,
      shipment_blocking: Boolean(shipmentBlocking),
      can_ship_with_note: Boolean(body.canShipWithNote),
      status: body.status || "not_started",
      evidence_note: body.evidence || "手动新增",
    })
    .select("id")
    .single();
  if (error) throw error;
  return { issueId: data.id };
}

async function createStyle(supabase, orgId, body) {
  const styleNo = String(body.styleNo || "").trim();
  const styleName = String(body.styleName || "").trim();
  if (!styleNo || !styleName) throw new Error("styleNo and styleName are required");

  const samplePhase = body.samplePhase || "first_sample";
  const plannedShipDate = body.plannedShipDate || null;
  const now = new Date().toISOString();

  const { data: style, error: styleError } = await supabase
    .from("styles")
    .insert({
      org_id: orgId,
      external_ref: `style_${styleNo}_${Date.now()}`,
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
      next_action: "准备材料齐套后由负责人确认",
      blocker_summary: "准备闸口未完成",
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();
  if (styleError) throw styleError;

  const { data: sample, error: sampleError } = await supabase
    .from("samples")
    .insert({
      org_id: orgId,
      external_ref: `sample_${styleNo}_${Date.now()}`,
      style_id: style.id,
      sample_phase: samplePhase,
      version_name: body.versionName || "一次样",
      status: "preparation_blocked",
      location: body.sampleLocation || "未设置",
      planned_ship_date: plannedShipDate,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();
  if (sampleError) throw sampleError;

  const { data: review, error: reviewError } = await supabase
    .from("reviews")
    .insert({
      org_id: orgId,
      external_ref: `review_${styleNo}_${Date.now()}`,
      style_id: style.id,
      sample_id: sample.id,
      review_no: `SR-${styleNo}`,
      status: "not_started",
      final_decision: "none",
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();
  if (reviewError) throw reviewError;

  return { styleId: style.id, sampleId: sample.id, reviewId: review.id };
}

async function deleteStyle(supabase, orgId, body) {
  if (!body.styleId) throw new Error("styleId is required");
  const { error } = await supabase
    .from("styles")
    .delete()
    .eq("org_id", orgId)
    .eq("id", body.styleId);
  if (error) throw error;
  return { styleId: body.styleId };
}

async function createPerson(supabase, orgId, body) {
  const name = String(body.name || "").trim();
  if (!name) throw new Error("name is required");
  const id = body.id || `user_${Date.now()}`;
  const payload = {
    org_id: orgId,
    id,
    name,
    department: body.department || "",
    role_name: body.role || "",
    current_responsibility: body.currentResponsibility || "",
    review_responsibility: body.reviewResponsibility || "",
    permissions: body.permissions || [],
    scope: body.scope || [],
    avatar_color: body.avatarColor || "zhao",
    enabled: body.enabled !== false,
    is_gate_owner: Boolean(body.isGateOwner),
    is_final_approver: Boolean(body.isFinalApprover),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("sample_people")
    .upsert(payload, { onConflict: "org_id,id" })
    .select("id")
    .single();
  if (error) throw error;
  return { personId: data.id };
}

async function createWorker(supabase, orgId, body) {
  const name = String(body.name || "").trim();
  if (!name) throw new Error("name is required");
  const id = body.id || `worker_${Date.now()}`;
  const payload = {
    org_id: orgId,
    id,
    name,
    department: body.department || "",
    contact: body.contact || "",
    route: body.route || "",
    skill: body.skill || "",
    status: body.status || "可派发",
    task_count: Number(body.taskCount || 0),
    last_completed_at: body.lastCompletedAt || "",
    priority: body.priority || "",
    note: body.note || "",
    avatar_color: body.avatarColor || "liayi",
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("sample_workers")
    .upsert(payload, { onConflict: "org_id,id" })
    .select("id")
    .single();
  if (error) throw error;
  return { workerId: data.id };
}

async function deletePerson(supabase, orgId, body) {
  if (!body.personId) throw new Error("personId is required");
  const { error } = await supabase
    .from("sample_people")
    .delete()
    .eq("org_id", orgId)
    .eq("id", body.personId);
  if (error) throw error;
  return { personId: body.personId };
}

async function deleteWorker(supabase, orgId, body) {
  if (!body.workerId) throw new Error("workerId is required");
  const { error } = await supabase
    .from("sample_workers")
    .delete()
    .eq("org_id", orgId)
    .eq("id", body.workerId);
  if (error) throw error;
  return { workerId: body.workerId };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("allow", "POST");
    return json(res, 405, { error: "Method not allowed" });
  }

  try {
    const supabase = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false },
    });
    const orgId = await firstOrg(supabase);
    const body = await readJson(req);

    const handlers = {
      departmentReview: updateDepartmentReview,
      sampleLocation: updateSampleLocation,
      reviewDecision: updateReviewDecision,
      issueStatus: updateIssueStatus,
      createIssue,
      createStyle,
      deleteStyle,
      createPerson,
      createWorker,
      deletePerson,
      deleteWorker,
    };
    const action = handlers[body.action];
    if (!action) return json(res, 400, { error: "Unknown sync action" });

    const result = await action(supabase, orgId, body);
    return json(res, 200, { ok: true, action: body.action, result });
  } catch (error) {
    return json(res, 500, { error: "Could not sync Sample OS data", detail: error.message });
  }
}
