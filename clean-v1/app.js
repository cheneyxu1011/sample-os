(function () {
  const state = {
    data: null,
    selectedStyleId: null,
    selectedFiles: [],
    styleInitFiles: {},
    lightboxIndex: -1,
    uploading: false,
    touchStartX: null,
    loading: false
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  const levelLabels = {
    minor: "轻微",
    normal: "一般",
    major: "重大",
    critical: "严重"
  };

  const statusLabels = {
    pending: "待评审",
    pass: "通过",
    needs_improvement: "需修改",
    fail: "不通过",
    not_started: "未开始",
    in_progress: "处理中",
    pending_verification: "待复验",
    closed: "已关闭",
    reviewing: "评审中"
  };

  const routeLabels = {
    normal: "普通款式",
    important: "重点款式",
    risk: "风险款式",
    quick_response: "快反款式",
    bonding_xinchangjiang: "压胶路线",
    outsourced: "外发款式",
    rudong_factory: "如东工厂款式"
  };

  const gateLabels = {
    preparation_gate: "评审前准备",
    sample_review_gate: "样衣评审",
    final_approval_gate: "最终放行",
    business_input: "开发入口"
  };

  const sampleStageLabels = {
    first_sample: "一次样",
    second_sample: "二次样",
    sms_sample: "SMS 样",
    pps_sample: "PPS 样",
    top_sample: "TOP 样",
    sms: "SMS 样",
    pp: "PPS 样",
    third_sample: "三次样"
  };

  const fileCategoryLabels = {
    style_cover: "款式主图",
    customer_reference: "客户原始资料",
    measurement_table: "尺寸表",
    tech_pack: "工艺单",
    bom: "BOM / 物料表",
    customer_comments: "客户修改意见",
    other: "其他附件",
    review_media: "评审媒体"
  };

  const releaseLabels = {
    ready_to_send: "可寄样",
    pending_final_approval: "待最终审批",
    blocked_by_issue: "禁止寄样：存在阻塞 Issue",
    blocked_by_department_review: "禁止寄样：部门未评审完成",
    blocked_by_owner_missing: "禁止寄样：责任人未指定",
    blocked_by_preparation: "禁止寄样：评审资料未齐全",
    overdue_pending_confirm: "寄样日期已逾期，需重新确认"
  };

  function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function showMessage(message, tone) {
    const banner = $("#message-banner");
    banner.hidden = !message;
    banner.textContent = message || "";
    banner.dataset.tone = tone || "error";
  }

  async function requestJson(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      headers: {
        "content-type": "application/json",
        ...(options.headers || {})
      }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.detail || payload.error || `请求失败：${response.status}`);
    }
    return payload;
  }

  async function syncData(action, payload) {
    return requestJson("/api/sampleos/sync", {
      method: "POST",
      body: JSON.stringify({ action, ...payload })
    });
  }

  function styleById(id) {
    return state.data?.styleList?.find((style) => style.id === id) || state.data?.styleList?.[0] || null;
  }

  function currentStyle() {
    return styleById(state.selectedStyleId);
  }

  function currentSample() {
    const style = currentStyle();
    return state.data?.samples?.find((sample) => sample.styleId === style?.id) || null;
  }

  function currentReview() {
    const style = currentStyle();
    const sample = currentSample();
    return state.data?.reviews?.find((review) => review.styleId === style?.id || review.sampleId === sample?.id) || null;
  }

  function currentIssues() {
    const style = currentStyle();
    const sample = currentSample();
    const review = currentReview();
    return (state.data?.issues || []).filter((issue) => (
      issue.styleId === style?.id || issue.sampleId === sample?.id || issue.reviewId === review?.id
    ));
  }

  function reviewMediaList() {
    return (currentSample()?.mediaList || []).filter((item) => !isStyleCoverMedia(item));
  }

  function isBlocking(issue) {
    return issue.status !== "closed" && (issue.shipmentBlocking || issue.level === "major" || issue.level === "critical");
  }

  function routeLabel(style) {
    return state.data?.settings?.routeRules?.[style.route]?.label || routeLabels[style.route] || style.route || "路线未设";
  }

  function gateLabel(value) {
    return gateLabels[value] || value || "未设置";
  }

  function sampleStageLabel(value) {
    return sampleStageLabels[value] || value || "未设置";
  }

  function textOwner(style, review, field, fallback = "未指定") {
    const profile = style?.profile || {};
    const owners = style?.owners || profile.owners || {};
    const dbValue = field === "gateOwner" ? (style?.gateOwner || review?.gateOwner) : (style?.finalApprover || review?.finalApprover);
    const textValue = owners[field] || profile[field] || "";
    return dbValue ? userName(dbValue) : (textValue || fallback);
  }

  function plannedDate(style, sample) {
    return style?.plannedShipDate || sample?.plannedShipDate || "";
  }

  function dateOnly(value) {
    const text = dateText(value);
    return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
  }

  function overdueDays(value) {
    const text = dateOnly(value);
    if (!text) return 0;
    const [year, month, day] = text.split("-").map(Number);
    const target = new Date(year, month - 1, day);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diff = Math.floor((today - target) / 86400000);
    return Math.max(0, diff);
  }

  function isFinalApproved(review) {
    return ["approve_to_send", "approved_to_send", "ship"].includes(String(review?.finalDecision || ""));
  }

  function departmentReviewIncomplete(review) {
    const rows = review?.departmentReviews || [];
    return !rows.length || rows.some((row) => !["pass", "closed"].includes(row.status));
  }

  function hasMediaCategory(sample, category) {
    return (sample?.mediaList || []).some((item) => categoryFromLabel(item) === category);
  }

  function preparationIncomplete(style, sample) {
    const rows = style?.preparationChecklist || [];
    if (rows.length) {
      return rows.some((item) => {
        if (item.done === true) return false;
        if (item.id === "tech_pack") return !hasMediaCategory(sample, "tech_pack");
        if (item.id === "bom") return !hasMediaCategory(sample, "bom");
        if (item.id === "customer_info") return !(style?.brand && style?.styleNo);
        if (item.id === "sample_route") return !style?.route;
        if (item.id === "ship_date") return !plannedDate(style, sample);
        return true;
      });
    }
    return style?.currentGate === "preparation_gate" && !(hasMediaCategory(sample, "tech_pack") && hasMediaCategory(sample, "bom"));
  }

  function verifiedPreviousChanges(style) {
    return !(style?.preparationChecklist || []).some((item) => /上一轮|复验|验证/.test(item.label || "") && item.done !== true);
  }

  function computeShipmentState(style, sample, review, issues) {
    if (!style || !sample) {
      return { risk: "暂无数据", release: "blocked_by_preparation", nextStep: "先保存款式基础信息", tone: "neutral", overdue: 0 };
    }
    const blockers = (issues || []).filter(isBlocking);
    const overdue = overdueDays(plannedDate(style, sample));
    const gateOwnerText = textOwner(style, review, "gateOwner", "");
    const finalApproverText = textOwner(style, review, "finalApprover", "");

    if (overdue && !isFinalApproved(review)) {
      return { risk: `寄样已逾期 ${overdue} 天`, release: "overdue_pending_confirm", nextStep: "重新确认预计寄样日期和寄样结论", tone: "amber", overdue };
    }
    if (blockers.length) {
      return { risk: "存在阻塞 Issue", release: "blocked_by_issue", nextStep: "整改并复核阻塞 Issue", tone: "red", overdue };
    }
    if (!gateOwnerText || gateOwnerText === "未指定") {
      return { risk: "Gate Owner 未指定", release: "blocked_by_owner_missing", nextStep: "指定 Gate Owner", tone: "amber", overdue };
    }
    if (!finalApproverText || finalApproverText === "未指定") {
      return { risk: "Final Approver 未指定", release: "blocked_by_owner_missing", nextStep: "指定最终审批人", tone: "amber", overdue };
    }
    if (preparationIncomplete(style, sample)) {
      return { risk: "评审资料未齐全", release: "blocked_by_preparation", nextStep: "完成评审前资料确认", tone: "amber", overdue };
    }
    if (departmentReviewIncomplete(review)) {
      return { risk: "部门未评审完成", release: "blocked_by_department_review", nextStep: "完成所有必评部门评审", tone: "amber", overdue };
    }
    if (!verifiedPreviousChanges(style)) {
      return { risk: "上一轮修改点未验证", release: "pending_final_approval", nextStep: "验证上一轮修改点", tone: "amber", overdue };
    }
    if (!isFinalApproved(review)) {
      return { risk: "无阻塞 Issue", release: "pending_final_approval", nextStep: "最终审批确认是否寄样", tone: "amber", overdue };
    }
    return { risk: "无阻塞 Issue", release: "ready_to_send", nextStep: "生成寄样记录并通知业务寄样", tone: "green", overdue };
  }

  function categoryFromLabel(item) {
    const label = String(item?.label || "");
    const bracket = label.match(/^\[([a-z_]+)\]\s*/i);
    if (bracket) return bracket[1];
    const colon = label.match(/^([a-z_]+):/i);
    if (colon) return colon[1];
    return item?.mediaCategory || item?.fileCategory || "";
  }

  function readableMediaLabel(item) {
    const label = String(item?.label || item?.fileName || "");
    return label.replace(/^\[[a-z_]+\]\s*/i, "").replace(/^[a-z_]+:\s*/i, "") || item?.fileName || "已上传文件";
  }

  function isStyleCoverMedia(item) {
    const category = categoryFromLabel(item);
    return ["style_cover", "front"].includes(category) || item?.label === "款式图";
  }

  function findStyleCover(sample) {
    return (sample?.mediaList || []).find((item) => isStyleCoverMedia(item) && item.url);
  }

  function uploadLabel(category, file) {
    return `[${category}] ${fileCategoryLabels[category] || category} · ${file.name}`;
  }

  function routeStatus(style) {
    const sample = state.data?.samples?.find((item) => item.styleId === style.id);
    const review = state.data?.reviews?.find((item) => item.styleId === style.id || item.sampleId === sample?.id);
    const issues = (state.data?.issues || []).filter((issue) => issue.styleId === style.id || issue.sampleId === sample?.id || issue.reviewId === review?.id);
    const shipment = computeShipmentState(style, sample, review, issues);
    if (review?.exceptionRequest?.approvalStatus === "待审批") return { label: "等待例外放行", tone: "amber" };
    if (shipment.release === "ready_to_send") return { label: "可以寄样", tone: "green" };
    if (shipment.release === "blocked_by_issue") return { label: "阻止寄样", tone: "red" };
    if (shipment.release === "blocked_by_preparation") return { label: "准备闸口未完成", tone: "neutral" };
    if (shipment.release === "pending_final_approval" || review?.status === "reviewing" || style.currentGate === "sample_review_gate") return { label: "评审中", tone: "neutral" };
    if (shipment.release === "overdue_pending_confirm") return { label: "等待例外放行", tone: "amber" };
    return { label: "状态未设", tone: "neutral" };
  }

  function userName(id) {
    return state.data?.users?.find((user) => user.id === id)?.name || id || "未指定";
  }

  function dateText(date) {
    if (!date) return "未设置";
    const value = String(date);
    return value.length >= 10 ? value.slice(0, 10) : value;
  }

  function meta(label, value) {
    return `<div class="meta"><span>${esc(label)}</span><strong>${esc(value || "未设置")}</strong></div>`;
  }

  function styleCard(style, includeAction) {
    const sample = state.data?.samples?.find((item) => item.styleId === style.id);
    const review = state.data?.reviews?.find((item) => item.styleId === style.id || item.sampleId === sample?.id);
    const issues = (state.data?.issues || []).filter((issue) => issue.styleId === style.id || issue.sampleId === sample?.id || issue.reviewId === review?.id);
    const shipment = computeShipmentState(style, sample, review, issues);
    const status = shipment.release === "ready_to_send" ? "ok" : shipment.tone === "red" ? "blocked" : "pending";
    const routeState = routeStatus(style);
    const styleImage = findStyleCover(sample);
    const visual = includeAction ? "" : `
      <div class="style-visual">
        <label class="style-image-upload ${styleImage?.url ? "has-image" : ""}">
          <input type="file" accept="image/*" data-style-image-upload />
          ${styleImage?.url
            ? `<img src="${esc(styleImage.url)}" alt="款式主图" />`
            : '<span class="style-image-empty"><strong>请上传样衣正面图</strong><small>款式主图专用通道</small></span>'}
          <span class="style-image-action">${styleImage?.url ? "更换款式主图" : "上传款式主图"}</span>
        </label>
      </div>
    `;
    return `
      <article class="style-card ${includeAction ? "" : "with-visual"}">
        ${visual}
        <div class="style-card-main">
          <div class="style-title">
            <h2>${esc(style.styleName)}</h2>
            <span class="badge ${status}">${esc(releaseLabels[shipment.release] || shipment.release)}</span>
          </div>
          <p>${esc(style.brand)} / ${esc(style.styleNo)} <small class="system-id">系统 ID：${esc(style.externalRef || style.id)}</small></p>
          ${!includeAction ? `<div class="status-strip">
            <span class="${esc(shipment.tone)}">当前风险状态：${esc(shipment.risk)}</span>
            <span class="${esc(shipment.tone)}">寄样放行状态：${esc(releaseLabels[shipment.release] || shipment.release)}</span>
          </div>` : ""}
          ${includeAction ? `
            <div class="mobile-pipeline-summary">
              <div><strong>${esc(style.styleNo || "未填款号")}</strong><span>${esc(style.brand || "未填品牌")}</span></div>
              <div class="route-tags"><i>${esc(routeLabel(style))}</i><i class="${esc(routeState.tone)}">${esc(routeState.label)}</i></div>
            </div>
          ` : ""}
          <div class="meta-grid">
            ${meta("季节", style.season)}
            ${meta("当前 Gate", gateLabel(style.currentGate))}
            ${meta("样品阶段", sampleStageLabel(style.samplePhase))}
            ${meta("样衣位置", sample?.location || style.sampleLocation)}
            ${meta("预计寄样", plannedDate(style, sample))}
            ${meta("客户交期", style.customerDeadline)}
            ${meta("意见来源", style.customerCommentSource)}
            ${meta("本轮目标", style.reviewObjective)}
            ${meta("Gate Owner", textOwner(style, review, "gateOwner", "未指定"))}
            ${meta("Final Approver", textOwner(style, review, "finalApprover", "杨总"))}
            ${meta("下一步", shipment.nextStep)}
          </div>
        </div>
        ${includeAction ? `
          <div class="pipeline-actions">
            <button class="secondary-button" type="button" data-open-prep="${esc(style.id)}">准备材料</button>
            <button class="primary-button" type="button" data-open-review="${esc(style.id)}">打开评审</button>
            <button class="danger-button" type="button" data-delete-style="${esc(style.id)}">删除</button>
          </div>
        ` : ""}
      </article>
    `;
  }

  function updateStatus() {
    const style = currentStyle();
    const shipment = computeShipmentState(style, currentSample(), currentReview(), currentIssues());
    const riskPill = $("#risk-pill");
    const releasePill = $("#release-pill");
    if (riskPill) {
      riskPill.className = `status-pill ${shipment.tone === "green" ? "ok" : shipment.tone === "red" ? "blocked" : "pending"}`;
      riskPill.textContent = `风险：${shipment.risk}`;
    }
    if (releasePill) {
      releasePill.className = `status-pill ${shipment.release === "ready_to_send" ? "ok" : shipment.tone === "red" ? "blocked" : "pending"}`;
      releasePill.textContent = releaseLabels[shipment.release] || shipment.release;
    }
  }

  function renderPipeline() {
    const styles = state.data?.styleList || [];
    $("#pipeline-list").classList.remove("skeleton");
    $("#pipeline-list").innerHTML = styles.length
      ? styles.map((style) => styleCard(style, true)).join("")
      : '<div class="empty">暂无款式数据。</div>';
  }

  function renderReviewSummary() {
    const style = currentStyle();
    $("#review-summary").classList.remove("skeleton");
    $("#review-summary").innerHTML = style ? styleCard(style, false) : '<div class="empty">暂无评审数据。</div>';
  }

  function renderDepartments() {
    const review = currentReview();
    const rows = review?.departmentReviews || [];
    $("#department-cards").innerHTML = rows.length ? rows.map((row, index) => `
      <article class="department-card" data-department-index="${index}">
        <header>
          <div>
            <strong>${esc(row.department)}</strong>
            <small>${esc(row.role || "评审员")} / ${esc(userName(row.reviewer))}</small>
          </div>
          <span class="badge ${row.status === "fail" ? "blocked" : "ok"}">${esc(statusLabels[row.status] || row.status)}</span>
        </header>
        <div class="field-grid">
          <select data-review-status>
            ${["pending", "pass", "needs_improvement", "fail"].map((status) => `<option value="${status}" ${row.status === status ? "selected" : ""}>${esc(statusLabels[status])}</option>`).join("")}
          </select>
          <button class="secondary-button" type="button" data-save-department="${index}">保存意见</button>
        </div>
        <textarea data-review-opinion placeholder="输入${esc(row.department)}评审意见">${esc(row.opinion || "")}</textarea>
      </article>
    `).join("") : '<div class="empty">暂无部门评审行。</div>';
  }

  function renderIssues() {
    const issues = currentIssues();
    $("#issue-list").innerHTML = issues.length ? issues.map((issue) => {
      const blocked = isBlocking(issue);
      const canMarkVerify = issue.status !== "closed" && issue.status !== "pending_verification";
      return `
        <article class="issue-row ${blocked ? "blocked" : ""}">
          <strong>
            ${esc(issue.title)}
            <small>${esc(issue.sourceDepartment || "未指定部门")} · ${esc(issue.relatedArea || "未标注部位")}</small>
          </strong>
          <span class="badge ${blocked ? "blocked" : "ok"}">${esc(levelLabels[issue.level] || issue.level)} / ${blocked ? "阻止寄样" : "不阻止"}</span>
          <span>${esc(statusLabels[issue.status] || issue.status)}</span>
          <div class="issue-actions">
            ${canMarkVerify ? `<button class="secondary-button" type="button" data-verify-issue="${esc(issue.id)}">整改完成</button>` : ""}
            ${issue.status !== "closed" ? `<button class="secondary-button" type="button" data-close-issue="${esc(issue.id)}">复核关闭</button>` : ""}
          </div>
        </article>
      `;
    }).join("") : '<div class="empty">暂无 Issue。</div>';
  }

  function reviewSummaryText(style, sample, review, issues, shipment) {
    const blockers = issues.filter(isBlocking);
    const passedDepartments = (review?.departmentReviews || []).filter((row) => row.status === "pass").length;
    const totalDepartments = review?.departmentReviews?.length || 0;
    return [
      `款式：${style?.brand || ""} ${style?.styleNo || ""} / ${style?.styleName || ""}`,
      `阶段：${sampleStageLabel(style?.samplePhase)}；Gate：${gateLabel(style?.currentGate)}`,
      `资料：${preparationIncomplete(style, sample) ? "未齐全" : "已齐全"}；部门评审：${passedDepartments}/${totalDepartments}`,
      `Issue：${issues.length} 个，其中阻塞 ${blockers.length} 个`,
      `放行判断：${releaseLabels[shipment.release] || shipment.release}`,
      `下一步：${shipment.nextStep}`
    ];
  }

  function renderFinalApproval() {
    const style = currentStyle();
    const sample = currentSample();
    const review = currentReview();
    const issues = currentIssues();
    const shipment = computeShipmentState(style, sample, review, issues);
    const box = $("#review-summary-box");
    const approveButton = $("#final-approve");
    const holdButton = $("#final-hold");
    if (!box || !approveButton || !holdButton) return;
    box.innerHTML = reviewSummaryText(style, sample, review, issues, shipment).map((line) => `<p>${esc(line)}</p>`).join("");
    const canApprove = shipment.release === "pending_final_approval" || shipment.release === "ready_to_send";
    approveButton.disabled = !canApprove || !review;
    approveButton.title = approveButton.disabled ? (releaseLabels[shipment.release] || shipment.risk) : "确认最终可寄样";
    holdButton.disabled = !review;
    $("#final-approval-status").textContent = isFinalApproved(review)
      ? "最终审批已通过：可寄样。"
      : approveButton.disabled ? `暂不能最终放行：${releaseLabels[shipment.release] || shipment.risk}` : "可以提交最终审批。";
  }

  function renderMedia() {
    const mediaList = reviewMediaList();
    $("#uploaded-media").innerHTML = mediaList.length ? mediaList.map((item) => {
      const media = item.mediaKind === "video" || String(item.mimeType || "").startsWith("video/")
        ? `<video src="${esc(item.url || "")}" controls muted></video>`
        : `<img src="${esc(item.url || "")}" alt="${esc(item.label || item.fileName)}" />`;
      return `
        <article class="media-card">
          <button class="media-delete" type="button" data-delete-media="${esc(item.id)}" aria-label="删除 ${esc(item.label || item.fileName)}">×</button>
          <button class="media-open" type="button" data-open-media="${esc(item.id)}" aria-label="放大查看 ${esc(item.label || item.fileName)}">${media}</button>
          <small>${esc(readableMediaLabel(item))} · ${esc(item.uploadedAt || "")}</small>
        </article>
      `;
    }).join("") : '<div class="empty">暂无已上传媒体。</div>';
  }

  function renderCalendar() {
    const styles = state.data?.styleList || [];
    $("#calendar-list").innerHTML = styles.length ? styles.map((style) => {
      const sample = state.data?.samples?.find((item) => item.styleId === style.id);
      const date = style.plannedShipDate || sample?.plannedShipDate || "";
      return `
        <article class="calendar-card">
          <div class="date-block"><span>${esc(dateText(date).slice(0, 4) || "日期")}</span><strong>${esc(dateText(date).slice(5) || "--")}</strong></div>
          <div>
            <h3>${esc(style.brand)} ${esc(style.styleNo)} / ${esc(style.styleName)}</h3>
            <p>${esc(sampleStageLabel(style.samplePhase))} · ${esc(sample?.location || style.sampleLocation || "未设置")} · ${esc(gateLabel(style.currentGate))}</p>
          </div>
        </article>
      `;
    }).join("") : '<div class="empty">暂无日历数据。</div>';
    renderMonthCalendar(styles);
  }

  function monthDateKey(date) {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
  }

  function parseCalendarDate(value) {
    const text = dateText(value);
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  function renderMonthCalendar(styles) {
    const events = styles.map((style) => {
      const sample = state.data?.samples?.find((item) => item.styleId === style.id);
      const date = parseCalendarDate(style.plannedShipDate || sample?.plannedShipDate);
      return date ? { style, sample, date, key: monthDateKey(date) } : null;
    }).filter(Boolean);

    const anchor = events[0]?.date || new Date();
    const year = anchor.getFullYear();
    const month = anchor.getMonth();
    const first = new Date(year, month, 1);
    const firstWeekday = (first.getDay() + 6) % 7;
    const gridStart = new Date(year, month, 1 - firstWeekday);
    const todayKey = monthDateKey(new Date());
    const eventMap = new Map();

    events.forEach((event) => {
      eventMap.set(event.key, [...(eventMap.get(event.key) || []), event]);
    });

    $("#calendar-month-title").textContent = `${year} 年 ${month + 1} 月`;
    $("#calendar-month-count").textContent = `${events.length} 个节点`;

    const cells = [];
    for (let index = 0; index < 42; index += 1) {
      const day = new Date(gridStart);
      day.setDate(gridStart.getDate() + index);
      const key = monthDateKey(day);
      const dayEvents = eventMap.get(key) || [];
      const classes = [
        "month-day",
        day.getMonth() !== month ? "is-other-month" : "",
        key === todayKey ? "is-today" : "",
        dayEvents.length ? "has-events" : ""
      ].filter(Boolean).join(" ");
      cells.push(`
        <div class="${classes}">
          <div class="month-day-number">${day.getDate()}</div>
          ${dayEvents.map(({ style, sample }) => `
            <div class="calendar-event">
              <strong>${esc(style.brand)} ${esc(style.styleNo)}</strong>
              <small>${esc(style.styleName)} · ${esc(sample?.location || style.sampleLocation || "未设置")}</small>
            </div>
          `).join("")}
        </div>
      `);
    }

    $("#month-calendar-grid").innerHTML = cells.join("");
  }

  function renderSettings() {
    const data = state.data || {};
    const style = currentStyle();
    const review = currentReview();
    const owners = [
      ["Gate Owner", textOwner(style, review, "gateOwner", "未指定")],
      ["Preparation Gate Owner", userName(data.gateRules?.preparationGateOwner)],
      ["Final Approver", textOwner(style, review, "finalApprover", "杨总")]
    ];
    $("#owner-list").innerHTML = owners.map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join("");

    const rules = data.settings?.issueLevelRules || data.issueLevelRules || {
      minor: { label: "轻微", shipmentRule: "可寄样，但必须记录" },
      normal: { label: "一般", shipmentRule: "提示风险，可继续寄样" },
      major: { label: "重大", shipmentRule: "默认阻止寄样，除非例外放行" },
      critical: { label: "严重", shipmentRule: "必须暂停寄样，整改复验后重新评审" }
    };
    $("#rule-list").innerHTML = Object.entries(rules).map(([, rule]) => (
      `<li><strong>${esc(rule.label)}</strong>：${esc(rule.shipmentRule || rule.systemAction || "")}</li>`
    )).join("");
  }

  function renderAll() {
    renderPipeline();
    renderReviewSummary();
    renderDepartments();
    renderIssues();
    renderMedia();
    renderFinalApproval();
    renderCalendar();
    renderSettings();
    updateStatus();
  }

  async function loadSnapshot() {
    state.loading = true;
    showMessage("");
    $("#source-label").textContent = "连接中";
    try {
      const data = await requestJson("/api/sampleos/snapshot-p0", { method: "GET" });
      state.data = data;
      state.selectedStyleId = state.selectedStyleId || data.currentStyleId || data.styleList?.[0]?.id || null;
      $("#source-label").textContent = data.source?.kind || "supabase";
      $("#source-time").textContent = data.source?.loadedAt ? `加载于 ${new Date(data.source.loadedAt).toLocaleString()}` : "已加载";
      renderAll();
    } catch (error) {
      console.error("读取 Supabase snapshot 失败", { error });
      showMessage(`无法读取 Supabase snapshot：${error.message}`);
      $("#source-label").textContent = "连接失败";
      $("#pipeline-list").innerHTML = "无法连接数据源，请确认 Vercel 环境变量和 Supabase 可用。";
    } finally {
      state.loading = false;
    }
  }

  async function saveDepartment(index) {
    const review = currentReview();
    const row = review?.departmentReviews?.[index];
    const card = $(`[data-department-index="${index}"]`);
    if (!review || !row || !card) return;
    const status = card.querySelector("[data-review-status]").value;
    const opinion = card.querySelector("[data-review-opinion]").value;
    row.status = status;
    row.opinion = opinion;
    renderDepartments();
    try {
      await syncData("departmentReview", {
        reviewId: review.id,
        department: row.department,
        reviewerId: row.reviewer,
        role: row.role,
        status,
        opinion,
        focusTags: row.focusTags || []
      });
      await loadSnapshot();
    } catch (error) {
      console.error("保存部门评审失败", { index, reviewId: review.id, row, status, opinion, error });
      showMessage(`保存评审失败：${error.message}`);
      await loadSnapshot();
    }
  }

  async function createIssueFromForm(form) {
    const style = currentStyle();
    const sample = currentSample();
    const review = currentReview();
    if (!style || !review) return showMessage("缺少当前款式或评审，不能新增 Issue。");
    const fields = new FormData(form);
    const level = fields.get("level");
    try {
      await syncData("createIssue", {
        styleId: style.id,
        sampleId: sample?.id,
        reviewId: review.id,
        title: fields.get("title"),
        description: fields.get("title"),
        sourceDepartment: fields.get("department"),
        level,
        shipmentBlocking: level === "major" || level === "critical",
        canShipWithNote: level === "minor" || level === "normal",
        status: "not_started"
      });
      form.reset();
      form.department.value = "品质部";
      await loadSnapshot();
    } catch (error) {
      console.error("新增 Issue 失败", { styleId: style.id, sampleId: sample?.id, reviewId: review.id, level, error });
      showMessage(`新增 Issue 失败：${error.message}`);
    }
  }

  function setFieldErrors(form, errors) {
    form.querySelectorAll("[data-field-error]").forEach((node) => {
      node.textContent = errors[node.dataset.fieldError] || "";
    });
  }

  function validateStyleForm(form) {
    const fields = new FormData(form);
    const errors = {};
    if (!String(fields.get("styleNo") || "").trim()) errors.styleNo = "请输入款号";
    if (!String(fields.get("styleName") || "").trim()) errors.styleName = "请输入款式名称";
    if (!String(fields.get("brand") || "").trim()) errors.brand = "请输入品牌";
    if (!String(fields.get("season") || "").trim()) errors.season = "请输入季节";
    if (!String(fields.get("samplePhase") || "").trim()) errors.samplePhase = "请选择样品阶段";
    setFieldErrors(form, errors);
    return errors;
  }

  async function uploadFilesForCreatedStyle(filesByCategory, context) {
    const entries = Object.entries(filesByCategory || {}).flatMap(([category, files]) => (
      Array.from(files || []).map((file) => ({ category, file }))
    ));
    if (!entries.length) return;
    $("#style-create-status").textContent = `正在上传资料：0/${entries.length}`;
    let index = 0;
    for (const { category, file } of entries) {
      index += 1;
      $("#style-create-status").textContent = `正在上传资料：${index}/${entries.length} ${file.name}`;
      const presigned = await createUpload(file, {
        ...context,
        label: uploadLabel(category, file),
        fileCategory: category,
        mediaCategory: category === "style_cover" ? "style_cover" : "document"
      });
      await putToS3(file, presigned, "#style-create-status");
      await completeUpload(file, presigned);
    }
  }

  async function createStyleFromForm(form) {
    const fields = new FormData(form);
    const errors = validateStyleForm(form);
    const firstError = Object.values(errors)[0];
    if (firstError) {
      $("#style-create-status").textContent = `创建失败：${firstError}`;
      return showMessage(`创建失败：${firstError}`);
    }
    const payload = {
      styleNo: String(fields.get("styleNo") || "").trim(),
      brand: String(fields.get("brand") || "").trim(),
      styleName: String(fields.get("styleName") || "").trim(),
      season: String(fields.get("season") || "").trim(),
      customer: String(fields.get("customer") || "").trim(),
      route: String(fields.get("route") || "normal"),
      samplePhase: String(fields.get("samplePhase") || "first_sample"),
      sampleLocation: String(fields.get("sampleLocation") || "样衣间").trim(),
      plannedShipDate: String(fields.get("plannedShipDate") || ""),
      customerDeadline: String(fields.get("customerDeadline") || ""),
      customerCommentSource: String(fields.get("customerCommentSource") || "").trim(),
      reviewObjective: String(fields.get("reviewObjective") || "").trim(),
      businessOwner: String(fields.get("businessOwner") || "").trim(),
      sampleOwner: String(fields.get("sampleOwner") || "").trim(),
      gateOwner: String(fields.get("gateOwner") || "").trim(),
      finalApprover: String(fields.get("finalApprover") || "").trim(),
      patternOwner: String(fields.get("patternOwner") || "").trim(),
      processOwner: String(fields.get("processOwner") || "").trim(),
      qcOwner: String(fields.get("qcOwner") || "").trim(),
      bondingOwner: String(fields.get("bondingOwner") || "").trim(),
      versionName: String(fields.get("samplePhase") || "first_sample"),
      quantity: 1,
      highRisk: false
    };
    const submit = $("#style-create-submit");
    submit.disabled = true;
    submit.textContent = "正在创建款式...";
    $("#style-create-status").textContent = "正在创建款式...";
    try {
      const response = await requestJson("/api/sampleos/create-style-fast", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      const result = response.result || {};
      if (!isUuid(result.styleId) || !isUuid(result.sampleId) || !isUuid(result.reviewId)) {
        throw new Error("style_id 未生成");
      }
      await uploadFilesForCreatedStyle(state.styleInitFiles, {
        styleId: result.styleId,
        sampleId: result.sampleId,
        reviewId: result.reviewId,
        styleExternalRef: result.style?.external_ref || null,
        sampleExternalRef: result.sample?.external_ref || null,
        reviewExternalRef: result.review?.external_ref || null
      });
      await loadSnapshot();
      state.selectedStyleId = result.styleId || state.selectedStyleId;
      renderAll();
      closeStyleModal();
      showMessage(result.existing ? "该款号已存在，已打开现有款式。" : "款式创建成功，已进入评审页面", "ok");
      switchView("review");
    } catch (error) {
      console.error("创建款式失败", { payload, selectedFiles: state.styleInitFiles, error });
      $("#style-create-status").textContent = `创建失败：${error.message}`;
      showMessage(`创建失败：${error.message}`);
    } finally {
      submit.disabled = false;
      submit.textContent = "创建款式";
    }
  }

  async function deleteStyle(styleId) {
    if (!isUuid(styleId)) return showMessage("只能删除已保存到数据库的真实款式。");
    const style = styleById(styleId);
    if (!window.confirm(`确认删除 ${style?.styleNo || "该款式"}？关联样衣、评审、问题、媒体 metadata 会一起清理。`)) return;
    try {
      await requestJson("/api/sampleos/delete-style-fast", {
        method: "POST",
        body: JSON.stringify({ styleId })
      });
      if (state.selectedStyleId === styleId) state.selectedStyleId = null;
      await loadSnapshot();
      showMessage("款式已删除。", "ok");
    } catch (error) {
      console.error("删除款式失败", { styleId, error });
      showMessage(`删除款式失败：${error.message}`);
    }
  }

  async function closeIssue(issueId) {
    try {
      await syncData("issueStatus", { issueId, status: "closed" });
      await loadSnapshot();
    } catch (error) {
      console.error("关闭 Issue 失败", { issueId, error });
      showMessage(`关闭 Issue 失败：${error.message}`);
    }
  }

  async function markIssueReadyForVerification(issueId) {
    try {
      await syncData("issueStatus", { issueId, status: "pending_verification" });
      await loadSnapshot();
      showMessage("Issue 已标记为待复验。", "ok");
    } catch (error) {
      console.error("标记 Issue 待复验失败", { issueId, error });
      showMessage(`标记待复验失败：${error.message}`);
    }
  }

  async function submitFinalDecision(finalDecision) {
    const review = currentReview();
    const style = currentStyle();
    const sample = currentSample();
    const issues = currentIssues();
    const shipment = computeShipmentState(style, sample, review, issues);
    if (!review) return showMessage("缺少当前评审，不能提交最终审批。");
    if (finalDecision === "approve_to_send" && !(shipment.release === "pending_final_approval" || shipment.release === "ready_to_send")) {
      const reason = releaseLabels[shipment.release] || shipment.risk;
      $("#final-approval-status").textContent = `最终审批被阻断：${reason}`;
      return showMessage(`最终审批被阻断：${reason}`);
    }
    try {
      $("#final-approval-status").textContent = "正在提交最终审批...";
      await syncData("reviewDecision", {
        reviewId: review.id,
        finalDecision,
        reviewSummary: reviewSummaryText(style, sample, review, issues, shipment)
      });
      await loadSnapshot();
      showMessage(finalDecision === "approve_to_send" ? "最终审批已通过，可以寄样。" : "已暂缓寄样。", "ok");
    } catch (error) {
      console.error("最终审批提交失败", { reviewId: review.id, finalDecision, error });
      $("#final-approval-status").textContent = `最终审批失败：${error.message}`;
      showMessage(`最终审批失败：${error.message}`);
    }
  }

  async function deleteMedia(mediaId) {
    try {
      await syncData("deleteMedia", { mediaId });
      await loadSnapshot();
    } catch (error) {
      console.error("删除媒体失败", { mediaId, error });
      showMessage(`删除媒体失败：${error.message}`);
    }
  }

  function renderLightboxMedia() {
    const mediaList = reviewMediaList();
    const item = mediaList[state.lightboxIndex];
    if (!item?.url) return;
    const isVideo = item.mediaKind === "video" || String(item.mimeType || "").startsWith("video/");
    $("#lightbox-stage").innerHTML = isVideo
      ? `<video src="${esc(item.url)}" controls autoplay></video>`
      : `<img src="${esc(item.url)}" alt="${esc(item.label || item.fileName)}" />`;
    $("#lightbox-caption").textContent = `${readableMediaLabel(item)} · ${state.lightboxIndex + 1}/${mediaList.length}`;
    $("#lightbox-prev").disabled = mediaList.length <= 1;
    $("#lightbox-next").disabled = mediaList.length <= 1;
  }

  function openMediaLightbox(mediaId) {
    const mediaList = reviewMediaList();
    const index = mediaList.findIndex((media) => media.id === mediaId);
    if (index < 0) return;
    state.lightboxIndex = index;
    renderLightboxMedia();
    $("#media-lightbox").hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeMediaLightbox() {
    $("#media-lightbox").hidden = true;
    state.lightboxIndex = -1;
    $("#lightbox-stage").innerHTML = "";
    $("#lightbox-caption").textContent = "";
    document.body.style.overflow = "";
  }

  function moveLightbox(direction) {
    const mediaList = reviewMediaList();
    if ($("#media-lightbox").hidden || mediaList.length <= 1) return;
    state.lightboxIndex = (state.lightboxIndex + direction + mediaList.length) % mediaList.length;
    renderLightboxMedia();
  }

  async function createUpload(file, context) {
    const mediaKind = file.type.startsWith("image/") ? "photo" : file.type.startsWith("video/") ? "video" : "document";
    return requestJson("/api/media/presign-upload", {
      method: "POST",
      body: JSON.stringify({
        ...context,
        mediaKind,
        fileName: file.name,
        label: context.label || file.name,
        fileCategory: context.fileCategory || null,
        mediaCategory: context.mediaCategory || null,
        mimeType: file.type || "application/octet-stream",
        byteSize: file.size
      })
    });
  }

  async function putToS3(file, presigned, statusSelector = "#upload-status") {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(presigned.method || "PUT", presigned.uploadUrl, true);
      Object.entries(presigned.headers || {}).forEach(([name, value]) => xhr.setRequestHeader(name, value));
      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        const percent = Math.round((event.loaded / event.total) * 100);
        const status = $(statusSelector);
        if (status) status.textContent = `上传中：${file.name} ${percent}%`;
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`S3 上传失败：${xhr.status}`));
      };
      xhr.onerror = () => reject(new Error("S3 上传失败：网络错误"));
      xhr.send(file);
    });
  }

  async function completeUpload(file, presigned) {
    const media = presigned.media;
    return requestJson("/api/media/complete-upload", {
      method: "POST",
      body: JSON.stringify({
        styleId: media.styleId,
        sampleId: media.sampleId,
        reviewId: media.reviewId,
        issueId: media.issueId,
        styleExternalRef: media.styleExternalRef,
        sampleExternalRef: media.sampleExternalRef,
        reviewExternalRef: media.reviewExternalRef,
        issueExternalRef: media.issueExternalRef,
        mediaKind: media.mediaKind,
        label: media.label || file.name,
        s3Bucket: media.s3Bucket,
        s3Region: media.s3Region,
        s3ObjectKey: media.s3ObjectKey,
        mimeType: media.mimeType,
        byteSize: media.byteSize,
        checksumSha256: null
      })
    });
  }

  async function uploadSelectedFiles() {
    if (state.uploading) return;
    const style = currentStyle();
    const sample = currentSample();
    const review = currentReview();
    if (!style || !sample || !review || !isUuid(style.id) || !isUuid(sample.id) || !isUuid(review.id)) {
      return showMessage("当前款式尚未保存到数据库，无法上传媒体。");
    }
    if (!state.selectedFiles.length) return;
    state.uploading = true;
    $("#upload-selected").disabled = true;
    $("#upload-selected").textContent = "上传中...";
    $("#upload-status").textContent = `准备上传 ${state.selectedFiles.length} 个文件...`;
    try {
      for (const file of state.selectedFiles) {
        const context = {
          styleId: style.id,
          sampleId: sample.id,
          reviewId: review?.id || null,
          styleExternalRef: style.externalRef,
          sampleExternalRef: sample.externalRef,
          reviewExternalRef: review?.externalRef || null,
          label: uploadLabel("review_media", file),
          fileCategory: "review_media",
          mediaCategory: file.type.startsWith("image/") ? "review_photo" : file.type.startsWith("video/") ? "review_video" : "review_document"
        };
        const presigned = await createUpload(file, context);
        await putToS3(file, presigned);
        await completeUpload(file, presigned);
      }
      state.selectedFiles = [];
      $$("[data-media-upload-input]").forEach((input) => { input.value = ""; });
      $("#media-preview").innerHTML = "";
      $("#upload-status").textContent = "上传成功，已同步到 Supabase。";
      await loadSnapshot();
    } catch (error) {
      console.error("上传评审媒体失败", { files: state.selectedFiles, error });
      $("#upload-status").textContent = `上传失败：${error.message}`;
      showMessage(`上传失败：${error.message}`);
    } finally {
      state.uploading = false;
      $("#upload-selected").textContent = "上传所选文件";
      $("#upload-selected").disabled = !state.selectedFiles.length;
    }
  }

  async function uploadStyleImage(file) {
    const style = currentStyle();
    const sample = currentSample();
    const review = currentReview();
    if (!file) return;
    if (!style || !sample || !review || !isUuid(style.id) || !isUuid(sample.id) || !isUuid(review.id)) {
      return showMessage("当前款式尚未保存到数据库，无法上传媒体。");
    }
    try {
      const context = {
        styleId: style.id,
        sampleId: sample.id,
        reviewId: review?.id || null,
        styleExternalRef: style.externalRef,
        sampleExternalRef: sample.externalRef,
        reviewExternalRef: review?.externalRef || null,
        label: uploadLabel("style_cover", file),
        fileCategory: "style_cover",
        mediaCategory: "style_cover"
      };
      const presigned = await createUpload(file, context);
      await putToS3(file, presigned);
      await completeUpload(file, presigned);
      await loadSnapshot();
    } catch (error) {
      console.error("款式主图上传失败", { file, styleId: style?.id, sampleId: sample?.id, reviewId: review?.id, error });
      showMessage(`款式图上传失败：${error.message}`);
    }
  }

  function switchView(viewName) {
    $$(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === viewName));
    $$(".view").forEach((view) => view.classList.toggle("active", view.id === `${viewName}-view`));
    $("#view-title").textContent = $(`#${viewName}-view`).dataset.title;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openStyleModal() {
    $("#style-modal").hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeStyleModal() {
    $("#style-modal").hidden = true;
    $("#style-form").reset();
    $("#style-form").brand.value = "萨洛蒙";
    $("#style-form").season.value = "SS27";
    $("#style-form").samplePhase.value = "second_sample";
    $("#style-form").sampleLocation.value = "样衣间";
    $("#style-form").finalApprover.value = "杨总";
    state.styleInitFiles = {};
    $("#style-cover-preview").innerHTML = "暂无主图";
    $("#style-create-status").textContent = "";
    setFieldErrors($("#style-form"), {});
    document.body.style.overflow = "";
  }

  function bindEvents() {
    document.addEventListener("click", (event) => {
      const nav = event.target.closest("[data-view]");
      if (nav) switchView(nav.dataset.view);

      const openReview = event.target.closest("[data-open-review]");
      if (openReview) {
        state.selectedStyleId = openReview.dataset.openReview;
        renderAll();
        switchView("review");
      }

      const prepButton = event.target.closest("[data-open-prep]");
      if (prepButton) {
        state.selectedStyleId = prepButton.dataset.openPrep;
        renderAll();
        switchView("settings");
        showMessage("准备材料清单已保存在 snapshot 的 preparationChecklist 中，后续可在这里展开完整准备页。", "ok");
      }

      const deleteStyleButton = event.target.closest("[data-delete-style]");
      if (deleteStyleButton) deleteStyle(deleteStyleButton.dataset.deleteStyle);

      const saveDepartmentButton = event.target.closest("[data-save-department]");
      if (saveDepartmentButton) saveDepartment(Number(saveDepartmentButton.dataset.saveDepartment));

      const closeIssueButton = event.target.closest("[data-close-issue]");
      if (closeIssueButton) closeIssue(closeIssueButton.dataset.closeIssue);

      const verifyIssueButton = event.target.closest("[data-verify-issue]");
      if (verifyIssueButton) markIssueReadyForVerification(verifyIssueButton.dataset.verifyIssue);

      const deleteMediaButton = event.target.closest("[data-delete-media]");
      if (deleteMediaButton) deleteMedia(deleteMediaButton.dataset.deleteMedia);

      const openMediaButton = event.target.closest("[data-open-media]");
      if (openMediaButton) openMediaLightbox(openMediaButton.dataset.openMedia);
    });

    $("#new-style-button").addEventListener("click", openStyleModal);
    $("#style-modal-close").addEventListener("click", closeStyleModal);
    $("#style-modal-cancel").addEventListener("click", closeStyleModal);
    $("#style-modal").addEventListener("click", (event) => {
      if (event.target.id === "style-modal") closeStyleModal();
    });
    $("#style-form").addEventListener("submit", (event) => {
      event.preventDefault();
      createStyleFromForm(event.currentTarget);
    });

    $("#reload-data").addEventListener("click", loadSnapshot);
    $("#lightbox-close").addEventListener("click", closeMediaLightbox);
    $("#lightbox-prev").addEventListener("click", () => moveLightbox(-1));
    $("#lightbox-next").addEventListener("click", () => moveLightbox(1));
    $("#media-lightbox").addEventListener("click", (event) => {
      if (event.target.id === "media-lightbox") closeMediaLightbox();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !$("#media-lightbox").hidden) closeMediaLightbox();
      if (event.key === "ArrowLeft") moveLightbox(-1);
      if (event.key === "ArrowRight") moveLightbox(1);
    });
    $("#media-lightbox").addEventListener("touchstart", (event) => {
      state.touchStartX = event.touches?.[0]?.clientX ?? null;
    }, { passive: true });
    $("#media-lightbox").addEventListener("touchend", (event) => {
      if (state.touchStartX === null) return;
      const endX = event.changedTouches?.[0]?.clientX ?? state.touchStartX;
      const delta = endX - state.touchStartX;
      state.touchStartX = null;
      if (Math.abs(delta) < 40) return;
      moveLightbox(delta > 0 ? -1 : 1);
    }, { passive: true });

    $("#issue-form").addEventListener("submit", (event) => {
      event.preventDefault();
      createIssueFromForm(event.currentTarget);
    });

    document.addEventListener("change", (event) => {
      const mediaInput = event.target.closest("[data-media-upload-input]");
      if (!mediaInput) return;
      const seen = new Set();
      state.selectedFiles = Array.from(mediaInput.files || []).filter((file) => {
        const key = `${file.name}:${file.size}:${file.lastModified}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      $("#upload-selected").disabled = !state.selectedFiles.length;
      $("#upload-status").textContent = state.selectedFiles.length ? `已选择 ${state.selectedFiles.length} 个文件，等待上传。` : "";
      $("#media-preview").innerHTML = state.selectedFiles.map((file) => {
        const url = URL.createObjectURL(file);
        const media = file.type.startsWith("video/")
          ? `<video src="${url}" controls muted></video>`
          : `<img src="${url}" alt="${esc(file.name)}" />`;
        return `<article class="media-card">${media}<small>${esc(file.name)}</small></article>`;
      }).join("");
    });

    document.addEventListener("change", (event) => {
      const input = event.target.closest("[data-style-init-file]");
      if (!input) return;
      const category = input.dataset.styleInitFile;
      const files = Array.from(input.files || []);
      state.styleInitFiles[category] = category === "style_cover" ? files.slice(0, 1) : files;
      const count = Object.values(state.styleInitFiles).reduce((sum, list) => sum + (list?.length || 0), 0);
      $("#style-create-status").textContent = count ? `已选择 ${count} 个款式资料，创建后上传。` : "";
      if (category === "style_cover") {
        const file = files[0];
        $("#style-cover-preview").innerHTML = file
          ? `<img src="${esc(URL.createObjectURL(file))}" alt="款式主图预览" />`
          : "暂无主图";
      }
    });

    $("#upload-selected").addEventListener("click", uploadSelectedFiles);
    $("#final-approve").addEventListener("click", () => submitFinalDecision("approve_to_send"));
    $("#final-hold").addEventListener("click", () => submitFinalDecision("hold_shipment"));
    document.addEventListener("change", (event) => {
      const input = event.target.closest("[data-style-image-upload]");
      if (!input) return;
      uploadStyleImage(input.files?.[0]);
      input.value = "";
    });
  }

  bindEvents();
  loadSnapshot();
})();
