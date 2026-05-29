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
  res.status(200).json({ totalCount: 42, needsReviewCount: 5, approvedCount: 37 });
});

// 3. 지출 정보 수정 후 승인 (PATCH /expenses/:expenseId/approve)
router.patch('/:expenseId/approve', authenticateJWT, (req: AuthRequest, res: Response) => {
  const { date, amount, categoryId, description, merchant, payerName } = req.body;
  res.status(200).json({
    id: req.params.expenseId,
    status: 'approved',
    date, amount, categoryId, description, merchant, payerName
  });
});

// 4. 지출 반려 처리 (PATCH /expenses/:expenseId/reject)
router.patch('/:expenseId/reject', authenticateJWT, (req: AuthRequest, res: Response) => {
  const { rejectReason } = req.body;
  res.status(200).json({ id: req.params.expenseId, status: 'rejected', rejectReason });
});

// 5. 봇 → 백엔드 지출 등록 (POST /expenses) — 인증 없음 (봇 호출용)
router.post('/', async (req: AuthRequest, res: Response) => {
  const { slackUserId, channelId, type, text, imageUrl } = req.body;

  // 필수 필드 검증
  if (!slackUserId || !channelId || !type) {
    return res.status(400).json({ error: '필수 필드가 누락되었습니다. (slackUserId, channelId, type)' });
  }
  if (!['text', 'image', 'text_image'].includes(type)) {
    return res.status(400).json({ error: 'type은 text / image / text_image 중 하나여야 합니다.' });
  }

  // type별 분기 (현재는 목데이터 응답 — LLM/OCR 연동 시 교체)
  if (type === 'text') {
    return res.status(200).json({
      status: 'needs_review',
      date: '2026-05-29',
      amount: 32000,
      category: '다과비',
      description: text ?? '텍스트 파싱 결과',
    });
  }

  if (type === 'image') {
    return res.status(200).json({
      status: 'needs_review',
      reason: 'OCR 분석 필요 — imageUrl: ' + imageUrl,
    });
  }

  if (type === 'text_image') {
    return res.status(200).json({
      status: 'needs_review',
      date: '2026-05-29',
      amount: 32000,
      category: '다과비',
      description: text ?? '텍스트+이미지 파싱 결과',
    });
  }
});

export const expenseRouter = router;