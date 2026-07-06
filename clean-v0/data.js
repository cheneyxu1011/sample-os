window.CLEAN_SAMPLE_OS_DATA = {
  style: {
    styleId: "style_212",
    brand: "萨洛蒙",
    styleNo: "212",
    name: "户外冲锋衣",
    season: "SS27",
    sampleStage: "二次样",
    status: "评审中",
    currentGate: "Sample Review Gate",
    location: "样衣间",
    sampleDate: "2026-06-30",
    gateOwner: "大前",
    preparationGateOwner: "王部长",
    finalApprover: "杨总"
  },
  departments: [
    { id: "design", name: "设计", owner: "设计部" },
    { id: "pattern", name: "版型", owner: "版房" },
    { id: "fabric", name: "面料", owner: "面料部" },
    { id: "craft", name: "工艺", owner: "工艺部" },
    { id: "quality", name: "品质", owner: "品控部" },
    { id: "business", name: "业务", owner: "业务部" }
  ],
  issueRules: [
    { level: "轻微", blocksShipping: false, note: "记录跟进，不阻止寄样。" },
    { level: "一般", blocksShipping: false, note: "需负责人确认，可继续寄样。" },
    { level: "重大", blocksShipping: true, note: "必须关闭或降级后才能寄样。" },
    { level: "严重", blocksShipping: true, note: "立即阻止寄样，需要最终审批。" }
  ]
};
