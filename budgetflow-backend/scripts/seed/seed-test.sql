-- E2E 테스트용 고정 픽스처
-- 실행: npm run seed:test
-- 재실행 안전 (DELETE → INSERT 방식)

DELETE FROM evidence_files    WHERE project_id = 'project-e2e';
DELETE FROM export_jobs       WHERE project_id = 'project-e2e';
DELETE FROM expenses          WHERE project_id = 'project-e2e';
DELETE FROM budget_categories WHERE project_id = 'project-e2e';
DELETE FROM projects          WHERE id = 'project-e2e';

-- Project
INSERT INTO projects
  (id, organization_id, name, total_budget, status,
   slack_channel_id, slack_channel_name, template_file_name, template_mapping_status, created_at)
VALUES
  ('project-e2e', 'org-e2e', 'E2E 테스트 프로젝트', 1000000, 'active',
   'C-E2E', 'e2e-budget', NULL, 'none', '2026-01-01T00:00:00+09:00');

-- Categories
INSERT INTO budget_categories (id, project_id, name, budget_limit, keywords) VALUES
  ('ecat-food',  'project-e2e', '식비',   400000, ARRAY['식사','밥','점심','저녁']),
  ('ecat-trans', 'project-e2e', '교통비', 200000, ARRAY['교통','버스','택시','지하철']),
  ('ecat-etc',   'project-e2e', '기타',   400000, ARRAY['기타','소모품']);

-- Expenses (각 status별 고정 ID·금액)
INSERT INTO expenses
  (id, project_id, category_id, date, amount, merchant, description,
   payer_name, input_channel, slack_user_id,
   status, evidence_status, ai_confidence, missing_fields, review_reason)
VALUES
  -- needs_review: 승인 테스트용
  ('exp-e2e-needs-review-1', 'project-e2e', 'ecat-food', '2026-06-01', 50000,
   '테스트식당', '점심 식대', '홍길동', 'slack', 'U-E2E-01',
   'needs_review', 'uploaded', 0.72, '{}', '금액 불일치'),

  -- needs_review: 반려 테스트용
  ('exp-e2e-needs-review-2', 'project-e2e', 'ecat-trans', '2026-06-02', 15000,
   '테스트택시', '야근 귀가 택시비', '김민지', 'slack', 'U-E2E-02',
   'needs_review', 'none', 0.65, ARRAY['evidenceFile'], '영수증 없음'),

  -- approved: 집계·내보내기 테스트용 (합계 170,000)
  ('exp-e2e-approved-1', 'project-e2e', 'ecat-food', '2026-06-03', 80000,
   '승인식당A', '행사 식대', '박성아', 'slack', 'U-E2E-03',
   'approved', 'verified', 0.95, '{}', NULL),

  ('exp-e2e-approved-2', 'project-e2e', 'ecat-food', '2026-06-04', 60000,
   '승인식당B', '운영진 식대', '이준혁', 'slack', 'U-E2E-04',
   'approved', 'verified', 0.91, '{}', NULL),

  ('exp-e2e-approved-3', 'project-e2e', 'ecat-trans', '2026-06-05', 30000,
   'KTX', '출장 교통비', '최수빈', 'slack', 'U-E2E-05',
   'approved', 'ocr_completed', 0.88, '{}', NULL),

  -- rejected
  ('exp-e2e-rejected-1', 'project-e2e', 'ecat-etc', '2026-06-06', 120000,
   '반려상점', '용도 불명확 구매', '장하민', 'slack', 'U-E2E-06',
   'rejected', 'uploaded', 0.55, '{}', '업무 관련성 없음'),

  -- created (최초 등록, 미처리)
  ('exp-e2e-created-1', 'project-e2e', NULL, '2026-06-07', 25000,
   '미분류상점', '영수증 접수', '백승엽', 'slack', 'U-E2E-07',
   'created', 'none', 0.00, ARRAY['category', 'evidenceFile'], NULL);

-- evidence_files
INSERT INTO evidence_files (id, project_id, expense_id, file_name, file_type, url, ocr_status)
VALUES
  ('evf-e2e-001', 'project-e2e', 'exp-e2e-approved-1',
   'receipt_e2e_001.jpg', 'image',
   'https://example-bucket.s3.ap-northeast-2.amazonaws.com/receipts/e2e_001.jpg', 'verified'),
  ('evf-e2e-002', 'project-e2e', 'exp-e2e-approved-2',
   'receipt_e2e_002.jpg', 'image',
   'https://example-bucket.s3.ap-northeast-2.amazonaws.com/receipts/e2e_002.jpg', 'verified'),
  ('evf-e2e-003', 'project-e2e', 'exp-e2e-needs-review-1',
   'receipt_e2e_003.jpg', 'image',
   'https://example-bucket.s3.ap-northeast-2.amazonaws.com/receipts/e2e_003.jpg', 'uploaded');

UPDATE expenses SET evidence_file_id = 'evf-e2e-001' WHERE id = 'exp-e2e-approved-1';
UPDATE expenses SET evidence_file_id = 'evf-e2e-002' WHERE id = 'exp-e2e-approved-2';
UPDATE expenses SET evidence_file_id = 'evf-e2e-003' WHERE id = 'exp-e2e-needs-review-1';

-- export_jobs (내보내기 API 테스트용)
INSERT INTO export_jobs
  (id, project_id, type, status, included_expense_count, excluded_review_count, created_at)
VALUES
  ('ejob-e2e-001', 'project-e2e', 'expense_report', 'completed', 3, 2,
   '2026-06-08T10:00:00+09:00');

-- 검증 쿼리 (실행 후 확인용)
-- SELECT status, count(*) FROM expenses WHERE project_id='project-e2e' GROUP BY status;
-- → needs_review: 2, approved: 3, rejected: 1, created: 1 (총 7건)
-- SELECT sum(amount) FROM expenses WHERE project_id='project-e2e' AND status='approved';
-- → 170,000
