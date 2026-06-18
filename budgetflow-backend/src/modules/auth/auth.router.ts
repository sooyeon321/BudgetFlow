import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "budgetflow-secret-key";

router.post("/login", (req: Request, res: Response) => {
  const { email, password } = req.body;

  // 시연용 무사통과 관리자 계정 생성
  if (email === "admin@inha.ac.kr") {
    const token = jwt.sign(
      {
        sub: "user_admin_999",
        "custom:organizationId": "org_inha_cs_2026",
        email: email,
      },
      JWT_SECRET,
      { expiresIn: "7d" },
    );
    return res.status(200).json({
      idToken: token,
      accessToken: token,
      message: "시연용 로그인 성공",
    });
  }

  return res.status(401).json({ error: "이메일 또는 비밀번호가 틀렸습니다." });
});

export const authRouter = router;
