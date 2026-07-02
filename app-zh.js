const titleMap = {
  pipeline: "开发流水线",
  style: "单款详情",
  review: "样衣评审",
  calendar: "样衣交期日历",
  prep: "开发准备 / 卡点追踪",
  settings: "设置",
  handoff: "大货交接预览",
  inbox: "沟通收件箱",
};

const titleMapJa = {
  pipeline: "開発パイプライン",
  style: "スタイル詳細",
  review: "サンプルレビュー",
  calendar: "サンプル納期カレンダー",
  prep: "開発準備 / ボトルネック",
  settings: "設定",
  handoff: "量産引き継ぎプレビュー",
  inbox: "コミュニケーション受信箱",
};

const navLabelMap = {
  pipeline: { zh: "开发流水线", ja: "開発パイプライン" },
  review: { zh: "样衣评审", ja: "サンプルレビュー" },
  calendar: { zh: "样衣日历", ja: "サンプルカレンダー" },
  settings: { zh: "设置", ja: "設定" },
  handoff: { zh: "转大货交接", ja: "量産引き継ぎ" },
  inbox: { zh: "沟通入口", ja: "連絡入口" },
};

let currentLang = "zh";
let settingsRoleTab = "templates";
const SAMPLE_OS_TEST_STYLE_ID = "style_212";
const SAMPLE_OS_SINGLE_STYLE_MODE = false;

const views = document.querySelectorAll(".view");
const title = document.querySelector("#view-title");
const drawer = document.querySelector("#issue-drawer");
const personDrawer = document.querySelector("#person-drawer");
const styleDrawer = document.querySelector("#style-drawer");
const modalRoot = document.querySelector("#modal-root");
const closeDrawer = document.querySelector("#close-drawer");
const closePersonDrawer = document.querySelector("#close-person-drawer");
const closeStyleDrawer = document.querySelector("#close-style-drawer");
const os = window.SampleOS;
const topSearchInput = document.querySelector(".topbar input[type='search']");
const topActions = document.querySelector(".top-actions");
const topPrimaryButton = document.querySelector(".top-actions .primary-button");
const userAccountRole = document.querySelector(".user-account small");
const userAccountName = document.querySelector(".user-account strong");
const editingReviewRows = new Set();
const pipelineFilters = new Set();
const calendarFilters = new Set();
const calendarState = { monthOffset: 0, brand: "" };
const mediaUploadState = { active: false, status: "idle", fileName: "", progress: 0, message: "", error: "", kind: "" };
let mediaViewerState = { mediaId: null, index: 0, items: [], touchStartX: 0, touchStartY: 0 };
const issueAreas = ["正面", "背面", "领口 / 帽口", "袖口", "下摆", "口袋", "前中拉链", "压胶缝", "面料", "辅料", "包装 / 吊牌 / 洗标", "其他"];
const evidenceTypes = ["图片", "视频", "测量数据", "客户 Comment", "TP / BOM 对比", "页面新增", "无证据"];
const issueLevelHelp = {
  minor: "轻微：不影响客户判断、不影响穿着、不影响结构。可寄样，但必须记录。",
  normal: "一般：影响外观或完整性，但可短期修改或说明。由 Gate Owner 判断是否修改后寄样。",
  major: "重大：影响客户判断、关键尺寸、功能、工艺或量产可行性。默认阻止寄样，除非例外放行。",
  critical: "严重：方向错误、面料错误、颜色错误、功能失效、重大质量风险。必须暂停寄样，复验后重新评审。",
};
const departmentStatusHelp = {
  pass: "该部门未发现需要跟踪的问题。",
  needs_improvement: "存在问题，但不一定阻止寄样。如需整改或复验，请转为 Issue。",
  fail: "存在重大风险，必须转为 Issue，并由评审负责人判断是否阻止寄样。",
  pending: "等待该部门提交专业意见。",
};
const roleTemplates = [
  { id: "business_pm", name: "Business PM / 业务负责人", type: "评审角色", stages: ["开发准备", "样衣评审"], responsibility: "确认客户邮件、TP、BOM、Comment、颜色、辅料、交期、寄样目的是否一致", permissions: ["发起开发", "补充资料", "提交意见", "创建 Issue", "申请寄样"], reviewDefault: "是", finalRelease: "否", exceptionRelease: "否", people: ["顾瑶", "顾永宏"], reviewRole: "业务负责人", focusTags: ["客户邮件", "TP", "BOM", "Comment", "颜色", "辅料", "交期", "寄样目的"] },
  { id: "pattern_reviewer", name: "Pattern Reviewer / 版型评审员", type: "评审角色", stages: ["样衣评审"], responsibility: "评审版型、关键尺寸、公差、结构、左右对称、纸样与实物一致性", permissions: ["提交意见", "创建尺寸/版型 Issue", "复验版型问题"], reviewDefault: "是", finalRelease: "否", exceptionRelease: "否", people: ["徐海燕"], reviewRole: "版型评审员", focusTags: ["版型", "关键尺寸", "公差", "结构", "左右对称", "纸样一致性"] },
  { id: "quality_reviewer", name: "Quality Reviewer / 品质评审员", type: "评审角色", stages: ["样衣评审", "整改复验"], responsibility: "确认外观、尺寸、历史问题、测试需求，判断是否存在质量阻断风险", permissions: ["提交意见", "创建质量 Issue", "复验 Issue", "提出质量判断建议"], reviewDefault: "是", finalRelease: "否", exceptionRelease: "否", people: ["大前"], reviewRole: "品质评审员", focusTags: ["外观", "尺寸", "历史问题", "测试需求", "质量阻断风险"] },
  { id: "process_reviewer", name: "Process Reviewer / 工艺评审员", type: "评审角色", stages: ["样衣评审", "工艺验证"], responsibility: "确认缝制、压胶、无缝工艺是否可执行，是否存在量产难点或工艺风险", permissions: ["提交意见", "创建工艺 Issue", "要求工艺小样验证"], reviewDefault: "是", finalRelease: "否", exceptionRelease: "否", people: ["陈工艺"], reviewRole: "工艺评审员", focusTags: ["缝制", "压胶", "无缝工艺", "量产难点", "工艺风险"] },
  { id: "ie_reviewer", name: "IE Reviewer / IE 评审员", type: "评审角色", stages: ["样衣评审", "量产可行性评估"], responsibility: "确认工时、瓶颈、设备需求、人员配置、产能和大货节拍风险", permissions: ["提交意见", "创建 IE Issue", "提出量产可行性建议"], reviewDefault: "是", finalRelease: "否", exceptionRelease: "否", people: ["麦克"], reviewRole: "IE 评审员", focusTags: ["工时", "瓶颈", "设备", "人员配置", "产能", "大货节拍"] },
  { id: "sample_feedback_owner", name: "Sample Feedback Owner / 打样反馈人", type: "流程角色", stages: ["打样完成", "样衣评审"], responsibility: "反馈实际打样过程中的资料不清、材料不齐、返工、临时改法和制作难点", permissions: ["提交意见", "创建打样异常 Issue"], reviewDefault: "是", finalRelease: "否", exceptionRelease: "否", people: ["李师傅"], reviewRole: "打样反馈人", focusTags: ["资料不清", "材料不齐", "返工", "临时改法", "制作难点"] },
  { id: "material_owner", name: "Material Owner / 面料负责人", type: "流程角色", stages: ["开发准备", "资料确认"], responsibility: "确认面料是否齐套、颜色/批次/缩率/预缩是否存在风险", permissions: ["面料确认", "创建面料 Issue", "更新面料状态"], reviewDefault: "否，必要时参与", finalRelease: "否", exceptionRelease: "否", people: ["李卫红"], reviewRole: "面料负责人", focusTags: ["面料齐套", "颜色", "批次", "缩率", "预缩"] },
  { id: "trim_owner", name: "Trim Owner / 辅料负责人", type: "流程角色", stages: ["开发准备", "资料确认"], responsibility: "确认拉链、扣具、织带、洗标、吊牌等辅料是否齐套并符合要求", permissions: ["辅料确认", "创建辅料 Issue", "更新辅料状态"], reviewDefault: "否，必要时参与", finalRelease: "否", exceptionRelease: "否", people: ["大红"], reviewRole: "辅料负责人", focusTags: ["拉链", "扣具", "织带", "洗标", "吊牌"] },
  { id: "preparation_gate_owner", name: "Preparation Gate Owner / 资料确认人", type: "Gate 角色", stages: ["准备闸口"], responsibility: "确认版子、面料、辅料、原样、客户要求是否齐全，确认后推进派发打样", permissions: ["资料确认", "推进到派发打样", "组织资料补齐"], reviewDefault: "否", finalRelease: "否", exceptionRelease: "否", people: ["王部长"], reviewRole: "资料确认人", focusTags: ["版子", "面料", "辅料", "原样", "客户要求"] },
  { id: "sample_dispatcher", name: "Sample Dispatcher / 普通打样派发人", type: "流程角色", stages: ["打样派发"], responsibility: "根据资料确认结果分配普通打样人员", permissions: ["派发打样", "普通打样", "提交异常"], reviewDefault: "否", finalRelease: "否", exceptionRelease: "否", people: ["大戴"], reviewRole: "普通打样派发人", focusTags: ["派发打样", "普通打样", "打样异常"] },
  { id: "bonding_owner", name: "Bonding Development Owner / 压胶开发负责人", type: "路线角色", stages: ["压胶开发确认"], responsibility: "确认压胶款式是否进入新长江流程，判断压胶工艺开发风险", permissions: ["压胶开发", "创建压胶 Issue", "要求工艺验证"], reviewDefault: "压胶款默认参与", finalRelease: "否", exceptionRelease: "否", people: ["张部长"], reviewRole: "压胶开发负责人", focusTags: ["压胶开发", "新长江流程", "工艺开发风险"] },
  { id: "xinchangjiang_dispatcher", name: "Xinchangjiang Dispatcher / 新长江派发人", type: "路线角色", stages: ["新长江派发"], responsibility: "负责新长江打样人员分配和现场执行状态更新", permissions: ["新长江派发", "派发打样", "提交异常"], reviewDefault: "否", finalRelease: "否", exceptionRelease: "否", people: ["夏红霞"], reviewRole: "新长江派发人", focusTags: ["新长江派发", "现场执行", "状态更新"] },
  { id: "sample_review_gate_owner", name: "Sample Review Gate Owner / 样衣评审负责人", type: "Gate 角色", stages: ["样衣评审", "寄样决策"], responsibility: "组织样衣评审、确认 Issue 等级、判断是否阻塞寄样、做最终寄样结论", permissions: ["确认问题等级", "复验问题", "最终放行", "阻止寄样"], reviewDefault: "是", finalRelease: "是", exceptionRelease: "否", people: ["大前"], reviewRole: "样衣评审负责人", focusTags: ["Issue 等级", "阻塞寄样", "最终寄样结论"] },
  { id: "final_approver", name: "Final Approver / 例外放行审批人", type: "审批角色", stages: ["例外放行", "重大争议"], responsibility: "处理重大问题带风险寄样、跨部门争议、例外放行审批", permissions: ["例外放行", "争议裁决"], reviewDefault: "否，仅例外时出现", finalRelease: "仅例外放行", exceptionRelease: "是", people: ["杨总"], reviewRole: "例外放行审批人", focusTags: ["例外放行", "重大争议"] },
  { id: "production_reviewer", name: "Production Reviewer / 生产评审员", type: "可选评审角色", stages: ["量产可行性评估"], responsibility: "从大货现场角度确认样衣工艺是否能稳定复制，确认设备、人员、产线组织能力", permissions: ["提交意见", "创建量产风险 Issue"], reviewDefault: "可选，压胶/复杂款建议参与", finalRelease: "否", exceptionRelease: "否", people: [], reviewRole: "生产评审员", focusTags: ["大货复制", "设备", "人员", "产线组织"] },
  { id: "measurement_reviewer", name: "Measurement Reviewer / 尺寸测量员", type: "可选评审角色", stages: ["样衣评审", "复验"], responsibility: "按统一量法测量关键尺寸，记录实测数据，标记超公差部位", permissions: ["提交尺寸复核", "创建尺寸 Issue", "上传测量表", "复验尺寸整改"], reviewDefault: "可选，尺寸风险款建议参与", finalRelease: "否", exceptionRelease: "否", people: [], reviewRole: "尺寸测量员", focusTags: ["关键尺寸", "实测数据", "超公差"] },
  { id: "lab_testing_owner", name: "Lab & Testing Owner / 测试负责人", type: "可选评审角色", stages: ["测试确认", "压胶/功能样评审"], responsibility: "判断是否需要洗后、拉力、剥离、防水、色牢度等测试，上传测试报告并确认结果", permissions: ["创建测试 Issue", "上传测试报告", "确认测试结果", "要求复验"], reviewDefault: "可选，压胶/功能款建议参与", finalRelease: "否", exceptionRelease: "否", people: [], reviewRole: "测试负责人", focusTags: ["洗后", "拉力", "剥离", "防水", "色牢度"] },
  { id: "sample_keeper", name: "Sample Keeper / 样衣管理员", type: "流程角色", stages: ["样衣位置管理"], responsibility: "维护样衣位置，确认当前持有人，记录样衣流转", permissions: ["更新样衣位置", "上传位置记录", "确认已寄出"], reviewDefault: "否", finalRelease: "否", exceptionRelease: "否", people: [], reviewRole: "样衣管理员", focusTags: ["样衣位置", "持有人", "流转记录"] },
  { id: "shipment_owner", name: "Sample Shipment Owner / 寄样负责人", type: "流程角色", stages: ["寄样执行"], responsibility: "根据 Gate Owner 的寄样结论执行寄样，填写快递单号，更新样衣状态", permissions: ["执行寄样", "填写快递单号", "更新样衣位置", "上传寄样凭证"], reviewDefault: "否", finalRelease: "否", exceptionRelease: "否", people: [], reviewRole: "寄样负责人", focusTags: ["寄样执行", "快递单号", "寄样凭证"] },
  { id: "document_controller", name: "Document Controller / 资料版本管理员", type: "流程角色", stages: ["资料管理"], responsibility: "确认当前使用的是最新 TP、BOM、纸样、客户 Comment，维护资料版本，标记旧版作废", permissions: ["上传资料", "标记资料版本", "作废旧版本", "创建资料不一致 Issue"], reviewDefault: "否", finalRelease: "否", exceptionRelease: "否", people: [], reviewRole: "资料版本管理员", focusTags: ["TP", "BOM", "纸样", "客户 Comment", "资料版本"] },
];
const glowTargets = [
  ".summary-card",
  ".section-block",
  ".style-header",
  ".review-hero",
  ".location-card",
  ".gate-owner-card",
  ".review-photo",
  ".row.data-row",
  ".calendar-item",
  ".training-card",
  ".material-card",
  ".blocker-card",
  ".tab",
  ".filter-button",
  ".workspace-tab",
  ".primary-button",
  ".row-action",
  ".pipeline-actions button",
  ".modal-actions button",
  ".drawer-actions button",
  ".decision-stack button",
  ".icon-button",
  ".user-account",
].join(",");

function esc(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

function updatePointerGlow(event) {
  const target = event.target.closest(glowTargets);
  if (!target) return;
  const rect = target.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;
  target.style.setProperty("--mx", `${Math.max(0, Math.min(100, x)).toFixed(1)}%`);
  target.style.setProperty("--my", `${Math.max(0, Math.min(100, y)).toFixed(1)}%`);
}

function showView(viewId) {
  if (!titleMap[viewId]) return;
  views.forEach((view) => view.classList.toggle("active", view.id === viewId));
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === viewId));
  title.textContent = (currentLang === "ja" ? titleMapJa : titleMap)[viewId];
  updateLanguageChrome();
  updateTopbar(viewId);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateLanguageChrome() {
  const lang = currentLang === "ja" ? "ja" : "zh";
  document.documentElement.lang = lang === "ja" ? "ja" : "zh-CN";
  document.querySelectorAll(".nav-item[data-view], .nav-item[data-nav-key]").forEach((item) => {
    const icon = item.querySelector(".nav-icon")?.textContent || "";
    const label = navLabelMap[item.dataset.view || item.dataset.navKey]?.[lang];
    if (label) item.innerHTML = `<span class="nav-icon">${esc(icon)}</span>${esc(label)}`;
  });
  const eyebrow = document.querySelector(".topbar .eyebrow");
  if (eyebrow) eyebrow.textContent = lang === "ja" ? "VANWELL / サンプルレビューシステム" : "万誉服饰 / 样衣评审系统";
  renderSidebarMetrics();
}

function showToast(message) {
  let toast = document.querySelector(".sampleos-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "sampleos-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2400);
}

function matchesTestStyle(style) {
  if (!SAMPLE_OS_SINGLE_STYLE_MODE) return true;
  return style?.externalRef === SAMPLE_OS_TEST_STYLE_ID || style?.id === SAMPLE_OS_TEST_STYLE_ID || String(style?.styleNo || "") === "212";
}

function filterSingleStylePayload(payload) {
  if (!SAMPLE_OS_SINGLE_STYLE_MODE || !payload) return payload;
  const filtered = { ...payload };
  const styles = Array.isArray(payload.styleList) ? payload.styleList.filter(matchesTestStyle).slice(0, 1) : [];
  const styleIds = new Set(styles.map((style) => style.id));
  const samples = Array.isArray(payload.samples) ? payload.samples.filter((sample) => styleIds.has(sample.styleId)) : [];
  const sampleIds = new Set(samples.map((sample) => sample.id));
  const reviews = Array.isArray(payload.reviews) ? payload.reviews.filter((review) => styleIds.has(review.styleId) || sampleIds.has(review.sampleId)) : [];
  const reviewIds = new Set(reviews.map((review) => review.id));
  filtered.styleList = styles;
  filtered.samples = samples;
  filtered.reviews = reviews;
  filtered.issues = Array.isArray(payload.issues) ? payload.issues.filter((issue) => styleIds.has(issue.styleId) || sampleIds.has(issue.sampleId) || reviewIds.has(issue.reviewId)) : [];
  filtered.currentStyleId = styles[0]?.id || null;
  filtered.currentReviewId = reviews.find((review) => review.styleId === filtered.currentStyleId)?.id || reviews[0]?.id || null;
  return filtered;
}

