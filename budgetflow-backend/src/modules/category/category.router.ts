import { Router, Response } from 'express';
import { authenticateJWT, AuthRequest } from '../../middlewares/auth.middleware';
import { pool } from '../../config/database';

const router = Router();

// 1. 카테고리 목록 조회
router.get('/', authenticateJWT, async (req: AuthRequest, res: Response) => {
  const { projectId } = req.query;
  const result = await pool.query(
    `SELECT bc.*,
      COALESCE(SUM(e.amount) FILTER (WHERE e.status IN ('approved', 'exported')), 0) AS "approvedAmount",
      bc.budget_limit - COALESCE(SUM(e.amount) FILTER (WHERE e.status IN ('approved', 'exported')), 0) AS "remainingAmount",
      ROUND(
        COALESCE(SUM(e.amount) FILTER (WHERE e.status IN ('approved', 'exported')), 0)::numeric
        / NULLIF(bc.budget_limit, 0) * 100, 1
      ) AS "usageRate"
    FROM budget_categories bc
    LEFT JOIN expenses e ON e.category_id = bc.id
    WHERE bc.project_id = $1
    GROUP BY bc.id
    ORDER BY bc.created_at`,
    [projectId]
  );
  res.status(200).json(result.rows);
});

// 2. 카테고리 생성
router.post('/', authenticateJWT, async (req: AuthRequest, res: Response) => {
  const { projectId, name, budgetLimit, keywords } = req.body;
  const id = `cat_${Date.now()}`;
  const result = await pool.query(
    `INSERT INTO budget_categories (id, project_id, name, budget_limit, keywords)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [id, projectId, name, budgetLimit, keywords || []]
  );
  res.status(201).json(result.rows[0]);
});

// 3. 카테고리 수정
router.patch('/:categoryId', authenticateJWT, async (req: AuthRequest, res: Response) => {
  const { name, budgetLimit, keywords } = req.body;
  const result = await pool.query(
    `UPDATE budget_categories SET name = $1, budget_limit = $2, keywords = $3
     WHERE id = $4 RETURNING *`,
    [name, budgetLimit, keywords || [], req.params.categoryId]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: '카테고리를 찾을 수 없습니다.' });
  res.status(200).json(result.rows[0]);
});

export const categoryRouter = router;