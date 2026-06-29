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
  title.textContent = titleMap[viewId];
  updateTopbar(viewId);
  window.scrollTo({ top: 0, behavior: "smooth" });
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
  if (userAccountRole) userAccountRole.textContent = isSettings ? "后台管理员" : "负责人";
  if (userAccountName) userAccountName.textContent = isSettings ? "张部长" : "张部长";
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

function renderGateFlow(style) {
  const order = ["preparation", "sample_making", "sample_review_gate", "shipment_decision"];
  const labels = ["准备", "打样", "评审", "决策"];
  const currentIndex = Math.max(0, order.indexOf(style.currentGate));
  return labels.map((label, index) => {
    if (index === 0) {
      const blocked = style.currentGate === "preparation_gate" || style.riskStatus === "overdue";
      return `<div class="prep-gate-wrap ${blocked ? "blocked" : ""}"><details class="prep-gate ${blocked ? "blocked" : "done"}"><summary><span>准备</span></summary><div class="prep-detail-grid"><b class="ok">版子</b><b class="ok">面料</b><b class="${blocked ? "warn" : "ok"}">辅料</b><b class="ok">样衣</b></div></details><small>${blocked ? style.blockerSummary : "准备齐全"}</small></div>`;
    }
    const className = index < currentIndex ? "done" : index === currentIndex ? "active" : "";
    return `<span class="${className}">${label}</span>`;
  }).join("");
}

function renderPipeline() {
  renderSummary();
  const table = document.querySelector("#pipeline .pipeline-table");
  if (!table) return;
  table.innerHTML = `<div class="row head"><div>款式</div><div>当前闸口</div><div>开发闸口</div><div>卡点与下一步</div></div>` + os.data.styleList.map((style) => {
    const summary = os.getStyleSummary(style.id);
    return `
      <div class="row data-row pipeline-row" data-style-id="${style.id}">
        <div><strong>${esc(style.styleNo)}</strong><span>${esc(style.styleName)} · ${esc(style.brand)} ${esc(style.season)}</span></div>
        <div class="stage-status"><strong>${esc(os.gateLabels[style.currentGate])}</strong><span class="status ${statusClass(summary.shipmentStatus.key)}">${esc(summary.shipmentStatus.label)}</span><small>路线：${esc(os.data.routeRules[style.route].label)} · 位置：${esc(summary.sample?.location || style.sampleLocation)}</small></div>
        <div class="stage-line gate-flow">${renderGateFlow(style)}</div>
        <div class="block-summary"><strong>卡点：${esc(style.blockerSummary || `${summary.blockingIssues.length} 个阻塞问题`)}</strong><span>责任：${esc(summary.ownerNames)}</span><span>评审负责人：${esc(summary.gateOwner?.name)}</span><span>阻塞问题：${summary.blockingIssues.length ? `是 · ${summary.blockingIssues.length} 个` : "否"}</span><span>下一步：${esc(summary.nextAction)}</span><div class="pipeline-actions"><button type="button" data-style-drawer="timeline" data-style-id="${style.id}">时间线</button><button type="button" data-style-drawer="details" data-style-id="${style.id}">详情</button><button type="button" data-style-drawer="prep" data-style-id="${style.id}">准备材料</button><button class="primary" type="button" data-open-review="${style.id}">打开评审</button></div></div>
      </div>`;
  }).join("");
}

