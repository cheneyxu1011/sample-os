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
      headers: {
        "content-type": "application/json",
        ...authHeaders(),
        ...(options.headers || {}),
      },
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

  function showCreateStyleError(error) {
    const message = `${error?.message || ""} ${error?.response?.error || ""} ${error?.response?.detail || ""}`;
    if (/insert samples|insert reviews|default department review|review_department_reviews/i.test(message)) {
      showToast("款式已创建，但样衣评审任务创建失败，请联系管理员。");
      return;
    }
    showToast("款式保存失败，请稍后重试或联系管理员。");
  }

  function applyP0Snapshot(snapshot) {
    if (!snapshot || snapshot.source?.kind !== "supabase") return;
    ["styleList", "samples", "reviews", "issues", "users", "workers"].forEach((key) => {
      if (Array.isArray(snapshot[key])) os.data[key] = snapshot[key];
    });
    const settingKeys = ["issueLevelRules", "sampleLocations", "sampleLocationOptions", "sampleRoutes", "samplePhases", "routeRules", "ruleVersion", "locationTransitions", "trainingCards"];
    settingKeys.forEach((key) => {
      if (snapshot.settings?.[key]) os.data[key] = snapshot.settings[key];
    });
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

  function installPatch() {
    if (!window.SampleOSBackend || typeof os === "undefined" || typeof renderAll !== "function" || typeof collectSampleVariants !== "function") {
      window.setTimeout(installPatch, 50);
      return;
    }

    window.loadBackendSnapshot = async function loadBackendSnapshotP0() {
      const snapshot = await requestJson("/api/sampleos/snapshot-p0", { method: "GET" });
      applyP0Snapshot(snapshot);
      renderAll();
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

      try {
        const response = await requestJson("/api/sampleos/create-style-fast", { method: "POST", body: JSON.stringify(payload) });
        const result = response.result || {};
        await window.loadBackendSnapshot();
        os.data.currentStyleId = result.styleId;
        os.data.currentReviewId = result.reviewId;
        renderAll();
        showView("pipeline");
        openStyleDrawer(result.styleId, "prep");
        showToast(result.message || (result.existing ? "该款号已存在，已打开现有款式。" : "款式已创建并同步到 Supabase，进入详情页继续补资料"));
        return true;
      } catch (error) {
        console.error("Create style sync failed", { message: error.message, status: error.status, response: error.response, request: error.request, payload });
        showCreateStyleError(error);
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
        if (saved) {
          renderAll();
          closeModal();
          showView("pipeline");
        }
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

    window.loadBackendSnapshot?.().catch((error) => console.error("P0 snapshot reload failed", error));
  }

  installPatch();
})();
