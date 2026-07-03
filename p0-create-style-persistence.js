(() => {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const isUuid = (value) => uuidPattern.test(String(value || ""));
  const authHeaders = () => {
    const token = window.SampleOSBackend?.getAccessToken?.();
    return token ? { authorization: `Bearer ${token}` } : {};
  };

  async function requestJson(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      headers: { "content-type": "application/json", ...authHeaders(), ...(options.headers || {}) },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error([payload.error || `Request failed with ${response.status}`, payload.detail, payload.code ? `code=${payload.code}` : ""].filter(Boolean).join("；"));
      error.status = response.status;
      error.response = payload;
      error.request = { path, payload: options.body || null };
      throw error;
    }
    return payload;
  }

  function installMobilePipelineCss() {
    const previous = document.querySelector("#sampleos-p0-mobile-pipeline-css");
    if (previous) previous.remove();
    const style = document.createElement("style");
    style.id = "sampleos-p0-mobile-pipeline-css";
    style.textContent = `
      @media (max-width: 768px) {
        body.apple-ui #pipeline .filter-row { display: none !important; }
        body.apple-ui #pipeline .summary-grid {
          display: flex !important;
          grid-template-columns: none !important;
          gap: 8px !important;
          overflow-x: auto !important;
          padding: 0 4px 2px !important;
          margin: 6px 0 8px !important;
          -webkit-overflow-scrolling: touch;
        }
        body.apple-ui #pipeline .summary-grid::-webkit-scrollbar { display: none; }
        body.apple-ui #pipeline .summary-card {
          flex: 0 0 92px !important;
          min-height: 54px !important;
          padding: 8px 10px !important;
          border-radius: 12px !important;
        }
        body.apple-ui #pipeline .summary-card::before { display: none !important; }
        body.apple-ui #pipeline .summary-card span,
        body.apple-ui #pipeline .summary-card small {
          display: block !important;
          font-size: 10px !important;
          line-height: 1.1 !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          margin: 0 !important;
        }
        body.apple-ui #pipeline .summary-card strong {
          display: block !important;
          font-size: 22px !important;
          line-height: 1 !important;
          margin: 2px 0 !important;
        }
        body.apple-ui #pipeline .pipeline-table { gap: 0 !important; }
        body.apple-ui #pipeline .pipeline-row {
          display: block !important;
          min-height: 0 !important;
          padding: 9px 10px !important;
          margin: 0 !important;
          border-radius: 0 !important;
          border-left: 0 !important;
          border-right: 0 !important;
          box-shadow: none !important;
          background: rgba(255,255,255,0.82) !important;
        }
        body.apple-ui #pipeline .pipeline-row > :not(.p0-compact-style):not(.block-summary) { display: none !important; }
        body.apple-ui #pipeline .pipeline-row .block-summary > :not(.pipeline-actions) { display: none !important; }
        body.apple-ui #pipeline .p0-compact-style {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) auto !important;
          gap: 8px !important;
          align-items: center !important;
          margin: 0 0 7px !important;
        }
        body.apple-ui #pipeline .p0-compact-style strong {
          display: block !important;
          font-size: 17px !important;
          line-height: 1.15 !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
        }
        body.apple-ui #pipeline .p0-compact-style span {
          display: block !important;
          color: #6e6e73 !important;
          font-size: 12px !important;
          line-height: 1.2 !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
        }
        body.apple-ui #pipeline .p0-route-pill {
          border: 1px solid rgba(0,0,0,0.1) !important;
          border-radius: 999px !important;
          padding: 4px 8px !important;
          font-size: 11px !important;
          color: #1d1d1f !important;
          background: rgba(248,248,248,0.9) !important;
          max-width: 92px !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
        }
        body.apple-ui #pipeline .block-summary { display: block !important; }
        body.apple-ui #pipeline .pipeline-actions {
          display: grid !important;
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          gap: 6px !important;
          margin: 0 !important;
        }
        body.apple-ui #pipeline .pipeline-actions [data-style-drawer="details"] { display: none !important; }
        body.apple-ui #pipeline .pipeline-actions button {
          min-height: 32px !important;
          height: 32px !important;
          padding: 0 6px !important;
          border-radius: 10px !important;
          font-size: 12px !important;
          line-height: 1 !important;
          white-space: nowrap !important;
        }
        body.apple-ui #pipeline .p0-style-delete {
          width: auto !important;
          border: 1px solid rgba(255,59,48,0.28) !important;
          color: #b42318 !important;
          background: rgba(255,59,48,0.07) !important;
          font-weight: 700 !important;
        }
      }
      body.apple-ui #pipeline .p0-style-delete { border: 1px solid rgba(255,59,48,0.28); color: #b42318; background: rgba(255,59,48,0.06); }
    `;
    document.head.appendChild(style);
  }

  function applyP0Snapshot(snapshot) {
    if (!snapshot || snapshot.source?.kind !== "supabase") return;
    ["styleList", "samples", "reviews", "issues", "users", "workers"].forEach((key) => {
      if (Array.isArray(snapshot[key])) os.data[key] = snapshot[key];
    });
    const settingKeys = ["issueLevelRules", "sampleLocations", "sampleLocationOptions", "sampleRoutes", "samplePhases", "routeRules", "ruleVersion", "locationTransitions", "trainingCards"];
    settingKeys.forEach((key) => { if (snapshot.settings?.[key]) os.data[key] = snapshot.settings[key]; });
    if (snapshot.gateRules) os.data.gateRules = { ...os.data.gateRules, ...snapshot.gateRules };
    if (Array.isArray(snapshot.users)) {
      os.data.departments = Array.from(new Set(snapshot.users.map((user) => user.department).filter(Boolean))).sort((a, b) => a.localeCompare(b, "zh-CN"));
      os.data.roles = Array.from(new Set(snapshot.users.map((user) => user.role).filter(Boolean))).sort((a, b) => a.localeCompare(b, "zh-CN"));
    }
    os.data.source = snapshot.source || { kind: "supabase", loadedAt: new Date().toISOString() };
    os.data.singleStyleMode = false;
    os.data.currentStyleId = snapshot.currentStyleId || os.data.styleList[0]?.id || null;
    os.data.currentReviewId = snapshot.currentReviewId || os.data.reviews.find((review) => review.styleId === os.data.currentStyleId)?.id || os.data.reviews[0]?.id || null;
  }

  function routeLabel(style) {
    return os.data.routeRules?.[style.route]?.label || os.data.sampleRoutes?.[style.route] || style.route || "路线未设";
  }

  function enhancePipelineRows() {
    document.querySelectorAll("#pipeline .pipeline-row[data-style-id]").forEach((row) => {
      const styleId = row.dataset.styleId;
      const style = os.getStyleById(styleId);
      if (style && !row.querySelector(".p0-compact-style")) {
        const compact = document.createElement("div");
        compact.className = "p0-compact-style";
        compact.innerHTML = `<div><strong>${esc(style.styleNo || "未填款号")}</strong><span>${esc(style.brand || "未填品牌")}</span></div><i class="p0-route-pill">${esc(routeLabel(style))}</i>`;
        row.insertBefore(compact, row.firstChild);
      }
      const actions = row.querySelector(".pipeline-actions") || row;
      const details = actions.querySelector('[data-style-drawer="details"]');
      if (details) details.remove();
      const prep = actions.querySelector('[data-style-drawer="prep"]');
      if (prep) prep.textContent = "准备材料";
      const review = actions.querySelector('[data-open-review]');
      if (review) review.textContent = "打开评审";
      if (!row.querySelector("[data-p0-delete-style]")) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "p0-style-delete";
        button.dataset.p0DeleteStyle = styleId;
        button.textContent = "删除";
        actions.appendChild(button);
      }
    });
  }

  async function deleteStyleFromPipeline(styleId) {
    const style = os.getStyleById(styleId);
    const label = style?.styleNo || "该款式";
    if (!window.confirm(`确认删除 ${label}？删除后列表、评审和已上传记录会一起移除。`)) return;
    try {
      await requestJson("/api/sampleos/delete-style-fast", { method: "POST", body: JSON.stringify({ styleId }) });
      os.data.styleList = os.data.styleList.filter((item) => item.id !== styleId);
      const removedSampleIds = os.data.samples.filter((sample) => sample.styleId === styleId).map((sample) => sample.id);
      const removedReviewIds = os.data.reviews.filter((review) => review.styleId === styleId).map((review) => review.id);
      os.data.samples = os.data.samples.filter((sample) => sample.styleId !== styleId);
      os.data.reviews = os.data.reviews.filter((review) => review.styleId !== styleId);
      os.data.issues = os.data.issues.filter((issue) => issue.styleId !== styleId && !removedSampleIds.includes(issue.sampleId) && !removedReviewIds.includes(issue.reviewId));
      await window.loadBackendSnapshot();
      renderAll();
      enhancePipelineRows();
      showToast("已删除款式");
    } catch (error) {
      console.error("Delete style failed", error);
      showToast(`删除失败：${error.message || "请稍后重试"}`);
    }
  }

  function installPipelineEnhancements() {
    installMobilePipelineCss();
    enhancePipelineRows();
    if (window.__sampleOsP0PipelineEnhancementsInstalled) return;
    window.__sampleOsP0PipelineEnhancementsInstalled = true;
    document.addEventListener("click", (event) => {
      const button = event.target.closest?.("[data-p0-delete-style]");
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      deleteStyleFromPipeline(button.dataset.p0DeleteStyle);
    }, true);
    const pipeline = document.querySelector("#pipeline");
    if (pipeline) new MutationObserver(() => enhancePipelineRows()).observe(pipeline, { childList: true, subtree: true });
  }

  function installPatch() {
    if (!window.SampleOSBackend || typeof os === "undefined" || typeof renderAll !== "function" || typeof collectSampleVariants !== "function") {
      window.setTimeout(installPatch, 50);
      return;
    }

    window.loadBackendSnapshot = async function loadBackendSnapshotP0() {
      const snapshot = await requestJson("/api/sampleos/snapshot-p0", { method: "GET" });
      applyP0Snapshot(snapshot);
      renderAll();
      installPipelineEnhancements();
      return true;
    };

    window.handleStyleSubmit = async function handleStyleSubmitP0(form) {
      const fields = form.elements;
      const locationOption = os.data.sampleLocationOptions.find((item) => item.id === fields.sampleLocation.value);
      const route = fields.route.value;
      const phase = fields.samplePhase.value;
      const sampleVariants = collectSampleVariants(form);
      const quantity = sampleVariants.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 1;
      const payload = {
        styleNo: fields.styleNo.value.trim(), brand: fields.brand.value, season: fields.season.value, styleName: fields.styleName.value.trim(), category: fields.category.value,
        color: sampleVariants.map((item) => item.color).filter(Boolean).join(" / "), size: sampleVariants.map((item) => item.size).filter(Boolean).join(" / "), sampleVariants,
        route, samplePhase: phase, sampleLocation: locationOption?.label || "样衣间", sampleDoneDate: fields.sampleDoneDate.value, plannedShipDate: fields.plannedShipDate.value,
        customerDueDate: fields.customerDueDate.value, versionName: os.phaseLabels[phase], highRisk: fields.highRisk.checked, syncCalendar: fields.syncCalendar.checked, quantity,
        businessOwnerId: fields.businessOwner.value, patternOwnerId: userIdByName("徐海燕"), fabricOwnerId: userIdByName("李卫红"), trimOwnerId: userIdByName("大红"), prepOwnerId: userIdByName("王部长"),
        reviewOwnerId: os.data.gateRules.sampleReviewGateOwner, finalApproverId: os.data.gateRules.finalApprover, normalDispatcherId: route === "normal" ? userIdByName("大戴") : null,
        bondingOwnerId: route === "bonding_xinchangjiang" ? userIdByName("张部长") : null, xcjDispatcherId: route === "bonding_xinchangjiang" || route === "xinchangjiang" ? userIdByName("夏红霞") : null,
      };

      try {
        const response = await requestJson("/api/sampleos/create-style-fast", { method: "POST", body: JSON.stringify(payload) });
        const result = response.result || {};
        await window.loadBackendSnapshot();
        os.data.currentStyleId = result.styleId;
        os.data.currentReviewId = result.reviewId;
        renderAll();
        installPipelineEnhancements();
        showView("pipeline");
        openStyleDrawer(result.styleId, "prep");
        showToast(result.message || (result.existing ? "该款号已存在，已打开现有款式。" : "款式已创建并同步到 Supabase，进入详情页继续补资料"));
        return true;
      } catch (error) {
        console.error("Create style sync failed", { message: error.message, status: error.status, response: error.response, request: error.request, payload });
        showToast("款式保存失败，请稍后重试或联系管理员。");
        return false;
      }
    };

    if (!window.__sampleOsP0SubmitGuardInstalled) {
      window.__sampleOsP0SubmitGuardInstalled = true;
      document.addEventListener("submit", async (event) => {
        const form = event.target.closest?.("[data-modal-form='style']");
        if (!form) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        const saved = await window.handleStyleSubmit(form);
        if (saved) { renderAll(); installPipelineEnhancements(); closeModal(); showView("pipeline"); }
      }, true);
    }

    if (!window.__sampleOsP0UploadGuardInstalled) {
      window.__sampleOsP0UploadGuardInstalled = true;
      document.addEventListener("change", (event) => {
        const input = event.target.closest?.("[data-media-upload]");
        if (!input?.files?.length) return;
        const review = os.getReviewById(os.data.currentReviewId);
        const sample = os.getSampleById(review?.sampleId);
        const style = os.getStyleById(review?.styleId || sample?.styleId);
        if (review && sample && style && isUuid(style.id) && isUuid(sample.id) && isUuid(review.id)) return;
        event.stopImmediatePropagation();
        input.value = "";
        showToast("当前款式尚未保存到数据库，无法上传媒体。");
      }, true);
    }

    installPipelineEnhancements();
    window.loadBackendSnapshot?.().catch((error) => console.error("P0 snapshot reload failed", error));
  }

  installPatch();
})();
