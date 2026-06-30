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

function applySnapshot(snapshot) {
  if (!snapshot || snapshot.source?.kind !== "supabase") return;
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
  const { style, sample, review, openIssues, blockingIssues } = summary;
  const peopleByScope = (scope) => os.data.users.filter((user) => user.scope?.some((item) => item.includes(scope)) || user.reviewResponsibility?.includes(scope) || user.currentResponsibility?.includes(scope));
  const ownerFor = (scope, fallback) => peopleByScope(scope)[0]?.name || fallback;
  const s3MediaCount = sample?.mediaList?.length || 0;
  const hasMedia = Boolean(s3MediaCount);
  const prepBlocked = style?.currentGate === "preparation_gate";
  const materialIssueCount = (keyword) => openIssues.filter((issue) => `${issue.title} ${issue.description} ${issue.relatedArea} ${issue.sourceDepartment}`.includes(keyword)).length;
  return [
    {
      name: "版子",
      state: prepBlocked || materialIssueCount("版") ? "待确认" : "已确认",
      owner: ownerFor("版", "版型负责人"),
      note: materialIssueCount("版") ? `${materialIssueCount("版")} 个版型相关问题未关闭` : "无未关闭版型问题",
      time: dateText(sample?.createdAt, "跟随样衣记录"),
    },
    {
      name: "面料",
      state: prepBlocked || materialIssueCount("面料") ? "待确认" : "已确认",
      owner: ownerFor("面料", "面料负责人"),
      note: materialIssueCount("面料") ? `${materialIssueCount("面料")} 个面料相关问题未关闭` : "无未关闭面料问题",
      time: dateText(sample?.updatedAt, "跟随样衣记录"),
    },
    {
      name: "辅料",
      state: prepBlocked || materialIssueCount("辅料") || materialIssueCount("拉链") ? "待确认" : "已确认",
      owner: ownerFor("辅料", "辅料负责人"),
      note: materialIssueCount("辅料") || materialIssueCount("拉链") ? "有辅料/拉链相关问题未关闭" : "无未关闭辅料问题",
      time: dateText(sample?.updatedAt, "跟随样衣记录"),
    },
    {
      name: "样衣媒体",
      state: hasMedia ? "已上传" : "待上传",
      owner: os.userName(os.data.currentUserId),
      note: hasMedia ? `${s3MediaCount} 个 S3 文件已同步` : "照片或视频上传后会进入 S3",
      time: dateText(sample?.updatedAt, "等待上传"),
    },
    {
      name: "评审结论",
      state: blockingIssues.length ? "阻塞" : review?.finalDecision && review.finalDecision !== "none" ? "已提交" : "待评审",
      owner: summary.gateOwner?.name || "评审负责人",
      note: blockingIssues.length ? `${blockingIssues.length} 个阻塞问题` : `${openIssues.length} 个未关闭问题`,
      time: dateText(review?.timeline?.[0]?.time || sample?.updatedAt, "等待评审"),
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
  const timeline = document.querySelector("#style .timeline-large");
  if (timeline) {
    const samplePhases = os.data.samples.filter((item) => item.styleId === style.id);
    const timelineRows = [
      ["收到资料 / 建立款式", `款式 ${style.styleNo} · ${style.brand} · ${dateText(sample.createdAt, "创建时间未记录")}`, "complete"],
      ["样衣记录", `${sample.versionName} · ${sample.location} · 更新 ${dateText(sample.updatedAt, "未记录")}`, sample.status === "shipped" ? "complete" : "current"],
      ["样衣媒体", (sample.mediaList || []).length ? `${(sample.mediaList || []).length} 个 S3 文件已同步` : "暂无 S3 媒体，评审页可上传照片/视频", (sample.mediaList || []).length ? "complete" : ""],
      [`${os.phaseLabels[style.samplePhase] || style.samplePhase}评审`, `${os.reviewStatusLabels[review.status] || review.status} · ${openIssues.length} 个未关闭 / ${blockingIssues.length} 个阻塞 · 负责人：${gateOwner.name}`, blockingIssues.length ? "current risk" : "current"],
      ["寄样决策", `${summary.shipmentStatus.label} · 下一步：${summary.nextAction}`, summary.shipmentStatus.canShip ? "complete" : blockingIssues.length ? "current risk" : ""],
    ];
    samplePhases
      .filter((item) => item.id !== sample.id)
      .forEach((item) => timelineRows.splice(2, 0, [item.versionName, `${item.status} · ${item.location} · ${dateText(item.updatedAt, "未记录")}`, item.status === "shipped" ? "complete" : ""]));
    timeline.innerHTML = timelineRows.map(([title, text, state]) => `<div class="timeline-item ${esc(state)}"><strong>${esc(title)}</strong><span>${esc(text)}</span></div>`).join("");
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
        <div class="hero-meta"><span>品牌：${esc(style.brand)}</span><span>季节：${esc(style.season)}</span><span>款式：${esc(style.category)}</span><span>阶段：${esc(sample.versionName)}</span><span>路线：${esc(os.data.routeRules[style.route]?.label || os.data.sampleRoutes[style.route] || style.route)}</span><span>评审负责人：${esc(gateOwner.name)}</span><span>创建时间：${esc(sample.createdAt)}</span><span>预计寄样：${esc(sample.plannedShipDate)}</span></div>
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
  const issueByArea = (area) => issues.filter((issue) => issue.relatedArea.includes(area) || area.includes(issue.relatedArea));
  const cards = sample.imageList.map((name, index) => {
    const related = issueByArea(name);
    const main = index === 0 ? " main" : "";
    const shape = index < 2 ? `<div class="garment ${index === 0 ? "front" : "back"} jacket-render"><i></i></div>` : "";
    const issueClass = related.length ? ` has-issue ${related.some((issue) => issue.level === "critical" || issue.level === "major") ? "critical" : "minor"}` : "";
    return `<div class="review-photo${main}${index > 1 ? " part-photo" : ""}${issueClass}">${shape}<span>${esc(name)}</span>${related.length ? `<em>${related.length} 个${os.data.issueLevelRules[related[0].level].label}问题</em>` : ""}</div>`;
  });
  sample.videoList.forEach((video) => cards.push(`<div class="review-photo video-thumb"><div class="play">▶</div><span>${esc(video)}</span></div>`));
  (sample.mediaList || []).forEach((media) => {
    const isVideo = media.mediaKind === "video" || media.mimeType?.startsWith("video/");
    const isImage = media.mimeType?.startsWith("image/");
    const preview = isImage && media.url ? `<img class="media-preview" src="${esc(media.url)}" alt="${esc(media.label || media.fileName || "样衣照片")}" loading="lazy">` : "";
    const canOpen = Boolean(media.url);
    cards.push(`<div class="review-photo uploaded-media ${isVideo ? "video-thumb" : ""}" data-uploaded-media-id="${esc(media.id)}" ${canOpen ? `data-open-media="${esc(media.id)}" role="button" tabindex="0"` : ""}>${preview}${isVideo ? `<div class="play">▶</div>` : ""}<button class="media-delete-button" type="button" data-delete-media="${esc(media.id)}" aria-label="删除${isVideo ? "视频" : "图片"}">删除</button><input class="media-label-input" data-media-label="${esc(media.id)}" value="${esc(media.label || media.fileName || "已上传文件")}" aria-label="媒体标签，例如正面、反面、拉链"><small class="media-meta">${isVideo ? "视频" : "照片"} · ${esc(media.uploadedAt || "")}</small></div>`);
  });
  cards.push(`<label class="review-photo upload-tile" data-upload-tile><input type="file" accept="image/*" data-media-upload="photo" /><strong>+ 上传照片</strong><span>拍照或从相册选择</span><em data-upload-status>等待选择照片</em></label>`);
  cards.push(`<label class="review-photo upload-tile" data-upload-tile><input type="file" accept="video/*" data-media-upload="video" /><strong>+ 上传视频</strong><span>录制或从相册选择</span><em data-upload-status>等待选择视频</em></label>`);
  grid.innerHTML = cards.join("");
}

function getCurrentMedia(mediaId) {
  const review = os.getReviewById(os.data.currentReviewId);
  const sample = os.getSampleById(review?.sampleId);
  return sample?.mediaList?.find((media) => media.id === mediaId);
}

function openMediaViewer(mediaId) {
  if (!modalRoot) return;
  const media = getCurrentMedia(mediaId);
  if (!media?.url) {
    showToast("这个文件还没有可预览链接，请稍后刷新");
    return;
  }
  const isVideo = media.mediaKind === "video" || media.mimeType?.startsWith("video/");
  const label = media.label || media.fileName || (isVideo ? "样衣视频" : "样衣照片");
  const content = isVideo
    ? `<video class="media-viewer-content" src="${esc(media.url)}" controls autoplay playsinline></video>`
    : `<img class="media-viewer-content" src="${esc(media.url)}" alt="${esc(label)}">`;
  modalRoot.innerHTML = `<div class="modal-backdrop" data-close-modal></div><section class="media-viewer" role="dialog" aria-modal="true" aria-label="${esc(label)}"><button class="media-viewer-close" type="button" data-close-modal aria-label="关闭预览">×</button>${content}<div class="media-viewer-caption"><strong>${esc(label)}</strong><span>${esc(media.uploadedAt || "")}</span></div></section>`;
  modalRoot.classList.add("open", "media-viewer-open");
  modalRoot.setAttribute("aria-hidden", "false");
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
  const rows = review.departmentReviews.length
    ? review.departmentReviews
    : os.data.departmentDetails.filter((dept) => dept.participatesInReview).map((dept) => ({
      department: dept.name,
      role: "评审员",
      reviewer: null,
      status: "pending",
      opinion: "",
      focusTags: dept.issueTypes || [],
      issueIds: [],
      reviewedAt: "",
    }));
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
    return `<div class="review-table-row editable-review-row ${isLocked ? "is-locked" : ""}" data-review-row="${index}" data-review-row-key="${esc(rowKey)}" data-focus="${esc(item.focusTags.join("、"))}"><strong>${esc(item.department)}</strong><em>${esc(item.role)}</em><span>${item.reviewer ? avatar(item.reviewer) : avatar(os.data.currentUserId)}</span><label class="review-status-cell"><select data-review-status ${isLocked ? "disabled" : ""}><option value="pass" ${item.status === "pass" ? "selected" : ""}>通过</option><option value="needs_improvement" ${item.status === "needs_improvement" ? "selected" : ""}>需要改进</option><option value="fail" ${item.status === "fail" ? "selected" : ""}>不通过</option></select><small data-review-status-help>${esc(statusNote)}</small></label><label><textarea data-review-opinion ${isLocked ? "readonly" : ""} placeholder="在这里输入评审意见">${esc(item.opinion)}</textarea><small>关注点：${esc(item.focusTags.join(" · ") || "可直接填写真实评审意见")}</small>${failWarning}</label><em class="issue-created ${issueCount ? "major" : "none"}">${issueCount ? `${issueCount} 个 Issue` : "普通意见"}</em><time>${esc(item.reviewedAt || "未保存")}</time><div class="row-actions-inline">${saveOrEdit}<button class="row-action primary" type="button" data-issue-from-review="${index}">转为 Issue</button></div></div>`;
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
  panel.innerHTML = `<div class="section-title"><h2>评审结论</h2><span>寄样结论权限：评审负责人 / 例外放行人</span></div><div class="gate-owner-card"><div><i class="avatar avatar-${esc(summary.gateOwner.avatarColor)}"></i><strong>${esc(summary.gateOwner.name)}</strong><small>评审负责人，可做普通寄样结论</small></div><span class="status ${canGate ? "green" : "red"}">${canGate ? "当前用户可最终放行" : "当前用户无最终放行权限"}</span></div><div class="decision-stack" data-decision-stack><button class="approve ${approveDisabled ? "disabled" : ""}" type="button" data-decision="can_ship">可以寄样</button><button class="revise ${canGate ? "" : "disabled"}" type="button" data-decision="ship_after_rework">修改后寄样</button><button class="hold ${canGate ? "" : "disabled"}" type="button" data-decision="hold_shipment">暂停寄样</button><button class="exception ${canException ? "" : "disabled"}" type="button" data-decision="exception_release">例外放行</button><button class="primary-button" type="button" data-submit-decision>提交评审结论</button><small>当前寄样状态：${esc(summary.shipmentStatus.label)}。${hasCriticalBlocking ? "存在严重 Blocking Issue，必须复验后重新评审。" : `例外放行仅 ${esc(summary.finalApprover.name)} 可批准。`}</small></div><div class="exception-box exception-form"><strong>例外放行申请</strong><label>例外原因 <input data-exception-reason value="${esc(review.exceptionRequest?.reason || "")}" placeholder="客户会议 / 交期风险 / 样衣用途"></label><label>风险说明 <textarea data-exception-risk-note placeholder="说明客户已知风险、需要同步的质量/交期影响">${esc(review.exceptionRequest?.riskNote || "")}</textarea></label><label>申请人 <span>${esc(os.userName(review.exceptionRequest?.applicant) || os.userName(os.data.currentUserId))}</span></label><label>审批人 <span>${esc(summary.finalApprover.name)} · 例外放行人</span></label><label>是否通知客户 <input type="checkbox" data-customer-notified ${review.exceptionRequest?.customerNotified ? "checked" : ""}></label><label>审批结论 <span>${esc(review.exceptionRequest?.approvalStatus || "未申请")}</span></label></div>`;
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
    grid.innerHTML = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([date, items]) => `<div class="calendar-day ${date <= todayKey ? "urgent" : ""}"><strong>${date.slice(5)} ${date === todayKey ? "今天" : ""}</strong>${items.map(({ style, sample, openIssues, blockingIssues, calendarRisk }) => `<div class="calendar-item" title="点击进入单款详情" data-style-drawer="details" data-style-id="${style.id}"><span class="brand-dot salomon"></span><div><b>${esc(style.brand)} ${esc(style.styleNo)}</b><small>${esc(os.phaseLabels[style.samplePhase] || style.samplePhase)} · ${style.quantity || 1} 件 · ${esc(sample?.location || style.sampleLocation || "未设置")}</small><em>状态：${esc(os.riskLabels[calendarRisk] || calendarRisk)} · 原因：${blockingIssues.length ? `${blockingIssues.length} 个阻塞问题` : openIssues.length ? `${openIssues.length} 个待处理问题` : "无阻塞"}</em></div></div>`).join("")}</div>`).join("");
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
      cells.push(`<div class="month-cell ${muted ? "muted-date" : ""} ${weekend ? "weekend" : ""}"><b>${cursor.getMonth() + 1}/${String(cursor.getDate()).padStart(2, "0")}</b>${items.map(({ style, sample, calendarRisk }) => `<span class="month-event ${monthEventClass(calendarRisk)}" data-style-drawer="details" data-style-id="${style.id}">${esc(style.brand)} ${esc(style.styleNo)} · ${esc(sample?.versionName || os.phaseLabels[style.samplePhase] || style.samplePhase)} · ${style.quantity || 1}件</span>`).join("")}</div>`);
    }
    monthCalendar.innerHTML = weekdays + cells.join("");
  }
  syncFilterButtons();
}

