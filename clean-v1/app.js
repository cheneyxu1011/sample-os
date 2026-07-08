(function () {
  const state = {
    data: null,
    selectedStyleId: null,
    styleInitFiles: {},
    editingStyleId: null,
    editingPersonId: null,
    editingBrandId: null,
    lightboxIndex: -1,
    selectedMediaId: "",
    pendingIssueContext: null,
    lightboxTool: "",
    lightboxZoomIndex: 0,
    lightboxDraftAnnotations: [],
    drawingAnnotation: null,
    selectedAnnotationId: null,
    draggingTextAnnotation: null,
    lightboxPan: { x: 0, y: 0 },
    lightboxPanning: null,
    pipelineViewMode: "cards",
    expandedRoadmaps: {},
    uploading: false,
    touchStartX: null,
    loading: false,
    settingsTab: "templates",
    reviewBrandFilter: "",
    reviewStyleFilter: "",
    calendarBrandFilter: "",
    calendarSeasonFilter: "",
    calendarStageFilter: "",
    calendarLocationFilter: "",
    calendarRouteFilter: "",
    calendarWeekOnly: false,
    calendarRiskOnly: false,
    calendarMineOnly: false,
    calendarFiltersOpen: true,
    calendarMonthOpen: false,
    documentsExpandedByStyle: {},
    localStyleDocumentsByStyle: {},
    localReviewMediaByStyle: {},
    activePreviewFile: null,
    selectedReviewTaskKeyByStyle: {},
    optionalDepartmentRoleIdsByStyle: {}
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const sidebarStorageKey = "sampleOSSidebarCollapsed";
  let sidebarPreferenceSet = false;

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

  const calendarLocationOptions = [
    { value: "", label: "全部地点" },
    { value: "新长江", label: "新长江工厂打样间" },
    { value: "事务所", label: "事务所打样间" },
    { value: "外发", label: "外发打样" },
    { value: "如东", label: "如东工厂打样间" }
  ];

  const calendarRouteOptions = [
    { value: "", label: "全部路线" },
    { value: "normal", label: "普通款式" },
    { value: "bonding", label: "压胶 / 新长江款式" },
    { value: "outsourced", label: "外发款式" },
    { value: "rudong", label: "如东工厂款式" }
  ];

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

  const styleDocumentCategories = [
    { id: "style_cover", required: true },
    { id: "customer_reference", required: true },
    { id: "measurement_table", required: true },
    { id: "tech_pack", required: false },
    { id: "bom", required: true },
    { id: "customer_comments", required: false },
    { id: "other", required: false }
  ];

  const styleDocumentCategoryIds = new Set(styleDocumentCategories.map((item) => item.id));

  const reviewMediaCategoryIds = new Set([
    "review_media",
    "front",
    "back",
    "side",
    "collar",
    "cuff",
    "hem",
    "bonding_seam",
    "pocket",
    "overall_video",
    "problem_video"
  ]);

  const mediaPartLabels = {
    front: "正面",
    back: "背面",
    side: "侧身",
    collar: "领口 / 帽口",
    cuff: "袖口",
    hem: "下摆",
    bonding_seam: "压胶缝",
    pocket: "口袋",
    other: "其他"
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

  const defaultBrands = [
    { id: "supreme", name: "SUPREME", aliases: [] },
    { id: "descente", name: "迪桑特", aliases: ["DESCENTE"] },
    { id: "salomon", name: "萨洛蒙", aliases: ["SALOMON"] }
  ];

  const defaultSampleLocations = [
    { id: "development_workshop", label: "开发车间" },
    { id: "sample_room", label: "样衣间" },
    { id: "rudong_factory", label: "如东工厂" },
    { id: "xinchangjiang_factory", label: "新长江工厂" },
    { id: "office", label: "事务所" },
    { id: "wanhang_factory", label: "万航工厂" },
    { id: "outsourcing_factory", label: "外协工厂" },
    { id: "juegang_factory", label: "掘港工厂" },
    { id: "shipped", label: "已寄出" },
    { id: "repair_pending", label: "待返修" }
  ];

  const roleTemplates = [
    { id: "business_pm", name: "Business PM / 业务负责人", type: "评审角色", stages: ["开发准备", "样衣评审"], responsibility: "确认客户邮件、TP、BOM、Comment、颜色、辅料、交期、寄样目的是否一致", permissions: ["发起开发", "补充资料", "提交意见", "创建 Issue", "申请寄样"], reviewDefault: "是", finalRelease: "否", exceptionRelease: "否", people: ["顾瑶", "顾永宏"] },
    { id: "pattern_reviewer", name: "Pattern Reviewer / 版型评审员", type: "评审角色", stages: ["样衣评审"], responsibility: "评审版型、关键尺寸、公差、结构、左右对称、纸样与实物一致性", permissions: ["提交意见", "创建尺寸/版型 Issue", "复验版型问题"], reviewDefault: "是", finalRelease: "否", exceptionRelease: "否", people: ["徐海燕"] },
    { id: "quality_reviewer", name: "Quality Reviewer / 品质评审员", type: "评审角色", stages: ["样衣评审", "整改复验"], responsibility: "确认外观、尺寸、历史问题、测试需求，判断是否存在质量阻断风险", permissions: ["提交意见", "创建质量 Issue", "复验 Issue", "提出质量判断建议"], reviewDefault: "是", finalRelease: "否", exceptionRelease: "否", people: ["大前"] },
    { id: "process_reviewer", name: "Process Reviewer / 工艺评审员", type: "评审角色", stages: ["样衣评审", "工艺验证"], responsibility: "确认缝制、压胶、无缝工艺是否可执行，是否存在量产难点或工艺风险", permissions: ["提交意见", "创建工艺 Issue", "要求工艺小样验证"], reviewDefault: "是", finalRelease: "否", exceptionRelease: "否", people: ["陈工艺"] },
    { id: "ie_reviewer", name: "IE Reviewer / IE 评审员", type: "评审角色", stages: ["样衣评审", "量产可行性评估"], responsibility: "确认工时、瓶颈、设备需求、人员配置、产能和大货节拍风险", permissions: ["提交意见", "创建 IE Issue", "提出量产可行性建议"], reviewDefault: "是", finalRelease: "否", exceptionRelease: "否", people: ["麦克"] },
    { id: "sample_feedback_owner", name: "Sample Feedback Owner / 打样反馈人", type: "流程角色", stages: ["打样完成", "样衣评审"], responsibility: "反馈实际打样过程中的资料不清、材料不齐、返工、临时改法和制作难点", permissions: ["提交意见", "创建打样异常 Issue"], reviewDefault: "是", finalRelease: "否", exceptionRelease: "否", people: ["李师傅"] },
    { id: "material_owner", name: "Material Owner / 面料负责人", type: "流程角色", stages: ["开发准备", "资料确认"], responsibility: "确认面料是否齐套、颜色/批次/缩率/预缩是否存在风险", permissions: ["面料确认", "创建面料 Issue", "更新面料状态"], reviewDefault: "否，必要时参与", finalRelease: "否", exceptionRelease: "否", people: ["李卫红"] },
    { id: "trim_owner", name: "Trim Owner / 辅料负责人", type: "流程角色", stages: ["开发准备", "资料确认"], responsibility: "确认拉链、扣具、织带、洗标、吊牌等辅料是否齐套并符合要求", permissions: ["辅料确认", "创建辅料 Issue", "更新辅料状态"], reviewDefault: "否，必要时参与", finalRelease: "否", exceptionRelease: "否", people: ["大红"] },
    { id: "preparation_gate_owner", name: "Preparation Gate Owner / 资料确认人", type: "Gate 角色", stages: ["准备闸口"], responsibility: "资料确认、推进到派发打样", permissions: ["资料确认", "推进到派发打样", "组织资料补齐"], reviewDefault: "否", finalRelease: "否", exceptionRelease: "否", people: ["王部长"] },
    { id: "sample_dispatcher", name: "Sample Dispatcher / 普通打样派发人", type: "流程角色", stages: ["打样派发"], responsibility: "根据资料确认结果分配普通打样人员", permissions: ["派发打样", "普通打样", "提交异常"], reviewDefault: "否", finalRelease: "否", exceptionRelease: "否", people: ["大戴"] },
    { id: "bonding_owner", name: "Bonding Development Owner / 压胶开发负责人", type: "路线角色", stages: ["压胶开发确认"], responsibility: "确认压胶款式是否进入新长江流程，判断压胶工艺开发风险", permissions: ["压胶开发", "创建压胶 Issue", "要求工艺验证"], reviewDefault: "压胶款默认参与", finalRelease: "否", exceptionRelease: "否", people: ["张部长"] },
    { id: "xinchangjiang_dispatcher", name: "Xinchangjiang Dispatcher / 新长江派发人", type: "路线角色", stages: ["新长江派发"], responsibility: "负责新长江打样人员分配和现场执行状态更新", permissions: ["新长江派发", "派发打样", "提交异常"], reviewDefault: "否", finalRelease: "否", exceptionRelease: "否", people: ["夏红霞"] },
    { id: "sample_review_gate_owner", name: "Sample Review Gate Owner / 样衣评审负责人", type: "Gate 角色", stages: ["样衣评审", "寄样决策"], responsibility: "组织样衣评审、确认 Issue 等级、判断是否阻止寄样、做最终寄样结论", permissions: ["确认问题等级", "复验问题", "最终放行", "阻止寄样"], reviewDefault: "是", finalRelease: "是", exceptionRelease: "否", people: ["大前"] },
    { id: "final_approver", name: "Final Approver / 例外放行审批人", type: "审批角色", stages: ["例外放行", "重大争议"], responsibility: "例外放行、重大争议裁决", permissions: ["例外放行", "争议裁决"], reviewDefault: "否，仅例外时出现", finalRelease: "仅例外放行", exceptionRelease: "是", people: ["杨总"] },
    { id: "production_reviewer", name: "Production Owner / 生产负责人", type: "可选评审角色", stages: ["量产可行性评估"], responsibility: "从大货现场角度确认样衣工艺是否能稳定复制", permissions: ["提交意见", "创建量产风险 Issue"], reviewDefault: "可选，压胶/复杂款建议参与", finalRelease: "否", exceptionRelease: "否", people: [] },
    { id: "measurement_reviewer", name: "Measurement Reviewer / 尺寸测量员", type: "可选评审角色", stages: ["样衣评审", "复验"], responsibility: "按统一量法测量关键尺寸，记录实测数据，标记超公差部位", permissions: ["提交尺寸复核", "创建尺寸 Issue", "上传测量表", "复验尺寸整改"], reviewDefault: "可选，尺寸风险款建议参与", finalRelease: "否", exceptionRelease: "否", people: [] },
    { id: "lab_testing_owner", name: "Lab & Testing Owner / 测试负责人", type: "可选评审角色", stages: ["测试确认", "压胶/功能样评审"], responsibility: "判断是否需要洗后、拉力、剥离、防水、色牢度等测试", permissions: ["创建测试 Issue", "上传测试报告", "确认测试结果", "要求复验"], reviewDefault: "可选，压胶/功能款建议参与", finalRelease: "否", exceptionRelease: "否", people: [] },
    { id: "sample_keeper", name: "Sample Keeper / 样衣管理员", type: "流程角色", stages: ["样衣位置管理"], responsibility: "维护样衣位置，确认当前持有人，记录样衣流转", permissions: ["更新样衣位置", "上传位置记录", "确认已寄出"], reviewDefault: "否", finalRelease: "否", exceptionRelease: "否", people: [] },
    { id: "shipment_owner", name: "Sample Shipment Owner / 寄样负责人", type: "流程角色", stages: ["寄样执行"], responsibility: "执行寄样，填写快递单号，更新样衣状态", permissions: ["执行寄样", "填写快递单号", "更新样衣位置", "上传寄样凭证"], reviewDefault: "否", finalRelease: "否", exceptionRelease: "否", people: [] },
    { id: "document_controller", name: "Document Controller / 资料版本管理员", type: "流程角色", stages: ["资料管理"], responsibility: "维护 TP、BOM、纸样、客户 Comment 资料版本", permissions: ["上传资料", "标记资料版本", "作废旧版本", "创建资料不一致 Issue"], reviewDefault: "否", finalRelease: "否", exceptionRelease: "否", people: [] }
  ];

  const hiddenRoleTemplateIds = new Set([
    "sample_dispatcher",
    "preparation_gate_owner",
    "xinchangjiang_dispatcher",
    "final_approver",
    "shipment_owner",
    "document_controller"
  ]);

  const defaultUsers = [
    { id: "default_guyao", name: "顾瑶", department: "业务部", enabled: true, role: "business_pm", scope: ["萨洛蒙", "样衣评审"] },
    { id: "default_guyonghong", name: "顾永宏", department: "业务部", enabled: true, role: "business_pm", scope: ["萨洛蒙", "样衣评审"] },
    { id: "default_wang", name: "王部长", department: "开发管理", enabled: true, role: "preparation_gate_owner", scope: ["普通打样", "样衣评审"] },
    { id: "default_daqian", name: "大前", department: "品质部", enabled: true, role: "quality_reviewer,sample_review_gate_owner", scope: ["萨洛蒙", "样衣评审"] },
    { id: "default_yang", name: "杨总", department: "管理层", enabled: true, role: "final_approver", isFinalApprover: true, scope: ["例外放行"] },
    { id: "default_zhang", name: "张部长", department: "压胶开发", enabled: true, role: "bonding_owner", scope: ["压胶 / 新长江"] },
    { id: "default_xia", name: "夏红霞", department: "新长江", enabled: true, role: "xinchangjiang_dispatcher", scope: ["压胶 / 新长江"] },
    { id: "default_xu", name: "徐海燕", department: "版型部", enabled: true, role: "pattern_reviewer", scope: ["样衣评审"] },
    { id: "default_process", name: "陈工艺", department: "工艺部", enabled: true, role: "process_reviewer", scope: ["样衣评审"] },
    { id: "default_ie", name: "麦克", department: "IE 部", enabled: true, role: "ie_reviewer", scope: ["样衣评审"] },
    { id: "default_sample", name: "李师傅", department: "打样部", enabled: true, role: "sample_feedback_owner", scope: ["普通打样", "样衣评审"] },
    { id: "default_material", name: "李卫红", department: "面料组", enabled: true, role: "material_owner", scope: ["普通打样"] },
    { id: "default_trim", name: "大红", department: "辅料组", enabled: true, role: "trim_owner", scope: ["普通打样"] },
    { id: "default_dispatch", name: "大戴", department: "样衣间", enabled: true, role: "sample_dispatcher,sample_keeper", scope: ["普通打样"] }
  ];

  const ownerRoleMap = {
    businessOwner: ["business_pm"],
    sampleOwner: ["sample_keeper", "sample_feedback_owner"],
    gateOwner: ["sample_review_gate_owner"],
    finalApprover: ["final_approver"],
    patternOwner: ["pattern_reviewer"],
    processOwner: ["process_reviewer"],
    qcOwner: ["quality_reviewer"],
    bondingOwner: ["bonding_owner"]
  };

  const legacyOwnerFieldByRole = {
    business_pm: "businessOwner",
    sample_keeper: "sampleOwner",
    sample_feedback_owner: "sampleOwner",
    sample_review_gate_owner: "gateOwner",
    final_approver: "finalApprover",
    pattern_reviewer: "patternOwner",
    process_reviewer: "processOwner",
    quality_reviewer: "qcOwner",
    bonding_owner: "bondingOwner"
  };

  const departmentRoleOwnerMap = {
    "业务部": "business_pm",
    "打版组": "pattern_reviewer",
    "品质部": "quality_reviewer",
    "工艺部": "process_reviewer",
    "IE 部": "ie_reviewer",
    "IE部": "ie_reviewer",
    "打样部": "sample_feedback_owner"
  };

  const departmentByRoleId = {
    business_pm: "业务部",
    pattern_reviewer: "打版组",
    quality_reviewer: "品质部",
    process_reviewer: "工艺部",
    ie_reviewer: "IE 部",
    sample_feedback_owner: "打样部",
    sample_review_gate_owner: "样衣评审负责人"
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

  function allUsers() {
    const realUsers = state.data?.users || [];
    const byName = new Map();
    defaultUsers.forEach((user) => byName.set(user.name, { ...user, isDefaultUser: true }));
    realUsers.forEach((user) => byName.set(user.name, { ...user, isDefaultUser: false }));
    return Array.from(byName.values());
  }

  function userRoleIds(user) {
    if (Array.isArray(user.roleIds)) return user.roleIds;
    if (Array.isArray(user.roles)) return user.roles;
    return String(user.role || "")
      .split(/[,\s/]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function userScopes(user) {
    return Array.isArray(user.scope) ? user.scope.filter(Boolean) : [];
  }

  function roleShortName(role) {
    return role?.name?.split(" / ").pop() || role?.name || "";
  }

  function roleById(roleId) {
    return activeRoleTemplates().find((role) => role.id === roleId) || roleTemplates.find((role) => role.id === roleId);
  }

  function isDefaultReviewRole(role) {
    return String(role?.reviewDefault || "").trim() === "是";
  }

  function hasConfiguredRoleTemplates() {
    return Array.isArray(state.data?.settings?.roleTemplates);
  }

  function activeRoleTemplates() {
    const configured = state.data?.settings?.roleTemplates;
    const source = Array.isArray(configured) && configured.length ? configured : roleTemplates;
    return source
      .filter((role) => !hiddenRoleTemplateIds.has(role.id))
      .map((role) => ({
        ...role,
        stages: Array.isArray(role.stages) ? role.stages : [],
        permissions: Array.isArray(role.permissions) ? role.permissions : [],
        people: Array.isArray(role.people) ? role.people : []
      }));
  }

  function serializeRoleTemplates(templates = activeRoleTemplates()) {
    return templates.map((role) => ({
      id: role.id,
      name: role.name,
      type: role.type,
      stages: role.stages || [],
      responsibility: role.responsibility || "",
      permissions: role.permissions || [],
      reviewDefault: role.reviewDefault || "否",
      finalRelease: role.finalRelease || "否",
      exceptionRelease: role.exceptionRelease || "否",
      people: role.people || []
    }));
  }

  function assignedRolesForUser(user) {
    if (hasConfiguredRoleTemplates()) {
      const ids = userRoleIds(user);
      return activeRoleTemplates().filter((role) => role.people.includes(user.name) || ids.includes(role.id));
    }
    const ids = userRoleIds(user);
    const explicit = activeRoleTemplates().filter((role) => ids.includes(role.id));
    if (explicit.length) return explicit;
    return activeRoleTemplates().filter((role) => role.people.includes(user.name));
  }

  function assignedUsersForRole(roleId) {
    return allUsers().filter((user) => assignedRolesForUser(user).some((role) => role.id === roleId));
  }

  function routeScopeLabels(route) {
    const label = routeLabels[route] || route || "";
    if (route === "bonding_xinchangjiang") return ["压胶 / 新长江", "压胶路线", label];
    return ["普通打样", label];
  }

  function personMatchesContext(user, brand, route) {
    const scopes = userScopes(user);
    if (!scopes.length) return true;
    const brandOk = !brand || scopes.includes(brand) || scopes.includes("样衣评审") || scopes.includes("全部品牌");
    const routeLabelsForStyle = routeScopeLabels(route);
    const routeOk = routeLabelsForStyle.some((label) => scopes.includes(label)) || scopes.includes("样衣评审") || scopes.includes("全部路线");
    return brandOk && routeOk;
  }

  function ownerOptionsForRoles(roleIds, brand, route) {
    const roleSet = new Set(roleIds);
    const users = allUsers().filter((user) => {
      if (user.enabled === false) return false;
      const hasRole = assignedRolesForUser(user).some((role) => roleSet.has(role.id));
      return hasRole && personMatchesContext(user, brand, route);
    });
    if (users.length) return users;
    return allUsers().filter((user) => {
      if (user.enabled === false) return false;
      return assignedRolesForUser(user).some((role) => roleSet.has(role.id));
    });
  }

  function selectedValuesFromForm(form) {
    const roleOwners = {};
    $$("[data-role-owner-select]").forEach((select) => {
      if (select.value) roleOwners[select.dataset.roleId] = select.value;
    });
    return {
      roleOwners,
      ...Object.fromEntries(Object.keys(ownerRoleMap).map((name) => [name, form.elements[name]?.value || ""]))
    };
  }

  function populateOwnerSelects(values = {}) {
    const form = $("#style-form");
    if (!form) return;
    const brand = form.elements.brand?.value || "";
    const route = form.elements.route?.value || "normal";
    const defaults = activeRoleTemplates().filter(isDefaultReviewRole);
    const optional = activeRoleTemplates().filter((role) => !isDefaultReviewRole(role));
    const roleOwners = values.roleOwners || {};
    const selectedForRole = (role, users, autoDefault) => {
      const legacyName = legacyOwnerFieldByRole[role.id];
      const current = roleOwners[role.id] || values[legacyName] || "";
      if (current) return current;
      return autoDefault ? users[0]?.name || "" : "";
    };
    const roleField = (role, autoDefault) => {
      const users = ownerOptionsForRoles([role.id], brand, route);
      const current = selectedForRole(role, users, autoDefault);
      const options = users.map((user) => `<option value="${esc(user.name)}">${esc(user.name)} / ${esc(user.department || "未设置")}</option>`).join("");
      const saved = current && !users.some((user) => user.name === current) ? `<option value="${esc(current)}">${esc(current)} / 已保存</option>` : "";
      return `
        <label>${esc(roleShortName(role))}
          <select name="roleOwner_${esc(role.id)}" data-role-owner-select data-role-id="${esc(role.id)}" data-legacy-owner="${esc(legacyOwnerFieldByRole[role.id] || "")}">
            <option value="">${autoDefault ? "未指定" : "按需添加"}</option>
            ${options}
            ${saved}
          </select>
        </label>
      `;
    };
    $("#default-owner-grid").innerHTML = defaults.map((role) => roleField(role, true)).join("");
    $("#optional-owner-grid").innerHTML = optional.map((role) => roleField(role, false)).join("");
    $$("[data-role-owner-select]").forEach((select) => {
      const role = roleById(select.dataset.roleId);
      const users = ownerOptionsForRoles([select.dataset.roleId], brand, route);
      select.value = selectedForRole(role, users, isDefaultReviewRole(role));
    });
    const hasOptionalValue = optional.some((role) => {
      const legacyName = legacyOwnerFieldByRole[role.id];
      return Boolean(roleOwners[role.id] || values[legacyName]);
    });
    setOptionalOwnerPanelVisible(hasOptionalValue);
  }

  function setOptionalOwnerPanelVisible(visible) {
    const panel = $("#optional-owner-panel");
    const button = $("#toggle-optional-owners");
    if (!panel || !button) return;
    panel.hidden = !visible;
    button.textContent = visible ? "收起按需参与" : "添加按需参与";
    button.setAttribute("aria-expanded", String(visible));
  }

  function roleOwnersFromForm() {
    const roleOwners = {};
    $$("[data-role-owner-select]").forEach((select) => {
      const roleId = select.dataset.roleId;
      if (roleId && select.value) roleOwners[roleId] = select.value;
    });
    return roleOwners;
  }

  function legacyOwnersFromRoleOwners(roleOwners) {
    const pick = (...roleIds) => roleIds.map((roleId) => roleOwners[roleId]).find(Boolean) || "";
    return {
      businessOwner: pick("business_pm"),
      sampleOwner: pick("sample_keeper", "sample_feedback_owner"),
      gateOwner: pick("sample_review_gate_owner"),
      finalApprover: pick("final_approver") || "杨总",
      patternOwner: pick("pattern_reviewer"),
      processOwner: pick("process_reviewer"),
      qcOwner: pick("quality_reviewer"),
      bondingOwner: pick("bonding_owner")
    };
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

  function currentStyleKey() {
    return currentStyle()?.id || state.editingStyleId || "__draft__";
  }

  function localStyleDocuments(styleId = currentStyleKey()) {
    return state.localStyleDocumentsByStyle[styleId] || [];
  }

  function localReviewMedia(styleId = currentStyleKey()) {
    return state.localReviewMediaByStyle[styleId] || [];
  }

  function canonicalFileType(item = {}) {
    const mime = String(item.mimeType || item.fileType || "");
    const name = String(item.fileName || item.name || item.label || "").toLowerCase();
    if (mime.startsWith("image/") || /\.(png|jpe?g|gif|webp|avif|heic)$/.test(name)) return "image";
    if (mime.startsWith("video/") || /\.(mp4|mov|webm|m4v)$/.test(name)) return "video";
    if (mime.includes("pdf") || /\.pdf$/.test(name)) return "pdf";
    if (/spreadsheet|excel|csv/.test(mime) || /\.(xls|xlsx|csv)$/.test(name)) return "excel";
    if (/word|document/.test(mime) || /\.(doc|docx)$/.test(name)) return "word";
    return "file";
  }

  function fileTypeLabel(item = {}) {
    const labels = { image: "图片", video: "视频", pdf: "PDF", excel: "Excel", word: "Word", file: "附件" };
    return labels[canonicalFileType(item)] || "附件";
  }

  function fileIcon(item = {}) {
    const icons = { image: "IMG", video: "VID", pdf: "PDF", excel: "XLS", word: "DOC", file: "FILE" };
    return icons[canonicalFileType(item)] || "FILE";
  }

  function formatFileSize(size) {
    const value = Number(size || 0);
    if (!value) return "大小未知";
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / 1024 / 1024).toFixed(1)} MB`;
  }

  function shortDate(value) {
    const text = dateText(value);
    return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(5, 10) : text;
  }

  function normalizeUploadedFile(item, fallback = {}) {
    const category = item.category || categoryFromLabel(item) || fallback.category || "other";
    return {
      id: String(item.id || fallback.id || `file_${Date.now()}`),
      styleId: item.styleId || fallback.styleId || "",
      reviewId: item.reviewId || fallback.reviewId || "",
      category,
      fileName: item.fileName || mediaNameForEdit(item) || "已上传文件",
      fileType: item.fileType || item.mimeType || "",
      mimeType: item.mimeType || item.fileType || "",
      fileSize: item.fileSize || item.size || 0,
      url: item.url || "",
      uploadedBy: item.uploadedBy || fallback.uploadedBy || "大前",
      uploadedAt: item.uploadedAt || fallback.uploadedAt || "",
      isMainImage: Boolean(item.isMainImage || category === "style_cover"),
      source: item.source || fallback.source || "snapshot",
      raw: item
    };
  }

  function styleDocumentList(style = currentStyle(), sample = currentSample()) {
    const snapshotDocs = (sample?.mediaList || [])
      .map((item) => normalizeUploadedFile(item, { styleId: style?.id || "", uploadedBy: item.uploadedBy || "系统" }))
      .filter((item) => styleDocumentCategoryIds.has(item.category));
    const localDocs = localStyleDocuments(style?.id || currentStyleKey());
    return [...snapshotDocs, ...localDocs];
  }

  function reviewMediaList() {
    const style = currentStyle();
    const sample = currentSample();
    const review = currentReview();
    const snapshotMedia = (sample?.mediaList || [])
      .map((item) => normalizeUploadedFile(item, { styleId: style?.id || "", reviewId: review?.id || "", uploadedBy: item.uploadedBy || "系统" }))
      .filter((item) => !styleDocumentCategoryIds.has(item.category) && (reviewMediaCategoryIds.has(item.category) || !isStyleCoverMedia(item)));
    return [...snapshotMedia, ...localReviewMedia(style?.id || currentStyleKey())];
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

  function roleOwnerText(style, roleId) {
    const owners = style?.owners || style?.profile?.owners || {};
    const roleOwners = owners.roleOwners || {};
    const legacyName = legacyOwnerFieldByRole[roleId];
    return roleOwners[roleId] || owners[legacyName] || "";
  }

  function uniqueNames(names) {
    return Array.from(new Set(names.map((name) => String(name || "").trim()).filter(Boolean).filter((name) => name !== "未指定")));
  }

  function roleOwnerNames(style, roleId, row = {}) {
    const role = roleById(roleId);
    const selected = roleOwnerText(style, roleId);
    const assigned = assignedUsersForRole(roleId).map((user) => user.name);
    const templatePeople = Array.isArray(role?.people) ? role.people : [];
    return uniqueNames([selected, row.reviewerName, userName(row.reviewer), ...templatePeople, ...assigned]);
  }

  function departmentReviewerNames(row, style) {
    const roleId = row.roleId || departmentRoleOwnerMap[row.department] || "";
    return roleId ? roleOwnerNames(style, roleId, row) : uniqueNames([row.reviewerName, userName(row.reviewer)]);
  }

  function reviewerChips(names) {
    const list = uniqueNames(names);
    return list.length
      ? `<span class="reviewer-chips">${list.map((name) => `<i>${esc(name)}</i>`).join("")}</span>`
      : `<span class="muted-inline">未指定</span>`;
  }

  function roleForDepartmentRow(row) {
    const roleId = row.roleId || departmentRoleOwnerMap[row.department] || "";
    return roleById(roleId);
  }

  function departmentRowsForReview(review, style) {
    const savedRows = Array.isArray(review?.departmentReviews) ? review.departmentReviews : [];
    const rowsByRole = new Map();
    const rowsByDepartment = new Map();
    const prepared = savedRows.map((row) => {
      const roleId = row.roleId || departmentRoleOwnerMap[row.department] || "";
      const role = roleById(roleId);
      const next = {
        ...row,
        roleId,
        role: row.role || roleShortName(role) || "评审员",
        responsibility: row.responsibility || role?.responsibility || ""
      };
      if (roleId) rowsByRole.set(roleId, next);
      rowsByDepartment.set(row.department, next);
      return next;
    });
    const neededRoleIds = new Set([
      ...activeRoleTemplates().filter(isDefaultReviewRole).map((role) => role.id),
      ...(state.optionalDepartmentRoleIdsByStyle[style?.id || ""] || [])
    ]);
    activeRoleTemplates().forEach((role) => {
      if (!neededRoleIds.has(role.id)) return;
      const department = departmentByRoleId[role.id] || roleShortName(role);
      if (rowsByRole.has(role.id) || rowsByDepartment.has(department)) return;
      prepared.push({
        id: `virtual_${role.id}`,
        isVirtual: true,
        roleId: role.id,
        department,
        role: roleShortName(role),
        reviewer: null,
        reviewerName: "",
        status: "pending",
        opinion: "",
        focusTags: [],
        responsibility: role.responsibility || ""
      });
    });
    const order = new Map(activeRoleTemplates().map((role, index) => [role.id, index]));
    return prepared.sort((a, b) => {
      const ai = order.has(a.roleId) ? order.get(a.roleId) : 999;
      const bi = order.has(b.roleId) ? order.get(b.roleId) : 999;
      return ai - bi || String(a.department).localeCompare(String(b.department), "zh-Hans-CN");
    });
  }

  function optionalDepartmentRoles(review) {
    const existing = new Set(departmentRowsForReview(review, currentStyle()).map((row) => row.roleId).filter(Boolean));
    return activeRoleTemplates().filter((role) => !isDefaultReviewRole(role) && !existing.has(role.id));
  }

  function reviewCardPlaceholder(row) {
    const role = roleForDepartmentRow(row);
    return row.responsibility || role?.responsibility || `输入${row.department}评审意见`;
  }

  function currentReviewerName(style = currentStyle(), review = currentReview()) {
    const gateOwner = textOwner(style, review, "gateOwner", "");
    if (gateOwner && gateOwner !== "未指定") return gateOwner;
    return roleOwnerNames(style, "quality_reviewer")[0] || "大前";
  }

  function reviewTaskKey(row, index = 0) {
    return row?.roleId || row?.id || `${row?.department || "department"}_${index}`;
  }

  function selectedReviewTaskKey(style = currentStyle()) {
    return state.selectedReviewTaskKeyByStyle[style?.id || ""] || "";
  }

  function myDepartmentRow(rows, style, review) {
    const selectedKey = selectedReviewTaskKey(style);
    const selectedRow = selectedKey ? rows.find((row, index) => reviewTaskKey(row, index) === selectedKey) : null;
    if (selectedRow) return selectedRow;
    const me = currentReviewerName(style, review);
    const preferred = rows.find((row) => row.roleId === "quality_reviewer" && departmentReviewerNames(row, style).includes(me));
    return preferred || rows.find((row) => departmentReviewerNames(row, style).includes(me)) || rows[0] || null;
  }

  function blockingIssueCount() {
    return currentIssues().filter(isBlocking).length;
  }

  function releaseStatusCopy(shipment, issues = currentIssues()) {
    const blockers = issues.filter(isBlocking).length;
    if (shipment.release === "ready_to_send") return { title: "当前可寄样", reason: "无阻塞项", tone: "ok" };
    if (blockers) return { title: "当前不可寄样", reason: `存在 ${blockers} 个 Blocking Issue`, tone: "blocked" };
    const rawReason = releaseLabels[shipment.release] || shipment.risk;
    return {
      title: "当前不可寄样",
      reason: String(rawReason || "").replace(/^禁止寄样：/, ""),
      tone: shipment.tone === "red" ? "blocked" : "pending"
    };
  }

  function issueCountForDepartment(department) {
    return currentIssues().filter((issue) => issue.sourceDepartment === department).length;
  }

  function pipelineIssueCounts(issues = []) {
    const openIssues = issues.filter((issue) => issue.status !== "closed");
    const blockingIssues = issues.filter(isBlocking);
    const criticalIssues = blockingIssues.filter((issue) => issue.level === "critical");
    const normalIssues = openIssues.filter((issue) => issue.level === "normal");
    return { open: openIssues.length, blocking: blockingIssues.length, critical: criticalIssues.length, normal: normalIssues.length };
  }

  function pipelineStatus(style, sample, review, issues, shipment) {
    const counts = pipelineIssueCounts(issues);
    if (counts.critical) {
      return {
        label: "暂停寄样｜严重 Issue 未复验",
        tone: "critical",
        riskLevel: "严重风险",
        blockerType: "严重 Issue",
        owner: textOwner(style, review, "gateOwner", "未指定")
      };
    }
    if (counts.blocking) {
      return {
        label: `样衣评审阻塞｜${counts.blocking} 个 Blocking Issue`,
        tone: "blocked",
        riskLevel: "高风险",
        blockerType: "Issue 阻塞",
        owner: textOwner(style, review, "gateOwner", "未指定")
      };
    }
    if (shipment.release === "blocked_by_preparation") {
      return {
        label: "准备闸口未完成｜资料未齐",
        tone: "pending",
        riskLevel: "资料风险",
        blockerType: "资料未齐",
        owner: textOwner(style, review, "preparationGateOwner", "王部长")
      };
    }
    if (shipment.release === "overdue_pending_confirm") {
      return {
        label: "待负责人判断｜交期逾期",
        tone: "pending",
        riskLevel: "交期风险",
        blockerType: "交期逾期",
        owner: textOwner(style, review, "gateOwner", "未指定")
      };
    }
    if (shipment.release === "blocked_by_owner_missing") {
      return {
        label: "待 Gate Owner 判断",
        tone: "review",
        riskLevel: "责任人风险",
        blockerType: "待负责人判断",
        owner: textOwner(style, review, "gateOwner", "未指定")
      };
    }
    if (counts.normal) {
      return {
        label: "待 Gate Owner 判断",
        tone: "review",
        riskLevel: "一般风险",
        blockerType: "待负责人判断",
        owner: textOwner(style, review, "gateOwner", "未指定")
      };
    }
    if (shipment.release === "ready_to_send") {
      return {
        label: "当前可寄样",
        tone: "ok",
        riskLevel: "低风险",
        blockerType: "无卡点",
        owner: textOwner(style, review, "gateOwner", "未指定")
      };
    }
    return {
      label: releaseLabels[shipment.release] || shipment.risk || "待确认",
      tone: shipment.tone === "red" ? "blocked" : "pending",
      riskLevel: shipment.risk || "待确认",
      blockerType: departmentReviewIncomplete(review) ? "部门评审未完成" : "待负责人判断",
      owner: textOwner(style, review, "gateOwner", "未指定")
    };
  }

  function pipelineOverview() {
    const styles = state.data?.styleList || [];
    const summary = styles.reduce((acc, style) => {
      const sample = state.data?.samples?.find((item) => item.styleId === style.id);
      const review = state.data?.reviews?.find((item) => item.styleId === style.id || item.sampleId === sample?.id);
      const issues = (state.data?.issues || []).filter((issue) => issue.styleId === style.id || issue.sampleId === sample?.id || issue.reviewId === review?.id);
      const shipment = computeShipmentState(style, sample, review, issues);
      if (shipment.release !== "ready_to_send") acc.blocked += 1;
      if (shipment.release === "blocked_by_preparation") acc.preparation += 1;
      if (shipment.release === "overdue_pending_confirm") acc.overdue += 1;
      return acc;
    }, { blocked: 0, preparation: 0, overdue: 0 });
    return `当前风险：${summary.blocked} 个款式不可寄样｜${summary.preparation} 个款式资料未齐｜${summary.overdue} 个款式交期逾期`;
  }

  function calendarRiskSummary(entries = calendarEntries(state.data?.styleList || [])) {
    const summary = entries.reduce((acc, entry) => {
      if (entry.shipment.release !== "ready_to_send") acc.blocked += 1;
      if (entry.shipment.release === "blocked_by_preparation") acc.preparation += 1;
      if (entry.shipment.release === "overdue_pending_confirm") acc.overdue += 1;
      if (entry.daysUntil >= 0 && entry.daysUntil <= 7) acc.near += 1;
      if (entry.shipment.release === "pending_final_approval") acc.exception += 1;
      return acc;
    }, { blocked: 0, preparation: 0, overdue: 0, near: 0, exception: 0 });
    if (summary.blocked || summary.overdue) {
      return `当前风险：${summary.blocked} 款不可寄样｜${summary.preparation} 款资料未齐｜${summary.overdue} 款交期逾期`;
    }
    return `当前风险：${summary.preparation} 款资料未齐｜${summary.near} 款交期临近｜${summary.exception} 款待例外放行`;
  }

  function daysUntilDate(dateKey) {
    if (!dateKey) return null;
    const [year, month, day] = dateKey.split("-").map(Number);
    const target = new Date(year, month - 1, day);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.floor((target - today) / 86400000);
  }

  function isThisWeekDate(dateKey) {
    if (!dateKey) return false;
    const [year, month, day] = dateKey.split("-").map(Number);
    const target = new Date(year, month - 1, day);
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return target >= start && target <= end;
  }

  function calendarRouteMatches(style, routeFilter) {
    if (!routeFilter) return true;
    const raw = `${style.route || ""} ${routeLabel(style)}`.toLowerCase();
    if (routeFilter === "bonding") return /bonding|压胶|新长江/.test(raw);
    if (routeFilter === "outsourced") return /outsourced|外发/.test(raw);
    if (routeFilter === "rudong") return /rudong|如东/.test(raw);
    if (routeFilter === "normal") return /normal|普通/.test(raw);
    return raw.includes(routeFilter);
  }

  function calendarLocationMatches(entry, locationFilter) {
    if (!locationFilter) return true;
    return String(entry.location || "").includes(locationFilter);
  }

  function calendarOwnedByMe(entry) {
    const me = currentReviewerName(entry.style, entry.review);
    const roleNames = activeRoleTemplates().flatMap((role) => roleOwnerNames(entry.style, role.id));
    return uniqueNames([entry.owner, textOwner(entry.style, entry.review, "gateOwner", ""), ...roleNames]).includes(me);
  }

  function calendarTone(entry) {
    if (entry.counts.critical || entry.shipment.release === "overdue_pending_confirm") return "blocked";
    if (entry.counts.blocking || entry.shipment.release === "blocked_by_issue") return "blocked";
    if (entry.shipment.release === "ready_to_send") return "ok";
    if (entry.style.currentGate === "sample_review_gate" || entry.review?.status === "reviewing") return "review";
    if (entry.shipment.release === "blocked_by_preparation" || entry.shipment.release === "blocked_by_owner_missing") return "pending";
    return "neutral";
  }

  function calendarRiskLabel(entry) {
    if (entry.counts.critical) return "严重 Issue";
    if (entry.shipment.release === "overdue_pending_confirm") return "交期逾期";
    if (entry.counts.blocking) return `${entry.counts.blocking} 个阻塞 Issue`;
    if (entry.shipment.release === "blocked_by_preparation") return "资料未齐";
    if (entry.shipment.release === "blocked_by_owner_missing") return "待负责人判断";
    if (entry.shipment.release === "blocked_by_department_review") return "部门未完成";
    if (entry.shipment.release === "ready_to_send") return "可寄样";
    if (entry.style.currentGate === "sample_review_gate" || entry.review?.status === "reviewing") return "评审中";
    return "未开始";
  }

  function calendarEntries(styles = state.data?.styleList || []) {
    return styles.map((style) => {
      const sample = state.data?.samples?.find((item) => item.styleId === style.id);
      const review = state.data?.reviews?.find((item) => item.styleId === style.id || item.sampleId === sample?.id);
      const issues = (state.data?.issues || []).filter((issue) => issue.styleId === style.id || issue.sampleId === sample?.id || issue.reviewId === review?.id);
      const shipment = computeShipmentState(style, sample, review, issues);
      const pipeline = pipelineStatus(style, sample, review, issues, shipment);
      const counts = pipelineIssueCounts(issues);
      const dateKey = dateOnly(plannedDate(style, sample));
      const entry = {
        style,
        sample,
        review,
        issues,
        shipment,
        pipeline,
        counts,
        dateKey,
        daysUntil: daysUntilDate(dateKey),
        location: sample?.location || style.sampleLocation || "未设置",
        owner: pipeline.owner || textOwner(style, review, "gateOwner", "未指定"),
        nextAction: shipment.nextStep || "确认下一步"
      };
      entry.tone = calendarTone(entry);
      entry.riskLabel = calendarRiskLabel(entry);
      return entry;
    }).filter((entry) => entry.dateKey);
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
    const style = state.data?.styleList?.find((item) => item.id === sample?.styleId) || currentStyle();
    return styleDocumentList(style, sample).some((item) => item.category === category);
  }

  function preparationIncomplete(style, sample) {
    const documents = styleDocumentList(style, sample);
    const missingRequired = styleDocumentCategories
      .filter((item) => item.required)
      .some((item) => !documents.some((doc) => doc.category === item.id));
    if (missingRequired) return true;
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
    return false;
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
    if (/^(款式主图|款式图|样衣正面图)(\s|·|$)/.test(label)) return "style_cover";
    if (/^正面(\s|·|$)/.test(label)) return "front";
    return item?.category || item?.mediaCategory || item?.fileCategory || "";
  }

  function readableMediaLabel(item) {
    const label = String(item?.label || item?.fileName || "");
    return label.replace(/^\[[a-z_]+\]\s*/i, "").replace(/^[a-z_]+:\s*/i, "") || item?.fileName || "已上传文件";
  }

  function mediaNameForEdit(item) {
    const category = categoryFromLabel(item);
    const categoryLabel = fileCategoryLabels[category];
    const label = readableMediaLabel(item);
    return categoryLabel ? label.replace(new RegExp(`^${categoryLabel}\\s*·\\s*`), "") : label;
  }

  function labelWithCategory(item, name) {
    const category = categoryFromLabel(item);
    return category ? `[${category}] ${name}` : name;
  }

  function isStyleCoverMedia(item) {
    const category = categoryFromLabel(item);
    const label = String(item?.label || "");
    return ["style_cover", "front"].includes(category) || /^(款式主图|款式图|样衣正面图)(\s|·|$)/.test(label);
  }

  function findStyleCover(sample) {
    const style = state.data?.styleList?.find((item) => item.id === sample?.styleId) || currentStyle();
    const covers = styleDocumentList(style, sample).filter((item) => item.category === "style_cover" && item.url);
    return covers.find((item) => item.isMainImage) || covers[0];
  }

  function uploadLabel(category, file) {
    return `[${category}] ${fileCategoryLabels[category] || "评审资料"} · ${file.name}`;
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
    return allUsers().find((user) => user.id === id)?.name || id || "未指定";
  }

  function dateText(date) {
    if (!date) return "未设置";
    const value = String(date);
    return value.length >= 10 ? value.slice(0, 10) : value;
  }

  function meta(label, value) {
    return `<div class="meta"><span>${esc(label)}</span><strong>${esc(value || "未设置")}</strong></div>`;
  }

  function roadmapStatus(index, currentIndex, finalApproved) {
    if (finalApproved) return "complete";
    if (index < currentIndex) return "complete";
    if (index === currentIndex) return "current";
    return "pending";
  }

  function roadmapNodes(style, sample, review, issues, shipment) {
    const blockers = (issues || []).filter(isBlocking);
    const finalApproved = isFinalApproved(review) || shipment.release === "ready_to_send";
    const gateIndexMap = {
      business_input: 0,
      preparation_gate: 1,
      sample_dispatch_gate: 2,
      sample_making_gate: 3,
      sample_review_gate: 4,
      final_approval_gate: 7
    };
    const currentIndex = finalApproved ? 8 : (gateIndexMap[style?.currentGate] ?? (sample ? 4 : 0));
    const gateOwner = textOwner(style, review, "gateOwner", "大前");
    const prepDone = !preparationIncomplete(style, sample);
    const reviewDone = review && !departmentReviewIncomplete(review);
    const issueText = `${issues.length} 个 Issue${blockers.length ? `，${blockers.length} 个阻塞` : ""}`;
    const decisionRisk = ["blocked_by_issue", "blocked_by_department_review", "blocked_by_owner_missing", "blocked_by_preparation", "overdue_pending_confirm"].includes(shipment.release);

    const nodes = [
      { label: "建立款式", desc: style?.styleNo ? "已完成" : "待建立", tip: "款式基础资料已经建立" },
      { label: "前期准备", desc: prepDone ? "王部长确认" : "资料待补齐", tip: prepDone ? "准备资料已满足评审要求" : "需要补齐工艺单、BOM、客户资料等" },
      { label: "派发打样", desc: sample ? "已派发" : "待派发", tip: "资料确认后派发到对应打样路线" },
      { label: "打样完成", desc: sample?.location || style?.sampleLocation || "待入库", tip: "样衣完成后进入样衣间或当前所在位置" },
      { label: "样衣评审", desc: `${gateOwner}负责`, tip: "点击进入样衣评审页", action: "review" },
      { label: "问题归属", desc: issueText, tip: "点击查看质量闸口问题", action: "issues" },
      { label: "整改复验", desc: blockers.length ? "待处理" : reviewDone ? "待复核" : "未开始", tip: "阻塞问题需整改完成并复核关闭", action: "issues" },
      { label: "寄样决策", desc: finalApproved ? "可寄样" : "待判断", tip: "点击查看评审结论与最终放行", action: "final" }
    ];

    return nodes.map((node, index) => {
      let status = roadmapStatus(index, currentIndex, finalApproved);
      if (blockers.length && index >= 5) status = "risk";
      if (!blockers.length && decisionRisk && index === 7) status = "risk";
      return { ...node, status };
    });
  }

  function renderRoadmap(style, sample, review, issues, shipment) {
    const nodes = roadmapNodes(style, sample, review, issues, shipment);
    const expanded = Boolean(state.expandedRoadmaps[style.id]);
    const currentIndex = nodes.findIndex((node) => node.status === "current");
    const firstRiskIndex = nodes.findIndex((node) => node.status === "risk");
    const activeIndex = currentIndex >= 0 ? currentIndex : firstRiskIndex >= 0 ? firstRiskIndex : Math.max(0, nodes.findIndex((node) => node.status === "pending") - 1);
    const current = nodes[activeIndex] || nodes[0];
    const lastComplete = [...nodes].reverse().find((node) => node.status === "complete") || nodes[0];
    const next = nodes.slice(activeIndex + 1).find((node) => node.status !== "complete") || nodes[nodes.length - 1];
    const compactItems = [
      ["已完成", lastComplete],
      ["当前", current],
      ["下一步", next],
      ["最终", nodes[nodes.length - 1]]
    ];
    return `
      <div class="gate-roadmap" aria-label="开发路线图">
        <div class="roadmap-head">
          <strong>开发路线图</strong>
          <span>${esc(gateLabel(style.currentGate))} · ${esc(statusLabels[review?.status] || review?.status || "进行中")}</span>
        </div>
        <div class="roadmap-compact">
          ${compactItems.map(([label, node]) => `
            <button class="roadmap-compact-item ${esc(node.status)}" type="button" title="${esc(`${node.label}：${node.desc}`)}" data-roadmap-action="${esc(node.action || "")}" data-roadmap-style="${esc(style.id)}">
              <span>${esc(label)}</span>
              <strong>${esc(node.label)}</strong>
              <small>${esc(node.desc)}</small>
            </button>
          `).join("")}
        </div>
        <button class="secondary-button compact-button roadmap-toggle" type="button" data-toggle-roadmap="${esc(style.id)}">${expanded ? "收起流程" : "展开流程"}</button>
        ${expanded ? `
          <div class="roadmap-track">
            ${nodes.map((node, index) => `
              <button class="roadmap-node ${esc(node.status)}" type="button" title="${esc(`${node.label}：${node.desc}`)}" data-roadmap-action="${esc(node.action || "")}" data-roadmap-style="${esc(style.id)}">
                <span class="roadmap-dot">${node.status === "complete" ? "✓" : node.status === "risk" ? "!" : ""}</span>
                <span class="roadmap-label">${esc(index + 1)}. ${esc(node.label)}</span>
                <small>${esc(node.desc)}</small>
              </button>
            `).join("")}
          </div>
        ` : ""}
      </div>
    `;
  }

  function styleCard(style, includeAction) {
    const sample = state.data?.samples?.find((item) => item.styleId === style.id);
    const review = state.data?.reviews?.find((item) => item.styleId === style.id || item.sampleId === sample?.id);
    const issues = (state.data?.issues || []).filter((issue) => issue.styleId === style.id || issue.sampleId === sample?.id || issue.reviewId === review?.id);
    const shipment = computeShipmentState(style, sample, review, issues);
    const pipeline = pipelineStatus(style, sample, review, issues, shipment);
    const routeState = routeStatus(style);
    const issueCounts = pipelineIssueCounts(issues);
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
      <article class="style-card ${includeAction ? "pipeline-card" : "with-visual"}">
        ${visual}
        <div class="style-card-main">
          <div class="style-title">
            <h2>${esc(style.styleName)}</h2>
            <span class="badge ${esc(pipeline.tone)}">${esc(pipeline.label)}</span>
          </div>
          <p>${esc(style.brand)} / ${esc(style.styleNo)}</p>
          ${includeAction ? `
            <div class="mobile-pipeline-summary">
              <div><strong>${esc(style.styleNo || "未填款号")}</strong><span>${esc(style.brand || "未填品牌")}</span></div>
              <div class="route-tags"><i>${esc(routeLabel(style))}</i><i class="${esc(routeState.tone)}">${esc(routeState.label)}</i></div>
            </div>
            <div class="pipeline-info-grid">
              <section>
                <span>款式身份</span>
                <strong>${esc(sampleStageLabel(style.samplePhase))}</strong>
                <p>${esc(routeLabel(style))}</p>
              </section>
              <section>
                <span>当前状态</span>
                <strong>${esc(gateLabel(style.currentGate))}</strong>
                <p>${esc(pipeline.riskLevel)}</p>
              </section>
              <section>
                <span>卡点</span>
                <strong>${esc(pipeline.blockerType)}</strong>
                <p>${esc(issueCounts.blocking)} Blocking / ${esc(issueCounts.open)} 未关闭</p>
              </section>
              <section>
                <span>责任与下一步</span>
                <strong>${esc(pipeline.owner)}</strong>
                <p>${esc(shipment.nextStep)}</p>
              </section>
              <section>
                <span>关键日期</span>
                <strong>${esc(dateText(plannedDate(style, sample)))}</strong>
                <p>客户交期 ${esc(dateText(style.customerDeadline))}</p>
              </section>
            </div>
          ` : ""}
          ${!includeAction ? `
            <div class="status-strip">
              <span class="${esc(pipeline.tone)}">当前寄样状态：${esc(pipeline.label)}</span>
              <span class="${esc(pipeline.tone)}">当前风险等级：${esc(pipeline.riskLevel)}</span>
            </div>
            <div class="meta-grid">
              ${meta("季节", style.season)}
              ${meta("当前 Gate", gateLabel(style.currentGate))}
              ${meta("样品阶段", sampleStageLabel(style.samplePhase))}
              ${meta("样衣位置", sample?.location || style.sampleLocation)}
              ${meta("预计寄样", plannedDate(style, sample))}
              ${meta("客户交期", style.customerDeadline)}
              ${meta("订货会日期", style.orderMeetingDate)}
              ${meta("本轮目标", style.reviewObjective)}
              ${meta("Gate Owner", textOwner(style, review, "gateOwner", "未指定"))}
              ${meta("Final Approver", textOwner(style, review, "finalApprover", "杨总"))}
              ${meta("下一步", shipment.nextStep)}
            </div>
          ` : ""}
          ${includeAction ? renderRoadmap(style, sample, review, issues, shipment) : ""}
        </div>
        ${includeAction ? `
          <div class="pipeline-actions">
            <button class="primary-button" type="button" data-open-review="${esc(style.id)}">打开评审</button>
            <button class="secondary-button" type="button" data-open-style-materials="${esc(style.id)}">款式资料</button>
            <details class="more-actions">
              <summary>更多</summary>
              <div>
                <button class="secondary-button" type="button" data-open-style-editor="${esc(style.id)}">编辑</button>
                <button class="danger-button" type="button" data-delete-style="${esc(style.id)}">删除</button>
              </div>
            </details>
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
      if ($("#pipeline-view")?.classList.contains("active")) {
        riskPill.className = "status-pill overview";
        riskPill.textContent = pipelineOverview();
      } else if ($("#calendar-view")?.classList.contains("active")) {
        riskPill.className = "status-pill overview";
        riskPill.textContent = calendarRiskSummary(calendarEntries(state.data?.styleList || []));
      } else {
        const copy = releaseStatusCopy(shipment);
        riskPill.className = `status-pill ${copy.tone}`;
        riskPill.textContent = copy.title === "当前可寄样" ? "当前可寄样" : `${copy.title}｜原因：${copy.reason}`;
      }
    }
    if (releasePill) {
      releasePill.hidden = true;
    }
  }

  function renderPipeline() {
    const styles = state.data?.styleList || [];
    $$("[data-pipeline-view-mode]").forEach((button) => {
      button.classList.toggle("active", button.dataset.pipelineViewMode === state.pipelineViewMode);
    });
    $("#pipeline-list").classList.remove("skeleton");
    $("#pipeline-list").classList.toggle("compact-list-mode", state.pipelineViewMode === "compact");
    if (!styles.length) {
      $("#pipeline-list").innerHTML = '<div class="empty">暂无款式数据。</div>';
      return;
    }
    if (state.pipelineViewMode === "compact") {
      $("#pipeline-list").innerHTML = `
        <div class="pipeline-table" role="table" aria-label="紧凑开发流水线">
          <div class="pipeline-row pipeline-row-head" role="row">
            <span>款号</span><span>品牌</span><span>阶段</span><span>当前 Gate</span><span>状态</span><span>Blocking Issue</span><span>责任人</span><span>预计寄样</span><span>下一步</span><span>操作</span>
          </div>
          ${styles.map((style) => {
            const sample = state.data?.samples?.find((item) => item.styleId === style.id);
            const review = state.data?.reviews?.find((item) => item.styleId === style.id || item.sampleId === sample?.id);
            const issues = (state.data?.issues || []).filter((issue) => issue.styleId === style.id || issue.sampleId === sample?.id || issue.reviewId === review?.id);
            const shipment = computeShipmentState(style, sample, review, issues);
            const pipeline = pipelineStatus(style, sample, review, issues, shipment);
            const counts = pipelineIssueCounts(issues);
            return `
              <div class="pipeline-row" role="row">
                <strong>${esc(style.styleNo || "未填")}</strong>
                <span>${esc(style.brand || "未填")}</span>
                <span>${esc(sampleStageLabel(style.samplePhase))}</span>
                <span>${esc(gateLabel(style.currentGate))}</span>
                <span><i class="pipeline-state ${esc(pipeline.tone)}">${esc(pipeline.label)}</i></span>
                <span>${esc(counts.blocking)}</span>
                <span>${esc(pipeline.owner)}</span>
                <span>${esc(dateText(plannedDate(style, sample)))}</span>
                <span>${esc(shipment.nextStep)}</span>
                <span><button class="primary-button compact-button" type="button" data-open-review="${esc(style.id)}">打开</button></span>
              </div>
            `;
          }).join("")}
        </div>
      `;
      return;
    }
    $("#pipeline-list").innerHTML = styles.map((style) => styleCard(style, true)).join("");
  }

  function configuredBrands() {
    const raw = state.data?.settings?.brands;
    if (Array.isArray(raw) && raw.length) {
      return raw.map((brand, index) => (
        typeof brand === "string"
          ? { id: `brand_${index}`, name: brand, aliases: [] }
          : { id: brand.id || `brand_${index}`, name: brand.name || brand.label || "", aliases: brand.aliases || [] }
      )).filter((brand) => brand.name);
    }
    return defaultBrands;
  }

  function serializeBrands(brands = configuredBrands()) {
    return brands.map((brand) => ({
      id: brand.id || brand.name.toLowerCase().replace(/\s+/g, "_"),
      name: brand.name,
      aliases: Array.isArray(brand.aliases) ? brand.aliases : []
    }));
  }

  function populateBrandSelect(value = "萨洛蒙") {
    const select = $("#style-brand-select");
    if (!select) return;
    const brands = configuredBrands();
    select.innerHTML = brands.map((brand) => `<option value="${esc(brand.name)}">${esc(brand.name)}</option>`).join("");
    if (value && !brands.some((brand) => brand.name === value)) {
      select.insertAdjacentHTML("beforeend", `<option value="${esc(value)}">${esc(value)} / 已保存</option>`);
    }
    select.value = value || brands[0]?.name || "";
  }

  async function saveBrands(brands, message = "品牌已保存") {
    try {
      await syncData("updateSetting", {
        key: "brands",
        value: serializeBrands(brands)
      });
      await loadSnapshot();
      showMessage(message, "ok");
    } catch (error) {
      console.error("保存品牌失败", { brands, error });
      showMessage(`保存品牌失败：${error.message}`);
    }
  }

  function normalizeLocation(item, index = 0) {
    if (typeof item === "string") return { id: `location_${index}`, label: item };
    if (item && typeof item === "object") {
      return {
        id: item.id || item.key || item.value || `location_${index}`,
        label: item.label || item.name || item.value || item.title || `位置 ${index + 1}`
      };
    }
    return { id: `location_${index}`, label: String(item || `位置 ${index + 1}`) };
  }

  function configuredSampleLocations() {
    const raw = state.data?.settings?.sampleLocations || state.data?.settings?.sampleLocationOptions;
    if (Array.isArray(raw) && raw.length) {
      const locations = raw.map(normalizeLocation).filter((item) => item.label);
      const existing = new Set(locations.map((item) => item.label));
      defaultSampleLocations.forEach((item) => {
        if (!existing.has(item.label)) locations.push(item);
      });
      return locations;
    }
    return defaultSampleLocations;
  }

  function populateLocationSelect(value = "样衣间") {
    const select = $("#sample-location-select");
    if (!select) return;
    const locations = configuredSampleLocations();
    select.innerHTML = locations.map((item) => `<option value="${esc(item.label)}">${esc(item.label)}</option>`).join("");
    if (value && !locations.some((item) => item.label === value)) {
      select.insertAdjacentHTML("beforeend", `<option value="${esc(value)}">${esc(value)} / 已保存</option>`);
    }
    select.value = value || "样衣间";
  }

  function styleMatchesReviewFilter(style) {
    const brand = state.reviewBrandFilter;
    const query = state.reviewStyleFilter.trim().toLowerCase();
    const matchesBrand = !brand || style.brand === brand;
    const haystack = [style.styleNo, style.styleName, style.brand].join(" ").toLowerCase();
    return matchesBrand && (!query || haystack.includes(query));
  }

  function filteredReviewStyles() {
    return (state.data?.styleList || []).filter(styleMatchesReviewFilter);
  }

  function ensureSelectedStyleVisible() {
    const filtered = filteredReviewStyles();
    if (!filtered.length) return;
    if (!filtered.some((style) => style.id === state.selectedStyleId)) {
      state.selectedStyleId = filtered[0].id;
    }
  }

  function renderReviewFilter() {
    const styles = state.data?.styleList || [];
    const brands = Array.from(new Set([...configuredBrands().map((brand) => brand.name), ...styles.map((style) => style.brand).filter(Boolean)]));
    const brandSelect = $("#review-brand-filter");
    const styleInput = $("#review-style-filter");
    const styleSelect = $("#review-style-select");
    if (!brandSelect || !styleInput || !styleSelect) return;

    brandSelect.innerHTML = `<option value="">全部品牌</option>${brands.map((brand) => `<option value="${esc(brand)}" ${state.reviewBrandFilter === brand ? "selected" : ""}>${esc(brand)}</option>`).join("")}`;
    styleInput.value = state.reviewStyleFilter;
    const filtered = filteredReviewStyles();
    styleSelect.innerHTML = filtered.length
      ? filtered.map((style) => `<option value="${esc(style.id)}" ${state.selectedStyleId === style.id ? "selected" : ""}>${esc(style.brand)} ${esc(style.styleNo)} / ${esc(style.styleName)}</option>`).join("")
      : `<option value="">没有匹配款式</option>`;
    styleSelect.disabled = !filtered.length;
  }

  function renderReviewSummary() {
    ensureSelectedStyleVisible();
    renderReviewFilter();
    const style = currentStyle();
    const sample = currentSample();
    const review = currentReview();
    const issues = currentIssues();
    const shipment = computeShipmentState(style, sample, review, issues);
    const release = releaseStatusCopy(shipment, issues);
    const cover = findStyleCover(sample);
    $("#review-summary").classList.remove("skeleton");
    $("#review-current-style").textContent = style ? `${style.brand || "未填品牌"} ${style.styleNo || "未填款号"} / ${style.styleName || "未填款名"}` : "暂无款式";
    $("#review-summary").innerHTML = style ? `
      <article class="review-hero-card">
        <div class="review-cover">
          <label class="style-image-upload ${cover?.url ? "has-image" : ""}">
            <input type="file" accept="image/*" data-style-image-upload />
            ${cover?.url
              ? `<img src="${esc(cover.url)}" alt="款式主图" />`
              : '<span class="style-image-empty"><strong>请上传样衣正面图</strong><small>款式主图专用通道</small></span>'}
            <span class="style-image-action">${cover?.url ? "更换款式主图" : "上传款式主图"}</span>
          </label>
        </div>
        <div class="review-core">
          <h2>${esc(style.styleName || "未填款式名称")}</h2>
          <p>${esc(style.brand || "未填品牌")} / ${esc(style.styleNo || "未填款号")}</p>
          <dl>
            <div><dt>样品阶段</dt><dd>${esc(sampleStageLabel(style.samplePhase))}</dd></div>
            <div><dt>季节</dt><dd>${esc(style.season || "未设置")}</dd></div>
            <div><dt>样衣位置</dt><dd>${esc(sample?.location || style.sampleLocation || "未设置")}</dd></div>
            <div><dt>预计寄样</dt><dd>${esc(plannedDate(style, sample) || "未设置")}</dd></div>
            <div><dt>客户交期</dt><dd>${esc(style.customerDeadline || "未设置")}</dd></div>
          </dl>
        </div>
        <div class="review-judgement">
          <span class="status-pill ${release.tone}">${esc(release.title)}</span>
          <dl>
            <div><dt>原因</dt><dd>${esc(release.reason)}</dd></div>
            <div><dt>下一步</dt><dd>${esc(shipment.nextStep)}</dd></div>
            <div><dt>Gate Owner</dt><dd>${esc(textOwner(style, review, "gateOwner", "未指定"))}</dd></div>
            <div><dt>Final Approver</dt><dd>${esc(textOwner(style, review, "finalApprover", "杨总"))}</dd></div>
            <div><dt>本轮目标</dt><dd>${esc(style.reviewObjective || "确认质量与工艺问题责任人，并判断是否允许寄样")}</dd></div>
          </dl>
        </div>
      </article>
    ` : '<div class="empty">暂无评审数据。</div>';
  }

  function renderDepartments() {
    const style = currentStyle();
    const review = currentReview();
    const rows = departmentRowsForReview(review, style);
    state.departmentReviewRows = rows;
    renderMyReviewTask(rows, style, review);
    const optional = optionalDepartmentRoles(review);
    const me = currentReviewerName(style, review);
    const activeRow = myDepartmentRow(rows, style, review);
    const activeKey = reviewTaskKey(activeRow, rows.indexOf(activeRow));
    const cards = rows.length ? rows.map((row, index) => {
      const role = roleForDepartmentRow(row);
      const reviewers = departmentReviewerNames(row, style);
      const isMine = reviewers.includes(me);
      const rowKey = reviewTaskKey(row, index);
      const isActiveTask = rowKey === activeKey;
      const isPendingReview = row.status === "pending" && !row.opinion;
      const submitted = ["pass", "needs_improvement", "fail"].includes(row.status);
      const draft = row.opinion && row.status === "pending";
      const issueCount = issueCountForDepartment(row.department);
      return `
        <details class="department-progress-card ${isPendingReview ? "pending-review" : ""}" data-department-index="${index}" data-role-id="${esc(row.roleId || "")}" ${isActiveTask || isMine ? "open" : ""}>
          <summary>
            <span>
              <strong>${esc(row.department)}</strong>
              <small>${esc(row.role || roleShortName(role) || "评审员")} ${reviewerChips(reviewers)}</small>
            </span>
            <span class="department-progress-meta">
              <i class="${isPendingReview ? "pending-review-chip" : ""}">${esc(isActiveTask ? "当前评审" : draft ? "已保存草稿" : statusLabels[row.status] || row.status)}</i>
              <i>${esc(issueCount ? `${issueCount} 个 Issue` : "0 个 Issue")}</i>
            </span>
          </summary>
          ${submitted || isMine ? `
            <div class="department-readonly-opinion">
              <p>${esc(row.opinion || reviewCardPlaceholder(row))}</p>
              ${isMine ? `<button class="secondary-button compact-button" type="button" data-scroll-my-review>编辑我的评审</button>` : ""}
            </div>
          ` : `<div class="department-readonly-opinion muted">待提交，暂不显示草稿内容。</div>`}
        </details>
    `;
    }).join("") : '<div class="empty">暂无部门评审行。</div>';
    const optionalPanel = optional.length ? `
      <details class="optional-review-panel">
        <summary>按需参与评审</summary>
        <div class="optional-review-list">
          ${optional.map((role) => {
            const names = roleOwnerNames(style, role.id);
            return `
              <article>
                <div>
                  <strong>${esc(roleShortName(role))}</strong>
                  <small>${esc(role.responsibility || "按需补充评审意见")}</small>
                  ${reviewerChips(names)}
                </div>
                <button class="secondary-button compact-button" type="button" data-add-optional-review="${esc(role.id)}">加入评审</button>
              </article>
            `;
          }).join("")}
        </div>
      </details>
    ` : "";
    $("#department-cards").innerHTML = cards + optionalPanel;
  }

  function renderMyReviewTask(rows, style, review) {
    const row = myDepartmentRow(rows, style, review);
    const index = row ? rows.indexOf(row) : -1;
    const container = $("#my-review-task");
    const filter = $("#reviewer-task-filter");
    const gateBox = $("#gate-owner-card");
    if (!container || !gateBox) return;
    if (!row) {
      if (filter) filter.innerHTML = "";
      container.innerHTML = '<div class="empty">当前没有匹配到你的评审任务。</div>';
      gateBox.innerHTML = "";
      return;
    }
    if (filter) {
      const currentKey = reviewTaskKey(row, index);
      filter.innerHTML = `
        <label>
          <span>选择评审人</span>
          <select id="reviewer-task-select">
            ${rows.map((item, itemIndex) => {
              const names = departmentReviewerNames(item, style);
              const role = item.role || roleShortName(roleForDepartmentRow(item)) || "评审员";
              const people = names.length ? names.join("、") : "未指定";
              const key = reviewTaskKey(item, itemIndex);
              return `<option value="${esc(key)}" ${key === currentKey ? "selected" : ""}>${esc(role)} / ${esc(people)}</option>`;
            }).join("")}
          </select>
        </label>
      `;
    }
    const reviewers = departmentReviewerNames(row, style);
    const statusText = row.opinion && row.status === "pending" ? "已保存草稿" : (statusLabels[row.status] || "待提交");
    container.innerHTML = `
      <article class="my-review-card" data-department-index="${index}">
        <div class="my-review-head">
          <div>
            <span>部门：${esc(row.department)}</span>
            <h3>${esc(row.role || "评审员")}</h3>
            ${reviewerChips(reviewers)}
          </div>
          <span class="badge ${row.status === "fail" ? "blocked" : row.status === "needs_improvement" ? "pending" : "ok"}">${esc(statusText)}</span>
        </div>
        <p class="review-duty">职责提示：${esc(reviewCardPlaceholder(row))}</p>
        <label>评审结果
          <select data-review-status>
            ${["pending", "pass", "needs_improvement", "fail"].map((status) => `<option value="${status}" ${row.status === status ? "selected" : ""}>${esc(statusLabels[status])}</option>`).join("")}
          </select>
        </label>
        <label>评审意见
          <textarea data-review-opinion placeholder="${esc(reviewCardPlaceholder(row))}">${esc(row.opinion || "")}</textarea>
        </label>
        <div class="my-review-actions">
          <button class="secondary-button" type="button" data-save-department="${index}">保存草稿</button>
          <button class="primary-button" type="button" data-submit-review="${index}">提交评审</button>
          <button class="secondary-button" type="button" data-review-to-issue="${index}">转为 Issue</button>
        </div>
      </article>
    `;
    const isGateOwner = roleOwnerNames(style, "sample_review_gate_owner").includes(currentReviewerName(style, review));
    const rowsDone = rows.filter((item) => ["pass", "needs_improvement", "fail"].includes(item.status)).length;
    const blockers = currentIssues().filter(isBlocking).length;
    gateBox.innerHTML = isGateOwner ? `
      <article class="gate-owner-panel">
        <h3>放行判断卡</h3>
        <dl>
          <div><dt>部门评审完成</dt><dd>${esc(rowsDone)} / ${esc(rows.length)}</dd></div>
          <div><dt>未关闭 Issue</dt><dd>${esc(currentIssues().filter((issue) => issue.status !== "closed").length)}</dd></div>
          <div><dt>Blocking Issue</dt><dd>${esc(blockers)}</dd></div>
          <div><dt>当前判断</dt><dd>${esc(blockers ? "暂停寄样" : "等待最终判断")}</dd></div>
        </dl>
      </article>
    ` : "";
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

  function documentCategorySummary(categoryId, documents) {
    const files = documents.filter((item) => item.category === categoryId);
    const latest = files.slice().sort((a, b) => String(b.uploadedAt || "").localeCompare(String(a.uploadedAt || "")))[0];
    return {
      categoryId,
      label: fileCategoryLabels[categoryId] || categoryId,
      required: styleDocumentCategories.find((item) => item.id === categoryId)?.required,
      files,
      latest
    };
  }

  function documentStatusText(documents) {
    const missing = styleDocumentCategories
      .filter((item) => item.required && !documents.some((doc) => doc.category === item.id))
      .map((item) => fileCategoryLabels[item.id] || item.id);
    return {
      complete: !missing.length,
      text: missing.length ? `评审资料未齐全：缺少 ${missing.join("、")}` : "评审资料已齐全"
    };
  }

  function fileThumb(item) {
    const type = canonicalFileType(item);
    if (type === "image" && item.url) return `<img src="${esc(item.url)}" alt="${esc(item.fileName)}" />`;
    if (type === "video" && item.url) return `<video src="${esc(item.url)}" muted playsinline></video>`;
    return `<span>${esc(fileIcon(item))}</span>`;
  }

  function fileCard(item, options = {}) {
    const canSetMain = options.allowMain && item.category === "style_cover" && canonicalFileType(item) === "image" && !item.isMainImage;
    return `
      <article class="document-file-card" data-file-card="${esc(item.id)}">
        <button class="document-file-thumb" type="button" data-preview-file="${esc(item.id)}">${fileThumb(item)}</button>
        <div class="document-file-meta">
          <strong>${esc(item.fileName)}</strong>
          <small>${esc(fileTypeLabel(item))} · ${esc(formatFileSize(item.fileSize))}</small>
          <small>${esc(item.uploadedBy || "未记录")} · ${esc(dateText(item.uploadedAt))} · ${esc(fileCategoryLabels[item.category] || item.category)}</small>
        </div>
        <div class="document-file-actions">
          <button class="secondary-button compact-button" type="button" data-preview-file="${esc(item.id)}">预览</button>
          <a class="secondary-button compact-button" href="${esc(item.url || "#")}" download="${esc(item.fileName)}">下载</a>
          ${canSetMain ? `<button class="secondary-button compact-button" type="button" data-set-main-document="${esc(item.id)}">设为主图</button>` : ""}
          ${item.source === "local" ? `<button class="danger-button compact-button" type="button" data-delete-local-file="${esc(item.id)}">删除</button>` : ""}
        </div>
      </article>
    `;
  }

  function renderStyleDocuments() {
    const style = currentStyle();
    const sample = currentSample();
    const documents = styleDocumentList(style, sample);
    const expanded = Boolean(state.documentsExpandedByStyle[style?.id || currentStyleKey()]);
    const status = documentStatusText(documents);
    const statusBox = $("#style-document-status");
    const folders = $("#style-document-folders");
    const files = $("#style-document-files");
    const toggle = $("#toggle-style-documents");
    if (toggle) toggle.textContent = expanded ? "收起资料" : "展开资料";
    if (statusBox) {
      statusBox.className = `document-status ${status.complete ? "complete" : "missing"}`;
      statusBox.textContent = status.text;
    }
    if (folders) {
      folders.innerHTML = styleDocumentCategories.map(({ id }) => {
        const summary = documentCategorySummary(id, documents);
        const latest = summary.latest;
        const updated = latest ? `${shortDate(latest.uploadedAt)} ${latest.uploadedBy || "未记录"}更新` : "缺失";
        return `
          <article class="document-folder-card ${summary.files.length ? "ready" : "missing"}">
            <strong>${esc(summary.label)}</strong>
            <span>${esc(summary.files.length)} 个文件｜${summary.files.length ? "已上传" : "缺失"}${latest ? `｜${esc(updated)}` : ""}</span>
          </article>
        `;
      }).join("");
    }
    if (files) {
      files.hidden = !expanded;
      files.innerHTML = styleDocumentCategories.map(({ id }) => {
        const summary = documentCategorySummary(id, documents);
        return `
          <section class="document-file-group">
            <h3>${esc(summary.label)}</h3>
            <div class="document-file-list">
              ${summary.files.length ? summary.files.map((item) => fileCard(item, { allowMain: true })).join("") : '<div class="compact-empty">暂无文件。</div>'}
            </div>
          </section>
        `;
      }).join("");
    }
  }

  function renderStyleMaterialFiles() {
    const styleKey = state.editingStyleId || "__draft__";
    const style = styleById(state.editingStyleId);
    const sample = state.data?.samples?.find((item) => item.styleId === style?.id);
    const documents = styleDocumentList(style, sample).filter((item) => item.styleId === styleKey || item.source === "snapshot");
    const container = $("#style-material-file-list");
    if (!container) return;
    container.innerHTML = styleDocumentCategories.map(({ id }) => {
      const items = documents.filter((item) => item.category === id);
      return `
        <section class="modal-document-group">
          <h4>${esc(fileCategoryLabels[id] || id)}</h4>
          ${items.length ? items.map((item) => fileCard(item, { allowMain: true })).join("") : '<div class="compact-empty">上传后会显示文件卡片。</div>'}
        </section>
      `;
    }).join("");
  }

  function renderMedia() {
    const mediaList = reviewMediaList();
    renderStyleDocuments();
    if (!state.selectedMediaId || !mediaList.some((item) => item.id === state.selectedMediaId)) {
      state.selectedMediaId = mediaList[0]?.id || "";
    }
    const selected = mediaList.find((item) => item.id === state.selectedMediaId);
    const focus = $("#media-focus");
    if (focus) {
      if (!selected) {
        focus.innerHTML = '<div class="media-focus-empty">暂无评审媒体，请先上传照片或视频。</div>';
      } else {
        const isVideo = selected.mediaKind === "video" || String(selected.mimeType || "").startsWith("video/");
        const preview = isVideo
          ? `<video src="${esc(selected.url || "")}" controls muted></video>`
          : `<img src="${esc(selected.url || "")}" alt="${esc(selected.label || selected.fileName)}" />`;
        focus.innerHTML = `
          <div class="media-focus-stage">
            <button class="media-open" type="button" data-open-media="${esc(selected.id)}" aria-label="放大查看 ${esc(selected.label || selected.fileName)}">${preview}</button>
          </div>
          <div class="media-focus-meta">
            <strong>${esc(readableMediaLabel(selected))}</strong>
            <span>${esc(mediaPartLabels[categoryFromLabel(selected)] || "未标注部位")}</span>
            <button class="secondary-button compact-button" type="button" data-review-to-issue>当前图片转 Issue</button>
          </div>
        `;
      }
    }
    $("#uploaded-media").innerHTML = mediaList.length ? mediaList.map((item) => {
      const media = item.mediaKind === "video" || String(item.mimeType || "").startsWith("video/")
        ? `<video src="${esc(item.url || "")}" controls muted></video>`
        : `<img src="${esc(item.url || "")}" alt="${esc(item.label || item.fileName)}" />`;
      const category = categoryFromLabel(item);
      const partOptions = Object.entries(mediaPartLabels).map(([value, label]) => `<option value="${esc(value)}" ${category === value ? "selected" : ""}>${esc(label)}</option>`).join("");
      return `
        <article class="media-card ${item.id === state.selectedMediaId ? "selected" : ""}">
          <button class="media-delete" type="button" data-delete-media="${esc(item.id)}" aria-label="删除 ${esc(item.label || item.fileName)}">×</button>
          <button class="media-open" type="button" data-select-media="${esc(item.id)}" aria-label="选择 ${esc(item.label || item.fileName)}">${media}</button>
          <label class="media-name-field">
            <span>部位</span>
            <select data-media-part-select="${esc(item.id)}">
              <option value="">未标注</option>
              ${partOptions}
            </select>
          </label>
          <label class="media-name-field">
            <span>名称</span>
            <input data-media-label-input="${esc(item.id)}" value="${esc(mediaNameForEdit(item))}" />
          </label>
          <small>${esc(mediaPartLabels[category] || fileCategoryLabels[category] || "评审媒体")} · ${esc(item.uploadedAt || "")}</small>
        </article>
      `;
    }).join("") : '<div class="empty">暂无已上传媒体。</div>';
  }

  function renderCalendar() {
    const allStyles = state.data?.styleList || [];
    const brandOptions = Array.from(new Set([...configuredBrands().map((brand) => brand.name), ...allStyles.map((style) => style.brand).filter(Boolean)]));
    const seasonOptions = Array.from(new Set(allStyles.map((style) => style.season).filter(Boolean)));
    const stageOptions = Array.from(new Set(allStyles.map((style) => style.samplePhase).filter(Boolean)));
    const brandSelect = $("#calendar-brand-filter");
    const seasonSelect = $("#calendar-season-filter");
    const stageSelect = $("#calendar-stage-filter");
    const locationSelect = $("#calendar-location-filter");
    const routeSelect = $("#calendar-route-filter");
    const filterBody = $("#calendar-filter-body");
    if (brandSelect) {
      brandSelect.innerHTML = `<option value="">全部品牌</option>${brandOptions.map((brand) => `<option value="${esc(brand)}" ${state.calendarBrandFilter === brand ? "selected" : ""}>${esc(brand)}</option>`).join("")}`;
    }
    if (seasonSelect) {
      seasonSelect.innerHTML = `<option value="">全部季节</option>${seasonOptions.map((season) => `<option value="${esc(season)}" ${state.calendarSeasonFilter === season ? "selected" : ""}>${esc(season)}</option>`).join("")}`;
    }
    if (stageSelect) {
      stageSelect.innerHTML = `<option value="">全部阶段</option>${stageOptions.map((stage) => `<option value="${esc(stage)}" ${state.calendarStageFilter === stage ? "selected" : ""}>${esc(sampleStageLabel(stage))}</option>`).join("")}`;
    }
    if (locationSelect) {
      locationSelect.innerHTML = calendarLocationOptions.map((item) => `<option value="${esc(item.value)}" ${state.calendarLocationFilter === item.value ? "selected" : ""}>${esc(item.label)}</option>`).join("");
    }
    if (routeSelect) {
      routeSelect.innerHTML = calendarRouteOptions.map((item) => `<option value="${esc(item.value)}" ${state.calendarRouteFilter === item.value ? "selected" : ""}>${esc(item.label)}</option>`).join("");
    }
    if ($("#calendar-week-only")) $("#calendar-week-only").checked = state.calendarWeekOnly;
    if ($("#calendar-risk-only")) $("#calendar-risk-only").checked = state.calendarRiskOnly;
    if ($("#calendar-mine-only")) $("#calendar-mine-only").checked = state.calendarMineOnly;
    if (filterBody) {
      filterBody.hidden = !state.calendarFiltersOpen;
      $("#calendar-filter-toggle").textContent = state.calendarFiltersOpen ? "收起筛选" : "展开筛选";
    }

    const entries = calendarEntries(allStyles)
      .filter((entry) => !state.calendarBrandFilter || entry.style.brand === state.calendarBrandFilter)
      .filter((entry) => !state.calendarSeasonFilter || entry.style.season === state.calendarSeasonFilter)
      .filter((entry) => !state.calendarStageFilter || entry.style.samplePhase === state.calendarStageFilter)
      .filter((entry) => calendarLocationMatches(entry, state.calendarLocationFilter))
      .filter((entry) => calendarRouteMatches(entry.style, state.calendarRouteFilter))
      .filter((entry) => !state.calendarWeekOnly || isThisWeekDate(entry.dateKey))
      .filter((entry) => !state.calendarRiskOnly || entry.tone === "blocked" || entry.tone === "pending" || entry.shipment.release !== "ready_to_send")
      .filter((entry) => !state.calendarMineOnly || calendarOwnedByMe(entry))
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey));

    const todayKey = monthDateKey(new Date());
    const todayDue = entries.filter((entry) => entry.dateKey === todayKey).length;
    const weekDue = entries.filter((entry) => isThisWeekDate(entry.dateKey)).length;
    const blocked = entries.filter((entry) => entry.daysUntil < 0 || entry.shipment.release !== "ready_to_send").length;
    $("#calendar-stats").innerHTML = [
      ["今日到期", todayDue, "今天预计寄样的款式"],
      ["本周到期", weekDue, "本周需要跟进的交期"],
      ["逾期 / 阻塞", blocked, "逾期或当前不可寄样"]
    ].map(([label, value, help]) => `
      <article class="calendar-stat-card">
        <span>${esc(label)}</span>
        <strong>${esc(value)}</strong>
        <small>${esc(help)}</small>
      </article>
    `).join("");

    const todayActions = entries.filter((entry) => entry.dateKey === todayKey || entry.tone === "blocked" || entry.tone === "pending").slice(0, 5);
    $("#today-action-list").innerHTML = todayActions.length ? todayActions.map((entry) => `
      <button class="today-action-item" type="button" data-calendar-open-style="${esc(entry.style.id)}">
        <strong>${esc(entry.style.brand)} ${esc(entry.style.styleNo)}</strong>
        <span>${esc(entry.counts.blocking ? `${entry.counts.blocking} 个阻塞 Issue，需${entry.owner}判断` : `${entry.riskLabel}，需${entry.owner}处理`)}</span>
      </button>
    `).join("") : '<div class="empty compact-empty">今日暂无必须处理事项。</div>';

    $("#calendar-list").innerHTML = entries.length ? entries.map((entry) => {
      return `
        <article class="calendar-card calendar-risk-card ${esc(entry.tone)}">
          <button class="calendar-card-open" type="button" data-calendar-open-style="${esc(entry.style.id)}">
            <div class="date-block"><span>${esc(entry.dateKey.slice(0, 4))}</span><strong>${esc(entry.dateKey.slice(5))}</strong></div>
            <div class="calendar-card-main">
              <div class="calendar-card-title">
                <h3>${esc(entry.style.brand)} ${esc(entry.style.styleNo)} / ${esc(entry.style.styleName)}</h3>
                <span class="calendar-risk-tag ${esc(entry.tone)}">${esc(entry.riskLabel)}</span>
              </div>
              <p>${esc(sampleStageLabel(entry.style.samplePhase))}｜${esc(gateLabel(entry.style.currentGate))}｜${esc(entry.location)}</p>
              <dl class="calendar-card-meta">
                <div><dt>当前状态</dt><dd>${esc(entry.pipeline.label)}</dd></div>
                <div><dt>当前责任人</dt><dd>${esc(entry.owner)}</dd></div>
                <div><dt>下一步</dt><dd>${esc(entry.nextAction)}</dd></div>
              </dl>
            </div>
          </button>
        </article>
      `;
    }).join("") : '<div class="empty">当前筛选下暂无日历数据。</div>';
    renderMonthCalendar(entries);
    updateStatus();
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

  function renderMonthCalendar(entries) {
    const events = entries.map((entry) => {
      const date = parseCalendarDate(entry.dateKey);
      return date ? { ...entry, date, key: monthDateKey(date) } : null;
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

    $("#month-calendar-section")?.classList.toggle("is-open", state.calendarMonthOpen);
    $("#calendar-month-toggle").textContent = state.calendarMonthOpen ? "收起月历" : "查看月历";
    $("#calendar-month-title").textContent = `${year} 年 ${month + 1} 月`;
    $("#calendar-month-count").textContent = `${events.length} 个节点`;

    const cells = [];
    for (let index = 0; index < 42; index += 1) {
      const day = new Date(gridStart);
      day.setDate(gridStart.getDate() + index);
      const key = monthDateKey(day);
      const dayEvents = eventMap.get(key) || [];
      const isOverdue = dayEvents.some((event) => event.daysUntil < 0 && event.shipment.release !== "ready_to_send");
      const classes = [
        "month-day",
        day.getMonth() !== month ? "is-other-month" : "",
        key === todayKey ? "is-today" : "",
        dayEvents.length ? "has-events" : "",
        isOverdue ? "is-overdue" : ""
      ].filter(Boolean).join(" ");
      cells.push(`
        <div class="${classes}">
          <button class="month-day-number" type="button" ${dayEvents[0] ? `data-calendar-open-style="${esc(dayEvents[0].style.id)}"` : ""}>${day.getDate()}</button>
          ${dayEvents.map((event) => `
            <button class="calendar-event ${esc(event.tone)}" type="button" data-calendar-open-style="${esc(event.style.id)}">
              <strong>${esc(event.style.brand)} ${esc(event.style.styleNo)}</strong>
              <small>${esc(sampleStageLabel(event.style.samplePhase))} · ${esc(event.riskLabel)}</small>
            </button>
          `).join("")}
        </div>
      `);
    }

    $("#month-calendar-grid").innerHTML = cells.join("");
  }

  function renderSettings() {
    const data = state.data || {};
    const users = allUsers();
    const templates = activeRoleTemplates();
    const gateRules = data.gateRules || {};
    const ownerOrDefault = (userId, fallback) => {
      if (!userId) return fallback;
      const name = userName(userId);
      return name && name !== "未指定" ? name : fallback;
    };
    const owners = [
      ["Preparation Gate Owner", ownerOrDefault(gateRules.preparationGateOwner, "王部长"), "资料确认、推进到派发打样"],
      ["Sample Review Gate Owner", ownerOrDefault(gateRules.sampleReviewGateOwner, "大前"), "组织样衣评审、确认 Issue 等级、判断是否阻止寄样、做最终寄样结论"],
      ["Final Approver", ownerOrDefault(gateRules.finalApprover, "杨总"), "例外放行、重大争议裁决"]
    ];
    $("#settings-stats").innerHTML = [
      ["系统角色", templates.length],
      ["Gate 负责人", 5],
      ["例外审批人", 1],
      ["打样路线", 2]
    ].map(([label, value]) => `<article><strong>${esc(value)}</strong><span>${esc(label)}</span></article>`).join("");

    $("#brand-list").innerHTML = configuredBrands().map((brand) => `
      <article>
        <div>
          <strong>${esc(brand.name)}</strong>
          <small>${brand.aliases?.length ? `英文 / 别名：${esc(brand.aliases.join(" / "))}` : "暂无别名"}</small>
        </div>
        <button type="button" data-edit-brand="${esc(brand.id)}">编辑</button>
      </article>
    `).join("");

    $("#owner-list").innerHTML = owners.map(([label, value, duty]) => `
      <div>
        <dt>${esc(label)}</dt>
        <dd><strong>${esc(value)}</strong><small>${esc(duty)}</small></dd>
      </div>
    `).join("");

    $("#role-template-view").innerHTML = templates.map((role) => {
      const assignedPeople = Array.from(new Set([
        ...(role.people || []),
        ...assignedUsersForRole(role.id).map((person) => person.name)
      ].filter(Boolean)));
      const availablePeople = users.filter((user) => !assignedPeople.includes(user.name));
      return `
      <article class="role-template-card">
        <header>
          <div>
            <strong>${esc(role.name)}</strong>
            <small>${esc(role.type)} · ${esc(role.stages.join(" / "))}</small>
          </div>
          <span class="badge ${role.reviewDefault === "是" ? "ok" : "pending"}">${esc(role.reviewDefault === "是" ? "默认评审" : "按需参与")}</span>
        </header>
        <p>${esc(role.responsibility)}</p>
        <dl>
          <div>
            <dt>关键权限</dt>
            <dd class="editable-chip-list permission-editor">
              ${role.permissions.length ? role.permissions.map((item, index) => `<button type="button" data-role-remove-permission="${esc(role.id)}" data-index="${index}">${esc(item)} ×</button>`).join("") : "<em>未设置</em>"}
              <span class="inline-add"><input data-role-permission-input="${esc(role.id)}" placeholder="新增权限" /><button type="button" data-role-add-permission="${esc(role.id)}">添加</button></span>
            </dd>
          </div>
          <div class="release-permission-row">
            <label><span>最终放行</span><select data-role-final-release="${esc(role.id)}"><option ${role.finalRelease === "否" ? "selected" : ""}>否</option><option ${role.finalRelease === "是" ? "selected" : ""}>是</option><option ${role.finalRelease === "仅例外放行" ? "selected" : ""}>仅例外放行</option></select></label>
            <label><span>例外放行</span><select data-role-exception-release="${esc(role.id)}"><option ${role.exceptionRelease === "否" ? "selected" : ""}>否</option><option ${role.exceptionRelease === "是" ? "selected" : ""}>是</option></select></label>
          </div>
          <div>
            <dt>当前分配人员</dt>
            <dd class="editable-chip-list people-editor">
              ${assignedPeople.length ? assignedPeople.map((person) => `<button type="button" data-role-remove-person="${esc(role.id)}" data-person="${esc(person)}">${esc(person)} ×</button>`).join("") : "<em>未分配</em>"}
              <span class="inline-add">
                <select data-role-person-select="${esc(role.id)}">
                  <option value="">选择人员</option>
                  ${availablePeople.map((person) => `<option value="${esc(person.name)}">${esc(person.name)} / ${esc(person.department || "未设置")}</option>`).join("")}
                </select>
                <button type="button" data-role-add-person="${esc(role.id)}">添加</button>
              </span>
            </dd>
          </div>
        </dl>
      </article>
    `;
    }).join("");

    $("#people-library-list").innerHTML = users.length ? `
      <div class="people-row people-head people-row-compact"><strong>人员姓名</strong><span>所属部门</span><em>已分配角色</em><small>适用品牌 / 路线</small><div>关键权限</div><div>操作</div></div>
      ${users.map((user) => {
        const assigned = assignedRolesForUser(user);
        const permissions = Array.from(new Set(assigned.flatMap((role) => role.permissions))).slice(0, 4);
        const scopes = user.scope?.length ? user.scope : ["样衣评审"];
        return `<div class="people-row people-row-compact">
          <strong>${esc(user.name)}</strong>
          <span>${esc(user.department || "未设置")}</span>
          <em>${esc(assigned.map(roleShortName).join(" / ") || "未分配固定角色")}</em>
          <small>${esc(scopes.join(" / "))}</small>
          <div class="permission-tags">${permissions.length ? permissions.map((item) => `<i>${esc(item)}</i>`).join("") : "<i>待分配</i>"}</div>
          <div class="row-actions-inline">
            <button type="button" data-edit-person="${esc(user.id)}">分配</button>
            <button type="button" data-delete-person="${esc(user.id)}">删除</button>
          </div>
        </div>`;
      }).join("")}
    ` : '<div class="empty">暂无人员记录。</div>';

    const rules = data.settings?.issueLevelRules || data.issueLevelRules || {
      minor: { label: "轻微", shipmentRule: "不阻止寄样，只记录" },
      normal: { label: "一般", shipmentRule: "默认不阻止寄样，由 Gate Owner 判断" },
      major: { label: "重大", shipmentRule: "默认阻止寄样，除非例外放行" },
      critical: { label: "严重", shipmentRule: "必须暂停寄样，整改复验后重新评审" }
    };
    $("#rule-list").innerHTML = Object.entries(rules).map(([, rule]) => (
      `<li><strong>${esc(rule.label)}</strong>：${esc(rule.shipmentRule || rule.systemAction || "")}</li>`
    )).join("");
    $("#route-list").innerHTML = [
      ["普通打样", "不需要张部长 / 夏红霞作为必要节点。"],
      ["压胶 / 新长江", "需要经过张部长和夏红霞。"]
    ].map(([title, text]) => `<article><strong>${esc(title)}</strong><p>${esc(text)}</p></article>`).join("");
    $("#location-list").innerHTML = configuredSampleLocations().map((item) => `<span>${esc(item.label)}</span>`).join("");
  }

  function renderPersonModalOptions(person = null) {
    const selectedRoleIds = new Set(person ? assignedRolesForUser(person).map((role) => role.id) : []);
    const selectedScopes = new Set(person ? userScopes(person) : ["样衣评审"]);
    $("#person-role-list").innerHTML = activeRoleTemplates().map((role) => `
      <label><input type="checkbox" name="roleIds" value="${esc(role.id)}" ${selectedRoleIds.has(role.id) ? "checked" : ""}><span><strong>${esc(role.name)}</strong><small>${esc(role.type)} · ${esc(role.permissions.slice(0, 3).join(" / "))}</small></span></label>
    `).join("");
    const scopes = ["萨洛蒙", "SUPREME", "迪桑特", "普通打样", "压胶 / 新长江", "样衣评审", "例外放行", "全部品牌", "全部路线"];
    $("#person-scope-list").innerHTML = scopes.map((scope) => `<label><input type="checkbox" name="scope" value="${esc(scope)}" ${selectedScopes.has(scope) ? "checked" : ""}><span>${esc(scope)}</span></label>`).join("");
  }

  function personPayloadFromForm(form, basePerson = null) {
    const fields = new FormData(form);
    const roleIds = fields.getAll("roleIds").map(String);
    const scope = fields.getAll("scope").map(String);
    const permissions = Array.from(new Set(roleIds.flatMap((roleId) => roleById(roleId)?.permissions || [])));
    return {
      id: basePerson?.isDefaultUser ? undefined : basePerson?.id,
      name: String(fields.get("name") || "").trim(),
      department: String(fields.get("department") || "").trim(),
      role: roleIds.join(","),
      currentResponsibility: roleIds.map((roleId) => roleShortName(roleById(roleId))).filter(Boolean).join(" / "),
      reviewResponsibility: roleIds.some((roleId) => roleById(roleId)?.reviewDefault === "是") ? "参与样衣评审" : "",
      permissions,
      scope,
      enabled: true,
      isGateOwner: roleIds.includes("sample_review_gate_owner") || roleIds.includes("preparation_gate_owner"),
      isFinalApprover: roleIds.includes("final_approver")
    };
  }

  function personPayloadWithRoles(user, roleIds) {
    const permissions = Array.from(new Set(roleIds.flatMap((roleId) => roleById(roleId)?.permissions || [])));
    return {
      id: user.isDefaultUser ? undefined : user.id,
      name: user.name,
      department: user.department || "",
      role: roleIds.join(","),
      currentResponsibility: roleIds.map((roleId) => roleShortName(roleById(roleId))).filter(Boolean).join(" / "),
      reviewResponsibility: roleIds.some((roleId) => roleById(roleId)?.reviewDefault === "是") ? "参与样衣评审" : "",
      permissions,
      scope: userScopes(user),
      enabled: user.enabled !== false,
      isGateOwner: roleIds.includes("sample_review_gate_owner") || roleIds.includes("preparation_gate_owner"),
      isFinalApprover: roleIds.includes("final_approver")
    };
  }

  async function syncPersonRoleRecord(personName, roleId, shouldInclude) {
    const user = allUsers().find((item) => item.name === personName);
    if (!user || user.isDefaultUser) return;
    const roleIds = new Set(userRoleIds(user));
    if (shouldInclude) roleIds.add(roleId);
    else roleIds.delete(roleId);
    await syncData("createPerson", personPayloadWithRoles(user, Array.from(roleIds)));
  }

  async function savePersonFromForm(form) {
    const basePerson = state.editingPersonId ? allUsers().find((user) => user.id === state.editingPersonId) : null;
    const payload = personPayloadFromForm(form, basePerson);
    if (!payload.name) {
      setFieldErrors(form, { name: "请输入人员姓名" });
      $("#person-save-status").textContent = "保存失败：请输入人员姓名";
      return;
    }
    setFieldErrors(form, {});
    $("#person-save-status").textContent = "正在保存人员...";
    try {
      await syncData("createPerson", payload);
      await syncPersonRoleTemplates(payload.name, userRoleIds(payload));
      $("#person-save-status").textContent = "人员已保存";
      closePersonModal();
      await loadSnapshot();
      showMessage("人员已保存，角色模板和负责人下拉已同步。", "ok");
    } catch (error) {
      console.error("保存人员失败", { payload, error });
      $("#person-save-status").textContent = `保存失败：${error.message}`;
      showMessage(`保存人员失败：${error.message}`);
    }
  }

  async function deletePersonRecord(personId) {
    const person = allUsers().find((user) => user.id === personId);
    if (!person) return;
    if (person.isDefaultUser) {
      showMessage("默认人员不是数据库记录，无法删除；保存为真实人员后可删除。");
      return;
    }
    const ok = window.confirm(`确认删除人员记录：${person.name}？删除后会同步从角色模板分配人员中移除。`);
    if (!ok) return;
    try {
      const nextTemplates = activeRoleTemplates().map((role) => ({
        ...role,
        people: (role.people || []).filter((name) => name !== person.name)
      }));
      await syncData("updateSetting", {
        key: "roleTemplates",
        value: serializeRoleTemplates(nextTemplates)
      });
      await syncData("deletePerson", { personId });
      await loadSnapshot();
      showMessage("人员记录已删除。", "ok");
    } catch (error) {
      console.error("删除人员失败", { personId, person, error });
      showMessage(`删除人员失败：${error.message}`);
    }
  }

  function openBrandModal(brandId = null) {
    const brand = brandId ? configuredBrands().find((item) => item.id === brandId) : null;
    state.editingBrandId = brand?.id || null;
    $("#brand-modal-title").textContent = brand ? "编辑品牌" : "新增品牌";
    const form = $("#brand-form");
    form.reset();
    form.elements.namedItem("name").value = brand?.name || "";
    form.elements.namedItem("aliases").value = brand?.aliases?.join(", ") || "";
    $("#brand-save-status").textContent = "";
    setFieldErrors(form, {});
    $("#brand-modal").hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeBrandModal() {
    $("#brand-modal").hidden = true;
    $("#brand-form").reset();
    $("#brand-save-status").textContent = "";
    state.editingBrandId = null;
    document.body.style.overflow = "";
  }

  async function saveBrandFromForm(form) {
    const fields = new FormData(form);
    const name = String(fields.get("name") || "").trim();
    if (!name) {
      setFieldErrors(form, { name: "请输入品牌名称" });
      $("#brand-save-status").textContent = "保存失败：请输入品牌名称";
      return;
    }
    setFieldErrors(form, {});
    const aliases = String(fields.get("aliases") || "")
      .split(/[,，]/)
      .map((item) => item.trim())
      .filter(Boolean);
    const brands = configuredBrands();
    const duplicate = brands.find((brand) => brand.name === name && brand.id !== state.editingBrandId);
    if (duplicate) {
      $("#brand-save-status").textContent = "保存失败：品牌已存在";
      return;
    }
    const id = state.editingBrandId || name.toLowerCase().replace(/\s+/g, "_");
    const nextBrands = state.editingBrandId
      ? brands.map((brand) => brand.id === state.editingBrandId ? { ...brand, name, aliases } : brand)
      : [...brands, { id, name, aliases }];
    $("#brand-save-status").textContent = "正在保存品牌...";
    await saveBrands(nextBrands, state.editingBrandId ? "品牌已更新。" : "品牌已新增。");
    closeBrandModal();
  }

  async function saveRoleTemplates(templates, message = "角色模板已保存") {
    try {
      await syncData("updateSetting", {
        key: "roleTemplates",
        value: serializeRoleTemplates(templates)
      });
      await loadSnapshot();
      showMessage(message, "ok");
    } catch (error) {
      console.error("保存角色模板失败", { templates, error });
      showMessage(`保存角色模板失败：${error.message}`);
    }
  }

  async function syncPersonRoleTemplates(personName, roleIds) {
    const selectedRoleIds = new Set(roleIds);
    const templates = activeRoleTemplates().map((role) => {
      const people = new Set((role.people || []).filter((name) => name !== personName));
      if (selectedRoleIds.has(role.id)) people.add(personName);
      return { ...role, people: Array.from(people) };
    });
    await syncData("updateSetting", {
      key: "roleTemplates",
      value: serializeRoleTemplates(templates)
    });
  }

  function updateRoleTemplate(roleId, updater, message) {
    const templates = activeRoleTemplates().map((role) => {
      if (role.id !== roleId) return role;
      const next = { ...role, permissions: [...(role.permissions || [])], people: [...(role.people || [])] };
      updater(next);
      next.permissions = Array.from(new Set(next.permissions.map((item) => String(item).trim()).filter(Boolean)));
      next.people = Array.from(new Set(next.people.map((item) => String(item).trim()).filter(Boolean)));
      return next;
    });
    return saveRoleTemplates(templates, message);
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
    try {
      const data = await requestJson("/api/sampleos/snapshot-p0", { method: "GET" });
      state.data = data;
      state.selectedStyleId = state.selectedStyleId || data.currentStyleId || data.styleList?.[0]?.id || null;
      renderAll();
    } catch (error) {
      console.error("读取 Supabase snapshot 失败", { error });
      showMessage(`暂时无法加载数据：${error.message}`);
      state.data = state.data || {};
      renderSettings();
      updateStatus();
      $("#pipeline-list").innerHTML = "暂时无法加载款式数据，请稍后重试。";
    } finally {
      state.loading = false;
    }
  }

  async function saveDepartment(index) {
    const style = currentStyle();
    const review = currentReview();
    const row = state.departmentReviewRows?.[index] || review?.departmentReviews?.[index];
    const card = $(`.my-review-card[data-department-index="${index}"]`) || $(`.department-card[data-department-index="${index}"]`);
    if (!review || !row || !card) return;
    const status = card.querySelector("[data-review-status]").value;
    const opinion = card.querySelector("[data-review-opinion]").value;
    row.status = status;
    row.opinion = opinion;
    renderDepartments();
    const reviewerName = departmentReviewerNames(row, style)[0] || "";
    const reviewer = allUsers().find((user) => user.name === reviewerName);
    try {
      await syncData("departmentReview", {
        reviewId: review.id,
        department: row.department,
        reviewerId: reviewer && !reviewer.isDefaultUser ? reviewer.id : row.reviewer,
        role: row.role,
        status,
        opinion,
        focusTags: row.focusTags?.length ? row.focusTags : [reviewCardPlaceholder(row)].filter(Boolean)
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
    const context = state.pendingIssueContext;
    const description = context ? [
      fields.get("title"),
      `部门：${context.department}`,
      `评审人：${context.reviewer || "未指定"}`,
      `关注点：${context.focus || "未设置"}`,
      `评审意见：${context.opinion || "未填写"}`,
      `图片：${context.mediaLabel || "未选择"}`,
      `部位：${context.mediaPart || "未标注"}`
    ].join("\n") : fields.get("title");
    try {
      await syncData("createIssue", {
        styleId: style.id,
        sampleId: sample?.id,
        reviewId: review.id,
        title: fields.get("title"),
        description,
        sourceDepartment: fields.get("department"),
        level,
        shipmentBlocking: level === "major" || level === "critical",
        canShipWithNote: level === "minor" || level === "normal",
        status: "not_started"
      });
      state.pendingIssueContext = null;
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
    const draftDocs = state.localStyleDocumentsByStyle.__draft__ || [];
    if (!draftDocs.length || !context?.styleId) return;
    state.localStyleDocumentsByStyle[context.styleId] = [
      ...(state.localStyleDocumentsByStyle[context.styleId] || []),
      ...draftDocs.map((item) => ({ ...item, styleId: context.styleId }))
    ];
    state.localStyleDocumentsByStyle.__draft__ = [];
    $("#style-create-status").textContent = "资料已加入本地预览。";
  }

  function stylePayloadFromForm(form) {
    const fields = new FormData(form);
    const roleOwners = roleOwnersFromForm();
    const legacyOwners = legacyOwnersFromRoleOwners(roleOwners);
    return {
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
      orderMeetingDate: String(fields.get("orderMeetingDate") || ""),
      reviewObjective: String(fields.get("reviewObjective") || "").trim(),
      roleOwners,
      ...legacyOwners,
      versionName: String(fields.get("samplePhase") || "first_sample"),
      quantity: 1,
      highRisk: false
    };
  }

  async function createStyleFromForm(form) {
    const errors = validateStyleForm(form);
    const firstError = Object.values(errors)[0];
    const editing = Boolean(state.editingStyleId);
    if (firstError) {
      $("#style-create-status").textContent = `${editing ? "保存" : "创建"}失败：${firstError}`;
      return showMessage(`${editing ? "保存" : "创建"}失败：${firstError}`);
    }
    const payload = stylePayloadFromForm(form);
    const submit = $("#style-create-submit");
    submit.disabled = true;
    submit.textContent = editing ? "正在保存资料..." : "正在创建款式...";
    $("#style-create-status").textContent = editing ? "正在保存资料..." : "正在创建款式...";
    try {
      if (editing) {
        const style = styleById(state.editingStyleId);
        const sample = state.data?.samples?.find((item) => item.styleId === style?.id);
        const review = state.data?.reviews?.find((item) => item.styleId === style?.id || item.sampleId === sample?.id);
        if (!style || !isUuid(style.id)) throw new Error("当前款式尚未保存，无法编辑资料");
        const response = await syncData("updateStyleInfo", {
          styleId: style.id,
          sampleId: sample?.id || null,
          reviewId: review?.id || null,
          ...payload
        });
        const result = response.result || {};
        await uploadFilesForCreatedStyle(state.styleInitFiles, {
          styleId: result.styleId || style.id,
          sampleId: result.sampleId || sample?.id,
          reviewId: result.reviewId || review?.id,
          styleExternalRef: style.externalRef || null,
          sampleExternalRef: sample?.externalRef || null,
          reviewExternalRef: review?.externalRef || null
        });
        await loadSnapshot();
        state.selectedStyleId = style.id;
        renderAll();
        closeStyleModal();
        showMessage("款式资料已保存。", "ok");
        return;
      }
      const response = await requestJson("/api/sampleos/create-style-fast", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      const result = response.result || {};
      if (!isUuid(result.styleId) || !isUuid(result.sampleId) || !isUuid(result.reviewId)) {
        throw new Error("款式保存记录未生成");
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
      console.error(`${editing ? "保存" : "创建"}款式失败`, { payload, styleInitFiles: state.styleInitFiles, error });
      $("#style-create-status").textContent = `${editing ? "保存" : "创建"}失败：${error.message}`;
      showMessage(`${editing ? "保存" : "创建"}失败：${error.message}`);
    } finally {
      submit.disabled = false;
      submit.textContent = editing ? "保存资料" : "创建款式";
    }
  }

  async function deleteStyle(styleId) {
    if (!isUuid(styleId)) return showMessage("只能删除已保存到数据库的真实款式。");
    const style = styleById(styleId);
    if (!window.confirm(`确认删除 ${style?.styleNo || "该款式"}？关联样衣、评审、问题和媒体记录会一起清理。`)) return;
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
    state.lightboxDraftAnnotations = normalizeAnnotations(item.annotations || []);
    state.drawingAnnotation = null;
    state.lightboxTool = "";
    state.lightboxZoomIndex = 0;
    state.selectedAnnotationId = null;
    state.draggingTextAnnotation = null;
    state.lightboxPan = { x: 0, y: 0 };
    state.lightboxPanning = null;
    $("#lightbox-stage").innerHTML = isVideo
      ? `<video src="${esc(item.url)}" controls autoplay></video>`
      : `
        <div class="lightbox-annotator" id="lightbox-annotator">
          <img src="${esc(item.url)}" alt="${esc(item.label || item.fileName)}" draggable="false" />
          <svg class="annotation-layer" id="annotation-layer" viewBox="0 0 100 100" preserveAspectRatio="none"></svg>
          <div class="annotation-text-layer" id="annotation-text-layer"></div>
        </div>
      `;
    $("#lightbox-caption").textContent = `${readableMediaLabel(item)} · ${state.lightboxIndex + 1}/${mediaList.length}`;
    $("#lightbox-prev").disabled = mediaList.length <= 1;
    $("#lightbox-next").disabled = mediaList.length <= 1;
    $("#lightbox-tools").hidden = isVideo;
    updateLightboxToolState();
    renderAnnotations();
  }

  function updateLightboxToolState() {
    const zoomLevels = [1, 3, 5, 10];
    const zoom = zoomLevels[state.lightboxZoomIndex] || 1;
    $$("[data-lightbox-tool]").forEach((button) => {
      button.classList.toggle("active", button.dataset.lightboxTool === state.lightboxTool);
      if (button.dataset.lightboxTool === "zoom") button.textContent = `放大 ${zoom}x`;
    });
    const annotator = $("#lightbox-annotator");
    if (annotator) {
      annotator.style.setProperty("--lightbox-zoom", zoom);
      annotator.style.setProperty("--lightbox-pan-x", `${state.lightboxPan.x}px`);
      annotator.style.setProperty("--lightbox-pan-y", `${state.lightboxPan.y}px`);
      annotator.classList.toggle("zoomed", zoom > 1);
      annotator.dataset.tool = state.lightboxTool || "";
    }
  }

  function annotationId() {
    return `anno_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function normalizeAnnotations(items) {
    return (Array.isArray(items) ? items : []).map((item) => ({ ...item, id: item.id || annotationId() }));
  }

  function renderAnnotations() {
    const svg = $("#annotation-layer");
    const textLayer = $("#annotation-text-layer");
    if (!svg || !textLayer) return;
    svg.innerHTML = state.lightboxDraftAnnotations
      .filter((item) => item.type === "draw" && item.points?.length > 1)
      .map((item) => {
        const points = item.points.map((point) => `${Number(point.x) * 100},${Number(point.y) * 100}`).join(" ");
        return `<polyline points="${esc(points)}" vector-effect="non-scaling-stroke"></polyline>`;
      }).join("");
    textLayer.innerHTML = state.lightboxDraftAnnotations
      .filter((item) => item.type === "text" && item.text)
      .map((item) => `<button type="button" class="${item.id === state.selectedAnnotationId ? "selected" : ""}" data-annotation-id="${esc(item.id)}" style="left:${Number(item.x) * 100}%;top:${Number(item.y) * 100}%">${esc(item.text)}</button>`)
      .join("");
  }

  function lightboxPoint(event) {
    const image = $("#lightbox-annotator img");
    if (!image) return null;
    const rect = image.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
    };
  }

  function beginLightboxPan(event) {
    const zoomed = state.lightboxZoomIndex > 0;
    if (!zoomed || state.lightboxTool !== "zoom") return false;
    if (event.target.closest("[data-annotation-id]")) return false;
    event.preventDefault();
    state.lightboxPanning = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: state.lightboxPan.x,
      originY: state.lightboxPan.y
    };
    $("#lightbox-annotator")?.setPointerCapture?.(event.pointerId);
    $("#lightbox-annotator")?.classList.add("is-panning");
    return true;
  }

  function moveLightboxPan(event) {
    if (!state.lightboxPanning || state.lightboxPanning.pointerId !== event.pointerId) return false;
    event.preventDefault();
    state.lightboxPan = {
      x: state.lightboxPanning.originX + event.clientX - state.lightboxPanning.startX,
      y: state.lightboxPanning.originY + event.clientY - state.lightboxPanning.startY
    };
    updateLightboxToolState();
    return true;
  }

  function endLightboxPan() {
    state.lightboxPanning = null;
    $("#lightbox-annotator")?.classList.remove("is-panning");
  }

  function beginAnnotation(event) {
    if (event.target.closest("[data-annotation-id]")) return;
    if (state.lightboxTool !== "draw") return;
    const point = lightboxPoint(event);
    if (!point) return;
    event.preventDefault();
    state.drawingAnnotation = { id: annotationId(), type: "draw", points: [point] };
    state.selectedAnnotationId = state.drawingAnnotation.id;
    state.lightboxDraftAnnotations.push(state.drawingAnnotation);
    renderAnnotations();
  }

  function moveAnnotation(event) {
    if (state.lightboxTool !== "draw" || !state.drawingAnnotation) return;
    const point = lightboxPoint(event);
    if (!point) return;
    event.preventDefault();
    state.drawingAnnotation.points.push(point);
    renderAnnotations();
  }

  function endAnnotation() {
    state.drawingAnnotation = null;
  }

  function addTextAnnotation(event) {
    if (event.target.closest("[data-annotation-id]")) return;
    if (state.lightboxTool !== "text") return;
    const point = lightboxPoint(event);
    if (!point) return;
    const text = window.prompt("输入图片备注");
    if (!text?.trim()) return;
    const annotation = { id: annotationId(), type: "text", x: point.x, y: point.y, text: text.trim() };
    state.lightboxDraftAnnotations.push(annotation);
    state.selectedAnnotationId = annotation.id;
    renderAnnotations();
  }

  function beginTextDrag(event) {
    const target = event.target.closest("[data-annotation-id]");
    if (!target) return false;
    const id = target.dataset.annotationId;
    const item = state.lightboxDraftAnnotations.find((annotation) => annotation.id === id);
    if (!item) return false;
    event.preventDefault();
    state.selectedAnnotationId = id;
    state.draggingTextAnnotation = { id };
    renderAnnotations();
    return true;
  }

  function moveTextAnnotation(event) {
    if (!state.draggingTextAnnotation) return false;
    const point = lightboxPoint(event);
    if (!point) return false;
    const item = state.lightboxDraftAnnotations.find((annotation) => annotation.id === state.draggingTextAnnotation.id);
    if (!item) return false;
    event.preventDefault();
    item.x = point.x;
    item.y = point.y;
    renderAnnotations();
    return true;
  }

  function endTextDrag() {
    state.draggingTextAnnotation = null;
  }

  function deleteSelectedAnnotation() {
    if (!state.selectedAnnotationId) return;
    state.lightboxDraftAnnotations = state.lightboxDraftAnnotations.filter((item) => item.id !== state.selectedAnnotationId);
    state.selectedAnnotationId = null;
    renderAnnotations();
  }

  function undoLastAnnotation() {
    state.lightboxDraftAnnotations.pop();
    state.selectedAnnotationId = null;
    renderAnnotations();
    $("#lightbox-caption").textContent = "已撤销最近一条备注，点击保存备注后生效";
  }

  function replaceMediaAnnotations(mediaId, annotations) {
    const nextAnnotations = normalizeAnnotations(annotations);
    (state.data.samples || []).forEach((sample) => {
      (sample.mediaList || []).forEach((media) => {
        if (String(media.id) === String(mediaId)) media.annotations = nextAnnotations;
      });
    });
    return nextAnnotations;
  }

  async function saveLightboxAnnotations() {
    const item = reviewMediaList()[state.lightboxIndex];
    if (!item?.id) return;
    const draftAnnotations = normalizeAnnotations(state.lightboxDraftAnnotations);
    try {
      $("#lightbox-caption").textContent = `${readableMediaLabel(item)} · 正在同步备注...`;
      const response = await syncData("updateMediaAnnotations", {
        mediaId: item.id,
        annotations: draftAnnotations
      });
      const result = response.result || {};
      state.lightboxDraftAnnotations = replaceMediaAnnotations(item.id, result.annotations || draftAnnotations);
      renderAnnotations();
      await loadSnapshot();
      const refreshedItem = reviewMediaList().find((media) => String(media.id) === String(item.id));
      if (refreshedItem) {
        state.lightboxDraftAnnotations = normalizeAnnotations(refreshedItem.annotations || state.lightboxDraftAnnotations);
        renderAnnotations();
      }
      $("#lightbox-caption").textContent = `${readableMediaLabel(refreshedItem || item)} · ✓ 备注已同步`;
      showMessage("图片备注已同步。", "ok");
    } catch (error) {
      console.error("保存图片备注失败", { mediaId: item.id, error });
      $("#lightbox-caption").textContent = `${readableMediaLabel(item)} · 备注同步失败：${error.message}`;
      showMessage(`保存图片备注失败：${error.message}`);
    }
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
    state.lightboxTool = "";
    state.lightboxZoomIndex = 0;
    state.lightboxDraftAnnotations = [];
    state.drawingAnnotation = null;
    state.selectedAnnotationId = null;
    state.draggingTextAnnotation = null;
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

  function allPreviewFiles() {
    const editingStyle = styleById(state.editingStyleId);
    const editingSample = state.data?.samples?.find((item) => item.styleId === editingStyle?.id);
    return [
      ...styleDocumentList(currentStyle(), currentSample()),
      ...(editingStyle ? styleDocumentList(editingStyle, editingSample) : []),
      ...reviewMediaList()
    ];
  }

  function openFilePreview(fileId) {
    const item = allPreviewFiles().find((file) => String(file.id) === String(fileId));
    if (!item) return;
    state.activePreviewFile = item;
    const type = canonicalFileType(item);
    const modal = $("#file-preview-modal");
    const title = $("#file-preview-title");
    const typeLabel = $("#file-preview-type");
    const download = $("#file-preview-download");
    const stage = $("#file-preview-stage");
    title.textContent = item.fileName || "已上传文件";
    typeLabel.textContent = `${fileTypeLabel(item)} · ${formatFileSize(item.fileSize)} · ${item.uploadedBy || "未记录"}`;
    download.href = item.url || "#";
    download.download = item.fileName || "download";
    if (type === "image") {
      stage.innerHTML = `<img src="${esc(item.url)}" alt="${esc(item.fileName)}" />`;
    } else if (type === "video") {
      stage.innerHTML = `<video src="${esc(item.url)}" controls autoplay></video>`;
    } else if (type === "pdf") {
      stage.innerHTML = item.url
        ? `<iframe src="${esc(item.url)}" title="${esc(item.fileName)}"></iframe>`
        : `<div class="file-preview-fallback"><strong>PDF 无法预览</strong><p>请下载查看。</p></div>`;
    } else {
      stage.innerHTML = `
        <div class="file-preview-fallback">
          <strong>${esc(fileIcon(item))}</strong>
          <p>${esc(item.fileName)} 暂不支持在线预览，请下载查看。</p>
          <a class="primary-button" href="${esc(item.url || "#")}" download="${esc(item.fileName)}">下载文件</a>
        </div>
      `;
    }
    modal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeFilePreview() {
    $("#file-preview-modal").hidden = true;
    $("#file-preview-stage").innerHTML = "";
    state.activePreviewFile = null;
    document.body.style.overflow = "";
  }

  function deleteLocalFile(fileId) {
    Object.keys(state.localStyleDocumentsByStyle).forEach((styleId) => {
      state.localStyleDocumentsByStyle[styleId] = state.localStyleDocumentsByStyle[styleId].filter((item) => item.id !== fileId);
    });
    Object.keys(state.localReviewMediaByStyle).forEach((styleId) => {
      state.localReviewMediaByStyle[styleId] = state.localReviewMediaByStyle[styleId].filter((item) => item.id !== fileId);
    });
    renderAll();
    renderStyleMaterialFiles();
  }

  function setMainDocument(fileId) {
    const styleId = Object.keys(state.localStyleDocumentsByStyle).find((key) => (
      state.localStyleDocumentsByStyle[key].some((item) => item.id === fileId)
    )) || state.editingStyleId || currentStyle()?.id || currentStyleKey();
    state.localStyleDocumentsByStyle[styleId] = localStyleDocuments(styleId).map((item) => ({
      ...item,
      isMainImage: item.id === fileId
    }));
    renderAll();
    renderStyleMaterialFiles();
    showMessage("款式主图已更新。", "ok");
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
        else reject(new Error(`文件上传失败：${xhr.status}`));
      };
      xhr.onerror = () => reject(new Error("文件上传失败：网络错误"));
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

  function addLocalStyleDocuments(category, files, styleId = currentStyleKey(), makeMain = false) {
    const style = styleById(styleId) || currentStyle();
    const review = currentReview();
    const now = new Date().toISOString();
    const uploadedBy = currentReviewerName(style, review) || "大前";
    const records = Array.from(files || []).filter(Boolean).map((file, index) => ({
      id: `local_doc_${Date.now()}_${index}_${Math.random().toString(16).slice(2)}`,
      styleId,
      category,
      fileName: file.name,
      fileType: file.type,
      mimeType: file.type,
      fileSize: file.size,
      url: URL.createObjectURL(file),
      uploadedBy,
      uploadedAt: now,
      isMainImage: makeMain || category === "style_cover",
      source: "local",
      raw: file
    }));
    if (!records.length) return [];
    const existing = localStyleDocuments(styleId).map((item) => (
      makeMain || category === "style_cover" ? { ...item, isMainImage: false } : item
    ));
    state.localStyleDocumentsByStyle[styleId] = [...existing, ...records];
    return records;
  }

  async function uploadMediaFiles(files) {
    const style = currentStyle();
    const review = currentReview();
    const uploadFiles = Array.from(files || []).filter(Boolean);
    if (!uploadFiles.length) return;
    const styleKey = style?.id || currentStyleKey();
    const now = new Date().toISOString();
    const uploadedBy = currentReviewerName(style, review) || "大前";
    const records = uploadFiles.map((file, index) => ({
      id: `local_review_${Date.now()}_${index}_${Math.random().toString(16).slice(2)}`,
      styleId: styleKey,
      reviewId: review?.id || "",
      category: canonicalFileType(file) === "video" ? "overall_video" : "review_media",
      fileName: file.name,
      fileType: file.type,
      mimeType: file.type,
      fileSize: file.size,
      url: URL.createObjectURL(file),
      uploadedBy,
      uploadedAt: now,
      relatedArea: "",
      source: "local",
      raw: file
    }));
    state.localReviewMediaByStyle[styleKey] = [...localReviewMedia(styleKey), ...records];
    state.selectedMediaId = records[0]?.id || state.selectedMediaId;
    $$("[data-media-upload-input]").forEach((input) => { input.value = ""; });
    $("#upload-status").dataset.tone = "success";
    $("#upload-status").textContent = `已添加 ${records.length} 个评审媒体文件。`;
    renderMedia();
  }

  async function saveMediaLabel(input) {
    const mediaId = input?.dataset.mediaLabelInput;
    const item = reviewMediaList().find((media) => media.id === mediaId);
    const name = String(input?.value || "").trim();
    if (!mediaId || !item || !name) return;
    if (item.source === "local") {
      Object.keys(state.localReviewMediaByStyle).forEach((styleId) => {
        state.localReviewMediaByStyle[styleId] = state.localReviewMediaByStyle[styleId].map((media) => (
          media.id === mediaId ? { ...media, fileName: name } : media
        ));
      });
      $("#upload-status").dataset.tone = "success";
      $("#upload-status").textContent = "媒体名称已更新。";
      renderMedia();
      return;
    }
    const nextLabel = labelWithCategory(item, name);
    if (nextLabel === item.label) return;
    input.disabled = true;
    try {
      await syncData("updateMediaLabel", { mediaId, label: nextLabel });
      $("#upload-status").dataset.tone = "success";
      $("#upload-status").textContent = "媒体名称已保存。";
      await loadSnapshot();
    } catch (error) {
      console.error("保存媒体名称失败", { mediaId, name, error });
      $("#upload-status").dataset.tone = "error";
      $("#upload-status").textContent = `名称保存失败：${error.message}`;
      showMessage(`名称保存失败：${error.message}`);
      input.disabled = false;
    }
  }

  async function saveMediaPart(select) {
    const mediaId = select?.dataset.mediaPartSelect;
    const item = reviewMediaList().find((media) => media.id === mediaId);
    if (!mediaId || !item) return;
    const name = mediaNameForEdit(item);
    if (item.source === "local") {
      Object.keys(state.localReviewMediaByStyle).forEach((styleId) => {
        state.localReviewMediaByStyle[styleId] = state.localReviewMediaByStyle[styleId].map((media) => (
          media.id === mediaId ? { ...media, category: select.value || "review_media" } : media
        ));
      });
      $("#upload-status").dataset.tone = "success";
      $("#upload-status").textContent = "媒体部位已更新。";
      renderMedia();
      return;
    }
    const nextLabel = select.value ? `[${select.value}] ${name}` : name;
    if (nextLabel === item.label) return;
    select.disabled = true;
    try {
      await syncData("updateMediaLabel", { mediaId, label: nextLabel });
      $("#upload-status").dataset.tone = "success";
      $("#upload-status").textContent = "媒体部位已保存。";
      await loadSnapshot();
    } catch (error) {
      console.error("保存媒体部位失败", { mediaId, label: nextLabel, error });
      $("#upload-status").dataset.tone = "error";
      $("#upload-status").textContent = `部位保存失败：${error.message}`;
      showMessage(`部位保存失败：${error.message}`);
      select.disabled = false;
    }
  }

  function fillIssueFromReview(index = null) {
    const rows = state.departmentReviewRows || [];
    const style = currentStyle();
    const review = currentReview();
    const row = Number.isInteger(index) ? rows[index] : myDepartmentRow(rows, style, review);
    const form = $("#issue-form");
    if (!form || !row) return;
    const selected = reviewMediaList().find((item) => item.id === state.selectedMediaId);
    const part = selected ? (mediaPartLabels[categoryFromLabel(selected)] || "未标注部位") : "未选择图片";
    state.pendingIssueContext = {
      department: row.department,
      reviewer: departmentReviewerNames(row, style)[0] || "",
      opinion: row.opinion || "",
      focus: reviewCardPlaceholder(row),
      mediaId: selected?.id || "",
      mediaLabel: selected ? readableMediaLabel(selected) : "",
      mediaPart: part
    };
    form.elements.title.value = `${row.department}评审问题 - ${part}`;
    form.elements.level.value = row.status === "fail" ? "major" : "normal";
    form.elements.department.value = row.department;
    form.scrollIntoView({ behavior: "smooth", block: "center" });
    showMessage(`已带入${row.department}、当前意见和当前图片，可补充 Issue 标题后提交。`, "ok");
  }

  async function uploadStyleImage(file) {
    const style = currentStyle();
    if (!file) return;
    addLocalStyleDocuments("style_cover", [file], style?.id || currentStyleKey(), true);
    renderAll();
    showMessage("款式主图已加入本地预览。", "ok");
  }

  function isMobileViewport() {
    return window.matchMedia("(max-width: 768px)").matches;
  }

  function applySidebarState(collapsed) {
    document.body.classList.toggle("sidebar-collapsed", collapsed);
    document.body.classList.toggle("sidebar-expanded", !collapsed);
    const toggle = $("#sidebar-toggle");
    if (toggle) {
      toggle.textContent = collapsed ? "›" : "‹";
      toggle.setAttribute("aria-label", collapsed ? "展开侧栏" : "收起侧栏");
      toggle.title = collapsed ? "展开侧栏" : "收起侧栏";
    }
  }

  function setSidebarCollapsed(collapsed, persist = true) {
    applySidebarState(collapsed);
    if (persist) {
      sidebarPreferenceSet = true;
      localStorage.setItem(sidebarStorageKey, collapsed ? "true" : "false");
    }
  }

  function initSidebarState() {
    const saved = localStorage.getItem(sidebarStorageKey);
    sidebarPreferenceSet = saved === "true" || saved === "false";
    applySidebarState(saved === "true");
    closeSidebarDrawer();
  }

  function openSidebarDrawer() {
    document.body.classList.add("sidebar-drawer-open");
    $("#sidebar-backdrop").hidden = false;
    $("#mobile-menu-button")?.setAttribute("aria-expanded", "true");
  }

  function closeSidebarDrawer() {
    document.body.classList.remove("sidebar-drawer-open");
    const backdrop = $("#sidebar-backdrop");
    if (backdrop) backdrop.hidden = true;
    $("#mobile-menu-button")?.setAttribute("aria-expanded", "false");
  }

  function switchView(viewName) {
    if (!$(`#${viewName}-view`)) return;
    $$(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === viewName));
    $$(".view").forEach((view) => view.classList.toggle("active", view.id === `${viewName}-view`));
    $("#view-title").textContent = $(`#${viewName}-view`).dataset.title;
    $$(".view-action").forEach((button) => {
      const hiddenViews = String(button.dataset.hideOn || "").split(/\s+/).filter(Boolean);
      button.hidden = hiddenViews.includes(viewName);
    });
    if (viewName === "review" && !sidebarPreferenceSet && !isMobileViewport()) {
      applySidebarState(true);
    }
    if (isMobileViewport()) closeSidebarDrawer();
    updateStatus();
    if (window.location.hash !== `#${viewName}`) {
      window.history.replaceState(null, "", `#${viewName}`);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function initViewFromHash() {
    const viewName = window.location.hash.replace("#", "");
    if (viewName) switchView(viewName);
  }

  function fillStyleForm(style) {
    const form = $("#style-form");
    const sample = state.data?.samples?.find((item) => item.styleId === style?.id);
    const review = state.data?.reviews?.find((item) => item.styleId === style?.id || item.sampleId === sample?.id);
    const owners = style?.owners || style?.profile?.owners || {};
    const roleOwners = {
      ...(owners.roleOwners || {}),
      ...(style?.profile?.owners?.roleOwners || {})
    };
    const values = {
      styleNo: style?.styleNo || "",
      styleName: style?.styleName || "",
      brand: style?.brand || "萨洛蒙",
      season: style?.season || "SS27",
      customer: style?.customer || style?.profile?.customer || "",
      route: style?.route || "normal",
      samplePhase: style?.samplePhase || sample?.samplePhase || "second_sample",
      sampleLocation: sample?.location || style?.sampleLocation || "样衣间",
      plannedShipDate: dateOnly(plannedDate(style, sample)),
      customerDeadline: dateOnly(style?.customerDeadline || style?.profile?.customerDeadline),
      orderMeetingDate: dateOnly(style?.orderMeetingDate || style?.profile?.orderMeetingDate),
      reviewObjective: style?.reviewObjective || style?.profile?.reviewObjective || "确认质量与工艺问题责任人，判断是否可寄样",
      businessOwner: owners.businessOwner || "",
      sampleOwner: owners.sampleOwner || "",
      gateOwner: owners.gateOwner || textOwner(style, review, "gateOwner", ""),
      finalApprover: owners.finalApprover || textOwner(style, review, "finalApprover", "杨总"),
      patternOwner: owners.patternOwner || "",
      processOwner: owners.processOwner || "",
      qcOwner: owners.qcOwner || "",
      bondingOwner: owners.bondingOwner || "",
      roleOwners
    };
    populateBrandSelect(values.brand);
    populateLocationSelect(values.sampleLocation);
    populateOwnerSelects(values);
    Object.entries(values).forEach(([name, value]) => {
      if (form.elements[name]) form.elements[name].value = value || "";
    });
  }

  function setStyleModalMode(mode, style = null) {
    const editing = mode === "edit";
    state.editingStyleId = editing ? style?.id : null;
    $("#style-modal-kicker").textContent = editing ? "款式资料维护" : "开发入口 / 款式资料初始化";
    $("#style-modal-title").textContent = editing ? "编辑款式资料" : "新建样衣评审款式";
    $("#style-modal-subtitle").textContent = editing ? "维护款式基础信息、责任人和客户前后资料" : "请先录入款式基础信息和开发资料";
    $("#style-create-submit").textContent = editing ? "保存资料" : "创建款式";
    $("#style-create-status").textContent = "";
    $("#style-cover-preview").innerHTML = "暂无主图";
  }

  function setStyleModalTab(tab = "edit") {
    const activeTab = tab === "materials" ? "materials" : "edit";
    $$("[data-style-modal-tab]").forEach((button) => {
      button.classList.toggle("active", button.dataset.styleModalTab === activeTab);
    });
    $$("[data-style-tab-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.styleTabPanel !== activeTab;
    });
    if (activeTab === "materials") renderStyleMaterialFiles();
  }

  function openStyleModal(styleId = null, tab = "edit") {
    const style = styleId ? styleById(styleId) : null;
    setStyleModalMode(style ? "edit" : "create", style);
    if (style) {
      fillStyleForm(style);
    } else {
      populateBrandSelect("萨洛蒙");
      populateLocationSelect("样衣间");
      populateOwnerSelects({
        finalApprover: "杨总"
      });
    }
    setStyleModalTab(tab);
    renderStyleMaterialFiles();
    $("#style-modal").hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeStyleModal() {
    $("#style-modal").hidden = true;
    $("#style-form").reset();
    populateBrandSelect("萨洛蒙");
    $("#style-form").season.value = "SS27";
    $("#style-form").samplePhase.value = "second_sample";
    populateLocationSelect("样衣间");
    $("#style-form").reviewObjective.value = "确认质量与工艺问题责任人，判断是否可寄样";
    populateOwnerSelects({ finalApprover: "杨总" });
    state.styleInitFiles = {};
    state.editingStyleId = null;
    setStyleModalMode("create");
    setStyleModalTab("edit");
    setFieldErrors($("#style-form"), {});
    document.body.style.overflow = "";
  }

  function openPersonModal(personId = null) {
    const person = personId ? allUsers().find((user) => user.id === personId) : null;
    state.editingPersonId = person?.id || null;
    $("#person-modal-title").textContent = person ? "分配人员" : "新增人员";
    const form = $("#person-form");
    form.reset();
    form.elements.namedItem("name").value = person?.name || "";
    form.elements.namedItem("department").value = person?.department || "";
    renderPersonModalOptions(person);
    $("#person-save-status").textContent = "";
    setFieldErrors(form, {});
    $("#person-modal").hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closePersonModal() {
    $("#person-modal").hidden = true;
    $("#person-form").reset();
    $("#person-save-status").textContent = "";
    state.editingPersonId = null;
    document.body.style.overflow = "";
  }

  function jumpToReviewSection(styleId, selector) {
    if (styleId) state.selectedStyleId = styleId;
    renderAll();
    switchView("review");
    window.requestAnimationFrame(() => {
      const target = selector ? document.querySelector(selector) : document.querySelector("#review-view");
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function bindEvents() {
    document.addEventListener("click", async (event) => {
      const nav = event.target.closest("[data-view]");
      if (nav) switchView(nav.dataset.view);

      const roadmapNode = event.target.closest("[data-roadmap-action]");
      if (roadmapNode) {
        const action = roadmapNode.dataset.roadmapAction;
        if (action === "review") jumpToReviewSection(roadmapNode.dataset.roadmapStyle, "#review-summary");
        if (action === "issues") jumpToReviewSection(roadmapNode.dataset.roadmapStyle, ".issue-panel");
        if (action === "final") jumpToReviewSection(roadmapNode.dataset.roadmapStyle, ".final-approval-panel");
      }

      const pipelineMode = event.target.closest("[data-pipeline-view-mode]");
      if (pipelineMode) {
        state.pipelineViewMode = pipelineMode.dataset.pipelineViewMode || "cards";
        renderPipeline();
        updateStatus();
      }

      const roadmapToggle = event.target.closest("[data-toggle-roadmap]");
      if (roadmapToggle) {
        const styleId = roadmapToggle.dataset.toggleRoadmap;
        state.expandedRoadmaps[styleId] = !state.expandedRoadmaps[styleId];
        renderPipeline();
      }

      const styleEditorButton = event.target.closest("[data-open-style-editor]");
      if (styleEditorButton) openStyleModal(styleEditorButton.dataset.openStyleEditor, "edit");

      const styleMaterialsButton = event.target.closest("[data-open-style-materials]");
      if (styleMaterialsButton) openStyleModal(styleMaterialsButton.dataset.openStyleMaterials, "materials");

      const openReview = event.target.closest("[data-open-review]");
      if (openReview) {
        state.selectedStyleId = openReview.dataset.openReview;
        renderAll();
        switchView("review");
      }

      const calendarOpen = event.target.closest("[data-calendar-open-style]");
      if (calendarOpen) {
        state.selectedStyleId = calendarOpen.dataset.calendarOpenStyle;
        renderAll();
        switchView("review");
      }

      const deleteStyleButton = event.target.closest("[data-delete-style]");
      if (deleteStyleButton) deleteStyle(deleteStyleButton.dataset.deleteStyle);

      const editPersonButton = event.target.closest("[data-edit-person]");
      if (editPersonButton) openPersonModal(editPersonButton.dataset.editPerson);

      const deletePersonButton = event.target.closest("[data-delete-person]");
      if (deletePersonButton) deletePersonRecord(deletePersonButton.dataset.deletePerson);

      const editBrandButton = event.target.closest("[data-edit-brand]");
      if (editBrandButton) openBrandModal(editBrandButton.dataset.editBrand);

      const removePermissionButton = event.target.closest("[data-role-remove-permission]");
      if (removePermissionButton) {
        const roleId = removePermissionButton.dataset.roleRemovePermission;
        const index = Number(removePermissionButton.dataset.index);
        updateRoleTemplate(roleId, (role) => role.permissions.splice(index, 1), "关键权限已删除");
      }

      const addPermissionButton = event.target.closest("[data-role-add-permission]");
      if (addPermissionButton) {
        const roleId = addPermissionButton.dataset.roleAddPermission;
        const input = document.querySelector(`[data-role-permission-input="${CSS.escape(roleId)}"]`);
        const value = input?.value?.trim();
        if (value) updateRoleTemplate(roleId, (role) => role.permissions.push(value), "关键权限已添加");
      }

      const removePersonButton = event.target.closest("[data-role-remove-person]");
      if (removePersonButton) {
        const roleId = removePersonButton.dataset.roleRemovePerson;
        const person = removePersonButton.dataset.person;
        await updateRoleTemplate(roleId, (role) => {
          role.people = role.people.filter((item) => item !== person);
        }, "分配人员已移除");
        await syncPersonRoleRecord(person, roleId, false);
        await loadSnapshot();
      }

      const addPersonButton = event.target.closest("[data-role-add-person]");
      if (addPersonButton) {
        const roleId = addPersonButton.dataset.roleAddPerson;
        const select = document.querySelector(`[data-role-person-select="${CSS.escape(roleId)}"]`);
        const person = select?.value;
        if (person) {
          await updateRoleTemplate(roleId, (role) => role.people.push(person), "分配人员已添加");
          await syncPersonRoleRecord(person, roleId, true);
          await loadSnapshot();
        }
      }

      const addOptionalReviewButton = event.target.closest("[data-add-optional-review]");
      if (addOptionalReviewButton) {
        const roleId = addOptionalReviewButton.dataset.addOptionalReview;
        if (roleId) {
          const styleKey = currentStyle()?.id || "";
          const current = state.optionalDepartmentRoleIdsByStyle[styleKey] || [];
          if (!current.includes(roleId)) state.optionalDepartmentRoleIdsByStyle[styleKey] = [...current, roleId];
          renderDepartments();
          showMessage("已加入按需评审，请填写意见后保存。", "ok");
        }
      }

      const saveDepartmentButton = event.target.closest("[data-save-department]");
      if (saveDepartmentButton) saveDepartment(Number(saveDepartmentButton.dataset.saveDepartment));

      const submitReviewButton = event.target.closest("[data-submit-review]");
      if (submitReviewButton) {
        const index = Number(submitReviewButton.dataset.submitReview);
        const card = $(`.my-review-card[data-department-index="${index}"]`);
        const select = card?.querySelector("[data-review-status]");
        if (select && select.value === "pending") select.value = "pass";
        saveDepartment(index);
      }

      const reviewToIssueButton = event.target.closest("[data-review-to-issue]");
      if (reviewToIssueButton) {
        const rawIndex = reviewToIssueButton.dataset.reviewToIssue;
        fillIssueFromReview(rawIndex === undefined || rawIndex === "" ? null : Number(rawIndex));
      }

      const scrollMyReviewButton = event.target.closest("[data-scroll-my-review]");
      if (scrollMyReviewButton) $("#my-review-task")?.scrollIntoView({ behavior: "smooth", block: "center" });

      const closeIssueButton = event.target.closest("[data-close-issue]");
      if (closeIssueButton) closeIssue(closeIssueButton.dataset.closeIssue);

      const verifyIssueButton = event.target.closest("[data-verify-issue]");
      if (verifyIssueButton) markIssueReadyForVerification(verifyIssueButton.dataset.verifyIssue);

      const deleteMediaButton = event.target.closest("[data-delete-media]");
      if (deleteMediaButton) {
        const mediaId = deleteMediaButton.dataset.deleteMedia;
        const item = reviewMediaList().find((media) => media.id === mediaId);
        if (item?.source === "local") deleteLocalFile(mediaId);
        else deleteMedia(mediaId);
      }

      const openMediaButton = event.target.closest("[data-open-media]");
      if (openMediaButton) openMediaLightbox(openMediaButton.dataset.openMedia);

      const selectMediaButton = event.target.closest("[data-select-media]");
      if (selectMediaButton) {
        state.selectedMediaId = selectMediaButton.dataset.selectMedia;
        renderMedia();
      }

      const previewFileButton = event.target.closest("[data-preview-file]");
      if (previewFileButton) openFilePreview(previewFileButton.dataset.previewFile);

      const deleteLocalFileButton = event.target.closest("[data-delete-local-file]");
      if (deleteLocalFileButton) deleteLocalFile(deleteLocalFileButton.dataset.deleteLocalFile);

      const setMainButton = event.target.closest("[data-set-main-document]");
      if (setMainButton) setMainDocument(setMainButton.dataset.setMainDocument);
    });

    document.addEventListener("focusout", (event) => {
      const input = event.target.closest("[data-media-label-input]");
      if (input) saveMediaLabel(input);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && document.body.classList.contains("sidebar-drawer-open")) closeSidebarDrawer();
      const input = event.target.closest("[data-media-label-input]");
      if (!input || event.key !== "Enter") return;
      event.preventDefault();
      input.blur();
    });

    document.addEventListener("change", (event) => {
      const mediaPart = event.target.closest("[data-media-part-select]");
      if (mediaPart) saveMediaPart(mediaPart);
    });

    document.addEventListener("change", (event) => {
      const reviewerTaskSelect = event.target.closest("#reviewer-task-select");
      if (!reviewerTaskSelect) return;
      const styleKey = currentStyle()?.id || "";
      state.selectedReviewTaskKeyByStyle[styleKey] = reviewerTaskSelect.value;
      renderDepartments();
    });

    $("#new-style-button").addEventListener("click", () => openStyleModal());
    $("#sidebar-toggle").addEventListener("click", () => {
      setSidebarCollapsed(!document.body.classList.contains("sidebar-collapsed"), true);
    });
    $("#mobile-menu-button").addEventListener("click", openSidebarDrawer);
    $("#sidebar-backdrop").addEventListener("click", closeSidebarDrawer);
    $("#add-person").addEventListener("click", () => openPersonModal());
    $("#add-brand").addEventListener("click", () => openBrandModal());
    $("#style-modal-close").addEventListener("click", closeStyleModal);
    $("#style-modal-cancel").addEventListener("click", closeStyleModal);
    $$("[data-style-modal-tab]").forEach((button) => {
      button.addEventListener("click", () => setStyleModalTab(button.dataset.styleModalTab));
    });
    $("#style-modal").addEventListener("click", (event) => {
      if (event.target.id === "style-modal") closeStyleModal();
    });
    $("#style-form").brand.addEventListener("input", () => populateOwnerSelects(selectedValuesFromForm($("#style-form"))));
    $("#style-form").route.addEventListener("change", () => populateOwnerSelects(selectedValuesFromForm($("#style-form"))));
    $("#toggle-optional-owners").addEventListener("click", () => {
      setOptionalOwnerPanelVisible($("#optional-owner-panel").hidden);
    });
    $("#style-form").addEventListener("submit", (event) => {
      event.preventDefault();
      createStyleFromForm(event.currentTarget);
    });
    $("#person-modal-close").addEventListener("click", closePersonModal);
    $("#person-modal-cancel").addEventListener("click", closePersonModal);
    $("#person-modal").addEventListener("click", (event) => {
      if (event.target.id === "person-modal") closePersonModal();
    });
    $("#person-form").addEventListener("submit", (event) => {
      event.preventDefault();
      savePersonFromForm(event.currentTarget);
    });
    $("#brand-modal-close").addEventListener("click", closeBrandModal);
    $("#brand-modal-cancel").addEventListener("click", closeBrandModal);
    $("#brand-modal").addEventListener("click", (event) => {
      if (event.target.id === "brand-modal") closeBrandModal();
    });
    $("#brand-form").addEventListener("submit", (event) => {
      event.preventDefault();
      saveBrandFromForm(event.currentTarget);
    });
    document.addEventListener("change", (event) => {
      const finalRelease = event.target.closest("[data-role-final-release]");
      if (finalRelease) {
        updateRoleTemplate(finalRelease.dataset.roleFinalRelease, (role) => {
          role.finalRelease = finalRelease.value;
        }, "最终放行权限已更新");
      }
      const exceptionRelease = event.target.closest("[data-role-exception-release]");
      if (exceptionRelease) {
        updateRoleTemplate(exceptionRelease.dataset.roleExceptionRelease, (role) => {
          role.exceptionRelease = exceptionRelease.value;
        }, "例外放行权限已更新");
      }
    });

    $("#reload-data").addEventListener("click", loadSnapshot);
    $("#review-brand-filter").addEventListener("change", (event) => {
      state.reviewBrandFilter = event.currentTarget.value;
      ensureSelectedStyleVisible();
      renderAll();
    });
    $("#review-style-filter").addEventListener("input", (event) => {
      state.reviewStyleFilter = event.currentTarget.value;
      ensureSelectedStyleVisible();
      renderAll();
    });
    $("#review-style-select").addEventListener("change", (event) => {
      if (!event.currentTarget.value) return;
      state.selectedStyleId = event.currentTarget.value;
      renderAll();
    });
    $("#review-filter-clear").addEventListener("click", () => {
      state.reviewBrandFilter = "";
      state.reviewStyleFilter = "";
      ensureSelectedStyleVisible();
      renderAll();
    });
    $("#toggle-review-filter").addEventListener("click", () => {
      const filter = $("#review-filter-body");
      filter.hidden = !filter.hidden;
      $("#toggle-review-filter").textContent = filter.hidden ? "切换款式" : "收起切换";
    });
    $("#toggle-style-documents").addEventListener("click", () => {
      const styleKey = currentStyle()?.id || currentStyleKey();
      state.documentsExpandedByStyle[styleKey] = !state.documentsExpandedByStyle[styleKey];
      renderStyleDocuments();
    });
    $("#calendar-brand-filter").addEventListener("change", (event) => {
      state.calendarBrandFilter = event.currentTarget.value;
      renderCalendar();
    });
    $("#calendar-season-filter").addEventListener("change", (event) => {
      state.calendarSeasonFilter = event.currentTarget.value;
      renderCalendar();
    });
    $("#calendar-stage-filter").addEventListener("change", (event) => {
      state.calendarStageFilter = event.currentTarget.value;
      renderCalendar();
    });
    $("#calendar-location-filter").addEventListener("change", (event) => {
      state.calendarLocationFilter = event.currentTarget.value;
      renderCalendar();
    });
    $("#calendar-route-filter").addEventListener("change", (event) => {
      state.calendarRouteFilter = event.currentTarget.value;
      renderCalendar();
    });
    $("#calendar-week-only").addEventListener("change", (event) => {
      state.calendarWeekOnly = event.currentTarget.checked;
      renderCalendar();
    });
    $("#calendar-risk-only").addEventListener("change", (event) => {
      state.calendarRiskOnly = event.currentTarget.checked;
      renderCalendar();
    });
    $("#calendar-mine-only").addEventListener("change", (event) => {
      state.calendarMineOnly = event.currentTarget.checked;
      renderCalendar();
    });
    $("#calendar-filter-toggle").addEventListener("click", () => {
      state.calendarFiltersOpen = !state.calendarFiltersOpen;
      renderCalendar();
    });
    $("#calendar-month-toggle").addEventListener("click", () => {
      state.calendarMonthOpen = !state.calendarMonthOpen;
      renderCalendar();
    });
    $("#calendar-filter-clear").addEventListener("click", () => {
      state.calendarBrandFilter = "";
      state.calendarSeasonFilter = "";
      state.calendarStageFilter = "";
      state.calendarLocationFilter = "";
      state.calendarRouteFilter = "";
      state.calendarWeekOnly = false;
      state.calendarRiskOnly = false;
      state.calendarMineOnly = false;
      renderCalendar();
    });
    $("#lightbox-close").addEventListener("click", closeMediaLightbox);
    $("#lightbox-prev").addEventListener("click", () => moveLightbox(-1));
    $("#lightbox-next").addEventListener("click", () => moveLightbox(1));
    $("#lightbox-save-annotations").addEventListener("click", saveLightboxAnnotations);
    $("#lightbox-delete-annotation").addEventListener("click", deleteSelectedAnnotation);
    $("#lightbox-undo-annotation").addEventListener("click", undoLastAnnotation);
    $("#lightbox-tools").addEventListener("click", (event) => {
      const button = event.target.closest("[data-lightbox-tool]");
      if (!button) return;
      const tool = button.dataset.lightboxTool;
      if (tool === "zoom") {
        state.lightboxZoomIndex = (state.lightboxZoomIndex + 1) % 4;
        state.lightboxTool = state.lightboxZoomIndex ? "zoom" : "";
        if (!state.lightboxZoomIndex) state.lightboxPan = { x: 0, y: 0 };
      } else {
        state.lightboxTool = state.lightboxTool === tool ? "" : tool;
      }
      updateLightboxToolState();
    });
    $("#lightbox-stage").addEventListener("pointerdown", (event) => {
      if (beginLightboxPan(event)) return;
      if (beginTextDrag(event)) return;
      beginAnnotation(event);
      addTextAnnotation(event);
    });
    $("#lightbox-stage").addEventListener("pointermove", (event) => {
      if (moveLightboxPan(event)) return;
      if (moveTextAnnotation(event)) return;
      moveAnnotation(event);
    });
    document.addEventListener("pointerup", () => {
      endLightboxPan();
      endTextDrag();
      endAnnotation();
    });
    $("#media-lightbox").addEventListener("click", (event) => {
      if (event.target.id === "media-lightbox") closeMediaLightbox();
    });
    $("#file-preview-close").addEventListener("click", closeFilePreview);
    $("#file-preview-modal").addEventListener("click", (event) => {
      if (event.target.id === "file-preview-modal") closeFilePreview();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !$("#media-lightbox").hidden) closeMediaLightbox();
      if (event.key === "Escape" && !$("#file-preview-modal").hidden) closeFilePreview();
      if (event.key === "Escape" && document.body.classList.contains("sidebar-drawer-open")) closeSidebarDrawer();
      if (event.key === "ArrowLeft") moveLightbox(-1);
      if (event.key === "ArrowRight") moveLightbox(1);
    });
    $("#media-lightbox").addEventListener("touchstart", (event) => {
      if (state.lightboxTool) return;
      state.touchStartX = event.touches?.[0]?.clientX ?? null;
    }, { passive: true });
    $("#media-lightbox").addEventListener("touchend", (event) => {
      if (state.lightboxTool) return;
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
      const files = Array.from(mediaInput.files || []).filter((file) => {
        const key = `${file.name}:${file.size}:${file.lastModified}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      uploadMediaFiles(files);
    });

    document.addEventListener("change", (event) => {
      const input = event.target.closest("[data-style-init-file]");
      if (!input) return;
      const category = input.dataset.styleInitFile;
      const files = Array.from(input.files || []);
      const acceptedFiles = category === "style_cover" ? files.slice(0, 1) : files;
      state.styleInitFiles[category] = acceptedFiles;
      const styleKey = state.editingStyleId || "__draft__";
      const added = addLocalStyleDocuments(category, acceptedFiles, styleKey, category === "style_cover");
      const count = localStyleDocuments(styleKey).length;
      $("#style-create-status").dataset.tone = "success";
      $("#style-create-status").textContent = added.length ? `已添加 ${added.length} 个资料文件，当前共 ${count} 个文件。` : "";
      if (category === "style_cover") {
        const file = acceptedFiles[0];
        $("#style-cover-preview").innerHTML = file
          ? `<img src="${esc(added[0]?.url || URL.createObjectURL(file))}" alt="款式主图预览" />`
          : "暂无主图";
      }
      renderStyleMaterialFiles();
      renderAll();
      input.value = "";
    });

    $("#final-approve").addEventListener("click", () => submitFinalDecision("approve_to_send"));
    $("#final-hold").addEventListener("click", () => submitFinalDecision("hold_shipment"));
    document.addEventListener("change", (event) => {
      const input = event.target.closest("[data-style-image-upload]");
      if (!input) return;
      uploadStyleImage(input.files?.[0]);
      input.value = "";
    });
    window.addEventListener("resize", () => {
      if (!isMobileViewport()) closeSidebarDrawer();
    });
  }

  initSidebarState();
  bindEvents();
  state.data = state.data || {};
  renderSettings();
  updateStatus();
  initViewFromHash();
  loadSnapshot();
})();
