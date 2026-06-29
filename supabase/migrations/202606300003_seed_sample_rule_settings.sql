insert into public.sample_settings (org_id, key, value)
select o.id, seed.key, seed.value::jsonb
from public.organizations o
cross join (values
  ('issueLevelRules', '{
    "minor": { "label": "轻微", "shipmentRule": "可寄样，但必须记录", "systemAction": "不锁寄样按钮" },
    "normal": { "label": "一般", "shipmentRule": "评审负责人判断是否修改后寄样", "systemAction": "提示风险" },
    "major": { "label": "重大", "shipmentRule": "默认阻止寄样，除非例外放行", "systemAction": "锁定寄样按钮，需例外放行人审批" },
    "critical": { "label": "严重", "shipmentRule": "必须暂停寄样，整改复验后重新评审", "systemAction": "锁定寄样按钮，不允许普通放行" }
  }'),
  ('sampleLocations', '[
    { "name": "开发车间", "description": "制作或返修中", "defaultHolder": "打样部", "changeReason": "制作/返修" },
    { "name": "样衣间", "description": "待评审或保管", "defaultHolder": "样衣管理员", "changeReason": "待评审/保管" },
    { "name": "业务", "description": "寄样准备", "defaultHolder": "业务负责人", "changeReason": "寄样准备" },
    { "name": "客户", "description": "客户已收到", "defaultHolder": "客户", "changeReason": "已送样" },
    { "name": "快递", "description": "寄出途中", "defaultHolder": "快递单号", "changeReason": "寄出中" },
    { "name": "新长江", "description": "新长江执行打样", "defaultHolder": "夏红霞", "changeReason": "压胶打样" },
    { "name": "压胶车间", "description": "压胶验证", "defaultHolder": "张部长", "changeReason": "压胶验证" },
    { "name": "待返修", "description": "问题整改中", "defaultHolder": "责任部门", "changeReason": "问题整改" },
    { "name": "已寄出", "description": "交样完成", "defaultHolder": "业务", "changeReason": "交样完成" }
  ]'),
  ('sampleLocationOptions', '[
    { "id": "xinchangjiang_sample_room", "label": "新长江工厂打样间", "recommendedRoute": "bonding_xinchangjiang" },
    { "id": "office_sample_room", "label": "事务所打样间", "recommendedRoute": "normal" },
    { "id": "outsourced_sample", "label": "外发打样", "recommendedRoute": "outsourced" },
    { "id": "rudong_factory_sample_room", "label": "如东工厂打样间", "recommendedRoute": "rudong_factory" }
  ]'),
  ('sampleRoutes', '{
    "normal": "普通款式",
    "bonding_xinchangjiang": "压胶 / 新长江款式",
    "outsourced": "外发款式",
    "rudong_factory": "如东工厂款式"
  }'),
  ('samplePhases', '{
    "first_sample": "一次样",
    "second_sample": "二次样",
    "third_sample": "三次样",
    "sms": "SMS / 销售样",
    "pp": "PP / 产前样",
    "qc_sample": "QC 样",
    "top_sample": "TOP 样"
  }'),
  ('routeRules', '{
    "normal": { "label": "普通款式", "nodes": ["业务收资料", "版子/面料/辅料并行准备", "王部长确认资料", "大戴分配打样", "打样完成", "样衣评审"] },
    "bonding_xinchangjiang": { "label": "压胶 / 新长江款式", "nodes": ["业务收资料", "版子/面料/辅料并行准备", "王部长确认资料", "张部长确认压胶开发", "夏红霞分配打样", "新长江/压胶打样完成", "样衣评审"] },
    "outsourced": { "label": "外发款式", "nodes": ["业务收资料", "版子/面料/辅料并行准备", "王部长确认资料", "外发负责人确认", "外发打样完成", "样衣评审"] },
    "rudong_factory": { "label": "如东工厂款式", "nodes": ["业务收资料", "版子/面料/辅料并行准备", "王部长确认资料", "如东工厂负责人确认", "如东打样完成", "样衣评审"] }
  }'),
  ('ruleVersion', '{ "name": "Sample OS Rules V0.4", "updatedAt": "2026-06-30", "updatedBy": "Supabase", "status": "线上同步" }'),
  ('locationTransitions', '[
    { "from": "开发车间", "to": "样衣间", "allowedBy": "打样部", "scanRequired": true, "reasonRequired": false, "timeline": true },
    { "from": "样衣间", "to": "业务", "allowedBy": "业务 / 样衣管理员", "scanRequired": true, "reasonRequired": false, "timeline": true },
    { "from": "业务", "to": "快递", "allowedBy": "业务", "scanRequired": true, "reasonRequired": true, "timeline": true },
    { "from": "任意位置", "to": "待返修", "allowedBy": "评审负责人 / 品质", "scanRequired": false, "reasonRequired": true, "timeline": true }
  ]'),
  ('trainingCards', '[
    "业务评审员职责卡",
    "版师评审员职责卡",
    "品质评审员职责卡",
    "工艺评审员职责卡",
    "IE 评审员职责卡",
    "打样评审员职责卡",
    "问题等级判断训练",
    "意见转问题示例",
    "培训小考"
  ]')
) as seed(key, value)
on conflict (org_id, key) do update
set value = excluded.value,
    updated_at = now();