function renderStyleWorkspace() {
  const summary = os.getStyleSummary(os.data.currentStyleId);
  const { style, sample, review, openIssues, blockingIssues, gateOwner, finalApprover } = summary;
  const header = document.querySelector("#style .style-header");
  if (header) {
    header.innerHTML = `<div><div class="eyebrow">款式 ${esc(style.styleNo)} / ${esc(style.brand)} / ${esc(style.season)}</div><h2>${esc(style.styleName)}</h2></div><div class="header-badges"><span class="status ${statusClass(summary.shipmentStatus.key)}">${esc(summary.shipmentStatus.label)}</span><span class="status neutral">${esc(os.phaseLabels[style.samplePhase])}</span><span class="status neutral">位置：${esc(sample.location)}</span><span class="status neutral">路线：${esc(os.data.routeRules[style.route].label)}</span><span class="status neutral">评审负责人：${esc(gateOwner.name)}</span><span class="status neutral">例外放行：${esc(finalApprover.name)}</span></div>`;
  }
  const timeline = document.querySelector("#style .timeline-large");
  if (timeline) {
    timeline.innerHTML = `
      <div class="timeline-item complete"><strong>收到样衣 / 资料</strong><span>闸口：资料接收完成 · 2026-06-16 10:30 · 业务顾瑶登记</span></div>
      <div class="timeline-item ${style.currentGate === "preparation_gate" ? "current risk" : "complete"}"><strong>前期准备</strong><span>闸口：准备闸口 · ${style.currentGate === "preparation_gate" ? style.blockerSummary : "版子/面料/样衣完成"} · 责任：大红 / 王部长</span></div>
      <div class="timeline-item complete"><strong>一次样</strong><span>闸口：已通过 · 2026-06-18 · 无阻塞问题</span></div>
      <div class="timeline-item current ${blockingIssues.length ? "risk" : ""}"><strong>${esc(os.phaseLabels[style.samplePhase])}</strong><span>闸口：${esc(os.reviewStatusLabels[review.status])} · ${openIssues.length} 个未关闭问题 / ${blockingIssues.length} 个阻塞问题 · 评审负责人：${esc(gateOwner.name)} · 当前动作：${esc(summary.nextAction)}</span></div>
      <div class="timeline-item"><strong>三次样</strong><span>等待中</span></div><div class="timeline-item"><strong>销售样</strong><span>未开始</span></div><div class="timeline-item"><strong>产前样</strong><span>未开始</span></div><div class="timeline-item"><strong>品质样</strong><span>未就绪</span></div>`;
  }
  const snapshot = document.querySelector("#style .snapshot-content");
  if (snapshot) {
    snapshot.innerHTML = `<h3>${esc(os.phaseLabels[style.samplePhase])}评审</h3><p>跨部门评审状态来自同一个评审任务 ${esc(review.reviewNo)}。</p><div class="snapshot-gate"><span>${summary.shipmentStatus.canShip ? "当前可寄样" : "当前不可寄样"}</span><strong>原因：${blockingIssues.length ? blockingIssues.map((issue) => issue.title).join(" / ") : summary.shipmentStatus.label} · 责任：${esc(summary.ownerNames)} · 下一步：${esc(summary.nextAction)}</strong></div><div class="mini-stats"><span><strong>${openIssues.length}</strong> 未关闭</span><span><strong>${blockingIssues.length}</strong> 阻塞</span><span><strong>${review.departmentReviews.length}</strong> 部门</span></div><button class="primary-button" data-view="review" type="button">打开评审</button>`;
  }
  const materials = document.querySelector("#style .parallel-materials");
  if (materials) {
    const blocked = style.currentGate === "preparation_gate";
    materials.innerHTML = [
      ["版子", blocked ? "待复核" : "完成", "徐海燕", blocked ? "阻塞" : "2026-06-17", blocked ? "主版已齐，口袋小片待复核。" : "主版已齐。"],
      ["样衣", "完成", "顾瑶", "2026-06-16", "客户原样已收到。"],
      ["面料", blocked ? "未到" : "完成", "李卫红", blocked ? "阻塞" : "2026-06-17", blocked ? "主面料等待到料。" : "主面料已确认。"],
      ["辅料", blocked ? "未齐" : "未齐", "大红", "阻塞", "拉链色号等待客户确认。"],
      ["资料确认", blocked ? "待确认" : "已确认", "王部长", blocked ? "阻塞" : "已通过", "资料齐套后推进打样。"],
    ].map(([name, state, owner, time, note]) => `<div class="material-card ${state === "完成" || state === "已确认" ? "done" : "waiting"} checklist-card"><strong>${name}</strong><span>${state} · ${owner} · ${time}</span><small>${note}</small></div>`).join("");
  }
}