function renderSettings() {
  const settingsHeader = document.querySelector("#settings .style-header");
  if (settingsHeader) {
    const version = os.data.ruleVersion;
    settingsHeader.innerHTML = `<div><div class="eyebrow">后台配置中心</div><h2>组织与流程规则</h2><p>维护人员、角色权限、Gate 负责人、打样派发、问题等级与样衣位置规则。</p></div><div class="header-badges"><span class="status blue">${esc(version.name)}</span><span class="status neutral">最后更新：${esc(version.updatedAt)}</span><span class="status neutral">更新人：${esc(version.updatedBy)}</span><span class="status amber">状态：${esc(version.status)}</span></div>`;
  }

  const summary = document.querySelector("#settings .settings-summary-grid");
  if (summary) {
    const uniqueRoles = new Set(os.data.users.map((user) => user.role).filter(Boolean));
    const gateOwnerCount = os.data.users.filter((user) => user.isGateOwner).length;
    const finalApproverCount = os.data.users.filter((user) => user.isFinalApprover).length;
    const workerRoutes = new Set(os.data.workers.map((worker) => worker.route).filter(Boolean));
    summary.innerHTML = `
      <div><span>系统角色</span><strong>${uniqueRoles.size}</strong><small>${os.data.users.length} 名人员来自 Supabase</small></div>
      <div><span>Gate 负责人</span><strong>${gateOwnerCount}</strong><small>${os.data.users.filter((user) => user.isGateOwner).map((user) => user.name).join(" / ") || "未指定"}</small></div>
      <div><span>例外审批人</span><strong>${finalApproverCount}</strong><small>${esc(os.data.users.filter((user) => user.isFinalApprover).map((user) => user.name).join(" / ") || os.userName(os.data.gateRules.finalApprover))}</small></div>
      <div><span>打样工人池</span><strong>${os.data.workers.length}</strong><small>${workerRoutes.size} 条路线：${esc(Array.from(workerRoutes).join(" / ") || "未配置")}</small></div>
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
    peopleTitle.innerHTML = `<div><h2>人员角色与系统权限</h2><span>人员职责会驱动流程权限、评审任务和放行判断</span></div><div class="panel-actions"><button class="row-action primary" type="button">+ 新增人员</button><button class="row-action" type="button">批量导入</button><button class="row-action" type="button">角色模板</button></div>`;
  }

  const peopleTable = document.querySelector("#settings .permission-table");
  if (peopleTable) {
    peopleTable.innerHTML = `<div class="people-row head"><span>姓名</span><span>部门</span><span>系统角色</span><span>适用范围</span><span>关键权限</span><span>状态</span><span>操作</span></div>` + os.data.users.map((user) => {
      const enabled = user.enabled !== false;
      const canReview = user.permissions.some((permission) => ["提交意见", "创建问题", "复验问题", "版型评审"].includes(permission));
      const canFinal = user.permissions.includes("最终放行");
      const canException = user.permissions.includes("例外放行");
      const dataPerson = [user.name, user.department, user.role, user.currentResponsibility, user.reviewResponsibility, "按角色权限矩阵执行", user.permissions.join("、"), user.scope.join(" / "), canReview ? "可参与评审" : "不可参与评审", `${canReview ? "可参与评审" : "不可参与评审"}；${canFinal ? "可最终放行" : "不可最终放行"}；${canException ? "可例外放行" : "不可例外放行"}`, canReview ? "是" : "否", canFinal ? "是" : "否", canException ? "是" : "否"].join("|");
      return `<div class="people-row" role="button" tabindex="0" data-person="${esc(dataPerson)}"><strong><i class="avatar avatar-${esc(user.avatarColor)}"></i>${esc(user.name)}</strong><span>${esc(user.department)}</span><em>${esc(user.role)}</em><small>${esc(user.scope.join(" / "))}</small><div class="permission-tags">${user.permissions.slice(0, 3).map((permission) => `<i>${esc(permission)}</i>`).join("")}</div><span class="status ${enabled ? "green" : "neutral"}">${enabled ? "启用" : "停用"}</span><div class="row-actions-inline"><button type="button">编辑</button><button type="button">停用</button></div></div>`;
    }).join("");
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

function renderStyleModal() {
  const brandOwners = os.data.users.filter((user) => user.department === "业务部").map((user) => ({ value: user.id, label: user.name }));
  return `
    <form class="modal-card wide" data-modal-form="style">
      <div class="modal-header"><div><span>开发入口</span><h2>新建款式 / 新建开发任务</h2></div><button type="button" data-close-modal>×</button></div>
      <section><h3>款式基础信息</h3><div class="form-grid"><label>品牌<select name="brand" required><option>萨洛蒙</option><option>其他</option></select></label><label>款号<input name="styleNo" required placeholder="212 / SW4SS27-002"></label><label>款式名称<input name="styleName" required placeholder="户外冲锋衣"></label><label>季节<select name="season" required><option>SS27</option><option>FW26</option><option>27SS</option><option>26FW</option></select></label><label>品类<select name="category"><option>冲锋衣</option><option>裤子</option><option>Polo</option><option>T恤</option><option>卫衣</option><option>外套</option><option>衬衫</option><option>其他</option></select></label><label>颜色<input name="color" placeholder="可选"></label><label>尺码<input name="size" placeholder="可选"></label><label>件数<input name="quantity" type="number" min="1" value="1" required></label></div></section>
      <section><h3>样衣阶段 / 打样路线</h3><div class="form-grid"><label>第几次样品<select name="samplePhase">${optionList(Object.entries(os.data.samplePhases).map(([value, label]) => ({ value, label })), "first_sample")}</select></label><label>在哪里打样<select name="sampleLocation" id="new-style-location">${optionList(os.data.sampleLocationOptions.map((item) => ({ value: item.id, label: item.label })), "office_sample_room")}</select></label><label>打样路线<select name="route" id="new-style-route">${optionList(Object.entries(os.data.sampleRoutes).map(([value, label]) => ({ value, label })), "normal")}</select></label><div class="route-hint" id="route-hint">事务所打样间，建议路线：普通款式</div></div></section>
      <section><h3>负责人设置</h3><div class="form-grid"><label>业务负责人<select name="businessOwner">${optionList(brandOwners, "user_guyao")}</select></label><label>版子负责人<select name="patternOwner">${optionList([{ value: "user_xuhaiyan", label: "徐海燕" }], "user_xuhaiyan")}</select></label><label>面料负责人<select name="fabricOwner">${optionList([{ value: "user_liweihong", label: "李卫红" }], "user_liweihong")}</select></label><label>辅料负责人<select name="trimOwner">${optionList([{ value: "user_dahong", label: "大红" }], "user_dahong")}</select></label><label>准备闸口<select name="prepOwner">${optionList([{ value: "user_wangbu", label: "王部长" }], "user_wangbu")}</select></label><label>普通打样派发<select name="normalDispatcher">${optionList([{ value: "user_dadai", label: "大戴" }], "user_dadai")}</select></label><label>压胶开发负责人<select name="bondingOwner">${optionList([{ value: "user_zhangbu", label: "张部长" }], "user_zhangbu")}</select></label><label>新长江派发人<select name="xcjDispatcher">${optionList([{ value: "user_xiahongxia", label: "夏红霞" }], "user_xiahongxia")}</select></label><label>评审负责人<select name="reviewOwner">${optionList(os.data.users.filter((u) => u.isGateOwner).map((u) => ({ value: u.id, label: u.name })), os.data.gateRules.sampleReviewGateOwner)}</select></label><label>例外放行<select name="finalApprover">${optionList(os.data.users.filter((u) => u.isFinalApprover).map((u) => ({ value: u.id, label: u.name })), os.data.gateRules.finalApprover)}</select></label></div></section>
      <section><h3>交期与日历同步</h3><div class="form-grid"><label>预计打样完成日期<input name="sampleDoneDate" type="date" required value="2026-07-03"></label><label>预计寄样日期<input name="plannedShipDate" type="date" required value="2026-07-05"></label><label>客户要求到样日期<input name="customerDueDate" type="date"></label><label class="inline-check"><input name="syncCalendar" type="checkbox" checked>同步到样衣日历</label><label class="inline-check"><input name="highRisk" type="checkbox">设为高风险</label></div></section>
      <section><h3>资料准备</h3>${checkList(["客户资料已收到", "TP / 技术包已收到", "版子准备", "面料准备", "辅料准备", "原样 / 样衣参考确认", "打样资料待王部长确认"], "prepItems", [])}</section>
      <section><h3>附件 / 图片</h3><div class="attachment-status-grid"><div>客户资料：待接入 S3</div><div>TP：待接入 S3</div><div>参考图片：请在评审页上传</div><div>原样图片：请在评审页上传</div></div><small class="muted-note">当前已接入评审页照片和视频上传；资料附件不会伪造上传状态。</small></section>
      <div class="modal-actions"><button type="button" data-close-modal>取消</button><button type="button" data-save-draft>保存草稿</button><button class="primary-button" type="submit">创建款式</button></div>
    </form>`;
}

function nextDateValue(days = 1) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return dateKey(date);
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
  const templates = { person: renderPersonModal, worker: renderWorkerModal, style: renderStyleModal, issue: renderIssueModal };
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

async function handleStyleSubmit(form) {
  const fields = form.elements;
  const locationOption = os.data.sampleLocationOptions.find((item) => item.id === fields.sampleLocation.value);
  const route = fields.route.value;
  const phase = fields.samplePhase.value;
  const payload = {
    styleNo: fields.styleNo.value.trim(),
    brand: fields.brand.value,
    season: fields.season.value,
    styleName: fields.styleName.value.trim(),
    category: fields.category.value,
    route,
    samplePhase: phase,
    sampleLocation: locationOption?.label || "样衣间",
    plannedShipDate: fields.plannedShipDate.value,
    versionName: os.phaseLabels[phase],
    highRisk: fields.highRisk.checked,
    quantity: Number(fields.quantity.value || 1),
  };
  if (!window.SampleOSBackend?.syncData) throw new Error("后端同步接口未加载");
  const response = await window.SampleOSBackend.syncData("createStyle", payload);
  await loadBackendSnapshot();
  os.data.currentStyleId = response.result.styleId;
  os.data.currentReviewId = response.result.reviewId;
  renderAll();
  showToast("新建款式已同步到 Supabase 和样衣日历");
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
  const hint = document.querySelector("#route-hint");
  if (option && routeSelect) routeSelect.value = option.recommendedRoute;
  if (hint && option) hint.textContent = `${option.label}，建议路线：${os.data.sampleRoutes[option.recommendedRoute]}`;
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

  const uploadTile = event.target.closest("[data-upload-tile]");
  if (uploadTile && !event.target.closest("[data-media-upload]")) {
    event.preventDefault();
    event.stopPropagation();
    uploadTile.querySelector("[data-media-upload]")?.click();
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

  if (event.key === "Escape") {
    drawer?.classList.remove("open");
    drawer?.setAttribute("aria-hidden", "true");
    personDrawer?.classList.remove("open");
    personDrawer?.setAttribute("aria-hidden", "true");
    closeStyleDrawerPanel();
    closeModal();
  }
});

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
  const status = input.closest("[data-upload-tile]")?.querySelector("[data-upload-status]");
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
    if (status) status.textContent = "准备上传...";
    await window.SampleOSBackend.seedDemoData();
    const result = await window.SampleOSBackend.uploadFile(file, context, ({ ratio }) => {
      if (status) status.textContent = `上传中 ${Math.round(ratio * 100)}%`;
    });
    const uploadedAt = new Date().toLocaleString("zh-CN", { hour12: false });
    sample.mediaList ||= [];
    sample.mediaList.push({
      id: result.media.id,
      label,
      fileName: file.name,
      mediaKind,
      mimeType: file.type,
      byteSize: file.size,
      uploadedAt,
      url: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
    });
    review.timeline.unshift({
      time: uploadedAt,
      type: "blue",
      text: `${os.userName(os.data.currentUserId)} · 上传${uploadTarget === "style-cover" ? "款式图" : mediaKind === "video" ? "视频" : "照片"}：${label}`,
    });
    if (status) status.textContent = `已上传：${result.media.id.slice(0, 8)}`;
    renderReview();
    showToast(`已上传并保存标签：${label}`);
  } catch (error) {
    if (status) status.textContent = error.message.includes("S3 upload failed") ? "S3 上传失败，请检查 bucket CORS" : error.message;
    else showToast(error.message.includes("S3 upload failed") ? "S3 上传失败，请检查 bucket CORS" : error.message);
  } finally {
    input.value = "";
  }
});
