INSERT INTO system_menu (name, permission, type, sort, parent_id, path, icon, component, component_name, status, visible, keep_alive, always_show)
SELECT '宿舍管理', '', 1, 83, 0, '/dorm', 'ep:house', '', '', 0, b'1', b'1', b'1'
WHERE NOT EXISTS (SELECT 1 FROM system_menu WHERE path = '/dorm' AND parent_id = 0 AND type = 1 AND deleted = b'0');

INSERT INTO system_menu (name, permission, type, sort, parent_id, path, icon, component, component_name, status, visible, keep_alive, always_show)
SELECT p.name, '', 2, p.sort, root.id, p.path, p.icon, p.component, p.component_name, 0, b'1', b'1', b'1'
FROM (
  SELECT '住宿资源' name, 1 sort, 'resource' path, 'ep:school' icon, 'dorm/resource/index' component, 'DormResource' component_name
  UNION ALL SELECT '住宿与押金', 2, 'stay', 'ep:house', 'dorm/stay/index', 'DormStay'
  UNION ALL SELECT '调宿管理', 3, 'change-request', 'ep:switch', 'dorm/change-request/index', 'DormChangeRequest'
  UNION ALL SELECT '查寝管理', 4, 'night-check', 'ep:moon', 'dorm/night-check/index', 'DormNightCheck'
  UNION ALL SELECT '卫生与排名', 5, 'hygiene', 'ep:medal', 'dorm/hygiene/index', 'DormHygiene'
  UNION ALL SELECT '违规登记', 6, 'violation', 'ep:warning', 'dorm/violation/index', 'DormViolation'
  UNION ALL SELECT '离返校管理', 7, 'travel', 'ep:location', 'dorm/travel/index', 'DormTravel'
  UNION ALL SELECT '我的住宿', 8, 'my-dorm', 'ep:user', 'dorm/my-dorm/index', 'DormMyDorm'
  UNION ALL SELECT '我的离返校', 9, 'my-travel', 'ep:position', 'dorm/my-travel/index', 'DormMyTravel'
) p
JOIN (SELECT MIN(id) id FROM system_menu WHERE path = '/dorm' AND parent_id = 0 AND type = 1 AND deleted = b'0') root
WHERE root.id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM system_menu m WHERE m.component = p.component AND m.deleted = b'0');