function renderReview() {
  const review = os.getReviewById(os.data.currentReviewId);
  const summary = os.getStyleSummary(review.styleId);
  const { style, sample, openIssues, blockingIssues, gateOwner, finalApprover, shipmentStatus } = summary;
  const hero = document.querySelector("#review .review-hero");
  if (hero) {
    hero.querySelector(".hero-info").innerHTML = `<div class="crumb">首页 / 样衣评审 / ${esc(review.reviewNo)}</div><div class="hero-title"><h2>${esc(style.styleNo)}-${esc(review.reviewNo)}</h2><span class="status blue">${esc(sample.versionName)}</span></div><div class="hero-meta"><span>品牌：${esc(style.brand)}</span><span>季节：${esc(style.season)}</span><span>款式：${esc(style.category)}</span><span>阶段：${esc(sample.versionName)}</span><span>路线：${esc(os.data.routeRules[style.route].label)}</span><span>评审负责人：${esc(gateOwner.name)}</span><span>创建时间：${esc(sample.createdAt)}</span><span>预计寄样：${esc(sample.plannedShipDate)}</span></div>`;
    hero.querySelector(".location-card").innerHTML = `<span>样衣位置</span><strong>${esc(sample.location)}</strong><small>更新时间：${esc(sample.updatedAt)}</small><select id="sample-location-select">${os.data.sampleLocations.map((loc) => `<option ${loc.name === sample.location ? "selected" : ""}>${esc(loc.name)}</option>`).join("")}</select>`;
  }
  const strip = document.querySelector("#review .strip-main");
  if (strip) {
    strip.innerHTML = `<div><span>当前是否可寄样</span><strong>${esc(shipmentStatus.label)}</strong></div><div><span>不可寄样原因</span><strong>${blockingIssues.length ? blockingIssues.map((issue) => issue.title).join(" / ") : "无阻塞问题"}</strong></div><div class="blocking-alert"><span>责任人与下一步</span><strong>${esc(summary.ownerNames)} · ${esc(summary.nextAction)}</strong></div>`;
  }
  renderMedia(sample, openIssues);
  renderDepartmentReviews(review);
  renderIssueList(review);
  renderDecision(review, summary);
  renderTimeline(review);
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
    cards.push(`<div class="review-photo uploaded-media ${isVideo ? "video-thumb" : ""}">${isVideo ? `<div class="play">▶</div>` : ""}<strong>${esc(media.label || media.fileName || "已上传文件")}</strong><span>${isVideo ? "视频" : "照片"} · ${esc(media.uploadedAt || "")}</span><em>已存入 S3</em></div>`);
  });
  cards.push(`<label class="review-photo upload-tile" data-upload-tile><input type="file" accept="image/*" data-media-upload="photo" /><strong>+ 上传照片</strong><span>拍照或从相册选择</span><em data-upload-status>等待选择照片</em></label>`);
  cards.push(`<label class="review-photo upload-tile" data-upload-tile><input type="file" accept="video/*" data-media-upload="video" /><strong>+ 上传视频</strong><span>录制或从相册选择</span><em data-upload-status>等待选择视频</em></label>`);
  grid.innerHTML = cards.join("");
}

