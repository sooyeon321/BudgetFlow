# BudgetFlow 팀원별 실행 가이드

> 기준일: 2026-06-16 | 발표: 2026-06-24
> 이 문서는 각 담당자가 **데모 준비를 위해 해야 할 일**을 순서대로 정리한 것입니다.

---

## 인프라 정보 (공통 참조)

| 항목          | 값                                                      |
| ------------- | ------------------------------------------------------- |
| EC2 IP        | `43.201.67.179`                                         |
| EC2 OS        | Amazon Linux 2023                                       |
| EC2 접속 계정 | `ec2-user`                                              |
| EC2 키페어    | `budgetflow-key.pem`                                    |
| RDS DB 이름   | `budgetflow`                                            |
| RDS 접속 유저 | `pasun`                                                 |
| RDS 비밀번호  | `InhaComputerScience2026!`                              |
| RDS 호스트    | AWS 콘솔 → RDS → `BudgetflowInfraStack` 엔드포인트 확인 |
| S3 버킷       | `pasun-budgetflow-storage-ap-northeast-2`               |
| 백엔드 포트   | `3001`                                                  |
| LLM 포트      | `4001` (봇 4000과 충돌 방지)                            |
| 봇 포트       | `4000`                                                  |

> **RDS는 EC2에서만 접속 가능합니다.** 보안그룹이 EC2 → RDS 5432 포트만 허용하도록 설정되어 있습니다.

---

## EC2 SSH 접속 방법

`budgetflow-key.pem` 파일이 있는 디렉토리에서 실행:

```bash
# 키 파일 권한 설정 (최초 1회)
chmod 400 budgetflow-key.pem

# EC2 접속
ssh -i budgetflow-key.pem ec2-user@43.201.67.179
```

접속 후 프로젝트 코드 위치 확인:

```bash
ls ~/BudgetFlow/   # 또는
ls ~/project/
```

---

## DB 현재 상태 확인 방법 (EC2 접속 후)

```bash
# RDS 접속 (EC2 안에서)
psql -h <RDS_ENDPOINT> -U pasun -d budgetflow

# 접속 후 테이블 존재 확인
\dt

# 데이터 수 확인
SELECT count(*) FROM expenses;
SELECT count(*) FROM projects;
```

테이블이 없으면 → `init.sql` 먼저 실행 필요
데이터가 6건 이하면 → seed 스크립트 실행 필요

---

## 역할별 실행 가이드

---

### 🗄️ 백엔드 담당 (박성아) — DB 세팅 + 시드 실행 주도

**담당 작업 요약:** EC2 접속 → 최신 코드 pull → DB 상태 확인 → seed 실행

#### Step 1. EC2 접속 후 최신 코드 pull

```bash
ssh -i budgetflow-key.pem ec2-user@43.201.67.179

# EC2 안에서
cd ~/[프로젝트 경로]
git pull origin main
cd budgetflow-backend
npm install   # 새 패키지(@faker-js/faker 등) 설치
```

#### Step 2. `.env` 파일 확인/생성

EC2의 `budgetflow-backend/.env`에 아래 내용이 있는지 확인:

```env
DB_HOST=<RDS 엔드포인트>     # AWS 콘솔 RDS에서 확인
DB_PORT=5432
DB_USER=pasun
DB_PASSWORD=InhaComputerScience2026!
DB_NAME=budgetflow
S3_BUCKET_NAME=pasun-budgetflow-storage-ap-northeast-2
AWS_REGION=ap-northeast-2
LLM_SERVICE_URL=http://localhost:4001
JWT_SECRET=<기존 값 유지>
```

#### Step 3. DB 스키마 상태 확인

```bash
psql -h $DB_HOST -U pasun -d budgetflow -c "\dt"
```

- 테이블 없음 → Step 4로 (스키마부터)
- 테이블 있음 → Step 5로 (seed만)

#### Step 4. 스키마 생성 (최초 1회)

```bash
psql -h $DB_HOST -U pasun -d budgetflow -f src/init.sql
psql -h $DB_HOST -U pasun -d budgetflow -f src/seed.sql   # 기본 데이터
```

#### Step 5. 데모 + E2E 시드 실행

```bash
# LLM 서비스가 4001 포트에서 기동 중인지 먼저 확인 (진수연 담당)
curl http://localhost:4001/health

# E2E 픽스처 삽입
npm run seed:test

# 데모 데이터 삽입 (LLM 기동 시 OCR 8건 추가, 미기동 시 Faker 20건만)
npm run seed:demo
```

#### Step 6. 결과 확인

```bash
psql -h $DB_HOST -U pasun -d budgetflow \
  -c "SELECT status, count(*) FROM expenses GROUP BY status;"
```

기대 결과:

- `approved`: 13건 이상
- `needs_review`: 7건 이상
- `rejected`: 3건 이상
- `created`: 2건 이상

---

### 🤖 LLM 담당 (진수연) — LLM 서비스 기동

**담당 작업 요약:** EC2에서 LLM 서비스를 포트 4001로 기동

#### Step 1. EC2 접속 후 LLM 디렉토리로 이동

```bash
ssh -i budgetflow-key.pem ec2-user@43.201.67.179
cd ~/[프로젝트 경로]/budgetflow-LLM
git pull origin main
npm install
```

#### Step 2. `.env` 설정

`budgetflow-LLM/.env` 파일에 아래 내용 확인/추가:

