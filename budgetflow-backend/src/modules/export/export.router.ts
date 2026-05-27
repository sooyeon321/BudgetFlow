import { Router, Response } from 'express';
import { authenticateJWT, AuthRequest } from '../../middlewares/auth.middleware';

const router = Router();

// 1. 지출내역서 생성 요청 (POST /projects/:projectId/exports/expense-report)
router.post('/:projectId/exports/expense-report', authenticateJWT, (req: AuthRequest, res: Response) => {
  res.status(200).json({
    jobId: 'job_excel_999',
    status: 'completed', // MVP 우선 즉시 완료처리 시연용
    downloadUrl: 'https://budgetflow-s3.amazonaws.com/exports/report_2026.xlsx'
  });
});

// 2. Export 결과 확인 폴링 (GET /projects/:projectId/exports)
router.get('/:projectId/exports', authenticateJWT, (req: AuthRequest, res: Response) => {
  res.status(200).json([
    { jobId: 'job_excel_999', status: 'completed', downloadUrl: 'https://budgetflow-s3.amazonaws.com/exports/report_2026.xlsx' }
  ]);
});

export const exportRouter = router;