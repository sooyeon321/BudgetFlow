# BudgetFlow 기여 가이드

## 팀 구성

| 역할       | 담당   | GitHub  |
| ---------- | ------ | ------- |
| 프론트엔드 | 백승엽 | @bksgyp |
| 백엔드     | 박성아 | -       |
| LLM/OCR    | 장하민 | -       |
| 슬랙 봇    | 진수연 | -       |

## 작업 흐름

### 1. 저장소 포크

1. 이 저장소를 본인 GitHub 계정으로 **Fork**
2. 포크한 저장소를 로컬에 클론

```bash
git clone https://github.com/<내-계정>/BudgetFlow.git
cd BudgetFlow
```

### 2. 원본 저장소를 upstream으로 등록

```bash
git remote add upstream https://github.com/bksgyp/BudgetFlow.git
git remote -v
# origin    https://github.com/<내-계정>/BudgetFlow.git
# upstream  https://github.com/bksgyp/BudgetFlow.git
```

### 3. 브랜치 생성 후 작업

브랜치 이름 규칙: `<역할>/<작업내용>`

```bash
git checkout -b frontend/expense-review-panel
git checkout -b backend/project-api
git checkout -b llm/text-parsing-lambda
git checkout -b bot/slack-webhook-ack
```

### 4. 커밋 메시지 규칙

```
feat: 새 기능 추가
fix: 버그 수정
docs: 문서 수정
style: 코드 스타일 변경
refactor: 리팩토링
chore: 빌드/설정 변경
```

예시:

```
feat: 지출 목록 needs_review 필터 추가
fix: 승인 후 목록 갱신 안 되는 버그 수정
```

### 5. 변경사항 upstream과 동기화

```bash
git fetch upstream
git rebase upstream/main
```

### 6. PR(Pull Request) 생성

1. 포크한 저장소에 브랜치 push
2. GitHub에서 `bksgyp/BudgetFlow` 원본 저장소로 PR 생성
3. PR 템플릿에 맞춰 작성

## 디렉토리 구조

```
BudgetFlow/
├── budgetflow-frontend/          # 프론트엔드 (Next.js)
│   ├── src/
│   │   ├── app/             # App Router 페이지
│   │   ├── components/      # 공통 컴포넌트
│   │   └── lib/             # API, hooks, types
│   └── DESIGN.md            # 디자인 원칙
├── product-reference/       # 디자인 참고 HTML 프로토타입
├── BudgetFlow_기획_총정리.md
├── BudgetFlow_MVP_전체정리.md
├── BudgetFlow_백엔드_API_계약.md
└── BudgetFlow_API_명세서.md
```

## 프론트엔드 로컬 실행

```bash
cd budgetflow-frontend
npm install
npm run dev
# http://localhost:3000 에서 확인
# 테스트 계정: admin@budgetflow.dev / budgetflow
```

## API 계약

팀원 간 API 계약은 `BudgetFlow_API_명세서.md`를 기준으로 합니다.  
백엔드 연동 분석은 `budgetflow-frontend/docs/backend-integration-review.md`를 참고하세요.
