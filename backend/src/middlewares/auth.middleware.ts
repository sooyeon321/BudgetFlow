import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'budgetflow-secret-key';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    organizationId: string;
    email: string;
  };
}

export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '인증 토큰이 누락되었습니다.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // 프론트엔드가 기존 도메인 코드를 고치지 않도록 Cognito의 custom 필드명을 그대로 매핑해줍니다.
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = {
      id: decoded.sub,
      organizationId: decoded['custom:organizationId'],
      email: decoded.email
    };
    next();
  } catch (error) {
    return res.status(403).json({ error: '유효하지 않거나 만료된 토큰입니다.' });
  }
};