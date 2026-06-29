import { createClient } from "@supabase/supabase-js";

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
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

  const token = getBearerToken(req);
  if (!token) {
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

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, org_id")
    .eq("user_id", userData.user.id)
    .single();

  if (profileError || !profile) return null;
  return { supabase, profile };
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

    const { data: style, error: styleError } = await supabase
      .from("styles")
      .upsert({
        org_id: profile.org_id,
        external_ref: "style_212",
        style_no: "212",
        brand: "萨洛蒙",
        season: "SS27",
        style_name: "户外冲锋衣",
        category: "夹克",
        route: "normal",
        current_gate: "sample_review_gate",
        sample_phase: "second_sample",
        risk_status: "blocked",
        planned_ship_date: "2026-06-28",
        next_action: "确认质量与工艺问题责任人",
        blocker_summary: "2 个问题阻止寄样",
      }, { onConflict: "org_id,external_ref" })
      .select("id")
      .single();

    if (styleError) return json(res, 400, { error: "Could not seed style", detail: styleError.message });

    const { data: sample, error: sampleError } = await supabase
      .from("samples")
      .upsert({
        org_id: profile.org_id,
        external_ref: "sample_212_2",
        style_id: style.id,
        sample_phase: "second_sample",
        version_name: "二次样",
        status: "reviewing",
        location: "开发车间",
        planned_ship_date: "2026-06-28",
      }, { onConflict: "org_id,external_ref" })
      .select("id")
      .single();

    if (sampleError) return json(res, 400, { error: "Could not seed sample", detail: sampleError.message });

    const { data: review, error: reviewError } = await supabase
      .from("reviews")
      .upsert({
        org_id: profile.org_id,
        external_ref: "review_212_second",
        style_id: style.id,
        sample_id: sample.id,
        review_no: "SR-002",
        status: "reviewing",
        final_decision: "none",
        exception_reason: "客户会议 / 交期风险 / 样衣用途",
        exception_risk_note: "重大问题带说明寄样，客户需知晓风险。",
        exception_approval_status: "待审批",
      }, { onConflict: "org_id,external_ref" })
      .select("id")
      .single();

    if (reviewError) return json(res, 400, { error: "Could not seed review", detail: reviewError.message });

    return json(res, 200, {
      seeded: true,
      refs: {
        styleExternalRef: "style_212",
        sampleExternalRef: "sample_212_2",
        reviewExternalRef: "review_212_second",
      },
      ids: {
        styleId: style.id,
        sampleId: sample.id,
        reviewId: review.id,
      },
    });
  } catch (error) {
    return json(res, 500, { error: "Could not seed demo data", detail: error.message });
  }
}
