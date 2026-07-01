import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@supabase/supabase-js";

const SAMPLE_OS_TEST_STYLE_ID = "style_212";
const SAMPLE_OS_SINGLE_STYLE_MODE = true;

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

function cleanDateTime(value) {
  if (!value) return "";
  return String(value).replace("T", " ").slice(0, 16);
}

function profileName(profileMap, id) {
  return id ? profileMap.get(id)?.display_name || null : null;
}

function matchesTestStyle(style) {
  if (!SAMPLE_OS_SINGLE_STYLE_MODE) return true;
  return style?.external_ref === SAMPLE_OS_TEST_STYLE_ID || style?.id === SAMPLE_OS_TEST_STYLE_ID || String(style?.style_no || "") === "212";
}

async function mediaAccessUrl(s3, item) {
  if (!s3 || !item.s3_bucket || !item.s3_object_key) return null;
  const command = new GetObjectCommand({
    Bucket: item.s3_bucket,
    Key: item.s3_object_key,
  });
  return getSignedUrl(s3, command, { expiresIn: 900 });
}

async function firstOrg(supabase) {
  const { data: orgs, error } = await supabase
    .from("organizations")
    .select("id, name")
    .order("created_at", { ascending: true })
    .limit(1);
  if (error) throw error;
  if (orgs?.[0]) return orgs[0];

  const { data: org, error: insertError } = await supabase
    .from("organizations")
    .insert({ name: "万誉" })
    .select("id, name")
    .single();
  if (insertError) throw insertError;
  return org;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("allow", "GET");
    return json(res, 405, { error: "Method not allowed" });
  }

  try {
    const supabase = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false },
    });
    const org = await firstOrg(supabase);

    const [
      profilesResult,
      departmentsResult,
      stylesResult,
      samplesResult,
      reviewsResult,
      departmentReviewsResult,
      issuesResult,
      mediaResult,
      peopleResult,
      workersResult,
      settingsResult,
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("org_id", org.id),
      supabase.from("departments").select("*").eq("org_id", org.id),
      supabase.from("styles").select("*").eq("org_id", org.id).order("planned_ship_date", { ascending: true, nullsFirst: false }),
      supabase.from("samples").select("*").eq("org_id", org.id).order("created_at", { ascending: true }),
      supabase.from("reviews").select("*").eq("org_id", org.id).order("created_at", { ascending: true }),
      supabase.from("review_department_reviews").select("*").eq("org_id", org.id).order("created_at", { ascending: true }),
      supabase.from("issues").select("*").eq("org_id", org.id).order("created_at", { ascending: true }),
      supabase.from("sample_media").select("*").eq("org_id", org.id).order("created_at", { ascending: true }),
      supabase.from("sample_people").select("*").eq("org_id", org.id).order("created_at", { ascending: true }),
      supabase.from("sample_workers").select("*").eq("org_id", org.id).order("created_at", { ascending: true }),
      supabase.from("sample_settings").select("*").eq("org_id", org.id),
    ]);

    const results = [profilesResult, departmentsResult, stylesResult, samplesResult, reviewsResult, departmentReviewsResult, issuesResult, mediaResult, peopleResult, workersResult, settingsResult];
    const firstError = results.find((result) => result.error)?.error;
    if (firstError) throw firstError;

    const profiles = profilesResult.data || [];
    const departments = departmentsResult.data || [];
    const allStyles = stylesResult.data || [];
    const selectedStyles = SAMPLE_OS_SINGLE_STYLE_MODE ? allStyles.filter(matchesTestStyle).slice(0, 1) : allStyles;
    const selectedStyleIds = new Set(selectedStyles.map((style) => style.id));
    const allSamples = samplesResult.data || [];
    const samples = SAMPLE_OS_SINGLE_STYLE_MODE ? allSamples.filter((sample) => selectedStyleIds.has(sample.style_id)) : allSamples;
    const selectedSampleIds = new Set(samples.map((sample) => sample.id));
    const allReviews = reviewsResult.data || [];
    const reviews = SAMPLE_OS_SINGLE_STYLE_MODE ? allReviews.filter((review) => selectedStyleIds.has(review.style_id) || selectedSampleIds.has(review.sample_id)) : allReviews;
    const selectedReviewIds = new Set(reviews.map((review) => review.id));
    const allDepartmentReviews = departmentReviewsResult.data || [];
    const departmentReviews = SAMPLE_OS_SINGLE_STYLE_MODE ? allDepartmentReviews.filter((item) => selectedReviewIds.has(item.review_id)) : allDepartmentReviews;
    const allIssues = issuesResult.data || [];
    const issues = SAMPLE_OS_SINGLE_STYLE_MODE ? allIssues.filter((issue) => selectedStyleIds.has(issue.style_id) || selectedSampleIds.has(issue.sample_id) || selectedReviewIds.has(issue.review_id)) : allIssues;
    const allMedia = mediaResult.data || [];
    const media = SAMPLE_OS_SINGLE_STYLE_MODE ? allMedia.filter((item) => selectedSampleIds.has(item.sample_id)) : allMedia;
    const styles = selectedStyles;
    const people = peopleResult.data || [];
    const workers = workersResult.data || [];
    const settings = settingsResult.data || [];
    const settingsMap = Object.fromEntries(settings.map((item) => [item.key, item.value]));
    const s3 = process.env.AWS_REGION ? new S3Client({ region: process.env.AWS_REGION }) : null;

    const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
    const departmentMap = new Map(departments.map((department) => [department.id, department]));
    const sampleReviewMap = new Map(reviews.map((review) => [review.sample_id, review]));
    const sampleByStyleMap = new Map(samples.map((sample) => [sample.style_id, sample]));
    const reviewIssueMap = new Map();
    issues.forEach((issue) => {
      if (!issue.review_id) return;
      reviewIssueMap.set(issue.review_id, [...(reviewIssueMap.get(issue.review_id) || []), issue.id]);
    });

    const samplePayload = await Promise.all(samples.map(async (sample) => {
      const review = sampleReviewMap.get(sample.id);
      const mediaList = await Promise.all(media.filter((item) => item.sample_id === sample.id).map(async (item) => ({
        id: item.id,
        label: item.label || "已上传文件",
        fileName: item.s3_object_key?.split("/").pop() || item.label || "已上传文件",
        mediaKind: item.media_kind,
        mimeType: item.mime_type,
        byteSize: item.byte_size,
        uploadedAt: cleanDateTime(item.created_at),
        url: await mediaAccessUrl(s3, item),
      })));
      return {
        id: sample.id,
        externalRef: sample.external_ref,
        styleId: sample.style_id,
        samplePhase: sample.sample_phase,
        versionName: sample.version_name,
        status: sample.status,
        location: SAMPLE_OS_SINGLE_STYLE_MODE ? "样衣间" : (sample.location || "未设置"),
        holder: profileName(profileMap, sample.holder_profile_id) || "未指定",
        createdAt: cleanDateTime(sample.created_at),
        updatedAt: cleanDateTime(sample.updated_at),
        imageList: [],
        videoList: [],
        mediaList,
        reviewId: review?.id || null,
        plannedShipDate: SAMPLE_OS_SINGLE_STYLE_MODE ? "2026-06-30" : (sample.planned_ship_date || ""),
      };
    }));

    const payload = {
      currentStyleId: styles[0]?.id || null,
      currentReviewId: reviews[0]?.id || null,
      source: {
        kind: "supabase",
        orgId: org.id,
        orgName: org.name,
        singleStyleMode: SAMPLE_OS_SINGLE_STYLE_MODE,
        testStyleId: SAMPLE_OS_TEST_STYLE_ID,
        loadedAt: new Date().toISOString(),
      },
      settings: settingsMap,
      gateRules: settingsMap.gateRules || undefined,
      styleList: styles.map((style) => ({
        id: style.id,
        externalRef: style.external_ref,
        styleNo: style.style_no,
        brand: style.brand,
        season: style.season || "",
        styleName: style.style_name,
        category: style.category || "",
        route: style.route || "normal",
        currentGate: style.current_gate || "business_input",
        samplePhase: style.sample_phase || "first_sample",
        sampleLocation: SAMPLE_OS_SINGLE_STYLE_MODE ? "样衣间" : (sampleByStyleMap.get(style.id)?.location || ""),
        currentOwner: [],
        gateOwner: style.gate_owner_id || null,
        finalApprover: style.final_approver_id || null,
        plannedShipDate: SAMPLE_OS_SINGLE_STYLE_MODE ? "2026-06-30" : (style.planned_ship_date || ""),
        riskStatus: style.risk_status || "normal",
        nextAction: style.next_action || "",
        blockerSummary: style.blocker_summary || "",
        sampleVariants: Array.isArray(style.sample_variants) ? style.sample_variants : [],
        quantity: Number(style.quantity || 1),
      })),
      samples: samplePayload,
      reviews: reviews.map((review) => ({
        id: review.id,
        externalRef: review.external_ref,
        styleId: review.style_id,
        sampleId: review.sample_id,
        reviewNo: review.review_no,
        status: review.status,
        gateOwner: review.gate_owner_id || null,
        finalApprover: review.final_approver_id || null,
        issueIds: reviewIssueMap.get(review.id) || [],
        finalDecision: review.final_decision || "none",
        exceptionRequest: review.exception_reason || review.exception_risk_note || review.exception_approval_status
          ? {
            reason: review.exception_reason || "",
            riskNote: review.exception_risk_note || "",
            applicant: review.exception_applicant_id || null,
            approver: review.exception_approver_id || review.final_approver_id || null,
            customerNotified: Boolean(review.customer_notified),
            approvalStatus: review.exception_approval_status || "未申请",
          }
          : null,
        timeline: [
          { time: cleanDateTime(review.updated_at) || "现在", type: "black", text: `Supabase · 载入评审 ${review.review_no}` },
        ],
        departmentReviews: departmentReviews.filter((item) => item.review_id === review.id).map((item) => ({
          id: item.id,
          department: departmentMap.get(item.department_id)?.name || "未指定部门",
          role: item.role_name || "评审员",
          reviewer: item.reviewer_id || null,
          status: item.status || "pending",
          opinion: item.opinion || "",
          focusTags: item.focus_tags || [],
          issueIds: [],
          reviewedAt: cleanDateTime(item.reviewed_at || item.created_at),
        })),
      })),
      issues: issues.map((issue) => ({
        id: issue.id,
        externalRef: issue.external_ref,
        styleId: issue.style_id,
        sampleId: issue.sample_id,
        reviewId: issue.review_id,
        title: issue.title,
        description: issue.description || "",
        sourceDepartment: departmentMap.get(issue.source_department_id)?.name || "未指定",
        relatedArea: issue.related_area || "",
        level: issue.level,
        shipmentBlocking: Boolean(issue.shipment_blocking),
        canShipWithNote: Boolean(issue.can_ship_with_note),
        owner: issue.owner_id || null,
        dueDate: cleanDateTime(issue.due_at),
        status: issue.status,
        verifier: issue.verifier_id || null,
        evidence: issue.evidence_note || "",
        createdAt: cleanDateTime(issue.created_at),
        updatedAt: cleanDateTime(issue.updated_at),
      })),
      users: people.map((person) => ({
        id: person.id,
        name: person.name,
        department: person.department || "",
        role: person.role_name || "",
        currentResponsibility: person.current_responsibility || "",
        reviewResponsibility: person.review_responsibility || "",
        permissions: person.permissions || [],
        scope: person.scope || [],
        avatarColor: person.avatar_color || "zhao",
        enabled: person.enabled !== false,
        isGateOwner: Boolean(person.is_gate_owner),
        isFinalApprover: Boolean(person.is_final_approver),
      })),
      workers: workers.map((worker) => ({
        id: worker.id,
        name: worker.name,
        department: worker.department || "",
        contact: worker.contact || "",
        route: worker.route || "",
        skill: worker.skill || "",
        status: worker.status || "可派发",
        taskCount: worker.task_count || 0,
        lastCompletedAt: worker.last_completed_at || "",
        priority: worker.priority || "",
        note: worker.note || "",
        avatarColor: worker.avatar_color || "liayi",
      })),
    };

    return json(res, 200, payload);
  } catch (error) {
    return json(res, 500, { error: "Could not load Sample OS data", detail: error.message });
  }
}
