import { Router, Response } from 'express';
import { authenticateJWT, AuthRequest } from '../../middlewares/auth.middleware';

const router = Router();

// 1. 엑셀 양식 분석 요청 (POST /projects/:projectId/template)
router.post('/:projectId/template', authenticateJWT, (req: AuthRequest, res: Response) => {
  res.status(200).json({
    projectId: req.params.projectId,
    detectedHeaders: ['일자', '사용처', '금액', '결제자지정', '비고']
  });
});

// 2. 엑셀 매핑 확정 (PATCH /projects/:projectId/template-mapping)
router.patch('/:projectId/template-mapping', authenticateJWT, (req: AuthRequest, res: Response) => {
  const { mappings } = req.body; // 예: { "date": "일자", "amount": "금액" }
  res.status(200).json({ message: '템플릿 매핑 설정이 저장되었습니다.', mappings });
});

export const templateRouter = router;