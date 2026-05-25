import { Router, Response } from 'express';
import { authenticateJWT, AuthRequest } from '../../middlewares/auth.middleware';

const router = Router();

// 1. 프로젝트 목록 조회 (GET /projects)
router.get('/', authenticateJWT, (req: AuthRequest, res: Response) => {
  res.status(200).json([
    { id: 'proj_01', name: '2026 1학기 학생회 정산', status: 'active', createdAt: '2026-03-01' },
    { id: 'proj_02', name: '2026 봄축제 예산 정산', status: 'closed', createdAt: '2026-05-10' }
  ]);
});

// 2. 새 프로젝트 생성 (POST /projects)
router.post('/', authenticateJWT, (req: AuthRequest, res: Response) => {
  const { name, budgetCategoryIds } = req.body;
  res.status(201).json({
    id: `proj_${Math.floor(Math.random() * 1000)}`,
    name,
    status: 'active',
    organizationId: req.user?.organizationId
  });
});

// 3. 프로젝트 상세 조회 (GET /projects/{projectId})
router.get('/:projectId', authenticateJWT, (req: AuthRequest, res: Response) => {
  res.status(200).json({
    id: req.params.projectId,
    name: '2026 1학기 학생회 정산',
    status: 'active',
    totalBudget: 5000000,
    usedBudget: 1250000
  });
});

// 4. 정산 마감 기능 (POST /projects/{projectId}/close)
router.post('/:projectId', authenticateJWT, (req: AuthRequest, res: Response) => {
  res.status(200).json({ id: req.params.projectId, status: 'closed', closedAt: new Date() });
});

export const projectRouter = router;