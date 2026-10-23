INSERT INTO system_menu (name, permission, type, sort, parent_id, path, icon, component, component_name, status, visible, keep_alive, always_show)
SELECT '考务管理', '', 1, 82, 0, '/exam', 'ep:document-checked', '', '', 0, b'1', b'1', b'1'
WHERE NOT EXISTS (SELECT 1 FROM system_menu WHERE path = '/exam' AND parent_id = 0 AND type = 1 AND deleted = b'0');

INSERT INTO system_menu (name, permission, type, sort, parent_id, path, icon, component, component_name, status, visible, keep_alive, always_show)
SELECT p.name, '', 2, p.sort, root.id, p.path, p.icon, p.component, p.component_name, 0, b'1', b'1', b'1'
FROM (
  SELECT '考场管理' name, 1 sort, 'venue' path, 'ep:school' icon, 'exam/venue/index' component, 'ExamVenue' component_name
  UNION ALL SELECT '考试安排', 2, 'session', 'ep:calendar', 'exam/session/index', 'ExamSession'
  UNION ALL SELECT '成绩管理', 3, 'score', 'ep:edit-pen', 'exam/score/index', 'ExamScore'
  UNION ALL SELECT '成绩统计', 4, 'statistics', 'ep:data-analysis', 'exam/statistics/index', 'ExamStatistics'
  UNION ALL SELECT '我的考试', 5, 'my-exam', 'ep:location', 'exam/my-exam/index', 'ExamMyExam'
) p
JOIN (SELECT MIN(id) id FROM system_menu WHERE path = '/exam' AND parent_id = 0 AND type = 1 AND deleted = b'0') root
WHERE root.id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM system_menu m WHERE m.component = p.component AND m.deleted = b'0');
