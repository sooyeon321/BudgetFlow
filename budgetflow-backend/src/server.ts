import app from './app';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 BudgetFlow 단일 통합 서버가 포트 ${PORT}에서 정상 기동 중입니다!`);
});