function renderDepartmentReviews(review) {
  const table = document.querySelector("#review .review-table");
  if (!table) return;
  table.innerHTML = `<div class="review-table-row head"><span>部门</span><span>角色</span><span>负责人</span><span>状态</span><span>评审意见 / 关注点</span><span>产生问题</span><span>时间</span><span></span></div>` + review.departmentReviews.map((item) => {
    const issueCount = item.issueIds.filter((id) => os.getIssuesByReview(review.id).some((issue) => issue.id === id && issue.status !== "closed")).length;
    const pill = item.status === "pass" ? "green" : item.status === "fail" ? "red" : "amber";
    return `<div class="review-table-row" data-focus="${esc(item.focusTags.join("、"))}"><strong>${esc(item.department)}</strong><em>${esc(item.role)}</em><span>${avatar(item.reviewer)}</span><span class="pill ${pill}">${esc(os.departmentStatusLabels[item.status])}</span><p>${esc(item.opinion)}<small>${esc(item.focusTags.join(" · "))}</small></p><em class="issue-created ${issueCount ? "major" : "none"}">${issueCount ? `${issueCount} 个问题` : "无"}</em><time>${esc(item.reviewedAt)}</time><button>✓</button></div>`;
  }).join("");
}

function renderIssueList(review) {
  const panelTitle = document.querySelector("#review .issue-panel .section-title h2");
  const table = document.querySelector("#review .issue-table");
  const issues = os.getIssuesByReview(review.id);
  const openIssues = os.getOpenIssues(review.id);
  if (panelTitle) panelTitle.innerHTML = `质量闸口问题 <span class="badge-count">${openIssues.length}</span>`;
  if (!table) return;
  table.innerHTML = `<div class="issue-table-row head"><span>问题</span><span>来源/证据</span><span>等级</span><span>是否阻塞</span><span>负责人</span><span>复验要求</span><span>状态</span></div>` + issues.map((issue) => {
    const level = os.data.issueLevelRules[issue.level];
    const blocking = os.getBlockingIssues(review.id).some((item) => item.id === issue.id);
    return `<div class="issue-table-row ${blocking ? "issue-blocking" : ""}" data-issue-id="${issue.id}"><strong>${esc(issue.title)}<small>${esc(issue.relatedArea)}</small></strong><span>${esc(issue.sourceDepartment)} · ${esc(issue.evidence)}</span><b class="priority ${issue.level}">${esc(level.label)}</b><span class="shipment ${blocking ? "no" : "yes"}">${blocking ? "是" : "否"}</span><span>${avatar(issue.owner)}</span><time>${issue.verifier ? `${os.userName(issue.verifier)}复验` : "无需复验"}</time><em>${esc(os.issueStatusLabels[issue.status])}</em>${issue.status !== "closed" ? `<button class="row-action" type="button" data-close-issue="${issue.id}">关闭</button>` : ""}</div>`;
  }).join("");
}

function renderDecision(review, summary) {
  const panel = document.querySelector("#review .decision-panel");
  if (!panel) return;
  const currentUser = os.getUser(os.data.currentUserId);
  const canGate = currentUser?.id === summary.gateOwner.id;
  const canException = currentUser?.id === summary.finalApprover.id;
  panel.innerHTML = `<div class="section-title"><h2>评审结论</h2><span>寄样结论权限：评审负责人 / 例外放行人</span></div><div class="gate-owner-card"><div><i class="avatar avatar-${esc(summary.gateOwner.avatarColor)}"></i><strong>${esc(summary.gateOwner.name)}</strong><small>评审负责人，可做普通寄样结论</small></div><span class="status ${canGate ? "green" : "red"}">${canGate ? "当前用户可最终放行" : "当前用户无最终放行权限"}</span></div><div class="decision-stack"><button class="approve ${canGate ? "" : "disabled"}" type="button">可以寄样</button><button class="revise ${canGate ? "" : "disabled"}" type="button">修改后寄样</button><button class="hold ${canGate ? "" : "disabled"}" type="button">暂停寄样</button><button class="exception ${canException ? "" : "disabled"}" type="button">例外放行</button><button class="primary-button" type="button">提交评审结论</button><small>当前寄样状态：${esc(summary.shipmentStatus.label)}。例外放行仅 ${esc(summary.finalApprover.name)} 可批准。</small></div><div class="exception-box exception-form"><strong>例外放行申请</strong><label>例外原因 <span>${esc(review.exceptionRequest?.reason || "客户会议 / 交期风险 / 样衣用途")}</span></label><label>风险说明 <span>${esc(review.exceptionRequest?.riskNote || "无")}</span></label><label>申请人 <span>${esc(os.userName(review.exceptionRequest?.applicant))}</span></label><label>审批人 <span>${esc(summary.finalApprover.name)} · 例外放行人</span></label><label>是否通知客户 <span>${review.exceptionRequest?.customerNotified ? "是" : "否，待审批后通知"}</span></label><label>审批结论 <span>${esc(review.exceptionRequest?.approvalStatus || "未申请")}</span></label></div>`;
}

