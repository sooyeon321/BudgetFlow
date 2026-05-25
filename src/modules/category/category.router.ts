import { Router, Response } from 'express';
import { authenticateJWT, AuthRequest } from '../../middlewares/auth.middleware';

const router = Router();

// 1. 카테고리 목록 조회 (GET /budget-categories)
router.get('/', authenticateJWT, (req: AuthRequest, res: Response) => {
  res.status(200).json([
    { id: 'cat_01', name: '식비', budgetAmount: 2000000 },
    { id: 'cat_02', name: '소모품비', budgetAmount: 1000000 }
  ]);
});

// 2. 새 카테고리 생성 (POST /budget-categories)
router.post('/', authenticateJWT, (req: AuthRequest, res: Response) => {
  const { name, budgetAmount } = req.body;
  res.status(201).json({ id: `cat_${Date.now()}`, name, budgetAmount });
});

// 3. 카테고리 수정 관리 (PATCH /budget-categories/:categoryId)
router.patch('/:categoryId', authenticateJWT, (req: AuthRequest, res: Response) => {
  const { name, budgetAmount } = req.body;
  res.status(200).json({ id: req.params.categoryId, name, budgetAmount });
});

export const categoryRouter = router;