function applySnapshot(snapshot) {
  if (!snapshot || snapshot.source?.kind !== "supabase") return;
  snapshot = filterSingleStylePayload(snapshot);
  if (SAMPLE_OS_SINGLE_STYLE_MODE && !snapshot.styleList?.length) {
    throw new Error(`Supabase 中未找到测试款式 ${SAMPLE_OS_TEST_STYLE_ID}`);
  }
  ["styleList", "samples", "reviews", "issues", "users", "workers"].forEach((key) => {
    if (Array.isArray(snapshot[key])) os.data[key] = snapshot[key];
  });
  const settingKeys = [
    "issueLevelRules",
    "sampleLocations",
    "sampleLocationOptions",
    "sampleRoutes",
    "samplePhases",
    "routeRules",
    "ruleVersion",
    "locationTransitions",
    "trainingCards",
  ];
  settingKeys.forEach((key) => {
    if (snapshot.settings?.[key]) os.data[key] = snapshot.settings[key];
  });
  if (snapshot.gateRules) os.data.gateRules = { ...os.data.gateRules, ...snapshot.gateRules };
  if (Array.isArray(snapshot.users)) {
    os.data.departments = Array.from(new Set(snapshot.users.map((user) => user.department).filter(Boolean))).sort((a, b) => a.localeCompare(b, "zh-CN"));
    os.data.roles = Array.from(new Set(snapshot.users.map((user) => user.role).filter(Boolean))).sort((a, b) => a.localeCompare(b, "zh-CN"));
    os.data.departmentDetails = os.data.departments.map((department) => {
      const members = snapshot.users.filter((user) => user.department === department);
      const owner = members.find((user) => user.isGateOwner || user.isFinalApprover) || members[0];
      const reviewMembers = members.filter((user) => user.permissions?.some((permission) => ["提交意见", "创建问题", "复验问题", "版型评审"].includes(permission)));
      return {
        name: department,
        owner: owner?.name || "未指定",
        participatesInReview: reviewMembers.length > 0,
        receivesNotification: members.length > 0,
        issueTypes: Array.from(new Set(members.flatMap((user) => user.scope || []))).filter(Boolean),
        defaultReviewer: reviewMembers[0]?.name || owner?.name || "未指定",
      };
    });
    os.data.permissionMatrix = os.data.roles.map((role) => {
      const roleUsers = snapshot.users.filter((user) => user.role === role);
      return {
        role,
        permissions: Array.from(new Set(roleUsers.flatMap((user) => user.permissions || []))).filter(Boolean),
      };
    });
  }
  os.data.source = snapshot.source;
  os.data.singleStyleMode = SAMPLE_OS_SINGLE_STYLE_MODE;
  os.data.testStyleId = SAMPLE_OS_TEST_STYLE_ID;
  os.data.currentStyleId = snapshot.currentStyleId || os.data.styleList[0]?.id || null;
  os.data.currentReviewId = snapshot.currentReviewId || os.getActiveReviewByStyle(os.data.currentStyleId)?.id || os.data.reviews[0]?.id || null;
}

async function loadBackendSnapshot() {
  if (!window.SampleOSBackend?.loadSnapshot) return;
  try {
    const snapshot = await window.SampleOSBackend.loadSnapshot();
    applySnapshot(snapshot);
    renderAll();
    updateTopbar(document.querySelector(".view.active")?.id || "pipeline");
  } catch (error) {
    console.warn("Sample OS snapshot failed", error);
    showToast(`暂时使用本地数据：${error.message}`);
    os.data.source = { kind: "local-fallback", loadedAt: new Date().toISOString(), reason: error.message };
    renderAll();
    updateTopbar(document.querySelector(".view.active")?.id || "pipeline");
  }
}

function ensureAdminActions() {
  if (document.querySelector(".admin-actions")) return;
  const wrapper = document.createElement("div");
  wrapper.className = "admin-actions";
  wrapper.innerHTML = `
    <button class="row-action admin-only" type="button">+ 新增人员</button>
    <button class="row-action admin-only" type="button">+ 新增打样工人</button>
    <button class="row-action admin-only" type="button">保存配置</button>
  `;
  topActions?.insertBefore(wrapper, topPrimaryButton);
}

function updateTopbar(viewId) {
  ensureAdminActions();
  const isSettings = viewId === "settings";
  const isPipeline = viewId === "pipeline";
  if (topSearchInput) {
    topSearchInput.placeholder = isSettings ? "搜索人员、部门、角色、权限、流程节点" : "搜索款号、品牌、负责人";
  }
  if (topPrimaryButton) {
    topPrimaryButton.textContent = isSettings ? "发布规则" : "+ 新建款式";
    topPrimaryButton.style.display = isSettings || isPipeline ? "" : "none";
  }
  document.querySelector(".admin-actions")?.classList.toggle("show", isSettings);
  const currentUser = os.getUser(os.data.currentUserId);
  if (userAccountRole) userAccountRole.textContent = currentUser?.role || (isSettings ? "后台管理员" : "负责人");
  if (userAccountName) userAccountName.textContent = currentUser?.name || "顾瑶";
}

function avatar(userId) {
  const user = os.getUser(userId);
  return `<i class="avatar avatar-${esc(user?.avatarColor || "zhao")}"></i>${esc(user?.name || "未指定")}`;
}

function userByName(name) {
  return os.data.users.find((user) => user.name === name);
}

function roleAssignedUsers(template) {
  return template.people.map(userByName).filter(Boolean);
}

function roleAssignedLabel(template) {
  return template.people.length ? template.people.join("、") : "待分配";
}

function personRoleTemplates(user) {
  return roleTemplates.filter((template) => template.people.includes(user.name) || user.assignedRoleIds?.includes(template.id));
}

function inheritedPermissions(user) {
  const assigned = personRoleTemplates(user);
  const inherited = assigned.flatMap((template) => template.permissions);
  return Array.from(new Set(assigned.length ? inherited : (user.permissions || []))).filter(Boolean);
}

function defaultReviewRoleTemplates(style) {
  const requiredIds = ["business_pm", "pattern_reviewer", "quality_reviewer", "process_reviewer", "ie_reviewer", "sample_feedback_owner"];
  if (style?.route === "bonding_xinchangjiang") requiredIds.push("bonding_owner");
  return roleTemplates.filter((template) => requiredIds.includes(template.id));
}

function reviewDepartmentForTemplate(template) {
  const departmentMap = {
    business_pm: "业务部",
    pattern_reviewer: "版型部",
    quality_reviewer: "品质部",
    process_reviewer: "工艺部",
    ie_reviewer: "IE 部",
    sample_feedback_owner: "打样部",
    bonding_owner: "压胶开发",
  };
  return departmentMap[template.id] || template.reviewRole || template.name.split(" / ").pop();
}

function reviewRowFromRoleTemplate(template) {
  const assignedUser = roleAssignedUsers(template)[0];
  const assignedName = assignedUser?.name || template.people[0] || "待分配";
  return {
    id: `role_${template.id}`,
    roleTemplateId: template.id,
    department: reviewDepartmentForTemplate(template),
    role: template.reviewRole || template.name,
    reviewer: assignedUser?.id || null,
    reviewerName: assignedName,
    status: "pending",
    opinion: "",
    focusTags: template.focusTags || [],
    issueIds: [],
    reviewedAt: "",
  };
}

function mergeReviewRowsWithRoleTemplates(review) {
  const style = os.getStyleById(review.styleId);
  const defaults = defaultReviewRoleTemplates(style).map(reviewRowFromRoleTemplate);
  const existing = review.departmentReviews || [];
  return defaults.map((row) => {
    const saved = existing.find((item) => item.roleTemplateId === row.roleTemplateId || item.role === row.role || item.department === row.department);
    return saved ? { ...row, ...saved, department: row.department, roleTemplateId: row.roleTemplateId, reviewerName: row.reviewerName, focusTags: saved.focusTags?.length ? saved.focusTags : row.focusTags } : row;
  });
}

function statusClass(key) {
  if (["blocked", "hold_shipment", "overdue", "critical"].includes(key)) return "red";
  if (["waiting_exception", "gate_owner_decision", "approaching_due", "normal"].includes(key)) return "amber";
  if (["can_ship", "can_ship_with_record", "shipped", "completed", "exception_released"].includes(key)) return "green";
  return "blue";
}

