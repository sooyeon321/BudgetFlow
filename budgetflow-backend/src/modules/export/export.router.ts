import { Router, Response } from 'express';
import { authenticateJWT, AuthRequest } from '../../middlewares/auth.middleware';
import { asyncHandler } from '../../middlewares/asyncHandler';
import { pool } from '../../config/database';
import ExcelJS from 'exceljs';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// 1. Export job 목록 조회
router.get('/:projectId/exports', authenticateJWT, asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await pool.query(
    'SELECT * FROM export_jobs WHERE project_id = $1 ORDER BY created_at DESC',
    [req.params.projectId]
  );
  res.status(200).json(result.rows);
}));

// 2. 지출내역서 엑셀 생성
router.post('/:projectId/exports/expense-report', authenticateJWT, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { projectId } = req.params;

  const expenses = await pool.query(
    `SELECT e.*, bc.name AS category_name
     FROM expenses e
     LEFT JOIN budget_categories bc ON e.category_id = bc.id
     WHERE e.project_id = $1 AND e.status = 'approved'
     ORDER BY e.date`,
    [projectId]
  );
  const excluded = await pool.query(
    `SELECT COUNT(*) FROM expenses WHERE project_id = $1 AND status = 'needs_review'`,
    [projectId]
  );

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('지출내역서');
  sheet.columns = [
    { header: '날짜', key: 'date', width: 15 },
    { header: '사용처', key: 'merchant', width: 20 },
    { header: '내용', key: 'description', width: 30 },
    { header: '카테고리', key: 'category_name', width: 15 },
    { header: '금액', key: 'amount', width: 12 },
    { header: '결제자', key: 'payer_name', width: 12 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: 'pattern', pattern: 'solid',
    fgColor: { argb: 'FFD9E1F2' }
  };
  expenses.rows.forEach(row => sheet.addRow(row));

  const jobId = `export_${uuidv4()}`;
  await pool.query(
    `INSERT INTO export_jobs (id, project_id, type, status, included_expense_count, excluded_review_count)
     VALUES ($1, $2, 'expense_report', 'completed', $3, $4)`,
    [jobId, projectId, expenses.rows.length, parseInt(excluded.rows[0].count)]
  );

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="expense-report-${projectId}.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
}));

export const exportRouter = router;