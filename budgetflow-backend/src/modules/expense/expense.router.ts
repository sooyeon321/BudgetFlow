import { Router, Response } from 'express';
import { authenticateJWT, AuthRequest } from '../../middlewares/auth.middleware';
import { pool } from '../../config/database';

const router = Router();

// 1. 지출 목록 조회
router.get('/', authenticateJWT, async (req: AuthRequest, res: Response) => {
  const { projectId, status } = req.query;
  let query = 'SELECT * FROM expenses WHERE 1=1';
  const params: any[] = [];

  if (projectId) {
    params.push(projectId);
    query += ` AND project_id = $${params.length}`;
  }
  if (status && status !== 'all') {
    params.push(status);
    query += ` AND status = $${params.length}`;
  }
  query += ' ORDER BY created_at DESC';

  const result = await pool.query(query, params);
  res.status(200).json(result.rows);
});

// 2. 지출 요약
router.get('/summary', authenticateJWT, async (req: AuthRequest, res: Response) => {
  const { projectId } = req.query;
  const result = await pool.query(
    `SELECT
      COUNT(*) AS "totalExpenseCount",
      COUNT(*) FILTER (WHERE status = 'needs_review') AS "needsReviewCount",
      COUNT(*) FILTER (WHERE status = 'approved') AS "approvedCount",
      COUNT(*) FILTER (WHERE status = 'rejected') AS "rejectedCount",
      COUNT(*) FILTER (WHERE evidence_status = 'none') AS "missingEvidenceCount",
      COALESCE(SUM(amount) FILTER (WHERE status IN ('approved', 'exported')), 0) AS "approvedAmount"
    FROM expenses WHERE project_id = $1`,
    [projectId]
  );
  res.status(200).json({ projectId, ...result.rows[0] });
});

// 3. 지출 승인
router.patch('/:expenseId/approve', authenticateJWT, async (req: AuthRequest, res: Response) => {
  const { date, amount, categoryId, description, merchant, payerName } = req.body;
  const result = await pool.query(
    `UPDATE expenses SET status = 'approved', date = $1, amount = $2, category_id = $3,
     description = $4, merchant = $5, payer_name = $6, review_reason = null, updated_at = NOW()
     WHERE id = $7 RETURNING *`,
    [date, amount, categoryId, description, merchant, payerName, req.params.expenseId]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: '지출을 찾을 수 없습니다.' });
  res.status(200).json(result.rows[0]);
});

// 4. 지출 반려
router.patch('/:expenseId/reject', authenticateJWT, async (req: AuthRequest, res: Response) => {
  const { reason } = req.body;
  const result = await pool.query(
    `UPDATE expenses SET status = 'rejected', review_reason = $1, updated_at = NOW()
     WHERE id = $2 RETURNING *`,
    [reason || '관리자 반려', req.params.expenseId]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: '지출을 찾을 수 없습니다.' });
  res.status(200).json(result.rows[0]);
});

// 5. 봇 → 백엔드 지출 등록 (인증 없음)
router.post('/', async (req: AuthRequest, res: Response) => {
  const { slackUserId, channelId, type, text, imageUrl } = req.body;

  if (!slackUserId || !channelId || !type) {
    return res.status(400).json({ error: '필수 필드가 누락되었습니다. (slackUserId, channelId, type)' });
  }
  if (!['text', 'image', 'text_image'].includes(type)) {
    return res.status(400).json({ error: 'type은 text / image / text_image 중 하나여야 합니다.' });
  }

  // LLM/OCR 연동 전 임시 응답
  return res.status(200).json({
    status: 'needs_review',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    category: null,
    description: text ?? null,
  });
});

export const expenseRouter = router;