function parseDate(value) {
  if (!value) return null;
  const [datePart] = String(value).split(/[ T]/);
  const parts = datePart.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function dateKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function startOfWeek(date) {
  const copy = new Date(date);
  const day = copy.getDay() || 7;
  copy.setDate(copy.getDate() - day + 1);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function getCalendarDate(summary) {
  return summary?.style?.plannedShipDate || summary?.sample?.plannedShipDate || "";
}

function isSpecialRoute(style) {
  const route = `${style?.route || ""} ${os.data.routeRules?.[style?.route]?.label || ""} ${os.data.sampleRoutes?.[style?.route] || ""}`;
  return /压胶|新长江|bond|xinchangjiang/i.test(route);
}

function styleMatchesCurrentUser(summary) {
  const userId = os.data.currentUserId;
  return summary.style?.currentOwner?.includes(userId)
    || summary.style?.gateOwner === userId
    || summary.style?.finalApprover === userId
    || summary.review?.gateOwner === userId
    || summary.review?.finalApprover === userId
    || summary.review?.departmentReviews?.some((item) => item.reviewer === userId);
}

function isBlockedSummary(summary) {
  return summary.blockingIssues.length > 0 || ["blocked", "hold_shipment", "waiting_exception"].includes(summary.shipmentStatus.key) || ["blocked", "waiting_exception"].includes(summary.calendarRisk);
}

function matchesPipelineFilters(summary) {
  for (const filter of pipelineFilters) {
    if (filter === "reviewing" && !(summary.review?.status === "reviewing" || summary.style.currentGate === "sample_review_gate")) return false;
    if (filter === "blocked" && !isBlockedSummary(summary)) return false;
    if (filter === "normal_route" && summary.style.route !== "normal") return false;
    if (filter === "has_blocking_issue" && !summary.blockingIssues.length) return false;
    if (filter === "gate_owner_decision" && !["gate_owner_decision", "blocked", "hold_shipment"].includes(summary.shipmentStatus.key)) return false;
    if (filter === "waiting_exception" && !(summary.shipmentStatus.key === "waiting_exception" || summary.calendarRisk === "waiting_exception")) return false;
  }
  return true;
}

function matchesCalendarFilters(summary) {
  const date = parseDate(getCalendarDate(summary));
  const today = new Date();
  const weekStart = startOfWeek(today);
  const weekEnd = addDays(weekStart, 6);
  for (const filter of calendarFilters) {
    if (filter === "mine" && !styleMatchesCurrentUser(summary)) return false;
    if (filter === "blocked" && !isBlockedSummary(summary)) return false;
    if (filter === "week" && (!date || date < weekStart || date > weekEnd)) return false;
    if (filter === "special_route" && !isSpecialRoute(summary.style)) return false;
    if (filter === "brand" && calendarState.brand && !String(summary.style.brand || "").includes(calendarState.brand)) return false;
  }
  return true;
}

function monthEventClass(risk) {
  if (risk === "blocked" || risk === "overdue") return "blocked";
  if (risk === "waiting_exception") return "exception";
  if (risk === "approaching_due") return "near";
  if (risk === "exception_released" || risk === "shipped") return "normal";
  return "normal";
}

function syncFilterButtons() {
  document.querySelectorAll("[data-pipeline-filter]").forEach((button) => button.classList.toggle("active", pipelineFilters.has(button.dataset.pipelineFilter)));
  document.querySelectorAll("[data-calendar-filter]").forEach((button) => {
    const active = button.dataset.calendarFilter === "brand" ? Boolean(calendarState.brand) : calendarFilters.has(button.dataset.calendarFilter);
    button.classList.toggle("active", active);
    if (button.dataset.calendarFilter === "brand") button.textContent = calendarState.brand ? `品牌：${calendarState.brand}` : "按品牌筛选";
  });
}

function renderSummary() {
  const stats = os.getStats();
  const el = document.querySelector("#pipeline .summary-grid");
  if (!el) return;
  el.innerHTML = `
    <div class="summary-card"><span>开发中款式</span><strong>${stats.activeStyles}</strong><small>${stats.reviewing} 个正在评审</small></div>
    <div class="summary-card"><span>样衣间样衣</span><strong>${stats.sampleRoomCount}</strong><small>含开发车间和样衣间</small></div>
    <div class="summary-card"><span>待负责人决策</span><strong>${stats.pendingOwnerDecision}</strong><small>由评审负责人判断</small></div>
    <div class="summary-card alert"><span>阻塞问题</span><strong>${stats.blockingIssues}</strong><small>影响寄样状态</small></div>
    <div class="summary-card exception"><span>待例外放行</span><strong>${stats.waitingException}</strong><small>客户会议或交期风险</small></div>
  `;
}

function renderSidebarMetrics() {
  const panel = document.querySelector(".side-panel");
  if (!panel) return;
  const stats = os.getStats();
  const activeStyle = os.getStyleById(os.data.currentStyleId);
  panel.innerHTML = `
    <div class="panel-label">${currentLang === "ja" ? "今日" : "今日"}</div>
    ${os.data.source?.kind === "local-fallback" ? `<div class="fallback-hint">${currentLang === "ja" ? "ローカルテストデータを使用中" : "当前使用本地测试数据"}</div>` : ""}
    <div class="side-metric">
      <span>${currentLang === "ja" ? "未解決課題" : "未关闭问题"}</span>
      <strong>${os.data.issues.filter((issue) => issue.status !== "closed").length}</strong>
    </div>
    <div class="side-metric">
      <span>${currentLang === "ja" ? "ブロック課題" : "阻塞问题"}</span>
      <strong>${stats.blockingIssues}</strong>
    </div>
    <div class="side-metric">
      <span>${currentLang === "ja" ? "現在スタイル" : "当前款式"}</span>
      <strong>${activeStyle?.styleNo || os.data.styleList.length}</strong>
    </div>
  `;
}

function dateText(value, fallback = "未记录") {
  return value ? esc(String(value).replace("T", " ").slice(0, 16)) : fallback;
}

function buildMaterialCards(summary) {
  const { style, sample, openIssues } = summary;
  const peopleByScope = (scope) => os.data.users.filter((user) => user.scope?.some((item) => item.includes(scope)) || user.reviewResponsibility?.includes(scope) || user.currentResponsibility?.includes(scope));
  const ownerFor = (scope, fallback) => peopleByScope(scope)[0]?.name || fallback;
  const s3MediaCount = sample?.mediaList?.length || 0;
  const hasMedia = Boolean(s3MediaCount);
  const prepBlocked = style?.currentGate === "preparation_gate";
  const materialIssueCount = (keyword) => openIssues.filter((issue) => `${issue.title} ${issue.description} ${issue.relatedArea} ${issue.sourceDepartment}`.includes(keyword)).length;
  return [
    {
      name: "客户资料已收到",
      state: prepBlocked ? "待补全" : "已确认",
      owner: ownerFor("业务", "业务负责人"),
      note: "客户邮件、Comment、寄样目的可在详情页继续补充",
      time: dateText(sample?.createdAt, "创建后补充"),
    },
    {
      name: "TP / 技术包已收到",
      state: prepBlocked ? "待上传" : "已上传",
      owner: ownerFor("业务", "业务负责人"),
      note: "创建后进入详情页上传 TP，并统一进入 S3",
      time: dateText(sample?.updatedAt, "等待上传"),
    },
    {
      name: "版子准备",
      state: prepBlocked || materialIssueCount("版") ? "待确认" : "已确认",
      owner: ownerFor("版", "版型负责人"),
      note: materialIssueCount("版") ? `${materialIssueCount("版")} 个版型相关问题未关闭` : "无未关闭版型问题",
      time: dateText(sample?.createdAt, "跟随样衣记录"),
    },
    {
      name: "面料准备",
      state: prepBlocked || materialIssueCount("面料") ? "待确认" : "已确认",
      owner: ownerFor("面料", "面料负责人"),
      note: materialIssueCount("面料") ? `${materialIssueCount("面料")} 个面料相关问题未关闭` : "无未关闭面料问题",
      time: dateText(sample?.updatedAt, "跟随样衣记录"),
    },
    {
      name: "辅料准备",
      state: prepBlocked || materialIssueCount("辅料") || materialIssueCount("拉链") ? "待确认" : "已确认",
      owner: ownerFor("辅料", "辅料负责人"),
      note: materialIssueCount("辅料") || materialIssueCount("拉链") ? "有辅料/拉链相关问题未关闭" : "无未关闭辅料问题",
      time: dateText(sample?.updatedAt, "跟随样衣记录"),
    },
    {
      name: "原样 / 样衣参考确认",
      state: hasMedia ? "已上传" : "待上传",
      owner: os.userName(os.data.currentUserId),
      note: hasMedia ? `${s3MediaCount} 个 S3 文件可作为参考` : "参考图片、原样图片创建后上传到 S3",
      time: dateText(sample?.updatedAt, "等待上传"),
    },
    {
      name: "打样资料待王部长确认",
      state: prepBlocked ? "待确认" : "已确认",
      owner: "王部长",
      note: "资料齐套确认后推进到派发打样",
      time: dateText(sample?.updatedAt, "等待确认"),
    },
  ];
}

function renderGateFlow(style) {
  const order = ["preparation", "sample_making", "sample_review_gate", "shipment_decision"];
  const labels = ["准备", "打样", "评审", "决策"];
  const currentIndex = Math.max(0, order.indexOf(style.currentGate));
  const summary = os.getStyleSummary(style.id);
  return labels.map((label, index) => {
    if (index === 0) {
      const cards = buildMaterialCards(summary);
      const blocked = style.currentGate === "preparation_gate" || cards.some((card) => ["待确认", "待上传", "阻塞"].includes(card.state));
      return `<div class="prep-gate-wrap ${blocked ? "blocked" : ""}"><details class="prep-gate ${blocked ? "blocked" : "done"}"><summary><span>准备</span></summary><div class="prep-detail-grid">${cards.slice(0, 4).map((card) => `<b class="${["已确认", "已上传", "已提交"].includes(card.state) ? "ok" : "warn"}">${esc(card.name)}</b>`).join("")}</div></details><small>${blocked ? esc(style.blockerSummary || "仍有准备项待确认") : "准备齐全"}</small></div>`;
    }
    const className = index < currentIndex ? "done" : index === currentIndex ? "active" : "";
    return `<span class="${className}">${label}</span>`;
  }).join("");
}

function renderPipeline() {
  renderSummary();
  const table = document.querySelector("#pipeline .pipeline-table");
  if (!table) return;
  const summaries = os.data.styleList.map((style) => os.getStyleSummary(style.id)).filter(({ style }) => style).filter(matchesPipelineFilters);
  if (!os.data.styleList.length) {
    table.innerHTML = `<div class="empty-state"><strong>暂无真实款式数据</strong><span>新建款式或上传样衣后，这里会从 Supabase 同步显示。</span></div>`;
    syncFilterButtons();
    return;
  }
  if (!summaries.length) {
    table.innerHTML = `<div class="empty-state"><strong>没有符合筛选的款式</strong><span>可以取消上方筛选条件，或等待 Supabase 同步新的款式。</span></div>`;
    syncFilterButtons();
    return;
  }
  table.innerHTML = `<div class="row head"><div>款式</div><div>当前闸口</div><div>开发闸口</div><div>卡点与下一步</div></div>` + summaries.map((summary) => {
    const { style } = summary;
    return `
      <div class="row data-row pipeline-row" data-style-id="${style.id}">
        <div><strong>${esc(style.styleNo)}</strong><span>${esc(style.styleName)} · ${esc(style.brand)} ${esc(style.season)}</span></div>
        <div class="stage-status"><strong>${esc(os.gateLabels[style.currentGate] || style.currentGate)}</strong><span class="status ${statusClass(summary.shipmentStatus.key)}">${esc(summary.shipmentStatus.label)}</span><small>路线：${esc(os.data.routeRules[style.route]?.label || os.data.sampleRoutes[style.route] || style.route)} · 位置：${esc(summary.sample?.location || style.sampleLocation || "未设置")}</small></div>
        <div class="stage-line gate-flow">${renderGateFlow(style)}</div>
        <div class="block-summary"><strong>卡点：${esc(style.blockerSummary || `${summary.blockingIssues.length} 个阻塞问题`)}</strong><span>责任：${esc(summary.ownerNames)}</span><span>评审负责人：${esc(summary.gateOwner?.name)}</span><span>阻塞问题：${summary.blockingIssues.length ? `是 · ${summary.blockingIssues.length} 个` : "否"}</span><span>下一步：${esc(summary.nextAction)}</span><div class="pipeline-actions"><button type="button" data-style-drawer="details" data-style-id="${style.id}">详情</button><button type="button" data-style-drawer="prep" data-style-id="${style.id}">准备材料</button><button class="primary" type="button" data-open-review="${style.id}">打开评审</button></div></div>
      </div>`;
  }).join("");
  syncFilterButtons();
}

function renderStyleWorkspace() {
  const summary = os.getStyleSummary(os.data.currentStyleId);
  const { style, sample, review, openIssues, blockingIssues, gateOwner, finalApprover } = summary;
  const header = document.querySelector("#style .style-header");
  if (!style || !sample || !review) {
    if (header) header.innerHTML = `<div><div class="eyebrow">单款详情</div><h2>暂无真实款式</h2><p>当前 Supabase 还没有可展示的款式、样衣和评审记录。</p></div>`;
    return;
  }
  if (header) {
    header.innerHTML = `<div><div class="eyebrow">款式 ${esc(style.styleNo)} / ${esc(style.brand)} / ${esc(style.season)}</div><h2>${esc(style.styleName)}</h2></div><div class="header-badges"><span class="status ${statusClass(summary.shipmentStatus.key)}">${esc(summary.shipmentStatus.label)}</span><span class="status neutral">${esc(os.phaseLabels[style.samplePhase] || style.samplePhase)}</span><span class="status neutral">位置：${esc(sample.location)}</span><span class="status neutral">路线：${esc(os.data.routeRules[style.route]?.label || os.data.sampleRoutes[style.route] || style.route)}</span><span class="status neutral">评审负责人：${esc(gateOwner.name)}</span><span class="status neutral">例外放行：${esc(finalApprover.name)}</span></div>`;
  }
  const snapshot = document.querySelector("#style .snapshot-content");
  if (snapshot) {
    snapshot.innerHTML = `<h3>${esc(os.phaseLabels[style.samplePhase])}评审</h3><p>跨部门评审状态来自同一个评审任务 ${esc(review.reviewNo)}。</p><div class="snapshot-gate"><span>${summary.shipmentStatus.canShip ? "当前可寄样" : "当前不可寄样"}</span><strong>原因：${blockingIssues.length ? blockingIssues.map((issue) => issue.title).join(" / ") : summary.shipmentStatus.label} · 责任：${esc(summary.ownerNames)} · 下一步：${esc(summary.nextAction)}</strong></div><div class="mini-stats"><span><strong>${openIssues.length}</strong> 未关闭</span><span><strong>${blockingIssues.length}</strong> 阻塞</span><span><strong>${review.departmentReviews.length}</strong> 部门</span></div><button class="primary-button" data-view="review" type="button">打开评审</button>`;
  }
  const materials = document.querySelector("#style .parallel-materials");
  if (materials) {
    materials.innerHTML = buildMaterialCards(summary).map((card) => `<div class="material-card ${["已确认", "已上传", "已提交"].includes(card.state) ? "done" : "waiting"} checklist-card"><strong>${esc(card.name)}</strong><span>${esc(card.state)} · ${esc(card.owner)} · ${card.time}</span><small>${esc(card.note)}</small></div>`).join("");
  }
}

function renderReview() {
  const review = os.getReviewById(os.data.currentReviewId);
  const emptyHero = document.querySelector("#review .review-hero");
  if (!review) {
    if (emptyHero) emptyHero.innerHTML = `<div class="hero-info"><div class="crumb">首页 / 样衣评审</div><div class="hero-title"><h2>暂无真实评审</h2><span class="status neutral">等待数据</span></div><div class="hero-meta"><span>请先新建款式或从 Supabase 同步评审记录。</span></div></div>`;
    const mediaGrid = document.querySelector("#review .review-media-grid");
    if (mediaGrid) mediaGrid.innerHTML = `<div class="empty-state"><strong>暂无样衣媒体</strong><span>有评审记录后可上传照片和视频。</span></div>`;
    return;
  }
  const summary = os.getStyleSummary(review.styleId);
  const { style, sample, openIssues, blockingIssues, gateOwner, finalApprover, shipmentStatus } = summary;
  if (!style || !sample) {
    if (emptyHero) emptyHero.innerHTML = `<div class="hero-info"><div class="crumb">首页 / 样衣评审 / ${esc(review.reviewNo)}</div><div class="hero-title"><h2>评审数据不完整</h2><span class="status amber">等待样衣</span></div><div class="hero-meta"><span>Supabase 中找不到关联款式或样衣。</span></div></div>`;
    return;
  }
  const hero = document.querySelector("#review .review-hero");
  const coverMedia = getStyleCoverMedia(sample);
  if (hero) {
    hero.innerHTML = `
      <label class="hero-garment style-cover-upload ${coverMedia ? "has-cover" : ""}" title="点击上传款式图">
        <input type="file" accept="image/*" data-media-upload="style-cover">
        ${coverMedia ? `<img src="${esc(coverMedia.url)}" alt="${esc(coverMedia.label || "款式图")}" loading="lazy">` : `<div class="garment front"></div>`}
        <span>${coverMedia ? "更换款式图" : "上传款式图"}</span>
      </label>
      <div class="hero-info">
        <div class="crumb">首页 / 样衣评审 / ${esc(review.reviewNo)}</div>
        <div class="hero-title"><h2>${esc(style.styleNo)}-${esc(review.reviewNo)}</h2><span class="status blue">${esc(sample.versionName)}</span></div>
        <div class="hero-meta"><span>品牌：${esc(style.brand)}</span><span>季节：${esc(style.season)}</span><span>款式：${esc(style.category)}</span><span>样衣：${esc(sampleVariantSummary(style))}</span><span>阶段：${esc(sample.versionName)}</span><span>路线：${esc(os.data.routeRules[style.route]?.label || os.data.sampleRoutes[style.route] || style.route)}</span><span>评审负责人：${esc(gateOwner.name)}</span><span>创建时间：${esc(sample.createdAt)}</span><span>预计寄样：${esc(sample.plannedShipDate)}</span></div>
      </div>
      <div class="review-process">
        <div class="process-step done"><b>✓</b><span>样衣完成</span><small>${esc(sample.createdAt || "")}</small></div>
        <div class="process-line active"></div>
        <div class="process-step active"><b>●</b><span>部门评审</span><small>${esc(os.reviewStatusLabels[review.status] || review.status)}</small></div>
        <div class="process-line"></div>
        <div class="process-step ${blockingIssues.length ? "warning" : "done"}"><b>${blockingIssues.length ? "!" : "✓"}</b><span>问题归属</span><small>${blockingIssues.length ? `${blockingIssues.length} 个阻塞` : "无阻塞"}</small></div>
        <div class="process-line"></div>
        <div class="process-step"><b>○</b><span>整改复验</span><small>${openIssues.length ? "待处理" : "无需复验"}</small></div>
        <div class="process-line"></div>
        <div class="process-step"><b>○</b><span>寄样决策</span><small>${esc(shipmentStatus.label)}</small></div>
      </div>
      <div class="location-card">
        <span>样衣位置</span>
        <strong>${esc(sample.location)}</strong>
        <small>更新时间：${esc(sample.updatedAt)}</small>
        <select id="sample-location-select">${os.data.sampleLocations.map((loc) => `<option ${loc.name === sample.location ? "selected" : ""}>${esc(loc.name)}</option>`).join("")}</select>
      </div>
    `;
  }
  const strip = document.querySelector("#review .strip-main");
  if (strip) {
    const firstBlocking = blockingIssues[0];
    const blockingOwner = blockingIssues.map((issue) => os.userName(issue.owner)).filter(Boolean).join(" / ") || summary.ownerNames;
    const shipmentLabel = blockingIssues.length
      ? shipmentStatus.key === "hold_shipment" ? "暂停寄样" : "当前不可寄样"
      : shipmentStatus.label;
    const reasonLabel = blockingIssues.length ? `${blockingIssues.length} 个 Blocking Issue` : "无阻塞问题";
    const nextStep = blockingIssues.length
      ? firstBlocking?.level === "critical" ? "整改 / 复验 / 重新评审" : "整改 / 复验 / Gate Owner 确认"
      : summary.nextAction;
    strip.innerHTML = `<div><span>当前是否可寄样</span><strong>${esc(shipmentLabel)}</strong></div><div><span>原因</span><strong>${esc(reasonLabel)}</strong></div><div class="blocking-alert"><span>当前责任人 / 下一步</span><strong>${esc(blockingOwner)} · ${esc(nextStep)}</strong></div>`;
  }
  renderMedia(sample, openIssues);
  renderDepartmentReviews(review);
  renderIssueList(review);
  renderDecision(review, summary);
  renderVersions(style.id, sample.id);
}

function renderMedia(sample, issues) {
  const grid = document.querySelector("#review .review-media-grid");
  if (!grid) return;
  const mediaItems = getReviewMediaItems(sample);
  const uploadDisabled = mediaUploadState.active ? "disabled" : "";
  const statusHtml = renderMediaUploadStatus();
  const cards = mediaItems.map(({ media, isVideo, isImage }) => {
    const label = media.label || media.fileName || (isVideo ? "样衣视频" : "样衣照片");
    const uploadedAt = media.uploadedAt || "刚刚";
    const preview = isImage && media.url ? `<img class="media-preview" src="${esc(media.url)}" alt="${esc(label)}" loading="lazy">` : "";
    const videoPreview = isVideo && media.url ? `<video class="media-preview" src="${esc(media.url)}" muted playsinline preload="metadata"></video>` : "";
    const canOpen = Boolean(media.url);
    return `
      <article class="review-photo uploaded-media ${isVideo ? "video-thumb" : ""}" data-uploaded-media-id="${esc(media.id)}" ${canOpen ? `data-open-media="${esc(media.id)}" role="button" tabindex="0"` : ""}>
        <div class="media-card-visual">${preview}${videoPreview}${isVideo ? `<div class="play">▶</div>` : ""}${!media.url ? `<span class="media-no-preview">暂无预览</span>` : ""}</div>
        <button class="media-delete-button" type="button" data-delete-media="${esc(media.id)}" aria-label="删除${isVideo ? "视频" : "图片"}">删除</button>
        <div class="media-card-body">
          <input class="media-label-input" data-media-label="${esc(media.id)}" value="${esc(label)}" aria-label="媒体标签，例如正面、反面、拉链">
          <small class="media-meta">${isVideo ? "视频" : "照片"} · ${esc(uploadedAt)}</small>
          <small class="media-issue-chip">暂无关联问题</small>
        </div>
      </article>`;
  }).join("");
  grid.innerHTML = `
    <div class="media-upload-toolbar">
      <label class="media-upload-button primary ${mediaUploadState.active ? "is-disabled" : ""}">
        <input type="file" accept="image/*" data-media-upload="photo" ${uploadDisabled}>
        <strong>上传照片</strong>
        <span>拍照或从相册选择</span>
      </label>
      <label class="media-upload-button ${mediaUploadState.active ? "is-disabled" : ""}">
        <input type="file" accept="video/*" data-media-upload="video" ${uploadDisabled}>
        <strong>上传视频</strong>
        <span>从相册选择视频</span>
      </label>
    </div>
    ${statusHtml}
    <div class="media-card-list">${cards || `<div class="empty-state"><strong>暂无样衣媒体</strong><span>上传照片或视频后会显示在这里。</span></div>`}</div>`;
}

function getCurrentMedia(mediaId) {
  const review = os.getReviewById(os.data.currentReviewId);
  const sample = os.getSampleById(review?.sampleId);
  return sample?.mediaList?.find((media) => media.id === mediaId);
}

function getReviewMediaItems(sample) {
  return (sample?.mediaList || [])
    .map((media, index) => ({ media, index }))
    .sort((a, b) => {
      const aTime = Date.parse(a.media.uploadedAt || "") || 0;
      const bTime = Date.parse(b.media.uploadedAt || "") || 0;
      if (aTime !== bTime) return bTime - aTime;
      return a.index - b.index;
    })
    .map(({ media }) => {
      const isVideo = media.mediaKind === "video" || media.mimeType?.startsWith("video/");
      const isImage = media.mimeType?.startsWith("image/");
      return { media, isVideo, isImage };
    });
}

function renderMediaUploadStatus() {
  if (mediaUploadState.status === "idle") return "";
  const percent = Math.max(0, Math.min(100, Math.round(mediaUploadState.progress || 0)));
  const canRetry = mediaUploadState.status === "error";
  const title = mediaUploadState.status === "success" ? "上传成功" : mediaUploadState.status === "error" ? "上传失败" : "正在上传";
  const message = mediaUploadState.status === "uploading"
    ? "正在上传，请勿关闭页面"
    : mediaUploadState.message || mediaUploadState.error || "";
  return `
    <div class="media-upload-status ${esc(mediaUploadState.status)}" data-media-upload-status>
      <div class="upload-status-head"><strong>${esc(title)}</strong><span>${esc(mediaUploadState.fileName || "")}</span><b>${percent}%</b></div>
      <div class="upload-progress"><i style="width:${percent}%"></i></div>
      <small>${esc(message)}</small>
      ${canRetry ? `<button type="button" data-retry-media-upload="${esc(mediaUploadState.kind || "photo")}">重新上传</button>` : ""}
    </div>`;
}

function setMediaUploadState(next) {
  Object.assign(mediaUploadState, next);
  const review = os.getReviewById(os.data.currentReviewId);
  const sample = os.getSampleById(review?.sampleId);
  if (sample) renderMedia(sample, os.getOpenIssues(review?.id));
}

function openMediaViewer(mediaId) {
  if (!modalRoot) return;
  const review = os.getReviewById(os.data.currentReviewId);
  const sample = os.getSampleById(review?.sampleId);
  const items = getReviewMediaItems(sample).filter((item) => item.media.url);
  const index = Math.max(0, items.findIndex((item) => item.media.id === mediaId));
  const media = items[index]?.media || getCurrentMedia(mediaId);
  if (!media?.url) {
    showToast("这个文件还没有可预览链接，请稍后刷新");
    return;
  }
  mediaViewerState = { ...mediaViewerState, mediaId: media.id, index, items };
  renderMediaViewer();
}

function renderMediaViewer() {
  if (!modalRoot) return;
  const item = mediaViewerState.items[mediaViewerState.index];
  const media = item?.media;
  if (!media?.url) return;
  const isVideo = item.isVideo;
  const label = media.label || media.fileName || (isVideo ? "样衣视频" : "样衣照片");
  const count = mediaViewerState.items.length;
  const prevDisabled = mediaViewerState.index <= 0 ? "disabled" : "";
  const nextDisabled = mediaViewerState.index >= count - 1 ? "disabled" : "";
  const content = isVideo
    ? `<video class="media-viewer-content" src="${esc(media.url)}" controls autoplay playsinline></video>`
    : `<img class="media-viewer-content" src="${esc(media.url)}" alt="${esc(label)}">`;
  modalRoot.innerHTML = `
    <div class="modal-backdrop" data-close-modal></div>
    <section class="media-viewer" role="dialog" aria-modal="true" aria-label="${esc(label)}">
      <button class="media-viewer-close" type="button" data-close-modal aria-label="关闭预览">×</button>
      <button class="media-viewer-nav prev" type="button" data-media-viewer-prev ${prevDisabled} aria-label="上一张">‹</button>
      <button class="media-viewer-nav next" type="button" data-media-viewer-next ${nextDisabled} aria-label="下一张">›</button>
      <div class="media-viewer-count">${mediaViewerState.index + 1} / ${count}</div>
      ${content}
      <div class="media-viewer-caption">
        <strong>${esc(label)}</strong>
        <span>${esc(media.uploadedAt || "")}</span>
        <span>${isVideo ? "视频" : "照片"}</span>
        <span>${esc(media.uploadedBy || os.userName(os.data.currentUserId) || "上传人未记录")}</span>
      </div>
    </section>`;
  modalRoot.classList.add("open", "media-viewer-open");
  modalRoot.setAttribute("aria-hidden", "false");
}

function moveMediaViewer(delta) {
  const nextIndex = mediaViewerState.index + delta;
  if (nextIndex < 0 || nextIndex >= mediaViewerState.items.length) return;
  mediaViewerState.index = nextIndex;
  mediaViewerState.mediaId = mediaViewerState.items[nextIndex]?.media?.id || null;
  renderMediaViewer();
}

function getStyleCoverMedia(sample) {
  return (sample?.mediaList || []).find((media) => {
    const label = String(media.label || "");
    return media.mimeType?.startsWith("image/") && media.url && /款式图|主图|封面/.test(label);
  }) || (sample?.mediaList || []).find((media) => media.mimeType?.startsWith("image/") && media.url);
}

function triggerMediaUpload(mediaKind) {
  const input = document.querySelector(`#review [data-media-upload="${mediaKind}"]`);
  if (!input) {
    showView("review");
    renderReview();
    document.querySelector(`#review [data-media-upload="${mediaKind}"]`)?.click();
    return;
  }
  input.click();
}

async function deleteSampleMedia(mediaId) {
  const review = os.getReviewById(os.data.currentReviewId);
  const sample = os.getSampleById(review?.sampleId);
  const media = sample?.mediaList?.find((item) => item.id === mediaId);
  if (!sample || !media) {
    showToast("没有找到这个媒体文件");
    return;
  }
  const label = media.label || media.fileName || "这个文件";
  const confirmed = window.confirm(`确定删除「${label}」吗？\n\n删除后它会从样衣评审页面移除，如导入错了可以重新上传。`);
  if (!confirmed) return;

  const previousMediaList = [...(sample.mediaList || [])];
  sample.mediaList = previousMediaList.filter((item) => item.id !== mediaId);
  sample.timeline ||= [];
  sample.timeline.unshift({
    time: new Date().toLocaleString("zh-CN", { hour12: false }),
    text: `${os.userName(os.data.currentUserId)} · 删除媒体：${label}`,
  });
  renderReview();
  try {
    await window.SampleOSBackend?.syncData?.("deleteMedia", { mediaId });
    showToast("媒体已删除，可以重新上传");
  } catch (error) {
    sample.mediaList = previousMediaList;
    renderReview();
    showToast(`删除失败：${error.message}`);
  }
}

function renderDepartmentReviews(review) {
  const titleBlock = document.querySelector("#review .department-panel .section-title");
  const table = document.querySelector("#review .review-table");
  if (!table) return;
  if (titleBlock) {
    titleBlock.innerHTML = `<div><h2>部门评审</h2><span>各部门先独立提交专业意见。部门评审不等于最终放行。</span><small class="panel-training-tip">评审意见如果需要别人处理、需要复验、影响寄样，就必须转为 Issue。</small></div>`;
  }
  const rows = mergeReviewRowsWithRoleTemplates(review);
  const reviewIssues = os.getIssuesByReview(review.id);
  table.innerHTML = `<div class="review-table-row head"><span>部门</span><span>角色</span><span>负责人</span><span>状态</span><span>评审意见 / 关注点</span><span>产生问题</span><span>时间</span><span>操作</span></div>` + rows.map((item, index) => {
    const issueIds = Array.isArray(item.issueIds) ? item.issueIds : [];
    const linkedIssues = reviewIssues.filter((issue) => issueIds.includes(issue.id) || issue.sourceDepartment === item.department);
    const issueCount = linkedIssues.filter((issue) => issue.status !== "closed").length;
    const pill = item.status === "pass" ? "green" : item.status === "fail" ? "red" : "amber";
    const rowKey = item.id || `${review.id}:${item.department}`;
    const isLocked = Boolean((item.opinion || "").trim() || item.reviewedAt) && !editingReviewRows.has(rowKey);
    const saveOrEdit = isLocked
      ? `<button class="row-action" type="button" data-edit-department-review="${index}">编辑</button>`
      : `<button class="row-action ${pill}" type="button" data-save-department-review="${index}">保存</button>`;
    const statusNote = departmentStatusHelp[item.status] || departmentStatusHelp.pending;
    const failWarning = item.status === "fail" && !issueCount ? `<small class="review-warning">请将该评审意见转为质量闸口 Issue，否则无法完成部门评审。</small>` : "";
    const reviewerLabel = item.reviewer ? avatar(item.reviewer) : `<i class="avatar avatar-zhao"></i>${esc(item.reviewerName || "待分配")}`;
    return `<div class="review-table-row editable-review-row ${isLocked ? "is-locked" : ""}" data-review-row="${index}" data-review-row-key="${esc(rowKey)}" data-focus="${esc(item.focusTags.join("、"))}"><strong>${esc(item.department)}</strong><em>${esc(item.role)}</em><span>${reviewerLabel}</span><label class="review-status-cell"><select data-review-status ${isLocked ? "disabled" : ""}><option value="pending" ${item.status === "pending" ? "selected" : ""}>待评审</option><option value="pass" ${item.status === "pass" ? "selected" : ""}>通过</option><option value="needs_improvement" ${item.status === "needs_improvement" ? "selected" : ""}>需要改进</option><option value="fail" ${item.status === "fail" ? "selected" : ""}>不通过</option></select><small data-review-status-help>${esc(statusNote)}</small></label><label><textarea data-review-opinion ${isLocked ? "readonly" : ""} placeholder="在这里输入评审意见">${esc(item.opinion)}</textarea><small>关注点：${esc(item.focusTags.join(" · ") || "可直接填写真实评审意见")}</small>${failWarning}</label><em class="issue-created ${issueCount ? "major" : "none"}">${issueCount ? `${issueCount} 个 Issue` : "普通意见"}</em><time>${esc(item.reviewedAt || "未保存")}</time><div class="row-actions-inline">${saveOrEdit}<button class="row-action primary" type="button" data-issue-from-review="${index}">转为 Issue</button></div></div>`;
  }).join("");
  review.departmentReviews = rows;
}

function renderIssueList(review) {
  const titleBlock = document.querySelector("#review .issue-panel .section-title");
  const table = document.querySelector("#review .issue-table");
  const issues = os.getIssuesByReview(review.id);
  const openIssues = os.getOpenIssues(review.id);
  if (titleBlock) titleBlock.innerHTML = `<div><h2>质量闸口问题 <span class="badge-count">${openIssues.length}</span></h2><span>需要整改、复验、归属责任或影响寄样的问题，会在这里形成 Issue，并进入闭环。</span><small class="panel-training-tip">Issue 必须有负责人、等级、是否阻塞寄样和关闭状态。</small></div><button class="row-action primary" type="button" data-open-issue-modal>新增问题</button>`;
  if (!table) return;
  if (!issues.length) {
    table.innerHTML = `<div class="empty-state"><strong>暂无真实质量问题</strong><span>当前 Supabase 没有这次评审的问题记录；新增后这里会同步显示。</span></div>`;
    return;
  }
  table.innerHTML = `<div class="issue-table-row head"><span>问题名称</span><span>来源部门</span><span>证据</span><span>等级</span><span>是否阻塞寄样</span><span>负责人姓名</span><span>状态</span><span>复验人</span><span></span></div>` + issues.map((issue) => {
    const level = os.data.issueLevelRules[issue.level] || os.data.issueLevelRules.normal;
    const blocking = os.getBlockingIssues(review.id).some((item) => item.id === issue.id);
    const evidence = evidenceTypes.find((type) => String(issue.evidence || "").includes(type)) || issue.evidence || "无证据";
    const ownerName = os.userName(issue.owner);
    const verifierName = issue.verifier ? os.userName(issue.verifier) : "无需复验";
    return `<div class="issue-table-row ${blocking ? "issue-blocking" : ""}" data-issue-id="${issue.id}"><strong>${esc(issue.title)}<small>${esc(issue.relatedArea || "未标注部位")}</small></strong><span>${esc(issue.sourceDepartment || "未指定")}</span><span>${esc(evidence)}</span><b class="priority ${esc(issue.level || "normal")}">${esc(level.label)}</b><span class="shipment ${blocking ? "no" : "yes"}">${blocking ? "是" : "否"}</span><span class="named-person">${avatar(issue.owner)}<small>${esc(ownerName)}</small></span><em>${esc(os.issueStatusLabels[issue.status] || issue.status || "未处理")}</em><time>${esc(verifierName)}</time>${issue.status !== "closed" ? `<button class="row-action" type="button" data-close-issue="${issue.id}">关闭</button>` : ""}</div>`;
  }).join("");
}

function renderDecision(review, summary) {
  const panel = document.querySelector("#review .decision-panel");
  if (!panel) return;
  const currentUser = os.getUser(os.data.currentUserId);
  const canGate = currentUser?.id === summary.gateOwner.id;
  const canException = currentUser?.id === summary.finalApprover.id;
  const hasCriticalBlocking = summary.blockingIssues.some((issue) => issue.level === "critical");
  const approveDisabled = !canGate || hasCriticalBlocking;
  panel.innerHTML = `<div class="decision-compact-head"><div><h3>寄样结论</h3><span>由评审负责人判断，例外放行由 ${esc(summary.finalApprover.name)} 审批。</span></div><span class="status ${summary.blockingIssues.length ? "red" : "green"}">${esc(summary.shipmentStatus.label)}</span></div><div class="gate-owner-card"><div><i class="avatar avatar-${esc(summary.gateOwner.avatarColor)}"></i><strong>${esc(summary.gateOwner.name)}</strong><small>评审负责人</small></div><span class="status ${canGate ? "green" : "red"}">${canGate ? "当前用户可最终放行" : "当前用户无最终放行权限"}</span></div><div class="decision-stack" data-decision-stack><button class="approve ${approveDisabled ? "disabled" : ""}" type="button" data-decision="can_ship">可以寄样</button><button class="revise ${canGate ? "" : "disabled"}" type="button" data-decision="ship_after_rework">修改后寄样</button><button class="hold ${canGate ? "" : "disabled"}" type="button" data-decision="hold_shipment">暂停寄样</button><button class="exception ${canException ? "" : "disabled"}" type="button" data-decision="exception_release">例外放行</button><button class="primary-button" type="button" data-submit-decision>提交结论</button><small>当前寄样状态：${esc(summary.shipmentStatus.label)}。${hasCriticalBlocking ? "存在严重 Blocking Issue，必须复验后重新评审。" : `例外放行仅 ${esc(summary.finalApprover.name)} 可批准。`}</small></div><details class="exception-box exception-form"><summary>例外放行申请</summary><label>例外原因 <input data-exception-reason value="${esc(review.exceptionRequest?.reason || "")}" placeholder="客户会议 / 交期风险 / 样衣用途"></label><label>风险说明 <textarea data-exception-risk-note placeholder="说明客户已知风险、需要同步的质量/交期影响">${esc(review.exceptionRequest?.riskNote || "")}</textarea></label><label>申请人 <span>${esc(os.userName(review.exceptionRequest?.applicant) || os.userName(os.data.currentUserId))}</span></label><label>审批人 <span>${esc(summary.finalApprover.name)} · 例外放行人</span></label><label>是否通知客户 <input type="checkbox" data-customer-notified ${review.exceptionRequest?.customerNotified ? "checked" : ""}></label><label>审批结论 <span>${esc(review.exceptionRequest?.approvalStatus || "未申请")}</span></label></details>`;
}

function renderVersions(styleId, activeSampleId) {
  const list = document.querySelector("#review .version-list");
  if (!list) return;
  list.innerHTML = os.data.samples.filter((sample) => sample.styleId === styleId).map((sample) => `<div class="${sample.id === activeSampleId ? "active" : ""}"><div class="mini-garment"></div><strong>${esc(sample.versionName)}</strong><span>${esc(sample.status === "shipped" ? "已寄样" : sample.status === "reviewing" ? "评审中" : "待制作")}</span></div>`).join("");
}

function renderCalendar() {
  const grid = document.querySelector("#calendar .calendar-grid");
  const riskList = document.querySelector("#calendar .risk-list");
  if (!grid || !riskList) return;
  const badges = document.querySelector("#calendar .header-badges");
  const monthTitle = document.querySelector("#calendar .month-section .section-title h2");
  const monthSubTitle = document.querySelector("#calendar .month-section .section-title span");
  const monthToolbar = document.querySelector("#calendar .month-toolbar");
  const monthCalendar = document.querySelector("#calendar .month-calendar");
  const hasRealSource = os.data.source?.kind === "supabase";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = dateKey(today);
  if (!hasRealSource) {
    if (badges) badges.innerHTML = `<span class="status neutral">等待 Supabase</span>`;
    grid.innerHTML = `<div class="empty-state"><strong>正在等待真实交期</strong><span>连接 Supabase 后，这里只显示数据库里的样衣交期。</span></div>`;
    riskList.innerHTML = `<div class="risk-row neutral"><strong>等待真实风险数据</strong><span>不会显示本地演示月历。</span></div>`;
    if (monthToolbar) monthToolbar.innerHTML = `<strong>暂无计划月历</strong><span class="status neutral">等待 Supabase 交期</span>`;
    if (monthCalendar) monthCalendar.innerHTML = `<div class="empty-state"><strong>暂无真实月历数据</strong><span>正在等待 Supabase 同步。</span></div>`;
    syncFilterButtons();
    return;
  }
  const allSummaries = os.data.styleList
    .map((style) => os.getStyleSummary(style.id))
    .filter((summary) => summary.style && parseDate(getCalendarDate(summary)));
  const summaries = allSummaries.filter(matchesCalendarFilters);
  const todayCount = summaries.filter((summary) => getCalendarDate(summary) <= todayKey).length;
  const blockedCount = summaries.filter(isBlockedSummary).length;
  const weekStart = startOfWeek(today);
  const weekEnd = addDays(weekStart, 6);
  if (badges) {
    badges.innerHTML = `<span class="status ${todayCount ? "red" : "green"}">今日/逾期 ${todayCount}</span><span class="status ${blockedCount ? "amber" : "green"}">风险 ${blockedCount}</span><span class="status neutral">真实交期 ${summaries.length}</span>`;
  }
  if (!allSummaries.length) {
    grid.innerHTML = `<div class="empty-state"><strong>暂无真实交期</strong><span>只有 Supabase 款式或样衣里填写了预计寄样日期，才会出现在样衣日历。</span></div>`;
    riskList.innerHTML = `<div class="risk-row neutral"><strong>无交期风险</strong><span>当前没有真实样衣日历数据。</span></div>`;
    if (monthToolbar) monthToolbar.innerHTML = `<strong>暂无计划月历</strong><span class="status neutral">等待 Supabase 交期</span>`;
    if (monthCalendar) monthCalendar.innerHTML = `<div class="empty-state"><strong>暂无真实月历数据</strong><span>请先为款式或样衣填写预计寄样日期。</span></div>`;
    syncFilterButtons();
    return;
  }
  if (!summaries.length) {
    grid.innerHTML = `<div class="empty-state"><strong>没有符合筛选的交期</strong><span>可以取消筛选条件或调整品牌。</span></div>`;
    riskList.innerHTML = `<div class="risk-row neutral"><strong>当前筛选无风险</strong><span>没有符合条件的真实交期记录。</span></div>`;
  }

  const weekSummaries = summaries.filter((summary) => {
    const date = parseDate(getCalendarDate(summary));
    return date >= weekStart && date <= weekEnd;
  });
  const gridItems = weekSummaries.length ? weekSummaries : summaries.slice(0, 8);
  const groups = {};
  gridItems.forEach((summary) => {
    const date = getCalendarDate(summary);
    groups[date] ||= [];
    groups[date].push(summary);
  });
  if (Object.keys(groups).length) {
    grid.innerHTML = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([date, items]) => `<div class="calendar-day ${date <= todayKey ? "urgent" : ""}"><strong>${date.slice(5)} ${date === todayKey ? "今天" : ""}</strong>${items.map(({ style, sample, openIssues, blockingIssues, calendarRisk }) => `<div class="calendar-item" title="点击进入单款详情" data-style-drawer="details" data-style-id="${style.id}"><span class="brand-dot salomon"></span><div><b>${esc(style.brand)} ${esc(style.styleNo)}</b><small>${esc(os.phaseLabels[style.samplePhase] || style.samplePhase)} · ${esc(sampleVariantSummary(style))} · ${esc(sample?.location || style.sampleLocation || "未设置")}</small><em>状态：${esc(os.riskLabels[calendarRisk] || calendarRisk)} · 原因：${blockingIssues.length ? `${blockingIssues.length} 个阻塞问题` : openIssues.length ? `${openIssues.length} 个待处理问题` : "无阻塞"}</em></div></div>`).join("")}</div>`).join("");
  }
  const riskOrder = { blocked: 1, overdue: 1, waiting_exception: 2, approaching_due: 3, normal: 4, exception_released: 5, shipped: 6 };
  if (summaries.length) {
    riskList.innerHTML = summaries.slice().sort((a, b) => (riskOrder[a.calendarRisk] || 9) - (riskOrder[b.calendarRisk] || 9)).map(({ style, calendarRisk, blockingIssues, nextAction, ownerNames }) => `<div class="risk-row ${calendarRisk === "blocked" || calendarRisk === "overdue" ? "danger" : calendarRisk === "waiting_exception" ? "warning" : calendarRisk === "normal" ? "neutral" : calendarRisk === "exception_released" || calendarRisk === "shipped" ? "success" : "info"}"><strong>${esc(style.brand)} ${esc(style.styleNo)}</strong><span>${esc(os.riskLabels[calendarRisk] || calendarRisk)} · ${blockingIssues.length ? `${blockingIssues.length} 个阻塞问题` : nextAction || "暂无下一步"} · 当前责任：${esc(ownerNames || "未指定")}</span></div>`).join("");
  }

  const baseMonthDate = parseDate(getCalendarDate(summaries[0] || allSummaries[0])) || today;
  const activeMonth = new Date(baseMonthDate.getFullYear(), baseMonthDate.getMonth() + calendarState.monthOffset, 1);
  const activeYear = activeMonth.getFullYear();
  const activeMonthIndex = activeMonth.getMonth();
  const monthStart = new Date(activeYear, activeMonthIndex, 1);
  const monthGridStart = startOfWeek(monthStart);
  const monthEnd = new Date(activeYear, activeMonthIndex + 1, 0);
  const monthGridEnd = addDays(startOfWeek(monthEnd), 6);
  const monthItems = summaries.filter((summary) => {
    const date = parseDate(getCalendarDate(summary));
    return date >= monthGridStart && date <= monthGridEnd;
  });
  const monthGroups = {};
  monthItems.forEach((summary) => {
    const key = getCalendarDate(summary);
    monthGroups[key] ||= [];
    monthGroups[key].push(summary);
  });
  if (monthTitle) monthTitle.textContent = `${activeMonthIndex + 1}月真实计划月历`;
  if (monthSubTitle) monthSubTitle.textContent = `来自 Supabase 的预计寄样日期，共 ${monthItems.length} 条`;
  if (monthToolbar) {
    monthToolbar.innerHTML = `<button type="button" data-calendar-month-nav="-1">‹ ${activeMonthIndex === 0 ? 12 : activeMonthIndex}月</button><strong>${activeYear}年 ${activeMonthIndex + 1}月</strong><button type="button" data-calendar-month-nav="1">${activeMonthIndex === 11 ? 1 : activeMonthIndex + 2}月 ›</button><span class="status green">正常</span><span class="status amber">临近/例外</span><span class="status red">逾期/阻止</span><span class="status blue">已寄样</span><span class="status neutral">真实数据</span>`;
  }
  if (monthCalendar) {
    const weekdays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"].map((day) => `<div class="weekday">${day}</div>`).join("");
    const cells = [];
    for (let cursor = new Date(monthGridStart); cursor <= monthGridEnd; cursor = addDays(cursor, 1)) {
      const key = dateKey(cursor);
      const items = monthGroups[key] || [];
      const muted = cursor.getMonth() !== activeMonthIndex;
      const weekend = [0, 6].includes(cursor.getDay());
      cells.push(`<div class="month-cell ${muted ? "muted-date" : ""} ${weekend ? "weekend" : ""}"><b>${cursor.getMonth() + 1}/${String(cursor.getDate()).padStart(2, "0")}</b>${items.map(({ style, sample, calendarRisk }) => `<span class="month-event ${monthEventClass(calendarRisk)}" data-style-drawer="details" data-style-id="${style.id}">${esc(style.brand)} ${esc(style.styleNo)} · ${esc(sample?.versionName || os.phaseLabels[style.samplePhase] || style.samplePhase)} · ${esc(sampleVariantSummary(style))}</span>`).join("")}</div>`);
    }
    monthCalendar.innerHTML = weekdays + cells.join("");
  }
  syncFilterButtons();
}

function renderRoleTemplateCards() {
  return `<div class="role-template-grid">${roleTemplates.map((template) => {
    const reviewClass = template.reviewDefault.startsWith("是") ? "green" : template.reviewDefault.includes("压胶") || template.reviewDefault.includes("可选") ? "amber" : "neutral";
    const finalClass = template.finalRelease === "是" ? "green" : template.finalRelease.includes("例外") ? "amber" : "neutral";
    const exceptionClass = template.exceptionRelease === "是" ? "green" : "neutral";
    return `<article class="role-template-card">
      <div class="role-card-head"><div><span>${esc(template.type)}</span><h3>${esc(template.name)}</h3></div><b>${esc(roleAssignedLabel(template))}</b></div>
      <p>${esc(template.responsibility)}</p>
      <dl>
        <div><dt>默认参与阶段</dt><dd>${esc(template.stages.join("、"))}</dd></div>
        <div><dt>默认出现在评审页</dt><dd><span class="status ${reviewClass}">${esc(template.reviewDefault)}</span></dd></div>
        <div><dt>可最终放行</dt><dd><span class="status ${finalClass}">${esc(template.finalRelease)}</span></dd></div>
        <div><dt>可例外放行</dt><dd><span class="status ${exceptionClass}">${esc(template.exceptionRelease)}</span></dd></div>
      </dl>
      <div class="permission-tags">${template.permissions.map((permission) => `<i>${esc(permission)}</i>`).join("")}</div>
    </article>`;
  }).join("")}</div>`;
}

function renderPersonAssignmentRows() {
  return `<div class="people-row head"><span>人员姓名</span><span>所属部门</span><span>已分配角色</span><span>适用品牌 / 路线</span><span>关键权限</span><span>状态</span><span>操作</span></div>` + os.data.users.map((user) => {
    const enabled = user.enabled !== false;
    const assignedRoles = personRoleTemplates(user);
    const permissions = inheritedPermissions(user);
    const scopes = Array.from(new Set([...(user.scope || []), ...assignedRoles.flatMap((role) => role.stages)])).filter(Boolean);
    const canReview = assignedRoles.some((role) => role.reviewDefault !== "否");
    const canFinal = assignedRoles.some((role) => role.finalRelease === "是");
    const canException = assignedRoles.some((role) => role.exceptionRelease === "是");
    const dataPerson = [user.name, user.department, assignedRoles.map((role) => role.name).join("、") || user.role, user.currentResponsibility, user.reviewResponsibility, "人员继承固定角色模板权限", permissions.join("、"), scopes.join(" / "), canReview ? "可参与评审" : "不可参与评审", `固定角色：${assignedRoles.map((role) => role.name.split(" / ").pop()).join(" / ") || "未分配"}`, canReview ? "是" : "否", canFinal ? "是" : "否", canException ? "是" : "否"].join("|");
    return `<div class="people-row" role="button" tabindex="0" data-person="${esc(dataPerson)}"><strong><i class="avatar avatar-${esc(user.avatarColor)}"></i>${esc(user.name)}</strong><span>${esc(user.department)}</span><em>${esc(assignedRoles.map((role) => role.name.split(" / ").pop()).join(" / ") || "未分配固定角色")}</em><small>${esc(scopes.join(" / ") || "待设置")}</small><div class="permission-tags">${permissions.slice(0, 3).map((permission) => `<i>${esc(permission)}</i>`).join("")}</div><span class="status ${enabled ? "green" : "neutral"}">${enabled ? "启用" : "停用"}</span><div class="row-actions-inline"><button type="button" data-assign-role="${esc(user.id)}">分配角色</button><button type="button">编辑人员</button><button type="button">停用</button></div></div>`;
  }).join("");
}

function renderSettings() {
  const settingsHeader = document.querySelector("#settings .style-header");
  if (settingsHeader) {
    const version = os.data.ruleVersion;
    settingsHeader.innerHTML = `<div><div class="eyebrow">后台配置中心</div><h2>组织与流程规则</h2><p>维护人员、角色权限、Gate 负责人、打样派发、问题等级与样衣位置规则。</p></div><div class="header-badges"><span class="status blue">${esc(version.name)}</span><span class="status neutral">最后更新：${esc(version.updatedAt)}</span><span class="status neutral">更新人：${esc(version.updatedBy)}</span><span class="status amber">状态：${esc(version.status)}</span></div>`;
  }

  const summary = document.querySelector("#settings .settings-summary-grid");
  if (summary) {
    summary.innerHTML = `
      <div><span>系统角色</span><strong>10</strong><small>核心流程角色固定，不随人员新增</small></div>
      <div><span>Gate 负责人</span><strong>5</strong><small>准备、派发、压胶、评审、例外</small></div>
      <div><span>例外审批人</span><strong>1</strong><small>杨总，只处理例外放行</small></div>
      <div><span>打样路线</span><strong>2</strong><small>普通打样 / 压胶新长江</small></div>
    `;
  }

  const versionBar = document.querySelector("#settings .rule-version-bar") || document.createElement("div");
  if (!versionBar.classList.contains("rule-version-bar")) {
    versionBar.className = "rule-version-bar";
    document.querySelector("#settings .settings-summary-grid")?.after(versionBar);
  }
  versionBar.innerHTML = `<div><strong>${esc(os.data.ruleVersion.name)}</strong><span>最后更新：${esc(os.data.ruleVersion.updatedAt)} · 更新人：${esc(os.data.ruleVersion.updatedBy)} · 状态：${esc(os.data.ruleVersion.status)}</span></div><div><button class="row-action" type="button">保存草稿</button><button class="row-action primary" type="button">发布规则</button></div>`;

  const peopleTitle = document.querySelector("#settings .people-panel .section-title");
  if (peopleTitle) {
    peopleTitle.innerHTML = `<div><h2>角色模板与人员分配</h2><span>先定义固定评审角色，再将现有人员分配到对应职责。</span></div><div class="panel-actions"><button class="row-action primary" type="button">+ 新增人员</button><button class="row-action disabled" type="button" aria-disabled="true">新增角色模板</button><button class="row-action" type="button" data-open-assignment>分配角色</button><button class="row-action" type="button">批量导入</button></div>`;
  }

  const peopleTable = document.querySelector("#settings .permission-table");
  if (peopleTable) {
    peopleTable.classList.toggle("role-template-mode", settingsRoleTab === "templates");
    peopleTable.innerHTML = `<div class="settings-role-tabs"><button class="${settingsRoleTab === "templates" ? "active" : ""}" type="button" data-settings-role-tab="templates">角色模板</button><button class="${settingsRoleTab === "assignments" ? "active" : ""}" type="button" data-settings-role-tab="assignments">人员分配</button></div>${settingsRoleTab === "templates" ? renderRoleTemplateCards() : renderPersonAssignmentRows()}`;
  }

  const workerTitle = document.querySelector("#settings .worker-panel .section-title");
  if (workerTitle) {
    workerTitle.innerHTML = `<div><h2>打样工人池</h2><span>轻量维护可派发状态，不做复杂排产</span></div><div class="panel-actions"><button class="row-action primary" type="button">+ 新增打样工人</button><button class="row-action" type="button">设置可派发状态</button></div>`;
  }

  const workerList = document.querySelector("#settings .worker-list-rich");
  if (workerList) {
    workerList.innerHTML = os.data.workers.map((worker) => `<div><span class="avatar avatar-${esc(worker.avatarColor)}"></span><strong>${esc(worker.name)}</strong><small>所属路线：${esc(worker.route)}</small><em class="status ${worker.status === "可派发" ? "green" : worker.status === "忙碌" ? "amber" : "neutral"}">${esc(worker.status)}</em><b>擅长：${esc(worker.skill)}</b><time>任务 ${worker.taskCount} · ${esc(worker.lastCompletedAt)}</time></div>`).join("");
  }

  const gate = document.querySelector("#settings .gate-settings");
  if (gate) {
    const rules = os.data.gateRules;
    const gateTitle = gate.closest(".section-block")?.querySelector(".section-title");
    if (gateTitle) gateTitle.innerHTML = `<h2>Gate 负责人设置</h2><span>统一维护准备、派发、压胶、评审和例外放行负责人</span>`;
    gate.innerHTML = `
      <div><span>Preparation Gate / 准备闸口</span><strong>${os.userName(rules.preparationGateOwner)}</strong><small>确认资料齐全，推进到打样</small></div>
      <div><span>Normal Dispatch / 普通打样派发</span><strong>${os.userName(rules.normalDispatcher)}</strong><small>普通款式打样人员分配</small></div>
      <div><span>Bonding Gate / 压胶开发确认</span><strong>${os.userName(rules.bondingDevelopmentOwner)}</strong><small>确认压胶开发与工艺风险</small></div>
      <div><span>Xinchangjiang Dispatch / 新长江派发</span><strong>${os.userName(rules.xinchangjiangDispatcher)}</strong><small>新长江打样人员分配</small></div>
      <div><span>Sample Review Gate / 样衣评审</span><strong><select id="gate-owner-select">${os.data.users.filter((u) => u.isGateOwner).map((u) => `<option value="${u.id}" ${u.id === rules.sampleReviewGateOwner ? "selected" : ""}>${esc(u.name)}</option>`).join("")}</select></strong><small>默认负责人：${os.userName(rules.sampleReviewGateOwner)} · 备用负责人：王部长 · 确认问题阻断和最终寄样结论</small></div>
      <div><span>Final Approver / 例外放行</span><strong>${os.userName(rules.finalApprover)}</strong><small>批准或驳回例外放行</small></div>
    `;
  }

  const duplicateOwner = document.querySelector("#settings .owner-settings")?.closest(".section-block");
  if (duplicateOwner) duplicateOwner.style.display = "none";

  const departmentTitle = document.querySelector("#settings .department-enums")?.closest(".section-block")?.querySelector(".section-title");
  if (departmentTitle) {
    departmentTitle.innerHTML = `<div><h2>部门维护</h2><span>点击部门标签查看参与评审、通知和问题类型规则</span></div><div class="panel-actions"><button class="row-action primary" type="button">+ 新增部门</button></div>`;
  }
  const departments = document.querySelector("#settings .department-enums");
  if (departments) {
    departments.innerHTML = os.data.departmentDetails.map((dept, index) => `<button class="department-chip ${index === 0 ? "active" : ""}" type="button" data-department-index="${index}">${esc(dept.name)}</button>`).join("");
    let detail = document.querySelector("#department-detail");
    if (!detail) {
      detail = document.createElement("div");
      detail.id = "department-detail";
      detail.className = "department-detail";
      departments.after(detail);
    }
    const dept = os.data.departmentDetails[0];
    detail.innerHTML = `<div><span>部门名称</span><strong>${esc(dept.name)}</strong></div><div><span>部门负责人</span><strong>${esc(dept.owner)}</strong></div><div><span>是否参与评审</span><strong>${dept.participatesInReview ? "是" : "否"}</strong></div><div><span>是否接收通知</span><strong>${dept.receivesNotification ? "是" : "否"}</strong></div><div><span>可创建的问题类型</span><strong>${esc(dept.issueTypes.join(" / "))}</strong></div><div><span>默认评审人</span><strong>${esc(dept.defaultReviewer)}</strong></div>`;
  }

  const raci = document.querySelector("#settings .raci-list");
  if (raci) {
    const permissions = ["发起开发", "资料确认", "派发打样", "提交意见", "创建问题", "复验问题", "最终放行", "例外放行"];
    raci.className = "permission-matrix";
    raci.innerHTML = `<div class="matrix-row head"><span>角色</span>${permissions.map((permission) => `<span>${esc(permission)}</span>`).join("")}</div>` + os.data.permissionMatrix.map((row) => `<div class="matrix-row"><strong>${esc(row.role)}</strong>${permissions.map((permission) => `<span class="${row.permissions.includes(permission) ? "yes" : ""}">${row.permissions.includes(permission) ? "✓" : ""}</span>`).join("")}</div>`).join("");
  }

  const ruleList = document.querySelector("#settings .issue-rule-list");
  if (ruleList) {
    ruleList.innerHTML = Object.entries(os.data.issueLevelRules).map(([key, rule]) => `<div><b class="priority ${key}">${esc(rule.label)}</b><span>寄样规则：${esc(rule.shipmentRule)}<br>系统动作：${esc(rule.systemAction)}</span></div>`).join("");
  }
  const locations = document.querySelector("#settings .location-enums.rich");
  if (locations) {
    locations.innerHTML = os.data.sampleLocations.map((loc) => `<span><b>${esc(loc.name)}</b><small>默认持有人：${esc(loc.defaultHolder)} · 原因：${esc(loc.changeReason)}</small></span>`).join("");
    let transitions = document.querySelector("#location-transition-rules");
    if (!transitions) {
      transitions = document.createElement("div");
      transitions.id = "location-transition-rules";
      transitions.className = "location-transition-rules";
      locations.after(transitions);
    }
    transitions.innerHTML = `<h3>位置变更规则</h3><div class="transition-row head"><span>起始位置</span><span>目标位置</span><span>谁可以变更</span><span>扫码</span><span>原因</span><span>时间线</span></div>${os.data.locationTransitions.map((rule) => `<div class="transition-row"><span>${esc(rule.from)}</span><span>${esc(rule.to)}</span><span>${esc(rule.allowedBy)}</span><span>${rule.scanRequired ? "需要" : "不需要"}</span><span>${rule.reasonRequired ? "需要" : "不需要"}</span><span>${rule.timeline ? "生成" : "不生成"}</span></div>`).join("")}`;
  }

  const training = document.querySelector("#settings .training-grid");
  if (training) {
    const titleBlock = training.closest(".section-block")?.querySelector(".section-title");
    const reviewerCount = os.data.users.filter((user) => user.permissions?.some((permission) => ["提交意见", "创建问题", "复验问题", "版型评审"].includes(permission))).length;
    const pendingTraining = Math.max(0, os.data.users.length - reviewerCount);
    if (titleBlock) titleBlock.innerHTML = `<div><h2>Reviewer Training / 评审员培训</h2><span>培训入口按当前 Supabase 人员权限统计</span></div><div class="training-stats"><span>可评审 ${reviewerCount}</span><span>待配置 ${pendingTraining}</span><span>人员总数 ${os.data.users.length}</span></div>`;
    training.innerHTML = os.data.trainingCards.map((card) => `<div class="training-card"><strong>${esc(card)}</strong><span>查看标准、示例和练习入口</span></div>`).join("");
  }
}

function optionList(items, selected = "") {
  return items.map((item) => {
    const value = typeof item === "string" ? item : item.value;
    const label = typeof item === "string" ? item : item.label;
    return `<option value="${esc(value)}" ${value === selected ? "selected" : ""}>${esc(label)}</option>`;
  }).join("");
}

function checkList(items, name, checkedItems = []) {
  return `<div class="check-grid">${items.map((item) => `<label><input type="checkbox" name="${esc(name)}" value="${esc(item)}" ${checkedItems.includes(item) ? "checked" : ""}>${esc(item)}</label>`).join("")}</div>`;
}

function renderStyleDrawer(styleId, mode = "details") {
  const summary = os.getStyleSummary(styleId);
  if (!summary.style || !styleDrawer) return;
  const { style, sample, review, openIssues, blockingIssues, shipmentStatus, gateOwner, finalApprover } = summary;
  document.querySelector("#style-drawer-title").textContent = `${style.styleNo} / ${style.styleName}`;
  const materials = buildMaterialCards(summary);
  const body = document.querySelector("#style-drawer-body");
  body.innerHTML = `
    <div class="drawer-summary-card">
      <div><span>品牌 / 季节</span><strong>${esc(style.brand)} · ${esc(style.season)}</strong></div>
      <div><span>阶段 / 路线</span><strong>${esc(os.phaseLabels[style.samplePhase] || style.samplePhase)} · ${esc(os.data.routeRules[style.route]?.label || os.data.sampleRoutes[style.route] || style.route)}</strong></div>
      <div><span>当前 Gate</span><strong>${esc(os.gateLabels[style.currentGate])}</strong></div>
      <div><span>当前责任人</span><strong>${esc(summary.ownerNames)}</strong></div>
      <div><span>样衣位置</span><strong>${esc(sample?.location || style.sampleLocation)}</strong></div>
      <div><span>当前样衣版本</span><strong>${esc(sample?.versionName || os.phaseLabels[style.samplePhase])}</strong></div>
      <div><span>未关闭问题</span><strong>${openIssues.length}</strong></div>
      <div><span>Blocking Issue</span><strong>${blockingIssues.length}</strong></div>
      <div><span>评审负责人</span><strong>${esc(gateOwner?.name)}</strong></div>
      <div><span>例外放行</span><strong>${esc(finalApprover?.name)}</strong></div>
    </div>
    <div class="drawer-field highlight">
      <span>下一步动作</span>
      <strong>${esc(summary.nextAction)}</strong>
      <small>寄样状态：${esc(shipmentStatus.label)}</small>
    </div>
    <div class="drawer-section ${mode === "prep" ? "emphasis" : ""}">
      <h3>前期准备 checklist</h3>
      <div class="drawer-checklist">${materials.map((card) => `<div class="${["已确认", "已上传", "已提交"].includes(card.state) ? "done" : "waiting"}"><strong>${esc(card.name)}</strong><span>${esc(card.state)} · ${esc(card.owner)}</span><small>${esc(card.note)}</small></div>`).join("")}</div>
    </div>
    <div class="drawer-actions">
      <button type="button" data-style-drawer="prep" data-style-id="${style.id}">看准备材料</button>
      <button class="primary-button" type="button" data-open-review="${style.id}">打开评审</button>
    </div>
  `;
}

function openStyleDrawer(styleId, mode = "details") {
  os.data.currentStyleId = styleId;
  const review = os.getActiveReviewByStyle(styleId);
  if (review) os.data.currentReviewId = review.id;
  renderStyleDrawer(styleId, mode);
  styleDrawer?.classList.add("open");
  styleDrawer?.setAttribute("aria-hidden", "false");
}

function closeStyleDrawerPanel() {
  styleDrawer?.classList.remove("open");
  styleDrawer?.setAttribute("aria-hidden", "true");
}

function openReviewForStyle(styleId) {
  os.data.currentStyleId = styleId;
  const review = os.getActiveReviewByStyle(styleId);
  if (review) os.data.currentReviewId = review.id;
  closeStyleDrawerPanel();
  renderAll();
  showView("review");
}

function renderPersonModal() {
  const roles = [
    "Business PM / 业务负责人", "Pattern Reviewer / 版型评审员", "Material Owner / 面料负责人", "Trim Owner / 辅料负责人",
    "Quality Reviewer / 品质评审员", "Process Reviewer / 工艺评审员", "IE Reviewer / IE 评审员", "Sample Data Gate / 资料确认人",
    "Sample Dispatcher / 打样派发人", "Bonding Development Owner / 压胶开发负责人", "Sample Reviewer / 样衣评审员",
    "Gate Owner / 样衣评审负责人", "Final Approver / 例外放行审批人", "Admin / 后台管理员",
  ];
  const scopes = ["萨洛蒙", "版子", "面料", "辅料", "普通打样", "压胶开发", "新长江派发", "样衣评审", "例外放行"];
  const permissions = ["发起开发", "补充资料", "资料确认", "面料确认", "辅料确认", "派发打样", "普通打样", "压胶开发", "新长江派发", "提交 Opinion", "创建 Issue", "复验 Issue", "确认问题等级", "最终放行", "例外放行", "后台配置"];
  return `
    <form class="modal-card" data-modal-form="person">
      <div class="modal-header"><div><span>人员账号</span><h2>新增人员</h2></div><button type="button" data-close-modal>×</button></div>
      <section><h3>基本信息</h3><div class="form-grid"><label>姓名<input name="name" required placeholder="例如：顾瑶"></label><label>所属部门<select name="department" required>${optionList(os.data.departments, "业务部")}</select></label><label>手机 / 联系方式<input name="contact" placeholder="可选"></label><label>状态<select name="status"><option>启用</option><option>停用</option></select></label><label>头像样式<select name="avatarColor">${optionList(["guyao", "guyonghong", "xu", "zhao", "chen", "mike", "li"])}</select></label></div></section>
      <section><h3>职责信息</h3><div class="form-grid one"><label>当前职责<textarea name="currentResponsibility" required placeholder="萨洛蒙业务员，收到客户信息资料后发起开发准备。"></textarea></label><label>评审职责<textarea name="reviewResponsibility" placeholder="从客户要求角度评审样衣是否符合邮件、TP、BOM、Comment、交期及寄样目的。"></textarea></label></div>${checkList(scopes, "scope", ["萨洛蒙"])}</section>
      <section><h3>系统角色</h3>${checkList(roles, "roles", ["Business PM / 业务负责人"])}</section>
      <section><h3>权限</h3>${checkList(permissions, "permissions", ["发起开发", "提交 Opinion", "创建 Issue"])}</section>
      <div class="modal-actions"><button type="button" data-close-modal>取消</button><button class="primary-button" type="submit">保存人员</button></div>
    </form>`;
}

function renderAssignmentModal(options = {}) {
  const selectedUser = os.getUser(options.userId) || os.data.users[0];
  const userRoles = new Set(selectedUser?.assignedRoleIds || roleTemplates.filter((template) => selectedUser && template.people.includes(selectedUser.name)).map((template) => template.id));
  const scopeOptions = ["萨洛蒙", "SUPREME", "迪桑特", "普通打样", "压胶 / 新长江", "样衣评审", "例外放行"];
  const selectedScopes = selectedUser?.scope || ["萨洛蒙", "样衣评审"];
  const isDefaultOwner = personRoleTemplates(selectedUser || {}).some((role) => role.people[0] === selectedUser?.name);
  const participatesReview = personRoleTemplates(selectedUser || {}).some((role) => role.reviewDefault !== "否");
  return `
    <form class="modal-card wide assignment-modal-card" data-modal-form="assignment">
      <div class="modal-header"><div><span>固定角色模板</span><h2>分配角色</h2></div><button type="button" data-close-modal>×</button></div>
      <section><h3>选择人员</h3><div class="form-grid"><label>人员<select name="userId" required>${optionList(os.data.users.map((user) => ({ value: user.id, label: `${user.name} · ${user.department}` })), selectedUser?.id)}</select></label><label class="inline-check"><input name="defaultOwner" type="checkbox" ${isDefaultOwner ? "checked" : ""}>作为默认负责人</label><label class="inline-check"><input name="reviewParticipant" type="checkbox" ${participatesReview ? "checked" : ""}>参与样衣评审页</label></div></section>
      <section><h3>固定角色</h3><div class="assignment-role-list">${roleTemplates.map((template) => `<label><input type="checkbox" name="roleIds" value="${esc(template.id)}" ${userRoles.has(template.id) ? "checked" : ""}><span><strong>${esc(template.name)}</strong><small>${esc(template.type)} · ${esc(template.permissions.slice(0, 3).join(" / "))}</small></span></label>`).join("")}</div></section>
      <section><h3>适用范围</h3>${checkList(scopeOptions, "scopes", selectedScopes)}</section>
      <div class="modal-actions"><button type="button" data-close-modal>取消</button><button class="primary-button" type="submit">保存分配</button></div>
    </form>`;
}

function renderWorkerModal() {
  return `
    <form class="modal-card" data-modal-form="worker">
      <div class="modal-header"><div><span>打样工人池</span><h2>新增打样工人</h2></div><button type="button" data-close-modal>×</button></div>
      <section><h3>基本信息</h3><div class="form-grid"><label>姓名<input name="name" required placeholder="例如：李阿姨"></label><label>所属部门<select name="department"><option>打样部</option><option>新长江工厂</option><option>压胶车间</option><option>外发打样</option></select></label><label>联系方式<input name="contact" placeholder="可选"></label><label>状态<select name="status"><option>可派发</option><option>忙碌</option><option>暂停</option><option>离岗</option></select></label></div></section>
      <section><h3>打样路线</h3>${checkList(["普通打样", "新长江压胶打样", "外发打样", "如东工厂打样"], "routes", ["普通打样"])}</section>
      <section><h3>擅长类型</h3>${checkList(["针织", "梭织", "冲锋衣", "裤子", "Polo", "T恤", "压胶", "无缝", "样衣修改", "小样验证", "返修"], "skills", ["梭织"])}</section>
      <section><h3>工作负荷</h3><div class="form-grid"><label>当前任务数<input name="taskCount" type="number" min="0" value="0"></label><label>最近完成时间<input name="lastCompletedAt" placeholder="可选"></label><label>派发优先级<select name="priority"><option>普通</option><option>优先</option><option>压胶优先</option><option>暂不派发</option></select></label></div><label class="full-label">备注<textarea name="note" placeholder="擅长梭织样衣修改，压胶经验较少。"></textarea></label></section>
      <div class="modal-actions"><button type="button" data-close-modal>取消</button><button class="primary-button" type="submit">保存打样工人</button></div>
    </form>`;
}

function renderSampleVariantRow(index = 0, variant = {}) {
  return `
    <div class="sample-variant-row" data-sample-variant-row>
      <label>颜色<input name="variantColor" placeholder="如：黑色 / 蓝色" value="${esc(variant.color || "")}"></label>
      <label>尺码<input name="variantSize" placeholder="如：M / L / XL" value="${esc(variant.size || "")}"></label>
      <label>件数<input name="variantQuantity" type="number" min="1" value="${Number(variant.quantity || 1)}"></label>
      <button type="button" data-remove-sample-variant aria-label="删除第 ${index + 1} 个颜色尺码组合">删除</button>
    </div>`;
}

function collectSampleVariants(form) {
  const rows = Array.from(form.querySelectorAll("[data-sample-variant-row]"));
  const variants = rows.map((row) => {
    const color = row.querySelector('[name="variantColor"]')?.value.trim() || "";
    const size = row.querySelector('[name="variantSize"]')?.value.trim() || "";
    const quantity = Math.max(1, Number(row.querySelector('[name="variantQuantity"]')?.value || 1));
    return { color, size, quantity };
  }).filter((item) => item.color || item.size || item.quantity > 0);
  return variants.length ? variants : [{ color: "", size: "", quantity: 1 }];
}

function sampleVariantSummary(style) {
  const variants = style?.sampleVariants || [];
  if (!variants.length) return `${style?.quantity || 1} 件`;
  return variants.map((item) => {
    const spec = [item.color, item.size].filter(Boolean).join(" / ") || "未填颜色尺码";
    return `${spec} ${item.quantity || 1}件`;
  }).join("；");
}

function renderStyleModal() {
  const brandOwners = os.data.users.filter((user) => user.department === "业务部").map((user) => ({ value: user.id, label: user.name }));
  const doneDate = nextDateValue(3);
  const shipDate = offsetDateValue(doneDate, 1);
  const recommendedSummary = recommendedOwnerSummary("normal", "office_sample_room");
  return `
    <form class="modal-card wide" data-modal-form="style">
      <div class="modal-header"><div><span>开发入口</span><h2>新建款式 / 新建开发任务</h2></div><button type="button" data-close-modal>×</button></div>
      <section><h3>款式基础信息</h3><div class="form-grid"><label>品牌<select name="brand" required><option>萨洛蒙</option><option>迪桑特</option><option>其他</option></select></label><label>款号<input name="styleNo" required placeholder="212 / SW4SS27-002"></label><label>款式名称<input name="styleName" required placeholder="户外冲锋衣"></label><label>季节<select name="season" required><option>SS27</option><option>FW26</option><option>27SS</option><option>26FW</option></select></label><label>品类<select name="category" required><option>冲锋衣</option><option>裤子</option><option>Polo</option><option>T恤</option><option>卫衣</option><option>外套</option><option>衬衫</option><option>其他</option></select></label><label>业务负责人<select name="businessOwner" required>${optionList(brandOwners, "user_guyao")}</select></label></div></section>
      <section><div class="section-title-row"><h3>样衣颜色 / 尺码 / 件数</h3><button type="button" data-add-sample-variant>添加组合</button></div><div class="sample-variant-list" data-sample-variant-list>${renderSampleVariantRow(0)}</div><small class="muted-note">同一个款号可一次录入多个颜色和尺码组合，系统会自动汇总总件数。</small></section>
      <section><h3>打样信息</h3><div class="form-grid"><label>第几次样品<select name="samplePhase" required>${optionList(Object.entries(os.data.samplePhases).map(([value, label]) => ({ value, label })), "first_sample")}</select></label><label>在哪里打样<select name="sampleLocation" id="new-style-location" required>${optionList(os.data.sampleLocationOptions.map((item) => ({ value: item.id, label: item.label })), "office_sample_room")}</select></label><label>打样路线<select name="route" id="new-style-route" required>${optionList(Object.entries(os.data.sampleRoutes).map(([value, label]) => ({ value, label })), "normal")}</select></label><label>预计打样完成日期<input name="sampleDoneDate" id="new-style-done-date" type="date" required value="${doneDate}"></label><label>预计寄样日期<input name="plannedShipDate" id="new-style-ship-date" type="date" required value="${shipDate}"></label><label>客户要求到样日期<input name="customerDueDate" type="date"></label><label class="inline-check"><input name="highRisk" type="checkbox">是否高风险</label><label class="inline-check"><input name="syncCalendar" type="checkbox" checked>同步到样衣日历</label></div></section>
      <section><h3>系统推荐</h3><div class="route-hint" id="route-hint">事务所打样间，建议路线：普通款式</div><div class="owner-recommendation" id="owner-recommendation"><strong>系统已根据打样路线自动分配负责人，可在款式详情页修改。</strong><span>${esc(recommendedSummary)}</span></div><small class="muted-note">客户资料、TP、参考图片、原样图片将在创建后进入款式详情页上传，并统一进入 S3。</small></section>
      <div class="modal-actions"><button type="button" data-close-modal>取消</button><button type="button" data-save-draft>保存草稿</button><button class="primary-button" type="submit">创建款式</button></div>
    </form>`;
}

function nextDateValue(days = 1) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

function offsetDateValue(value, days = 1) {
  const date = value ? new Date(`${value}T00:00:00`) : new Date();
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

function recommendedOwnerSummary(route = "normal", locationId = "office_sample_room") {
  const locationOption = os.data.sampleLocationOptions.find((item) => item.id === locationId);
  const routeLabel = os.data.sampleRoutes[route] || route;
  const base = ["业务负责人：表单选择", "版子：徐海燕", "面料：李卫红", "辅料：大红", "准备闸口：王部长", `评审负责人：${os.userName(os.data.gateRules.sampleReviewGateOwner) || "大前"}`];
  if (route === "bonding_xinchangjiang" || route === "xinchangjiang") {
    base.push("压胶开发：张部长", "新长江派发：夏红霞");
  } else {
    base.push("普通打样派发：大戴");
  }
  return `${locationOption?.label || "样衣间"} · ${routeLabel} · ${base.join(" / ")}`;
}

function userIdByName(name) {
  return os.data.users.find((user) => user.name === name)?.id || null;
}

function updateStyleCreateRecommendations() {
  const locationSelect = document.querySelector("#new-style-location");
  const routeSelect = document.querySelector("#new-style-route");
  const hint = document.querySelector("#route-hint");
  const summary = document.querySelector("#owner-recommendation span");
  if (!locationSelect || !routeSelect) return;
  const option = os.data.sampleLocationOptions.find((item) => item.id === locationSelect.value);
  if (hint && option) hint.textContent = `${option.label}，建议路线：${os.data.sampleRoutes[routeSelect.value] || routeSelect.value}`;
  if (summary) summary.textContent = recommendedOwnerSummary(routeSelect.value, locationSelect.value);
}

function mediaOptionList(sample, selected = "") {
  const media = (sample?.mediaList || []).filter((item) => item.url || item.label || item.fileName);
  if (!media.length) return `<option value="">暂无已上传媒体</option>`;
  return `<option value="">不关联</option>${media.map((item) => `<option value="${esc(item.id)}" ${item.id === selected ? "selected" : ""}>${esc(item.label || item.fileName || item.id)}</option>`).join("")}`;
}

function renderIssueModal(prefill = {}) {
  const review = os.getReviewById(os.data.currentReviewId);
  const sample = os.getSampleById(review?.sampleId);
  const currentUser = os.getUser(os.data.currentUserId);
  const reviewerId = prefill.reviewer || currentUser?.id || "";
  const level = prefill.level || "normal";
  const sourceDepartment = prefill.sourceDepartment || currentUser?.department || "品质部";
  const needsVerification = prefill.needsVerification ?? ["major", "critical"].includes(level);
  const shipmentBlocking = prefill.shipmentBlocking ?? ["major", "critical"].includes(level);
  return `
    <form class="modal-card wide issue-modal-card" data-modal-form="issue" data-source-review-index="${esc(prefill.departmentReviewIndex ?? "")}">
      <div class="modal-header"><div><span>质量闸口 Issue</span><h2>${prefill.fromDepartmentReview ? "评审意见转为 Issue" : "新增问题"}</h2></div><button type="button" data-close-modal>×</button></div>
      <section><h3>问题基础信息</h3><div class="form-grid"><label>问题名称<input name="title" required value="${esc(prefill.title || "")}" placeholder="例如：领口起皱 / 拉链色差"></label><label>问题位置 / 部位<select name="relatedArea" required>${optionList(issueAreas, prefill.relatedArea || issueAreas[0])}</select></label><label class="full-label">问题描述<textarea name="description" required placeholder="描述问题现象、判断依据和期望处理方式">${esc(prefill.description || "")}</textarea></label></div></section>
      <section><h3>来源与证据</h3><div class="form-grid"><label>来源部门<select name="sourceDepartment" required>${optionList(os.data.departments.length ? os.data.departments : [sourceDepartment], sourceDepartment)}</select></label><label>评审人<select name="reviewer" required>${optionList(os.data.users.map((user) => ({ value: user.id, label: `${user.name} · ${user.department}` })), reviewerId)}</select></label><label>证据类型<select name="evidenceType" required>${optionList(evidenceTypes, prefill.evidenceType || "页面新增")}</select></label><label>关联图片 / 视频<select name="mediaId">${mediaOptionList(sample, prefill.mediaId || "")}</select></label><label class="full-label">关注点<input name="focusPoint" value="${esc(prefill.focusPoint || "")}" placeholder="例如：外观 / 历史问题 / 复验"></label></div></section>
      <section><h3>问题等级</h3><div class="form-grid"><label>等级<select name="level" required data-issue-level>${optionList([{ value: "minor", label: "轻微" }, { value: "normal", label: "一般" }, { value: "major", label: "重大" }, { value: "critical", label: "严重" }], level)}</select></label><div class="issue-level-help" data-issue-level-help>${esc(issueLevelHelp[level])}</div></div></section>
      <section><h3>是否阻塞寄样</h3><div class="form-grid"><label class="inline-check"><input name="shipmentBlocking" type="checkbox" ${shipmentBlocking ? "checked" : ""} ${level === "critical" ? "disabled" : ""}>阻塞寄样</label><small class="muted-note">轻微默认否；一般默认否但可切换；重大默认是；严重必须是。</small></div></section>
      <section><h3>责任与复验</h3><div class="form-grid"><label>负责人<select name="owner" required>${optionList(os.data.users.map((user) => ({ value: user.id, label: `${user.name} · ${user.department}` })), prefill.owner || reviewerId || os.data.gateRules.sampleReviewGateOwner)}</select></label><label>截止时间<input name="dueDate" type="date" required value="${esc(prefill.dueDate || nextDateValue(1))}"></label><label class="inline-check"><input name="needsVerification" type="checkbox" ${needsVerification ? "checked" : ""}>需要复验</label><label>复验人<select name="verifier" ${["major", "critical"].includes(level) ? "required" : ""}>${optionList([{ value: "", label: "无需复验" }, ...os.data.users.map((user) => ({ value: user.id, label: `${user.name} · ${user.department}` }))], prefill.verifier || reviewerId || "")}</select></label><label>状态<select name="status"><option value="not_started" selected>未处理</option><option value="in_progress">处理中</option><option value="pending_verification">待验证</option></select></label></div></section>
      <div class="modal-actions"><button type="button" data-close-modal>取消</button><button class="primary-button" type="submit">保存为 Issue</button></div>
    </form>`;
}

function openModal(type, options = {}) {
  if (!modalRoot) return;
  const templates = { person: renderPersonModal, assignment: renderAssignmentModal, worker: renderWorkerModal, style: renderStyleModal, issue: renderIssueModal };
  modalRoot.innerHTML = `<div class="modal-backdrop" data-close-modal></div>${templates[type]?.(options) || ""}`;
  modalRoot.classList.remove("media-viewer-open", "issue-modal-open");
  modalRoot.classList.add("open");
  if (type === "issue") modalRoot.classList.add("issue-modal-open");
  modalRoot.setAttribute("aria-hidden", "false");
}

function closeModal() {
  modalRoot?.classList.remove("open", "media-viewer-open", "issue-modal-open");
  modalRoot?.setAttribute("aria-hidden", "true");
  if (modalRoot) modalRoot.innerHTML = "";
}

function selectedValues(form, name) {
  return Array.from(form.querySelectorAll(`[name="${name}"]:checked`)).map((input) => input.value);
}

async function handlePersonSubmit(form) {
  const roles = selectedValues(form, "roles");
  const permissions = selectedValues(form, "permissions").map((permission) => permission.replace(" Opinion", "意见").replace(" Issue", "问题"));
  const fields = form.elements;
  const name = fields.name.value.trim();
  if (!name) return;
  const id = `user_${Date.now()}`;
  const isGateOwner = roles.some((role) => role.includes("Gate Owner"));
  const isFinalApprover = roles.some((role) => role.includes("Final Approver"));
  await window.SampleOSBackend.syncData("createPerson", {
    id,
    name,
    department: fields.department.value,
    role: roles.map((role) => role.split(" / ").pop()).join(" / ") || "业务负责人",
    currentResponsibility: fields.currentResponsibility.value.trim(),
    reviewResponsibility: fields.reviewResponsibility.value.trim() || "待补充评审职责",
    permissions,
    scope: selectedValues(form, "scope"),
    avatarColor: fields.avatarColor.value,
    enabled: fields.status.value === "启用",
    isGateOwner,
    isFinalApprover,
  });
  await loadBackendSnapshot();
  showToast("人员已同步到 Supabase");
}

async function handleAssignmentSubmit(form) {
  const fields = form.elements;
  const user = os.getUser(fields.userId.value);
  if (!user) throw new Error("请选择要分配角色的人员");
  const roleIds = selectedValues(form, "roleIds");
  if (!roleIds.length) throw new Error("请至少选择一个固定角色");
  user.assignedRoleIds = roleIds;
  user.scope = selectedValues(form, "scopes");
  user.reviewParticipant = Boolean(fields.reviewParticipant?.checked);
  user.permissions = inheritedPermissions(user);
  user.enabled = user.enabled !== false;
  if (fields.defaultOwner?.checked) {
    roleIds.forEach((roleId) => {
      const template = roleTemplates.find((role) => role.id === roleId);
      if (template && !template.people.includes(user.name)) template.people.unshift(user.name);
    });
  }
  renderSettings();
  renderReview();
  showToast(`${user.name} 已按固定角色模板更新权限`);
}

async function handleWorkerSubmit(form) {
  const fields = form.elements;
  const name = fields.name.value.trim();
  if (!name) return;
  await window.SampleOSBackend.syncData("createWorker", {
    id: `worker_${Date.now()}`,
    name,
    department: fields.department.value,
    contact: fields.contact.value.trim(),
    route: selectedValues(form, "routes").join(" / "),
    skill: selectedValues(form, "skills").join(" / ") || "待维护",
    status: fields.status.value,
    taskCount: Number(fields.taskCount.value || 0),
    lastCompletedAt: fields.lastCompletedAt.value.trim() || "暂无记录",
    priority: fields.priority.value,
    note: fields.note.value.trim(),
    avatarColor: "liayi",
  });
  await loadBackendSnapshot();
  showToast("打样工人已同步到 Supabase");
}

function createLocalStyleFromPayload(payload, reason = "") {
  const timestamp = Date.now();
  const styleId = `local_style_${timestamp}`;
  const sampleId = `local_sample_${timestamp}`;
  const reviewId = `local_review_${timestamp}`;
  const now = new Date().toLocaleString("zh-CN", { hour12: false }).replace(/\//g, "-");
  const style = {
    id: styleId,
    externalRef: styleId,
    styleNo: payload.styleNo,
    brand: payload.brand || "未指定品牌",
    season: payload.season || "",
    styleName: payload.styleName,
    category: payload.category || "",
    route: payload.route || "normal",
    currentGate: "preparation_gate",
    samplePhase: payload.samplePhase || "first_sample",
    sampleLocation: payload.sampleLocation || "未设置",
    currentOwner: [],
    gateOwner: payload.reviewOwnerId || null,
    finalApprover: payload.finalApproverId || null,
    plannedShipDate: payload.plannedShipDate || "",
    riskStatus: payload.highRisk ? "approaching_due" : "normal",
    nextAction: "准备材料齐套后由负责人确认",
    blockerSummary: reason ? `本地保存，待同步：${reason}` : "本地保存，待同步",
    sampleVariants: payload.sampleVariants || [],
    quantity: payload.quantity || 1,
    localOnly: true,
  };
  const sample = {
    id: sampleId,
    externalRef: sampleId,
    styleId,
    samplePhase: style.samplePhase,
    versionName: payload.versionName || os.phaseLabels[style.samplePhase] || "一次样",
    status: "preparation_blocked",
    location: style.sampleLocation,
    holder: "未指定",
    createdAt: now,
    updatedAt: now,
    imageList: [],
    videoList: [],
    mediaList: [],
    reviewId,
    plannedShipDate: style.plannedShipDate,
  };
  const review = {
    id: reviewId,
    externalRef: reviewId,
    styleId,
    sampleId,
    reviewNo: `LOCAL-${payload.styleNo || timestamp}`,
    status: "not_started",
    gateOwner: style.gateOwner,
    finalApprover: style.finalApprover,
    issueIds: [],
    finalDecision: "none",
    exceptionRequest: null,
    timeline: [{ time: now, type: "amber", text: `本地保存成功，Supabase 同步失败：${reason || "未知错误"}` }],
    departmentReviews: [],
  };
  os.data.styleList = [style, ...os.data.styleList.filter((item) => item.id !== styleId)];
  os.data.samples = [sample, ...os.data.samples];
  os.data.reviews = [review, ...os.data.reviews];
  os.data.currentStyleId = styleId;
  os.data.currentReviewId = reviewId;
  os.data.source = { kind: "local-fallback", loadedAt: new Date().toISOString(), reason };
  return { styleId, sampleId, reviewId };
}

async function handleStyleSubmit(form) {
  const fields = form.elements;
  const locationOption = os.data.sampleLocationOptions.find((item) => item.id === fields.sampleLocation.value);
  const route = fields.route.value;
  const phase = fields.samplePhase.value;
  const sampleVariants = collectSampleVariants(form);
  const quantity = sampleVariants.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 1;
  const payload = {
    styleNo: fields.styleNo.value.trim(),
    brand: fields.brand.value,
    season: fields.season.value,
    styleName: fields.styleName.value.trim(),
    category: fields.category.value,
    color: sampleVariants.map((item) => item.color).filter(Boolean).join(" / "),
    size: sampleVariants.map((item) => item.size).filter(Boolean).join(" / "),
    sampleVariants,
    route,
    samplePhase: phase,
    sampleLocation: locationOption?.label || "样衣间",
    sampleDoneDate: fields.sampleDoneDate.value,
    plannedShipDate: fields.plannedShipDate.value,
    customerDueDate: fields.customerDueDate.value,
    versionName: os.phaseLabels[phase],
    highRisk: fields.highRisk.checked,
    syncCalendar: fields.syncCalendar.checked,
    quantity,
    businessOwnerId: fields.businessOwner.value,
    patternOwnerId: userIdByName("徐海燕"),
    fabricOwnerId: userIdByName("李卫红"),
    trimOwnerId: userIdByName("大红"),
    prepOwnerId: userIdByName("王部长"),
    reviewOwnerId: os.data.gateRules.sampleReviewGateOwner,
    finalApproverId: os.data.gateRules.finalApprover,
    normalDispatcherId: route === "normal" ? userIdByName("大戴") : null,
    bondingOwnerId: route === "bonding_xinchangjiang" ? userIdByName("张部长") : null,
    xcjDispatcherId: route === "bonding_xinchangjiang" || route === "xinchangjiang" ? userIdByName("夏红霞") : null,
  };
  if (!window.SampleOSBackend?.syncData) {
    const local = createLocalStyleFromPayload(payload, "后端同步接口未加载");
    renderAll();
    openStyleDrawer(local.styleId, "prep");
    showToast("本地保存成功，同步失败：后端同步接口未加载");
    return;
  }
  try {
    const response = await window.SampleOSBackend.syncData("createStyle", payload);
    await loadBackendSnapshot();
    os.data.currentStyleId = response.result.styleId;
    os.data.currentReviewId = response.result.reviewId;
    renderAll();
    openStyleDrawer(response.result.styleId, "prep");
    showToast("款式已创建并同步到 Supabase，进入详情页继续补资料");
  } catch (error) {
    console.error("Create style sync failed", {
      message: error.message,
      status: error.status,
      response: error.response,
      request: error.request,
      payload,
    });
    const local = createLocalStyleFromPayload(payload, error.message);
    renderAll();
    openStyleDrawer(local.styleId, "prep");
    showToast(`本地保存成功，同步失败：${error.message}`);
  }
}

async function handleIssueSubmit(form) {
  const review = os.getReviewById(os.data.currentReviewId);
  const sample = os.getSampleById(review?.sampleId);
  if (!review || !sample) throw new Error("缺少当前评审或样衣");
  const fields = form.elements;
  const level = fields.level.value;
  const shipmentBlocking = level === "critical" || Boolean(fields.shipmentBlocking.checked);
  const needsVerification = Boolean(fields.needsVerification.checked) || ["major", "critical"].includes(level);
  if (level === "critical" && !shipmentBlocking) throw new Error("严重问题必须阻塞寄样");
  if (["major", "critical"].includes(level) && !fields.verifier.value) throw new Error("重大 / 严重问题必须填写复验人");
  const evidenceType = fields.evidenceType.value;
  const mediaLabel = fields.mediaId.value
    ? sample.mediaList?.find((media) => media.id === fields.mediaId.value)?.label
    : "";
  const payload = {
    reviewId: review.id,
    styleId: review.styleId,
    sampleId: sample.id,
    title: fields.title.value.trim(),
    description: fields.focusPoint.value.trim()
      ? `${fields.description.value.trim()}\n关注点：${fields.focusPoint.value.trim()}`
      : fields.description.value.trim(),
    relatedArea: fields.relatedArea.value,
    sourceDepartment: fields.sourceDepartment.value,
    reviewerId: fields.reviewer.value,
    focusPoint: fields.focusPoint.value.trim(),
    evidence: mediaLabel ? `${evidenceType} · ${mediaLabel}` : evidenceType,
    mediaId: fields.mediaId.value || null,
    level,
    shipmentBlocking,
    canShipWithNote: ["minor", "normal"].includes(level) && !shipmentBlocking,
    ownerId: fields.owner.value,
    dueDate: fields.dueDate.value,
    needsVerification,
    verifierId: needsVerification ? fields.verifier.value || null : null,
    status: fields.status.value || "not_started",
  };
  if (!payload.title || !payload.description || !payload.relatedArea || !payload.ownerId || !payload.dueDate) {
    throw new Error("请完整填写问题名称、描述、部位、负责人和截止时间");
  }
  const response = await window.SampleOSBackend.syncData("createIssue", payload);
  const localIssueId = response?.result?.issueId || `issue_local_${Date.now()}`;
  const rowIndex = form.dataset.sourceReviewIndex;
  if (rowIndex !== "") {
    const item = review.departmentReviews[Number(rowIndex)];
    if (item) {
      item.issueIds ||= [];
      if (!item.issueIds.includes(localIssueId)) item.issueIds.push(localIssueId);
    }
  }
  await loadBackendSnapshot();
  showToast(level === "minor" ? "轻微 Issue 已记录，不阻止寄样" : level === "normal" ? "一般 Issue 已记录，等待 Gate Owner 判断" : level === "major" ? "重大 Issue 已记录，已同步阻塞状态" : "严重 Issue 已记录，已暂停寄样");
}

function updateIssueLevelFields(form) {
  const level = form.elements.level?.value || "normal";
  const blocking = form.elements.shipmentBlocking;
  const needsVerification = form.elements.needsVerification;
  const verifier = form.elements.verifier;
  const help = form.querySelector("[data-issue-level-help]");
  if (help) help.textContent = issueLevelHelp[level] || "";
  if (blocking) {
    blocking.checked = ["major", "critical"].includes(level);
    blocking.disabled = level === "critical";
  }
  if (needsVerification) needsVerification.checked = ["major", "critical"].includes(level);
  if (verifier) {
    if (["major", "critical"].includes(level)) verifier.setAttribute("required", "required");
    else verifier.removeAttribute("required");
  }
}

function updateRouteHint(locationId) {
  const option = os.data.sampleLocationOptions.find((item) => item.id === locationId);
  const routeSelect = document.querySelector("#new-style-route");
  if (option && routeSelect) routeSelect.value = option.recommendedRoute;
  updateStyleCreateRecommendations();
}

function renderAll() {
  renderSidebarMetrics();
  renderPipeline();
  renderStyleWorkspace();
  renderReview();
  renderCalendar();
  renderSettings();
  syncFilterButtons();
  os.validateData();
}

function openPerson(row) {
  const fields = row.dataset.person?.split("|") || [];
  if (!fields.length) return;
  const [name, dept, role, duty, reviewDuty, raci, permissions, scope, gates, note, canReview = "否", canFinal = "否", canException = "否"] = fields;
  document.querySelector("#person-name").textContent = name;
  document.querySelector("#person-dept").textContent = dept;
  document.querySelector("#person-role").textContent = role;
  document.querySelector("#person-duty").textContent = duty;
  document.querySelector("#person-review-duty").textContent = reviewDuty;
  document.querySelector("#person-raci").textContent = raci;
  document.querySelector("#person-scope").textContent = scope;
  document.querySelector("#person-gates").textContent = gates;
  document.querySelector("#person-can-review").textContent = canReview;
  document.querySelector("#person-can-final").textContent = canFinal;
  document.querySelector("#person-can-exception").textContent = canException;
  document.querySelector("#person-note").textContent = note;
  const tagBox = document.querySelector("#person-permissions");
  tagBox.innerHTML = "";
  permissions.split("、").forEach((permission) => {
    const tag = document.createElement("i");
    tag.textContent = permission;
    tagBox.appendChild(tag);
  });
  personDrawer.classList.add("open");
  personDrawer.setAttribute("aria-hidden", "false");
}

renderAll();
updateTopbar(document.querySelector(".view.active")?.id || "pipeline");
loadBackendSnapshot();
window.SampleOSApp = {
  renderAll,
  showView,
  updateTopbar,
  loadBackendSnapshot,
};

document.addEventListener("click", (event) => {
  const langButton = event.target.closest(".language-switch button");
  if (langButton) {
    currentLang = langButton.textContent.includes("日本") ? "ja" : "zh";
    document.querySelectorAll(".language-switch button").forEach((button) => button.classList.toggle("active", button === langButton));
    showView(document.querySelector(".view.active")?.id || "pipeline");
    showToast(currentLang === "ja" ? "日本語表示に切り替えました（一部項目は中国語データのままです）" : "已切换回中文");
    return;
  }

  const pipelineFilter = event.target.closest("[data-pipeline-filter]");
  if (pipelineFilter) {
    const key = pipelineFilter.dataset.pipelineFilter;
    if (pipelineFilters.has(key)) pipelineFilters.delete(key);
    else pipelineFilters.add(key);
    renderPipeline();
    return;
  }

  const calendarFilter = event.target.closest("[data-calendar-filter]");
  if (calendarFilter) {
    const key = calendarFilter.dataset.calendarFilter;
    if (key === "brand") {
      const brands = Array.from(new Set(os.data.styleList.map((style) => style.brand).filter(Boolean))).join(" / ");
      const nextBrand = window.prompt(`输入要筛选的品牌；留空清除。当前可选：${brands || "暂无品牌"}`, calendarState.brand || "");
      calendarState.brand = String(nextBrand || "").trim();
      if (calendarState.brand) calendarFilters.add("brand");
      else calendarFilters.delete("brand");
    } else if (calendarFilters.has(key)) {
      calendarFilters.delete(key);
    } else {
      calendarFilters.add(key);
    }
    renderCalendar();
    return;
  }

  const monthNav = event.target.closest("[data-calendar-month-nav]");
  if (monthNav) {
    calendarState.monthOffset += Number(monthNav.dataset.calendarMonthNav) || 0;
    renderCalendar();
    return;
  }

  const uploadTrigger = event.target.closest("[data-trigger-upload]");
  if (uploadTrigger) {
    event.preventDefault();
    event.stopPropagation();
    triggerMediaUpload(uploadTrigger.dataset.triggerUpload);
    return;
  }

  const retryUpload = event.target.closest("[data-retry-media-upload]");
  if (retryUpload) {
    triggerMediaUpload(retryUpload.dataset.retryMediaUpload || "photo");
    return;
  }

  const deleteMediaButton = event.target.closest("[data-delete-media]");
  if (deleteMediaButton) {
    event.preventDefault();
    event.stopPropagation();
    deleteSampleMedia(deleteMediaButton.dataset.deleteMedia);
    return;
  }

  const mediaCard = event.target.closest("[data-open-media]");
  if (mediaCard && !event.target.closest("[data-media-label]")) {
    openMediaViewer(mediaCard.dataset.openMedia);
    return;
  }

  if (event.target.closest("[data-media-viewer-prev]")) {
    moveMediaViewer(-1);
    return;
  }

  if (event.target.closest("[data-media-viewer-next]")) {
    moveMediaViewer(1);
    return;
  }

  const modalClose = event.target.closest("[data-close-modal]");
  if (modalClose) {
    closeModal();
    return;
  }

  if (event.target === topPrimaryButton) {
    const activeView = document.querySelector(".view.active")?.id;
    if (activeView === "pipeline") openModal("style");
    return;
  }

  const adminButton = event.target.closest(".admin-actions button, #settings .panel-actions button");
  if (adminButton) {
    const text = adminButton.textContent.trim();
    if (text.includes("新增人员")) {
      openModal("person");
      return;
    }
    if (text.includes("新增打样工人")) {
      openModal("worker");
      return;
    }
  }

  const saveDraft = event.target.closest("[data-save-draft]");
  if (saveDraft) {
    showToast("已保留当前填写内容；点击创建款式后进入详情页继续补全。");
    return;
  }

  const addSampleVariant = event.target.closest("[data-add-sample-variant]");
  if (addSampleVariant) {
    const list = addSampleVariant.closest("section")?.querySelector("[data-sample-variant-list]");
    if (list) list.insertAdjacentHTML("beforeend", renderSampleVariantRow(list.querySelectorAll("[data-sample-variant-row]").length));
    return;
  }

  const removeSampleVariant = event.target.closest("[data-remove-sample-variant]");
  if (removeSampleVariant) {
    const list = removeSampleVariant.closest("[data-sample-variant-list]");
    const rows = list?.querySelectorAll("[data-sample-variant-row]");
    if (rows?.length > 1) removeSampleVariant.closest("[data-sample-variant-row]")?.remove();
    else showToast("至少保留一个颜色尺码组合");
    return;
  }

  const settingsTab = event.target.closest("[data-settings-role-tab]");
  if (settingsTab) {
    settingsRoleTab = settingsTab.dataset.settingsRoleTab;
    renderSettings();
    return;
  }

  const openAssignment = event.target.closest("[data-open-assignment]");
  if (openAssignment) {
    openModal("assignment");
    return;
  }

  const assignRole = event.target.closest("[data-assign-role]");
  if (assignRole) {
    event.preventDefault();
    event.stopPropagation();
    openModal("assignment", { userId: assignRole.dataset.assignRole });
    return;
  }

  const styleDrawerButton = event.target.closest("[data-style-drawer]");
  if (styleDrawerButton) {
    openStyleDrawer(styleDrawerButton.dataset.styleId, styleDrawerButton.dataset.styleDrawer);
    return;
  }

  const reviewButton = event.target.closest("[data-open-review]");
  if (reviewButton) {
    openReviewForStyle(reviewButton.dataset.openReview);
    return;
  }

  const departmentChip = event.target.closest("[data-department-index]");
  if (departmentChip) {
    const index = Number(departmentChip.dataset.departmentIndex);
    const dept = os.data.departmentDetails[index];
    document.querySelectorAll("[data-department-index]").forEach((chip) => chip.classList.toggle("active", chip === departmentChip));
    const detail = document.querySelector("#department-detail");
    if (detail && dept) {
      detail.innerHTML = `<div><span>部门名称</span><strong>${esc(dept.name)}</strong></div><div><span>部门负责人</span><strong>${esc(dept.owner)}</strong></div><div><span>是否参与评审</span><strong>${dept.participatesInReview ? "是" : "否"}</strong></div><div><span>是否接收通知</span><strong>${dept.receivesNotification ? "是" : "否"}</strong></div><div><span>可创建的问题类型</span><strong>${esc(dept.issueTypes.join(" / "))}</strong></div><div><span>默认评审人</span><strong>${esc(dept.defaultReviewer)}</strong></div>`;
    }
    return;
  }

  const closeIssue = event.target.closest("[data-close-issue]");
  if (closeIssue) {
    os.closeIssue(closeIssue.dataset.closeIssue);
    renderAll();
    window.SampleOSBackend?.syncData?.("issueStatus", { issueId: closeIssue.dataset.closeIssue, status: "closed" })
      .then(loadBackendSnapshot)
      .catch((error) => showToast(`关闭问题未同步：${error.message}`));
    return;
  }
  const openIssueButton = event.target.closest("[data-open-issue-modal]");
  if (openIssueButton) {
    openModal("issue");
    return;
  }

  const issueFromReview = event.target.closest("[data-issue-from-review]");
  if (issueFromReview) {
    const review = os.getReviewById(os.data.currentReviewId);
    const index = Number(issueFromReview.dataset.issueFromReview);
    const item = review?.departmentReviews[index];
    if (!review || !item) return;
    const focusText = (item.focusTags || []).join(" / ");
    const textForArea = `${item.opinion || ""} ${focusText}`;
    const relatedArea = issueAreas.find((area) => textForArea.includes(area.split(" / ")[0])) || "其他";
    openModal("issue", {
      fromDepartmentReview: true,
      departmentReviewIndex: index,
      title: item.opinion ? item.opinion.slice(0, 18) : `${item.department}评审问题`,
      description: item.opinion || "",
      sourceDepartment: item.department,
      reviewer: item.reviewer || os.data.currentUserId,
      focusPoint: focusText,
      relatedArea,
      level: item.status === "fail" ? "major" : item.status === "needs_improvement" ? "normal" : "minor",
      owner: item.reviewer || os.data.currentUserId,
      verifier: item.status === "fail" ? (review.gateOwner || os.data.gateRules.sampleReviewGateOwner) : item.reviewer,
      shipmentBlocking: item.status === "fail",
      needsVerification: item.status !== "pass",
      evidenceType: "页面新增",
    });
    return;
  }

  const decisionButton = event.target.closest("[data-decision]");
  if (decisionButton && !decisionButton.classList.contains("disabled")) {
    document.querySelectorAll("[data-decision]").forEach((button) => button.classList.toggle("selected", button === decisionButton));
    decisionButton.closest("[data-decision-stack]").dataset.selectedDecision = decisionButton.dataset.decision;
    return;
  }

  const submitDecision = event.target.closest("[data-submit-decision]");
  if (submitDecision) {
    const review = os.getReviewById(os.data.currentReviewId);
    const stack = submitDecision.closest("[data-decision-stack]");
    const finalDecision = stack?.dataset.selectedDecision || review.finalDecision || "none";
    window.SampleOSBackend?.syncData?.("reviewDecision", {
      reviewId: review.id,
      finalDecision,
      exceptionReason: document.querySelector("[data-exception-reason]")?.value || "",
      exceptionRiskNote: document.querySelector("[data-exception-risk-note]")?.value || "",
      exceptionApprovalStatus: finalDecision === "exception_release" ? "待审批" : null,
      customerNotified: document.querySelector("[data-customer-notified]")?.checked || false,
    }).then(() => {
      showToast("评审结论已同步到 Supabase");
      return loadBackendSnapshot();
    }).catch((error) => showToast(`评审结论未同步：${error.message}`));
    return;
  }

  const editDepartmentReview = event.target.closest("[data-edit-department-review]");
  if (editDepartmentReview) {
    const review = os.getReviewById(os.data.currentReviewId);
    const index = Number(editDepartmentReview.dataset.editDepartmentReview);
    const item = review.departmentReviews[index];
    const rowKey = item?.id || `${review.id}:${item?.department}`;
    if (item) editingReviewRows.add(rowKey);
    renderDepartmentReviews(review);
    document.querySelector(`[data-review-row="${index}"] [data-review-opinion]`)?.focus();
    return;
  }

  const saveDepartmentReview = event.target.closest("[data-save-department-review]");
  if (saveDepartmentReview) {
    const review = os.getReviewById(os.data.currentReviewId);
    const row = saveDepartmentReview.closest("[data-review-row]");
    const index = Number(saveDepartmentReview.dataset.saveDepartmentReview);
    const item = review.departmentReviews[index];
    item.status = row.querySelector("[data-review-status]")?.value || "pending";
    item.opinion = row.querySelector("[data-review-opinion]")?.value.trim() || "";
    item.reviewer = item.reviewer || os.data.currentUserId;
    const hasLinkedIssue = os.getIssuesByReview(review.id).some((issue) => (item.issueIds || []).includes(issue.id) || issue.sourceDepartment === item.department);
    if (item.status === "fail" && !hasLinkedIssue) {
      showToast("请将该评审意见转为质量闸口 Issue，否则无法完成部门评审。");
      openModal("issue", {
        fromDepartmentReview: true,
        departmentReviewIndex: index,
        title: item.opinion ? item.opinion.slice(0, 18) : `${item.department}不通过问题`,
        description: item.opinion,
        sourceDepartment: item.department,
        reviewer: item.reviewer,
        focusPoint: (item.focusTags || []).join(" / "),
        relatedArea: "其他",
        level: "major",
        owner: item.reviewer,
        verifier: review.gateOwner || os.data.gateRules.sampleReviewGateOwner,
        shipmentBlocking: true,
        needsVerification: true,
      });
      return;
    }
    const rowKey = row.dataset.reviewRowKey || item.id || `${review.id}:${item.department}`;
    editingReviewRows.delete(rowKey);
    window.SampleOSBackend?.syncData?.("departmentReview", {
      reviewId: review.id,
      department: item.department,
      role: item.role,
      reviewerId: item.reviewer,
      status: item.status,
      opinion: item.opinion,
      focusTags: item.focusTags,
    }).then(() => {
      showToast("评审意见已同步");
      return loadBackendSnapshot();
    }).catch((error) => showToast(`评审意见未同步：${error.message}`));
    renderDepartmentReviews(review);
    return;
  }
  const person = event.target.closest(".people-row[data-person]");
  if (person) {
    openPerson(person);
    return;
  }
  const viewButton = event.target.closest("[data-view]");
  if (viewButton && titleMap[viewButton.dataset.view]) {
    if (viewButton.dataset.styleId) {
      os.data.currentStyleId = viewButton.dataset.styleId;
      const review = os.getActiveReviewByStyle(viewButton.dataset.styleId);
      if (review) os.data.currentReviewId = review.id;
      renderAll();
    }
    showView(viewButton.dataset.view);
  }
});

document.addEventListener("change", (event) => {
  if (event.target.id === "gate-owner-select") {
    os.updateSampleReviewGateOwner(event.target.value);
    renderAll();
    window.SampleOSBackend?.syncData?.("updateGateRule", {
      key: "sampleReviewGateOwner",
      userId: event.target.value,
    }).then(loadBackendSnapshot).catch((error) => showToast(`Gate 负责人未同步：${error.message}`));
  }
  if (event.target.id === "sample-location-select") {
    const review = os.getReviewById(os.data.currentReviewId);
    const sample = os.getSampleById(review.sampleId);
    os.updateSampleLocation(review.styleId, event.target.value);
    renderAll();
    window.SampleOSBackend?.syncData?.("sampleLocation", {
      sampleId: sample.id,
      location: event.target.value,
      reason: "页面位置调整",
    }).then(loadBackendSnapshot).catch((error) => showToast(`样衣位置未同步：${error.message}`));
  }
  if (event.target.id === "new-style-location") {
    updateRouteHint(event.target.value);
  }
  if (event.target.id === "new-style-route") {
    updateStyleCreateRecommendations();
  }
  if (event.target.id === "new-style-done-date") {
    const shipDate = document.querySelector("#new-style-ship-date");
    if (shipDate) shipDate.value = offsetDateValue(event.target.value, 1);
  }
  if (event.target.matches("[data-issue-level]")) {
    const form = event.target.closest("[data-modal-form='issue']");
    if (form) updateIssueLevelFields(form);
  }
  if (event.target.matches("[data-review-status]")) {
    const row = event.target.closest("[data-review-row]");
    const help = row?.querySelector("[data-review-status-help]");
    if (help) help.textContent = departmentStatusHelp[event.target.value] || "";
  }
});

document.addEventListener("submit", async (event) => {
  const form = event.target.closest("[data-modal-form]");
  if (!form) return;
  event.preventDefault();
  const type = form.dataset.modalForm;
  try {
    if (type === "person") await handlePersonSubmit(form);
    if (type === "assignment") await handleAssignmentSubmit(form);
    if (type === "worker") await handleWorkerSubmit(form);
    if (type === "style") await handleStyleSubmit(form);
    if (type === "issue") await handleIssueSubmit(form);
    renderAll();
    closeModal();
    if (type === "style") showView("pipeline");
  } catch (error) {
    showToast(`保存失败：${error.message}`);
  }
});

closeDrawer?.addEventListener("click", () => {
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
});

closePersonDrawer?.addEventListener("click", () => {
  personDrawer.classList.remove("open");
  personDrawer.setAttribute("aria-hidden", "true");
});

closeStyleDrawer?.addEventListener("click", closeStyleDrawerPanel);

document.querySelectorAll("[data-permission-filter]").forEach((chip) => {
  chip.addEventListener("click", () => {
    const filter = chip.dataset.permissionFilter;
    document.querySelectorAll("[data-permission-filter]").forEach((item) => item.classList.toggle("active", item === chip));
    document.querySelectorAll(".people-row[data-person]").forEach((row) => {
      const matches = filter === "all" || row.textContent.includes(filter);
      row.classList.toggle("is-hidden", !matches);
    });
  });
});

document.querySelectorAll(".route-flow button[data-node]").forEach((nodeButton) => {
  nodeButton.addEventListener("click", () => {
    const [name, role, owner, required, blocking, skip, record] = nodeButton.dataset.node.split("|");
    document.querySelectorAll(".route-flow button[data-node]").forEach((button) => button.classList.toggle("active", button === nodeButton));
    document.querySelector("#route-node-name").textContent = name;
    document.querySelector("#route-node-role").textContent = role;
    document.querySelector("#route-node-owner").textContent = owner;
    document.querySelector("#route-node-required").textContent = required;
    document.querySelector("#route-node-blocking").textContent = blocking;
    document.querySelector("#route-node-skip").textContent = skip;
    document.querySelector("#route-node-record").textContent = record;
  });
});

const topSearch = document.querySelector(".topbar input[type='search']");
if (topSearch) {
  topSearch.addEventListener("input", () => {
    const query = topSearch.value.trim().toLowerCase();
    if (!document.querySelector("#settings.active")) return;
    document.querySelectorAll(".people-row[data-person]").forEach((row) => row.classList.toggle("is-hidden", query && !row.textContent.toLowerCase().includes(query)));
  });
}

document.addEventListener("keydown", (event) => {
  const mediaLabel = event.target.closest?.("[data-media-label]");
  if (mediaLabel && event.key === "Enter") {
    event.preventDefault();
    mediaLabel.blur();
    return;
  }

  const mediaCard = event.target.closest?.("[data-open-media]");
  if (mediaCard && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    openMediaViewer(mediaCard.dataset.openMedia);
    return;
  }

  if (modalRoot?.classList.contains("media-viewer-open") && event.key === "ArrowLeft") {
    event.preventDefault();
    moveMediaViewer(-1);
    return;
  }

  if (modalRoot?.classList.contains("media-viewer-open") && event.key === "ArrowRight") {
    event.preventDefault();
    moveMediaViewer(1);
    return;
  }

  if (event.key === "Escape") {
    drawer?.classList.remove("open");
    drawer?.setAttribute("aria-hidden", "true");
    personDrawer?.classList.remove("open");
    personDrawer?.setAttribute("aria-hidden", "true");
    closeStyleDrawerPanel();
    closeModal();
  }
});

document.addEventListener("touchstart", (event) => {
  if (!modalRoot?.classList.contains("media-viewer-open")) return;
  const touch = event.touches?.[0];
  if (!touch) return;
  mediaViewerState.touchStartX = touch.clientX;
  mediaViewerState.touchStartY = touch.clientY;
}, { passive: true });

document.addEventListener("touchend", (event) => {
  if (!modalRoot?.classList.contains("media-viewer-open")) return;
  const touch = event.changedTouches?.[0];
  if (!touch) return;
  const dx = touch.clientX - mediaViewerState.touchStartX;
  const dy = touch.clientY - mediaViewerState.touchStartY;
  if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
  moveMediaViewer(dx < 0 ? 1 : -1);
}, { passive: true });

document.addEventListener("pointermove", updatePointerGlow, { passive: true });

document.addEventListener("change", async (event) => {
  const labelInput = event.target.closest("[data-media-label]");
  if (labelInput) {
    const review = os.getReviewById(os.data.currentReviewId);
    const sample = os.getSampleById(review.sampleId);
    const media = sample.mediaList?.find((item) => item.id === labelInput.dataset.mediaLabel);
    if (media) {
      media.label = labelInput.value.trim() || media.label;
      window.SampleOSBackend?.syncData?.("updateMediaLabel", {
        mediaId: media.id,
        label: media.label,
      }).then(() => showToast("媒体标签已保存")).catch((error) => showToast(`媒体标签未同步：${error.message}`));
    }
    return;
  }

  const input = event.target.closest("[data-media-upload]");
  if (!input?.files?.length) return;
  if (mediaUploadState.active) {
    showToast("正在上传，请勿重复选择文件");
    input.value = "";
    return;
  }
  const file = input.files[0];
  const review = os.getReviewById(os.data.currentReviewId);
  const sample = os.getSampleById(review.sampleId);
  const uploadTarget = input.dataset.mediaUpload;
  const mediaKind = uploadTarget === "style-cover" ? "photo" : uploadTarget;
  const fallbackLabel = uploadTarget === "style-cover" ? "款式图" : mediaKind === "video" ? "整体视频" : "正面";
  const label = uploadTarget === "style-cover" ? fallbackLabel : window.prompt("给这个文件写个标签，例如：正面、反面、拉链", fallbackLabel) || fallbackLabel;
  const context = {
    styleId: review.styleId,
    sampleId: sample.id,
    reviewId: review.id,
    label,
  };

  try {
    setMediaUploadState({
      active: true,
      status: "uploading",
      fileName: file.name,
      progress: 1,
      message: "正在上传，请勿关闭页面",
      error: "",
      kind: uploadTarget,
    });
    await window.SampleOSBackend.seedDemoData();
    const result = await window.SampleOSBackend.uploadFile(file, context, ({ ratio }) => {
      setMediaUploadState({
        active: true,
        status: "uploading",
        fileName: file.name,
        progress: Math.max(1, Math.round(ratio * 100)),
        message: "正在上传，请勿关闭页面",
        error: "",
        kind: uploadTarget,
      });
    });
    const uploadedAt = new Date().toLocaleString("zh-CN", { hour12: false });
    sample.mediaList ||= [];
    sample.mediaList.unshift({
      id: result.media.id,
      label,
      fileName: file.name,
      mediaKind,
      mimeType: file.type,
      byteSize: file.size,
      uploadedAt,
      url: file.type.startsWith("image/") || file.type.startsWith("video/") ? URL.createObjectURL(file) : null,
      uploadedBy: os.userName(os.data.currentUserId),
    });
    review.timeline.unshift({
      time: uploadedAt,
      type: "blue",
      text: `${os.userName(os.data.currentUserId)} · 上传${uploadTarget === "style-cover" ? "款式图" : mediaKind === "video" ? "视频" : "照片"}：${label}`,
    });
    setMediaUploadState({
      active: false,
      status: "success",
      fileName: file.name,
      progress: 100,
      message: "上传成功",
      error: "",
      kind: uploadTarget,
    });
    renderReview();
    showToast(`已上传并保存标签：${label}`);
    window.setTimeout(() => {
      if (mediaUploadState.status !== "success" || mediaUploadState.fileName !== file.name) return;
      setMediaUploadState({ active: false, status: "idle", fileName: "", progress: 0, message: "", error: "", kind: "" });
    }, 3000);
  } catch (error) {
    const rawMessage = String(error?.message || error || "网络错误");
    const message = rawMessage.includes("S3 upload failed") ? "S3 上传失败，请检查 bucket CORS" : rawMessage;
    setMediaUploadState({
      active: false,
      status: "error",
      fileName: file.name,
      progress: 0,
      message: "",
      error: message,
      kind: uploadTarget,
    });
    showToast(`上传失败：${message}`);
  } finally {
    input.value = "";
  }
});
