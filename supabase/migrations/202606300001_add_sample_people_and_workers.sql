create table if not exists public.sample_people (
  org_id uuid not null references public.organizations(id) on delete cascade,
  id text not null,
  name text not null,
  department text,
  role_name text,
  current_responsibility text,
  review_responsibility text,
  permissions text[] not null default '{}',
  scope text[] not null default '{}',
  avatar_color text,
  enabled boolean not null default true,
  is_gate_owner boolean not null default false,
  is_final_approver boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (org_id, id)
);

create table if not exists public.sample_workers (
  org_id uuid not null references public.organizations(id) on delete cascade,
  id text not null,
  name text not null,
  department text,
  contact text,
  route text,
  skill text,
  status text not null default '可派发',
  task_count integer not null default 0,
  last_completed_at text,
  priority text,
  note text,
  avatar_color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (org_id, id)
);

alter table public.sample_people enable row level security;
alter table public.sample_workers enable row level security;

grant select, insert, update, delete on public.sample_people, public.sample_workers to authenticated;

drop policy if exists "members can manage sample people" on public.sample_people;
create policy "members can manage sample people"
on public.sample_people for all
to authenticated
using (org_id in (select public.current_profile_org_ids()))
with check (org_id in (select public.current_profile_org_ids()));

drop policy if exists "members can manage sample workers" on public.sample_workers;
create policy "members can manage sample workers"
on public.sample_workers for all
to authenticated
using (org_id in (select public.current_profile_org_ids()))
with check (org_id in (select public.current_profile_org_ids()));

insert into public.sample_people (
  org_id, id, name, department, role_name, current_responsibility, review_responsibility,
  permissions, scope, avatar_color, enabled, is_gate_owner, is_final_approver
)
select o.id, seed.id, seed.name, seed.department, seed.role_name, seed.current_responsibility, seed.review_responsibility,
  seed.permissions, seed.scope, seed.avatar_color, true, seed.is_gate_owner, seed.is_final_approver
from public.organizations o
cross join (values
  ('user_guyao', '顾瑶', '业务部', '业务负责人', '收到客户信息后发起开发准备', '确认客户邮件、技术包、物料清单、交期和寄样目的', array['发起开发','提交意见','创建问题','申请寄样'], array['萨洛蒙'], 'guyao', false, false),
  ('user_guyonghong', '顾永宏', '业务部', '业务负责人', '补齐客户要求和交样日期', '补充寄样目的和风险说明', array['补充资料','提交意见','创建问题'], array['萨洛蒙'], 'guyonghong', false, false),
  ('user_xuhaiyan', '徐海燕', '打版组', '版型评审员', '确认版子完整并安排处理', '评审版型、尺寸、公差、结构、纸样与实物一致性', array['版型评审','创建问题','复验问题'], array['版子'], 'xu', false, false),
  ('user_liweihong', '李卫红', '打样面料', '面料负责人', '确认开发样所需面料', '确认面料齐套、颜色、批次和缩率风险', array['面料确认','创建问题','更新状态'], array['面料'], 'liweihong', false, false),
  ('user_dahong', '大红', '打样辅料', '辅料负责人', '确认拉链、扣具、织带等辅料', '确认辅料规格、颜色、功能和齐套性', array['辅料确认','创建问题','更新状态'], array['辅料'], 'dahong', false, false),
  ('user_wangbu', '王部长', '开发管理', '资料确认人 / 评审负责人', '确认资料齐套并推进派发打样', '可主持样衣评审并确认寄样结论', array['资料确认','推进打样','组织评审','最终放行'], array['准备闸口','样衣评审'], 'wangbu', true, false),
  ('user_dadai', '大戴', '打样间', '打样派发人', '负责普通款式打样人员分配', '反馈普通打样过程异常', array['派发打样','普通打样','提交异常'], array['普通打样'], 'dadai', false, false),
  ('user_zhangbu', '张部长', '新长江工厂', '压胶开发负责人', '确认压胶开发和工艺风险', '评审压胶参数、胶带匹配和量产稳定性', array['压胶开发','创建问题','要求验证'], array['压胶开发'], 'zhang', false, false),
  ('user_xiahongxia', '夏红霞', '新长江工厂', '新长江派发人', '负责新长江打样人员分配', '反馈新长江打样执行异常', array['新长江派发','派发打样','提交异常'], array['新长江派发'], 'xia', false, false),
  ('user_daqian', '大前', '品质管理', '评审负责人', '质量判断、问题阻断、整改复验', '主持评审、确认问题闭环、决定普通寄样结论', array['评审负责人','复验问题','最终放行'], array['样衣评审','质量放行'], 'zhao', true, false),
  ('user_yang', '杨总', '管理层', '例外放行审批人', '处理例外放行和重大争议', '批准重大问题下的例外放行', array['例外放行','争议裁决'], array['例外放行'], 'wangayi', false, true),
  ('user_zhao', '赵经理', '品质部', '质量评审员', '识别质量问题并复验', '外观、历史问题、测试和复验要求', array['提交意见','创建问题','复验问题'], array['样衣评审'], 'zhao', false, false),
  ('user_chen', '陈工艺', '工艺部', '工艺评审员', '确认工艺可行性', '缝制、压胶、工艺可行性、量产难点', array['提交意见','创建问题'], array['样衣评审'], 'chen', false, false),
  ('user_mike', '麦克', '工业工程部', '工业工程评审员', '评估工时瓶颈和量产风险', '工序、工时、夹具专机、产能风险', array['提交意见'], array['样衣评审'], 'mike', false, false),
  ('user_lishifu', '李师傅', '打样部', '打样反馈人', '上传样衣并反馈打样异常', '资料不清、材料不齐、实际制作异常', array['提交意见','创建问题'], array['样衣评审'], 'li', false, false)
) as seed(id, name, department, role_name, current_responsibility, review_responsibility, permissions, scope, avatar_color, is_gate_owner, is_final_approver)
on conflict (org_id, id) do nothing;

insert into public.sample_workers (
  org_id, id, name, department, route, skill, status, task_count, last_completed_at, avatar_color
)
select o.id, seed.id, seed.name, seed.department, seed.route, seed.skill, seed.status, seed.task_count, seed.last_completed_at, seed.avatar_color
from public.organizations o
cross join (values
  ('worker_liayi', '李阿姨', '打样部', '普通打样', '梭织 / 修改', '可派发', 1, '昨天完成', 'liayi'),
  ('worker_zhangayi', '张阿姨', '打样部', '普通打样', '针织 / 小样验证', '忙碌', 3, '今天 16:00', 'zhangayi'),
  ('worker_wangayi', '王阿姨', '打样部', '普通打样', '梭织 / 返修', '可派发', 0, '06-28 完成', 'wangayi'),
  ('worker_zhuxiaoli', '朱晓丽', '新长江工厂', '新长江压胶', '压胶 / 小样验证', '可派发', 2, '今天上午', 'zhuxiaoli')
) as seed(id, name, department, route, skill, status, task_count, last_completed_at, avatar_color)
on conflict (org_id, id) do nothing;
