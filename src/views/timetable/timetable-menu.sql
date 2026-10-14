-- 课程表管理：可见业务菜单初始化（MySQL，需手动执行，可重复执行）
--
-- 1. 只新增可见目录“课程表管理”及 3 个页面菜单，不修改已有的隐藏目录 timetable-permissions 及其 14 个权限项。
-- 2. 不写死菜单主键，不向任何角色或用户授权；执行后请在“系统管理 - 角色管理 - 菜单权限”中按角色勾选。
-- 3. 页面菜单不设置 permission：页面可见性由菜单分配控制，接口访问仍由隐藏目录下的按钮权限
--    （timetable:lesson:query 等）控制，避免产生重复的权限标识。
-- 4. component 对应 src/views 下的文件，component_name 与页面组件 defineOptions 的 name 一致。

INSERT INTO system_menu (name, permission, type, sort, parent_id, path, icon, component, component_name, status, visible, keep_alive, always_show)
SELECT '课程表管理', '', 1, 81, 0, '/timetable', 'ep:calendar', '', '', 0, b'1', b'1', b'1'
WHERE NOT EXISTS (SELECT 1 FROM system_menu WHERE path = '/timetable' AND parent_id = 0 AND type = 1 AND deleted = b'0');

INSERT INTO system_menu (name, permission, type, sort, parent_id, path, icon, component, component_name, status, visible, keep_alive, always_show)
SELECT p.name, '', 2, p.sort, root.id, p.path, p.icon, p.component, p.component_name, 0, b'1', b'1', b'1'
FROM (
  SELECT '课程表' name, 1 sort, 'lesson' path, 'ep:calendar' icon, 'timetable/lesson/index' component, 'TimetableLesson' component_name
  UNION ALL SELECT '教室管理', 2, 'classroom', 'ep:school', 'timetable/classroom/index', 'TimetableClassroom'
  UNION ALL SELECT '调停课申请', 3, 'change-request', 'ep:document-checked', 'timetable/change-request/index', 'TimetableChangeRequest'
) p
JOIN (SELECT MIN(id) id FROM system_menu WHERE path = '/timetable' AND parent_id = 0 AND type = 1 AND deleted = b'0') root
WHERE root.id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM system_menu m WHERE m.component = p.component AND m.deleted = b'0');
