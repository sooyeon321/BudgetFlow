-- BudgetFlow 초기 데이터 seed
-- 실행 순서: init.sql → seed.sql

-- Projects
INSERT INTO projects (id, organization_id, name, total_budget, status, slack_channel_id, slack_channel_name, template_file_name, template_mapping_status, created_at, closed_at) VALUES
  ('project-aingthon',    'org-gdgoc', 'AINGTHON 운영 예산',  1200000, 'active', 'C-AINGTHON',    'aingthon-budget',    'AINGTHON_지출내역서.xlsx', 'confirmed', '2026-05-03T10:00:00+09:00', NULL),
  ('project-orientation', 'org-gdgoc', '신입회원 OT 정산',      800000, 'closed', 'C-ORIENTATION', 'orientation-budget', 'OT_정산서.xlsx',           'confirmed', '2026-03-20T11:00:00+09:00', '2026-04-01T18:30:00+09:00');

-- BudgetCategories
INSERT INTO budget_categories (id, project_id, name, budget_limit, keywords, created_at) VALUES
  ('cat-food',   'project-aingthon', '식비',    500000, ARRAY['식사','뒷풀이','도시락','식비'],    '2026-05-03T10:10:00+09:00'),
  ('cat-snack',  'project-aingthon', '다과비',  200000, ARRAY['다과','간식','커피','음료'],        '2026-05-03T10:11:00+09:00'),
  ('cat-promo',  'project-aingthon', '홍보비',  250000, ARRAY['포스터','현수막','홍보'],           '2026-05-03T10:12:00+09:00'),
  ('cat-supply', 'project-aingthon', '운영물품', 250000, ARRAY['명찰','문구','운영','소모품'],      '2026-05-03T10:13:00+09:00');

-- Expenses
INSERT INTO expenses (id, project_id, category_id, date, amount, merchant, description, payer_name, input_channel, slack_user_id, status, evidence_status, evidence_file_id, ai_confidence, missing_fields, review_reason, created_at, updated_at) VALUES
  ('exp-001', 'project-aingthon', 'cat-food',   '2026-05-12', 158000, '인하식당',     '행사 뒷풀이 식사비',    '홍길동', 'slack', 'U-HONG', 'approved',     'verified',      'evidence-001', 0.94, '{}',                   NULL,           '2026-05-12T21:12:00+09:00', '2026-05-12T21:16:00+09:00'),
  ('exp-002', 'project-aingthon', 'cat-snack',  '2026-05-13',  32500, '편의점',       '참가자 다과와 음료',    '김민지', 'slack', 'U-KIM',  'approved',     'ocr_completed', 'evidence-002', 0.89, '{}',                   NULL,           '2026-05-13T15:30:00+09:00', '2026-05-13T15:35:00+09:00'),
  ('exp-003', 'project-aingthon', 'cat-food',   '2026-05-13', 128000, '도시락팩토리', '운영진 도시락',         '박성아', 'slack', 'U-PARK', 'approved',     'verified',      'evidence-003', 0.91, '{}',                   NULL,           '2026-05-13T18:20:00+09:00', '2026-05-13T18:25:00+09:00'),
  ('exp-004', 'project-aingthon', 'cat-promo',  '2026-05-14',  20000, '프린트샵',     '행사 안내 포스터 출력', '진수연', 'slack', 'U-JIN',  'approved',     'uploaded',      'evidence-004', 0.86, '{}',                   NULL,           '2026-05-14T10:10:00+09:00', '2026-05-14T10:20:00+09:00'),
  ('exp-005', 'project-aingthon', 'cat-supply', '2026-05-14',  86000, '문구센터',     '명찰과 운영 문구류',    '장하민', 'slack', 'U-JANG', 'needs_review', 'none',          NULL,           0.78, ARRAY['evidenceFile'], '영수증 없음',   '2026-05-14T14:40:00+09:00', '2026-05-14T14:40:00+09:00'),
  ('exp-006', 'project-aingthon', 'cat-snack',  '2026-05-15', 218000, '카페인하',     '참가자 커피 쿠폰',      '백승엽', 'slack', 'U-BAEK', 'needs_review', 'uploaded',      'evidence-006', 0.83, '{}',                   '다과비 예산 초과 가능', '2026-05-15T09:20:00+09:00', '2026-05-15T09:20:00+09:00');

-- ExportJobs
INSERT INTO export_jobs (id, project_id, type, status, included_expense_count, excluded_review_count, download_url, expires_at, created_at) VALUES
  ('export-001', 'project-aingthon', 'expense_report', 'completed', 4, 2, NULL, NULL, '2026-05-15T12:00:00+09:00');
