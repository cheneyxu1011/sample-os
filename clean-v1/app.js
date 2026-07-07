(function () {
  const state = {
    data: null,
    selectedStyleId: null,
    selectedFiles: [],
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
    return state.data?.samples?.find((sample) => sample.styleId === style?.id) || state.data?.samples?.[0] || null;
  }

  function currentReview() {
    const style = currentStyle();
    const sample = currentSample();
    return state.data?.reviews?.find((review) => review.styleId === style?.id || review.sampleId === sample?.id) || state.data?.reviews?.[0] || null;
  }

  function currentIssues() {
    const style = currentStyle();
    const sample = currentSample();
    const review = currentReview();
    return (state.data?.issues || []).filter((issue) => (
      issue.styleId === style?.id || issue.sampleId === sample?.id || issue.reviewId === review?.id
    ));
  }

  function isBlocking(issue) {
    return issue.status !== "closed" && (issue.shipmentBlocking || issue.level === "major" || issue.level === "critical");
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
    const blockers = issues.filter(isBlocking);
    const status = blockers.length ? "blocked" : "ok";
    return `
      <article class="style-card">
        <div class="style-card-main">
          <div class="style-title">
            <h2>${esc(style.styleName)}</h2>
            <span class="badge ${status}">${blockers.length ? `${blockers.length} 个阻塞 Issue` : "可寄样"}</span>
          </div>
          <p>${esc(style.brand)} / ${esc(style.styleNo)} / ${esc(style.externalRef || style.id)}</p>
          <div class="meta-grid">
            ${meta("季节", style.season)}
            ${meta("当前 Gate", style.currentGate)}
            ${meta("样品阶段", style.samplePhase)}
            ${meta("样衣位置", sample?.location || style.sampleLocation)}
            ${meta("预计寄样", style.plannedShipDate || sample?.plannedShipDate)}
            ${meta("Gate Owner", userName(style.gateOwner || review?.gateOwner))}
            ${meta("Final Approver", userName(style.finalApprover || review?.finalApprover))}
            ${meta("下一步", style.nextAction || style.blockerSummary)}
          </div>
        </div>
        ${includeAction ? `<button class="primary-button" type="button" data-open-review="${esc(style.id)}">打开评审</button>` : ""}
      </article>
    `;
  }

  function updateStatus() {
    const blockers = currentIssues().filter(isBlocking);
    const pill = $("#blocking-pill");
    pill.className = `status-pill ${blockers.length ? "blocked" : "ok"}`;
    pill.textContent = blockers.length ? `寄样阻止：${blockers.length} 个 Issue` : "可寄样：无阻塞 Issue";
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
      return `
        <article class="issue-row ${blocked ? "blocked" : ""}">
          <strong>
            ${esc(issue.title)}
            <small>${esc(issue.sourceDepartment || "未指定部门")} · ${esc(issue.relatedArea || "未标注部位")}</small>
          </strong>
          <span class="badge ${blocked ? "blocked" : "ok"}">${esc(levelLabels[issue.level] || issue.level)} / ${blocked ? "阻止寄样" : "不阻止"}</span>
          <span>${esc(statusLabels[issue.status] || issue.status)}</span>
          ${issue.status !== "closed" ? `<button class="secondary-button" type="button" data-close-issue="${esc(issue.id)}">关闭</button>` : ""}
        </article>
      `;
    }).join("") : '<div class="empty">暂无 Issue。</div>';
  }

  function renderMedia() {
    const sample = currentSample();
    const mediaList = sample?.mediaList || [];
    $("#uploaded-media").innerHTML = mediaList.length ? mediaList.map((item) => {
      const media = item.mediaKind === "video" || String(item.mimeType || "").startsWith("video/")
        ? `<video src="${esc(item.url || "")}" controls muted></video>`
        : `<img src="${esc(item.url || "")}" alt="${esc(item.label || item.fileName)}" />`;
      return `
        <article class="media-card">
          <button class="media-delete" type="button" data-delete-media="${esc(item.id)}" aria-label="删除 ${esc(item.label || item.fileName)}">×</button>
          <button class="media-open" type="button" data-open-media="${esc(item.id)}" aria-label="放大查看 ${esc(item.label || item.fileName)}">${media}</button>
          <small>${esc(item.label || item.fileName)} · ${esc(item.uploadedAt || "")}</small>
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
            <p>${esc(style.samplePhase)} · ${esc(sample?.location || style.sampleLocation || "未设置")} · ${esc(style.currentGate)}</p>
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
      ["Gate Owner", userName(style?.gateOwner || review?.gateOwner)],
      ["Preparation Gate Owner", userName(data.gateRules?.preparationGateOwner)],
      ["Final Approver", userName(style?.finalApprover || review?.finalApprover)]
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
    renderCalendar();
    renderSettings();
    updateStatus();
  }

  async function loadSnapshot() {
    state.loading = true;
    showMessage("");
    $("#source-label").textContent = "连接中";
    try {
      const data = await requestJson("/api/sampleos/snapshot", { method: "GET" });
      state.data = data;
      state.selectedStyleId = state.selectedStyleId || data.currentStyleId || data.styleList?.[0]?.id || null;
      $("#source-label").textContent = data.source?.kind || "supabase";
      $("#source-time").textContent = data.source?.loadedAt ? `加载于 ${new Date(data.source.loadedAt).toLocaleString()}` : "已加载";
      renderAll();
    } catch (error) {
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
      showMessage(`新增 Issue 失败：${error.message}`);
    }
  }

  async function closeIssue(issueId) {
    try {
      await syncData("issueStatus", { issueId, status: "closed" });
      await loadSnapshot();
    } catch (error) {
      showMessage(`关闭 Issue 失败：${error.message}`);
    }
  }

  async function deleteMedia(mediaId) {
    try {
      await syncData("deleteMedia", { mediaId });
      await loadSnapshot();
    } catch (error) {
      showMessage(`删除媒体失败：${error.message}`);
    }
  }

  function openMediaLightbox(mediaId) {
    const sample = currentSample();
    const item = sample?.mediaList?.find((media) => media.id === mediaId);
    if (!item?.url) return;
    const isVideo = item.mediaKind === "video" || String(item.mimeType || "").startsWith("video/");
    $("#lightbox-stage").innerHTML = isVideo
      ? `<video src="${esc(item.url)}" controls autoplay></video>`
      : `<img src="${esc(item.url)}" alt="${esc(item.label || item.fileName)}" />`;
    $("#lightbox-caption").textContent = item.label || item.fileName || "媒体预览";
    $("#media-lightbox").hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeMediaLightbox() {
    $("#media-lightbox").hidden = true;
    $("#lightbox-stage").innerHTML = "";
    $("#lightbox-caption").textContent = "";
    document.body.style.overflow = "";
  }

  async function createUpload(file, context) {
    const mediaKind = file.type.startsWith("image/") ? "photo" : file.type.startsWith("video/") ? "video" : "document";
    return requestJson("/api/media/presign-upload", {
      method: "POST",
      body: JSON.stringify({
        ...context,
        mediaKind,
        fileName: file.name,
        label: file.name,
        mimeType: file.type || "application/octet-stream",
        byteSize: file.size
      })
    });
  }

  async function putToS3(file, presigned) {
    const response = await fetch(presigned.uploadUrl, {
      method: presigned.method || "PUT",
      headers: presigned.headers || {},
      body: file
    });
    if (!response.ok) throw new Error(`S3 上传失败：${response.status}`);
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
    const style = currentStyle();
    const sample = currentSample();
    const review = currentReview();
    if (!style || !sample) return showMessage("缺少当前款式或样衣，不能上传。");
    if (!state.selectedFiles.length) return;
    $("#upload-selected").disabled = true;
    $("#upload-selected").textContent = "上传中...";
    try {
      for (const file of state.selectedFiles) {
        const context = {
          styleId: style.id,
          sampleId: sample.id,
          reviewId: review?.id || null,
          styleExternalRef: style.externalRef,
          sampleExternalRef: sample.externalRef,
          reviewExternalRef: review?.externalRef || null
        };
        const presigned = await createUpload(file, context);
        await putToS3(file, presigned);
        await completeUpload(file, presigned);
      }
      state.selectedFiles = [];
      $("#media-upload").value = "";
      $("#media-preview").innerHTML = "";
      await loadSnapshot();
    } catch (error) {
      showMessage(`上传失败：${error.message}`);
    } finally {
      $("#upload-selected").textContent = "上传所选文件";
      $("#upload-selected").disabled = !state.selectedFiles.length;
    }
  }

  function switchView(viewName) {
    $$(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === viewName));
    $$(".view").forEach((view) => view.classList.toggle("active", view.id === `${viewName}-view`));
    $("#view-title").textContent = $(`#${viewName}-view`).dataset.title;
    window.scrollTo({ top: 0, behavior: "smooth" });
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

      const saveDepartmentButton = event.target.closest("[data-save-department]");
      if (saveDepartmentButton) saveDepartment(Number(saveDepartmentButton.dataset.saveDepartment));

      const closeIssueButton = event.target.closest("[data-close-issue]");
      if (closeIssueButton) closeIssue(closeIssueButton.dataset.closeIssue);

      const deleteMediaButton = event.target.closest("[data-delete-media]");
      if (deleteMediaButton) deleteMedia(deleteMediaButton.dataset.deleteMedia);

      const openMediaButton = event.target.closest("[data-open-media]");
      if (openMediaButton) openMediaLightbox(openMediaButton.dataset.openMedia);
    });

    $("#reload-data").addEventListener("click", loadSnapshot);
    $("#lightbox-close").addEventListener("click", closeMediaLightbox);
    $("#media-lightbox").addEventListener("click", (event) => {
      if (event.target.id === "media-lightbox") closeMediaLightbox();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !$("#media-lightbox").hidden) closeMediaLightbox();
    });

    $("#issue-form").addEventListener("submit", (event) => {
      event.preventDefault();
      createIssueFromForm(event.currentTarget);
    });

    $("#media-upload").addEventListener("change", (event) => {
      state.selectedFiles = Array.from(event.target.files || []);
      $("#upload-selected").disabled = !state.selectedFiles.length;
      $("#media-preview").innerHTML = state.selectedFiles.map((file) => {
        const url = URL.createObjectURL(file);
        const media = file.type.startsWith("video/")
          ? `<video src="${url}" controls muted></video>`
          : `<img src="${url}" alt="${esc(file.name)}" />`;
        return `<article class="media-card">${media}<small>${esc(file.name)}</small></article>`;
      }).join("");
    });

    $("#upload-selected").addEventListener("click", uploadSelectedFiles);
  }

  bindEvents();
  loadSnapshot();
})();