function renderTimeline(review) {
  const timeline = document.querySelector("#review .vertical-timeline");
  if (!timeline) return;
  timeline.innerHTML = review.timeline.map((item) => `<div class="${item.type === "red" ? "danger" : ""}"><b>${esc(item.time)}</b><span>${esc(item.text)}</span></div>`).join("");
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
  const groups = {};
  os.data.styleList.forEach((style) => {
    const date = style.plannedShipDate;
    groups[date] ||= [];
    groups[date].push(os.getStyleSummary(style.id));
  });
  grid.innerHTML = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([date, items]) => `<div class="calendar-day ${date <= "2026-06-28" ? "urgent" : ""}"><strong>${date.slice(5)} ${date === "2026-06-28" ? "今天" : ""}</strong>${items.map(({ style, sample, openIssues, blockingIssues, calendarRisk }) => `<div class="calendar-item" title="点击进入单款详情" data-style-drawer="details" data-style-id="${style.id}"><span class="brand-dot salomon"></span><div><b>${esc(style.brand)} ${esc(style.styleNo)}</b><small>${esc(os.phaseLabels[style.samplePhase])} · ${style.quantity || sample?.imageList.length || 1} 件 · ${esc(sample?.location || style.sampleLocation)}</small><em>状态：${esc(os.riskLabels[calendarRisk])} · 原因：${blockingIssues.length ? `${blockingIssues.length} 个阻塞问题` : openIssues.length ? `${openIssues.length} 个待处理问题` : "无阻塞"}</em></div></div>`).join("")}</div>`).join("");
  const riskOrder = { blocked: 1, overdue: 1, waiting_exception: 2, approaching_due: 3, normal: 4, exception_released: 5, shipped: 6 };
  riskList.innerHTML = os.data.styleList.map((style) => os.getStyleSummary(style.id)).sort((a, b) => (riskOrder[a.calendarRisk] || 9) - (riskOrder[b.calendarRisk] || 9)).map(({ style, calendarRisk, blockingIssues, nextAction, ownerNames }) => `<div class="risk-row ${calendarRisk === "blocked" || calendarRisk === "overdue" ? "danger" : calendarRisk === "waiting_exception" ? "warning" : calendarRisk === "normal" ? "neutral" : calendarRisk === "exception_released" || calendarRisk === "shipped" ? "success" : "info"}"><strong>${esc(style.brand)} ${esc(style.styleNo)}</strong><span>${esc(os.riskLabels[calendarRisk])} · ${blockingIssues.length ? `${blockingIssues.length} 个阻塞问题` : nextAction} · 当前责任：${esc(ownerNames)}</span></div>`).join("");
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
      <div><span>系统角色</span><strong>10</strong><small>业务、版型、材料、派发、评审、放行</small></div>
      <div><span>Gate 负责人</span><strong>5</strong><small>准备、派发、压胶、评审、放行</small></div>
      <div><span>例外审批人</span><strong>1</strong><small>${esc(os.userName(os.data.gateRules.finalApprover))}</small></div>
      <div><span>打样路线</span><strong>${Object.keys(os.data.sampleRoutes).length}</strong><small>普通 / 压胶新长江 / 外发 / 如东</small></div>
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
    const stats = os.data.trainingStats;
    const titleBlock = training.closest(".section-block")?.querySelector(".section-title");
    if (titleBlock) titleBlock.innerHTML = `<div><h2>Reviewer Training / 评审员培训</h2><span>静态入口：培训职责、问题等级判断、意见转问题和小考</span></div><div class="training-stats"><span>已培训 ${stats.trained}</span><span>未培训 ${stats.untrained}</span><span>可成为 Reviewer ${stats.eligibleReviewers}</span></div>`;
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
  const materials = [
    ["版子", style.currentGate === "preparation_gate" ? "待复核" : "完成", "徐海燕", style.currentGate === "preparation_gate" ? "口袋小片待复核" : "主版已齐"],
    ["面料", style.currentGate === "preparation_gate" ? "未到" : "完成", "李卫红", style.currentGate === "preparation_gate" ? "主面料等待到料" : "主面料已确认"],
    ["辅料", style.currentGate === "preparation_gate" ? "未齐" : "完成", "大红", style.currentGate === "preparation_gate" ? "拉链色号待客户确认" : "辅料齐套"],
    ["原样 / 样衣参考", "完成", "顾瑶", "客户原样已收到"],
    ["资料确认", style.currentGate === "preparation_gate" ? "待确认" : "完成", "王部长", "资料齐套后进入派发"],
  ];
  const reviewState = blockingIssues.length ? "current risk" : "current";
  const decisionState = style.currentGate === "shipment_decision"
    ? shipmentStatus.canShip ? "current" : "current risk"
    : "";
  const timeline = [
    ["收到样衣 / 资料", "业务登记客户信息，开始开发准备", "complete"],
    ["前期准备", style.currentGate === "preparation_gate" ? style.blockerSummary : "版子、面料、辅料和参考样完成", style.currentGate === "preparation_gate" ? "current risk" : "complete"],
    [os.phaseLabels[style.samplePhase], `${review ? os.reviewStatusLabels[review.status] : "未生成评审"} · ${openIssues.length} 个未关闭 / ${blockingIssues.length} 个阻塞`, reviewState],
    ["寄样决策", shipmentStatus.label, decisionState],
  ];
  const body = document.querySelector("#style-drawer-body");
  body.innerHTML = `
    <div class="drawer-summary-card">
      <div><span>品牌 / 季节</span><strong>${esc(style.brand)} · ${esc(style.season)}</strong></div>
      <div><span>阶段 / 路线</span><strong>${esc(os.phaseLabels[style.samplePhase])} · ${esc(os.data.routeRules[style.route].label)}</strong></div>
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
    <div class="drawer-section ${mode !== "timeline" ? "" : "emphasis"}">
      <h3>开发时间线</h3>
      <div class="drawer-timeline">${timeline.map(([name, note, state]) => `<div class="${esc(state)}"><i></i><strong>${esc(name)}</strong><span>${esc(note)}</span></div>`).join("")}</div>
    </div>
    <div class="drawer-section ${mode === "prep" ? "emphasis" : ""}">
      <h3>前期准备 checklist</h3>
      <div class="drawer-checklist">${materials.map(([name, state, owner, note]) => `<div class="${state === "完成" ? "done" : "waiting"}"><strong>${esc(name)}</strong><span>${esc(state)} · ${esc(owner)}</span><small>${esc(note)}</small></div>`).join("")}</div>
    </div>
    <div class="drawer-actions">
      <button type="button" data-style-drawer="timeline" data-style-id="${style.id}">看时间线</button>
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
      <section><h3>附件 / 图片</h3><div class="fake-upload-grid"><div>上传客户资料</div><div>上传 TP</div><div>上传参考图片</div><div>上传原样图片</div></div><small class="muted-note">评审页照片和视频已接入 S3 上传，资料附件后续接入。</small></section>
      <div class="modal-actions"><button type="button" data-close-modal>取消</button><button type="button" data-save-draft>保存草稿</button><button class="primary-button" type="submit">创建款式</button></div>
    </form>`;
}

