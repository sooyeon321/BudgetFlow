import { Router, Response } from 'express';
import { authenticateJWT, AuthRequest } from '../../middlewares/auth.middleware';

const router = Router();

// 1. 지출 목록 조회 (GET /expenses)
router.get('/', authenticateJWT, (req: AuthRequest, res: Response) => {
  res.status(200).json([
    { id: 'exp_01', projectId: 'proj_01', amount: 25000, status: 'needs_review', merchant: '스타벅스', payerName: '홍길동' },
    { id: 'exp_02', projectId: 'proj_01', amount: 120000, status: 'confirmed', merchant: '인하밥집', payerName: '김철수' }
  ]);
});

// 2. 지출 요약 통계 (GET /expenses/summary)
router.get('/summary', authenticateJWT, (req: AuthRequest, res: Response) => {
  res.status(200).json({ totalCount: 42, needsReviewCount: 5, confirmedCount: 37 });
});

// 3. 지출 정보 수정 후 승인 (PATCH /expenses/:expenseId/approve)
router.patch('/:expenseId/approve', authenticateJWT, (req: AuthRequest, res: Response) => {
  const { date, amount, categoryId, description, merchant, payerName } = req.body;
  res.status(200).json({
    id: req.params.expenseId,
    status: 'confirmed',
    date, amount, categoryId, description, merchant, payerName
  });
});

// 4. 지출 반려 처리 (PATCH /expenses/:expenseId/reject)
router.patch('/:expenseId/reject', authenticateJWT, (req: AuthRequest, res: Response) => {
  const { rejectReason } = req.body;
  res.status(200).json({ id: req.params.expenseId, status: 'rejected', rejectReason });
});

export const expenseRouter = router;