```env
PORT=4001
AWS_REGION=ap-northeast-2
# EC2 IAM Role이 Bedrock + Textract 권한 가지고 있으면 키 불필요
# (SafeInstanceProfileForUser-pasun 역할 확인)
```

#### Step 3. 서비스 기동

```bash
# 백그라운드로 실행
nohup npm run dev > llm.log 2>&1 &

# 또는 별도 터미널에서
npm run dev
```

#### Step 4. 헬스체크

```bash
curl http://localhost:4001/health
# {"status":"ok"} 가 나와야 seed:demo의 OCR Phase가 실행됨
```

> **주의:** 포트가 4001이어야 합니다. 기존에 4000으로 기동 중이었다면 종료 후 4001로 재기동하세요.
>
> ```bash
> # 기존 프로세스 확인 및 종료
> lsof -i :4000 -i :4001
> kill <PID>
> ```

---

### 🤖 봇 담당 (장하민) — S3 버킷 확인 + 봇 기동

**담당 작업 요약:** seed 스크립트가 같은 S3 버킷 사용 → 버킷 이름 공유 + 봇 정상 기동 확인

#### Step 1. S3 버킷 이름 확인 후 박성아에게 공유

인프라 코드 기준 버킷 이름: `pasun-budgetflow-storage-ap-northeast-2`

AWS 콘솔 또는 CLI로 실제 존재 여부 확인:

```bash
aws s3 ls | grep budgetflow
```

#### Step 2. 봇 `.env` 확인

`budgetflow-bot/.env`:

```env
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
S3_BUCKET_NAME=pasun-budgetflow-storage-ap-northeast-2
AWS_REGION=ap-northeast-2
BACKEND_URL=http://localhost:3001
PORT=4000
```

#### Step 3. 봇 기동

```bash
cd budgetflow-bot
npm install
nohup npm run dev > bot.log 2>&1 &
```

#### Step 4. seed 완료 후 S3 확인

seed:demo 실행 후 OCR 이미지가 S3에 올라갔는지 확인:

```bash
aws s3 ls s3://pasun-budgetflow-storage-ap-northeast-2/receipts/ | grep cord_
# cord_로 시작하는 파일이 생기면 OCR Phase 성공
```

---

### 🖥️ 프론트 담당 (백승엽) — API 연결 전환 + 대시보드 확인

**담당 작업 요약:** 현재 mock 데이터 → 실제 백엔드 API로 전환

#### Step 1. 환경변수 설정

`budgetflow-frontend/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://43.201.67.179:3001
```

> 로컬 개발 중이라면 EC2 대신 `http://localhost:3001` (EC2에서 포트 포워딩 or 로컬 백엔드 기동 필요)

#### Step 2. API 연결 확인

`src/lib/api/budgetflow-api.ts`에서 `isApiConfigured` 조건 확인:

- 환경변수 설정 후 실제 API 호출로 전환되는지 확인
- mock 데이터가 계속 보이면 이 플래그부터 점검

#### Step 3. 데모 데이터 확인 체크리스트

seed 실행 후 웹 대시보드에서 확인:

- [ ] 프로젝트 목록에 **"2026 여름 해커톤"** (active) 표시
- [ ] 지출 목록 **20~28건** (Faker 20건 + OCR 최대 8건)
- [ ] status 필터별 분류 (`approved` / `needs_review` / `rejected`)
- [ ] `needs_review` 항목에 검토 필요 배지 표시
- [ ] 카테고리별 예산 사용률 차트에 실제 금액 반영
- [ ] 승인 버튼 클릭 → `PATCH /api/expenses/:id/approve` 호출 → UI 갱신
- [ ] 정산 마감 → 엑셀 다운로드 흐름 동작

#### Step 4. 테스트 계정으로 로그인

```
이메일: admin@inha.ac.kr
비밀번호: (백엔드 담당에게 확인 — 현재 비밀번호 검증 없이 이메일만 일치하면 로그인됨)
```

---

## 전체 실행 순서 요약

```
[진수연] budgetflow-LLM → PORT=4001로 기동
    ↓
[장하민] budgetflow-bot → PORT=4000으로 기동, S3 버킷 이름 공유
    ↓
[박성아] EC2에서 git pull → DB 상태 확인 → seed:test → seed:demo
    ↓
[박성아] 백엔드 서버 기동 (PORT=3001)
    ↓
[백승엽] .env.local 설정 → 웹 대시보드에서 데이터 확인
```

---

## 트러블슈팅

| 증상                              | 원인                                    | 해결                                             |
| --------------------------------- | --------------------------------------- | ------------------------------------------------ |
| `seed:demo` 실행 시 DB 연결 실패  | `.env`에 `DB_HOST` 없거나 RDS 주소 틀림 | AWS 콘솔 RDS 엔드포인트 재확인                   |
| OCR Phase 스킵 메시지             | LLM 서비스 미기동 or 포트 불일치        | 진수연: `curl http://localhost:4001/health` 확인 |
| 프론트에 mock 데이터만 보임       | `isApiConfigured` false                 | `.env.local`의 `NEXT_PUBLIC_API_BASE_URL` 확인   |
| seed:test 실행 후 E2E 데이터 없음 | `psql` 명령어 환경변수 미설정           | `export DB_HOST=...` 후 재실행                   |
| S3 업로드 실패                    | EC2 IAM Role에 S3 권한 없음             | AWS 콘솔 → EC2 IAM Role → S3 정책 확인           |