function openModal(type) {
  if (!modalRoot) return;
  const templates = { person: renderPersonModal, worker: renderWorkerModal, style: renderStyleModal };
  modalRoot.innerHTML = `<div class="modal-backdrop" data-close-modal></div>${templates[type]?.() || ""}`;
  modalRoot.classList.add("open");
  modalRoot.setAttribute("aria-hidden", "false");
}

function closeModal() {
  modalRoot?.classList.remove("open");
  modalRoot?.setAttribute("aria-hidden", "true");
  if (modalRoot) modalRoot.innerHTML = "";
}

function selectedValues(form, name) {
  return Array.from(form.querySelectorAll(`[name="${name}"]:checked`)).map((input) => input.value);
}

function handlePersonSubmit(form) {
  const roles = selectedValues(form, "roles");
  const permissions = selectedValues(form, "permissions").map((permission) => permission.replace(" Opinion", "意见").replace(" Issue", "问题"));
  const fields = form.elements;
  const name = fields.name.value.trim();
  if (!name) return;
  const id = `user_${Date.now()}`;
  const isGateOwner = roles.some((role) => role.includes("Gate Owner"));
  const isFinalApprover = roles.some((role) => role.includes("Final Approver"));
  os.data.users.push({
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
}

function handleWorkerSubmit(form) {
  const fields = form.elements;
  const name = fields.name.value.trim();
  if (!name) return;
  os.data.workers.push({
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
}

function handleStyleSubmit(form) {
  const fields = form.elements;
  const timestamp = Date.now();
  const styleId = `style_${timestamp}`;
  const sampleId = `sample_${timestamp}`;
  const reviewId = `review_${timestamp}`;
  const locationOption = os.data.sampleLocationOptions.find((item) => item.id === fields.sampleLocation.value);
  const route = fields.route.value;
  const phase = fields.samplePhase.value;
  const owners = route === "bonding_xinchangjiang"
    ? [fields.businessOwner.value, fields.bondingOwner.value, fields.xcjDispatcher.value]
    : [fields.businessOwner.value, fields.normalDispatcher.value, fields.prepOwner.value];
  os.data.styleList.unshift({
    id: styleId,
    styleNo: fields.styleNo.value.trim(),
    brand: fields.brand.value,
    season: fields.season.value,
    styleName: fields.styleName.value.trim(),
    category: fields.category.value,
    route,
    currentGate: "preparation_gate",
    samplePhase: phase,
    sampleLocation: locationOption?.label || "样衣间",
    currentOwner: owners,
    gateOwner: fields.prepOwner.value,
    finalApprover: fields.finalApprover.value,
    plannedShipDate: fields.plannedShipDate.value,
    riskStatus: fields.highRisk.checked ? "approaching_due" : "normal",
    nextAction: "准备材料齐套后由王部长确认",
    blockerSummary: "准备闸口未完成",
    quantity: Number(fields.quantity.value || 1),
  });
  os.data.samples.push({
    id: sampleId,
    styleId,
    samplePhase: phase,
    versionName: os.phaseLabels[phase],
    status: "preparation_blocked",
    location: locationOption?.label || "样衣间",
    holder: os.userName(fields.businessOwner.value),
    createdAt: "2026-06-29 10:00",
    updatedAt: "2026-06-29 10:00",
    imageList: [],
    videoList: [],
    mediaList: [],
    reviewId,
    plannedShipDate: fields.plannedShipDate.value,
  });
  os.data.reviews.push({
    id: reviewId,
    styleId,
    sampleId,
    reviewNo: `SR-${fields.styleNo.value.trim() || timestamp}`,
    status: "not_started",
    gateOwner: fields.reviewOwner.value,
    finalApprover: fields.finalApprover.value,
    issueIds: [],
    finalDecision: "none",
    exceptionRequest: null,
    timeline: [{ time: "现在", type: "black", text: "系统 · 新建开发任务并同步到样衣日历" }],
    departmentReviews: [],
  });
  os.data.currentStyleId = styleId;
  os.data.currentReviewId = reviewId;
}

function updateRouteHint(locationId) {
  const option = os.data.sampleLocationOptions.find((item) => item.id === locationId);
  const routeSelect = document.querySelector("#new-style-route");
  const hint = document.querySelector("#route-hint");
  if (option && routeSelect) routeSelect.value = option.recommendedRoute;
  if (hint && option) hint.textContent = `${option.label}，建议路线：${os.data.sampleRoutes[option.recommendedRoute]}`;
}

function renderAll() {
  renderPipeline();
  renderStyleWorkspace();
  renderReview();
  renderCalendar();
  renderSettings();
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

document.addEventListener("click", (event) => {
  const uploadTrigger = event.target.closest("[data-trigger-upload]");
  if (uploadTrigger) {
    event.preventDefault();
    event.stopPropagation();
    const mediaKind = uploadTrigger.dataset.triggerUpload;
    document.querySelector(`#review [data-media-upload="${mediaKind}"]`)?.click();
    return;
  }

  const uploadTile = event.target.closest("[data-upload-tile]");
  if (uploadTile && !event.target.closest("[data-media-upload]")) {
    event.preventDefault();
    event.stopPropagation();
    uploadTile.querySelector("[data-media-upload]")?.click();
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
    return;
  }
  if (event.target.closest("#review .issue-panel .section-title .primary")) {
    os.addDemoIssue(os.data.currentReviewId);
    renderAll();
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
  }
  if (event.target.id === "sample-location-select") {
    const review = os.getReviewById(os.data.currentReviewId);
    os.updateSampleLocation(review.styleId, event.target.value);
    renderAll();
  }
  if (event.target.id === "new-style-location") {
    updateRouteHint(event.target.value);
  }
});

document.addEventListener("submit", (event) => {
  const form = event.target.closest("[data-modal-form]");
  if (!form) return;
  event.preventDefault();
  const type = form.dataset.modalForm;
  if (type === "person") handlePersonSubmit(form);
  if (type === "worker") handleWorkerSubmit(form);
  if (type === "style") handleStyleSubmit(form);
  renderAll();
  closeModal();
  if (type === "style") showView("pipeline");
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
  const input = event.target.closest("[data-media-upload]");
  if (!input?.files?.length) return;
  const status = input.closest("[data-upload-tile]")?.querySelector("[data-upload-status]");
  const file = input.files[0];
  const review = os.getReviewById(os.data.currentReviewId);
  const sample = os.getSampleById(review.sampleId);
  const mediaKind = input.dataset.mediaUpload;
  const context = {
    styleId: review.styleId,
    sampleId: sample.id,
    reviewId: review.id,
  };

  try {
    status.textContent = "准备上传...";
    await window.SampleOSBackend.seedDemoData();
    const result = await window.SampleOSBackend.uploadFile(file, context, ({ ratio }) => {
      status.textContent = `上传中 ${Math.round(ratio * 100)}%`;
    });
    const uploadedAt = new Date().toLocaleString("zh-CN", { hour12: false });
    sample.mediaList ||= [];
    sample.mediaList.push({
      id: result.media.id,
      label: file.name,
      mediaKind,
      mimeType: file.type,
      byteSize: file.size,
      uploadedAt,
    });
    review.timeline.unshift({
      time: uploadedAt,
      type: "blue",
      text: `${os.userName(os.data.currentUserId)} · 上传${mediaKind === "video" ? "视频" : "照片"}：${file.name}`,
    });
    status.textContent = `已上传：${result.media.id.slice(0, 8)}`;
    renderReview();
  } catch (error) {
    status.textContent = error.message.includes("token") ? "请先登录" : error.message;
  } finally {
    input.value = "";
  }
});
