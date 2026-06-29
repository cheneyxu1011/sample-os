(function () {
  const data = window.sampleOSData;

  const gateLabels = {
    business_input: "业务资料",
    preparation: "前期准备",
    preparation_gate: "准备闸口",
    sample_dispatch: "派发打样",
    sample_making: "打样执行",
    sample_review_gate: "样衣评审闸口",
    shipment_decision: "寄样决策",
    completed: "已完成",
  };

  const phaseLabels = {
    first_sample: "一次样",
    second_sample: "二次样",
    third_sample: "三次样",
    sms: "销售样",
    pp: "产前样",
    qc_sample: "品质样",
    top_sample: "TOP样",
  };

  const reviewStatusLabels = {
    not_started: "未开始",
    reviewing: "评审中",
    issue_assignment: "问题归属",
    rework_verification: "整改复验",
    shipment_decision: "寄样决策",
    completed: "已完成",
  };

  const issueStatusLabels = {
    not_started: "未开始",
    in_progress: "处理中",
    pending_verification: "待验证",
    verified: "已验证",
    closed: "已关闭",
  };

  const departmentStatusLabels = {
    pass: "通过",
    needs_improvement: "需要改进",
    fail: "不通过",
    pending: "待评审",
  };

  const riskLabels = {
    normal: "正常",
    approaching_due: "临近交期",
    overdue: "已逾期",
    blocked: "阻止寄样",
    waiting_exception: "等待例外放行",
    shipped: "已寄样",
  };

  function getUser(id) {
    return data.users.find((user) => user.id === id);
  }

  function userName(id) {
    return getUser(id)?.name || "未指定";
  }

  function getStyleById(styleId) {
    return data.styleList.find((style) => style.id === styleId);
  }

  function getSampleByStyle(styleId) {
    const style = getStyleById(styleId);
    return data.samples.find((sample) => sample.styleId === styleId && sample.samplePhase === style?.samplePhase)
      || data.samples.find((sample) => sample.styleId === styleId);
  }

  function getSampleById(sampleId) {
    return data.samples.find((sample) => sample.id === sampleId);
  }

  function getActiveReviewByStyle(styleId) {
    const sample = getSampleByStyle(styleId);
    return data.reviews.find((review) => review.id === sample?.reviewId)
      || data.reviews.find((review) => review.styleId === styleId);
  }

  function getReviewById(reviewId) {
    return data.reviews.find((review) => review.id === reviewId);
  }

  function getIssuesByReview(reviewId) {
    return data.issues.filter((issue) => issue.reviewId === reviewId);
  }

  function getOpenIssues(reviewId) {
    return getIssuesByReview(reviewId).filter((issue) => issue.status !== "closed");
  }

  function isBlockingIssue(issue) {
    if (issue.status === "closed") return false;
    if (issue.level === "critical" || issue.level === "major") return true;
    return Boolean(issue.shipmentBlocking);
  }

  function getBlockingIssues(reviewId) {
    return getIssuesByReview(reviewId).filter(isBlockingIssue);
  }

  function getCurrentGate(styleId) {
    return getStyleById(styleId)?.currentGate || "business_input";
  }

  function getGateOwner(styleId) {
    const style = getStyleById(styleId);
    const ownerId = style?.currentGate === "preparation_gate"
      ? data.gateRules.preparationGateOwner
      : data.gateRules.sampleReviewGateOwner;
    return getUser(style?.gateOwner || ownerId) || getUser(ownerId);
  }

  function getFinalApprover() {
    return getUser(data.gateRules.finalApprover);
  }

  function getNextAction(styleId) {
    const style = getStyleById(styleId);
    const review = getActiveReviewByStyle(styleId);
    const blocking = review ? getBlockingIssues(review.id) : [];
    if (!style) return "等待资料";
    if (style.currentGate === "preparation_gate") return style.nextAction;
    if (blocking.length > 0) return "确认质量与工艺问题责任人";
    if (review?.status === "shipment_decision") return "评审负责人确认寄样结论";
    return style.nextAction || "等待下一步";
  }

  function getShipmentStatus(reviewId) {
    const openIssues = getOpenIssues(reviewId);
    const review = getReviewById(reviewId);
    if (review?.finalDecision === "exception_release") return { key: "exception_release", label: "例外放行", canShip: true };
    if (openIssues.some((issue) => issue.level === "critical")) return { key: "hold_shipment", label: "暂停寄样", canShip: false };
    if (openIssues.some((issue) => issue.level === "major")) return { key: "blocked", label: "阻止寄样", canShip: false };
    if (openIssues.some((issue) => issue.level === "normal")) return { key: "gate_owner_decision", label: "待评审负责人判断", canShip: false };
    if (openIssues.some((issue) => issue.level === "minor")) return { key: "can_ship_with_record", label: "可寄样，需记录", canShip: true };
    return { key: "can_ship", label: "可以寄样", canShip: true };
  }

  function getCalendarRisk(styleId) {
    const style = getStyleById(styleId);
    const review = getActiveReviewByStyle(styleId);
    const shipment = review ? getShipmentStatus(review.id) : { key: "normal" };
    if (!style) return "normal";
    if (shipment.key === "hold_shipment" || shipment.key === "blocked") return "blocked";
    if (shipment.key === "exception_release" || style.riskStatus === "waiting_exception") return "waiting_exception";
    return style.riskStatus || "normal";
  }

  function getStyleSummary(styleId) {
    const style = getStyleById(styleId);
    const sample = getSampleByStyle(styleId);
    const review = getActiveReviewByStyle(styleId);
    const openIssues = review ? getOpenIssues(review.id) : [];
    const blockingIssues = review ? getBlockingIssues(review.id) : [];
    const shipmentStatus = review ? getShipmentStatus(review.id) : { key: "not_started", label: "未开始", canShip: false };
    const ownerNames = (style?.currentOwner || []).map(userName).join(" / ") || userName(getGateOwner(styleId)?.id);
    return { style, sample, review, openIssues, blockingIssues, shipmentStatus, ownerNames, gateOwner: getGateOwner(styleId), finalApprover: getFinalApprover(), nextAction: getNextAction(styleId), calendarRisk: getCalendarRisk(styleId) };
  }

  function getStats() {
    const summaries = data.styleList.map((style) => getStyleSummary(style.id));
    return {
      activeStyles: data.styleList.filter((style) => style.currentGate !== "completed").length,
      reviewing: summaries.filter((item) => item.review?.status === "reviewing").length,
      sampleRoomCount: data.samples.filter((sample) => sample.location === "样衣间" || sample.location === "开发车间").length,
      pendingOwnerDecision: summaries.filter((item) => ["gate_owner_decision", "blocked", "hold_shipment"].includes(item.shipmentStatus.key)).length,
      blockingIssues: data.issues.filter(isBlockingIssue).length,
      waitingException: summaries.filter((item) => item.shipmentStatus.key === "exception_release" || item.style?.riskStatus === "waiting_exception").length,
    };
  }

  function closeIssue(issueId) {
    const issue = data.issues.find((item) => item.id === issueId);
    if (!issue) return;
    issue.status = "closed";
    issue.updatedAt = new Date().toISOString().slice(0, 16).replace("T", " ");
  }

  function addDemoIssue(reviewId) {
    const review = getReviewById(reviewId);
    const sample = getSampleById(review?.sampleId);
    if (!review || !sample) return;
    const id = `issue_demo_${Date.now()}`;
    data.issues.push({
      id,
      styleId: review.styleId,
      sampleId: sample.id,
      reviewId,
      title: "新增重大问题",
      description: "静态 demo 模拟新增问题后，所有页面同步刷新。",
      sourceDepartment: "品质部",
      relatedArea: "前片",
      level: "major",
      shipmentBlocking: true,
      canShipWithNote: false,
      owner: "user_zhao",
      dueDate: "2026-06-30 18:00",
      status: "not_started",
      verifier: "user_zhao",
      evidence: "手动新增",
      createdAt: "2026-06-29 10:00",
      updatedAt: "2026-06-29 10:00",
    });
    review.issueIds.push(id);
    review.timeline.push({ time: "现在", type: "red", text: "系统 · 新增重大问题，重新计算寄样状态" });
  }

  function updateSampleLocation(styleId, location) {
    const style = getStyleById(styleId);
    const sample = getSampleByStyle(styleId);
    if (style) style.sampleLocation = location;
    if (sample) {
      sample.location = location;
      sample.updatedAt = "2026-06-29 10:30";
    }
  }

  function updateSampleReviewGateOwner(userId) {
    data.gateRules.sampleReviewGateOwner = userId;
    data.styleList.forEach((style) => {
      if (style.currentGate === "sample_review_gate" || style.currentGate === "shipment_decision") style.gateOwner = userId;
    });
    data.reviews.forEach((review) => {
      if (review.status !== "not_started") review.gateOwner = userId;
    });
  }

  function validateData() {
    const warnings = [];
    data.reviews.forEach((review) => {
      review.issueIds.forEach((issueId) => {
        if (!data.issues.some((issue) => issue.id === issueId)) warnings.push(`评审 ${review.id} 找不到问题 ${issueId}`);
      });
    });
    data.issues.forEach((issue) => {
      if (!issue.owner) warnings.push(`问题 ${issue.id} 没有负责人`);
      if (isBlockingIssue(issue) && getShipmentStatus(issue.reviewId).canShip) warnings.push(`阻塞问题 ${issue.id} 没有影响寄样状态`);
    });
    data.styleList.forEach((style) => {
      if (!style.currentGate) warnings.push(`款式 ${style.styleNo} 没有当前闸口`);
    });
    data.samples.forEach((sample) => {
      if (!sample.location) warnings.push(`样衣 ${sample.id} 没有位置`);
    });
    ["preparationGateOwner", "sampleReviewGateOwner", "finalApprover"].forEach((key) => {
      if (!data.gateRules[key]) warnings.push(`闸口设置 ${key} 没有负责人`);
    });
    console.groupCollapsed("Sample OS consistency check");
    if (warnings.length) console.warn(warnings);
    else console.log("统一 mock data 检查通过");
    console.groupEnd();
    return warnings;
  }

  window.SampleOS = {
    data,
    gateLabels,
    phaseLabels,
    reviewStatusLabels,
    issueStatusLabels,
    departmentStatusLabels,
    riskLabels,
    getUser,
    userName,
    getStyleById,
    getSampleByStyle,
    getSampleById,
    getActiveReviewByStyle,
    getReviewById,
    getIssuesByReview,
    getOpenIssues,
    getBlockingIssues,
    getCurrentGate,
    getNextAction,
    getShipmentStatus,
    getCalendarRisk,
    getGateOwner,
    getFinalApprover,
    getStyleSummary,
    getStats,
    closeIssue,
    addDemoIssue,
    updateSampleLocation,
    updateSampleReviewGateOwner,
    validateData,
  };
})();
