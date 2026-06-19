# BudgetFlow LLM 서비스 — curl 요청 가이드

LLM 서비스 EC2에 접속한 상태(EC2 Instance Connect 또는 SSH)에서 실행하는 것을 기준으로 작성했다.
외부에서 호출할 때는 `localhost`를 EC2의 Public IP로 바꾸고, 보안 그룹에 해당 포트가 열려 있는지 먼저 확인한다.

---

## 0. 서버가 살아있는지 확인

```bash
curl http://localhost:4000/health
```

정상이면 다음이 반환된다.

```json
{"status":"ok"}
```

응답이 없으면 서버가 꺼져 있거나 포트가 다르다. 서버 실행 시 콘솔에 출력되는 포트 번호를 확인한다(기본 4000, 충돌 시 4001로 자동 변경될 수 있음).

---

## 1. 텍스트 파싱 — `POST /analyze/text`

```bash
curl -X POST http://localhost:4000/analyze/text \
  -H "Content-Type: application/json" \
  -d '{
    "inputType": "text",
    "text": "어제 행사 다과 32,000원",
    "projectId": "proj_test",
    "requestDate": "2026-06-16",
    "timezone": "Asia/Seoul",
    "submittedBy": {
      "userId": "U12345",
      "displayName": "진수연"
    },
    "categories": [
      { "id": "cat_01", "name": "다과비", "keywords": ["간식", "음료", "다과", "케이터링"] },
      { "id": "cat_02", "name": "식비", "keywords": ["식사", "밥", "점심", "저녁"] }
    ]
  }'
```

### 필드 바꿔서 테스트할 때

- `text`: 실제로 분석하고 싶은 지출 문장으로 교체
- `requestDate`: 호출하는 날짜(YYYY-MM-DD). "어제", "오늘" 같은 상대 날짜 계산 기준이 되므로 반드시 오늘 날짜로 넣어야 한다.
- `categories`: 테스트하려는 프로젝트의 실제 카테고리 목록으로 교체. 비어 있으면 카테고리 분류가 항상 실패한다.

### amount가 null로 나오는 경우

응답에 `"amount": null`이 나오면 정상 동작이다. 실제 서비스에서는 이 경우 Expense를 저장하지 않고 사용자에게 재입력을 요청하는 흐름으로 백엔드가 처리해야 한다.

---

## 2. 영수증 OCR — `POST /analyze/image`

먼저 영수증 이미지를 S3 버킷(`2026-inha-cc-04-s3`)에 업로드하고 키 값을 확인한다.

```bash
curl -X POST http://localhost:4000/analyze/image \
  -H "Content-Type: application/json" \
  -d '{
    "inputType": "image",
    "s3Key": "receipt_001.jpg",
    "projectId": "proj_test",
    "evidenceFileId": "evf_test_001",
    "submittedBy": {
      "userId": "U12345",
      "displayName": "진수연"
    },
    "categories": [
      { "id": "cat_01", "name": "다과비", "keywords": ["간식", "음료", "다과", "케이터링"] },
      { "id": "cat_02", "name": "식비", "keywords": ["식사", "밥", "점심", "저녁"] }
    ]
  }'
```

### 필드 바꿔서 테스트할 때

- `s3Key`: S3에 업로드한 실제 파일명/경로 (한글 파일명은 인코딩 문제가 생길 수 있어 영문 권장)
- `evidenceFileId`: 임의의 식별자로 테스트 가능, 실제로는 백엔드가 EvidenceFile 생성 시 발급하는 ID

### OCR 실패 시 응답 예시

```json
{
  "evidenceStatus": "ocr_failed",
  "needsReview": true,
  "reviewReason": "OCR 분석 실패",
  ...
}
```

이 경우는 S3 다운로드 실패 또는 이미지 인식 실패다. `s3Key`가 정확한지, 버킷 권한이 있는지부터 확인한다.

---

## 3. 자주 발생하는 문제

| 증상 | 원인 | 확인 방법 |
|---|---|---|
| curl이 응답 없이 멈춤(타임아웃) | 보안 그룹에 해당 포트가 안 열려있음 | EC2 콘솔 → Security → Inbound rules에 포트 추가 |
| `Connection refused` | 서버가 꺼져 있거나 다른 포트에서 실행 중 | EC2에서 `npx tsx src/app.ts` 재실행, 콘솔에 출력되는 포트 확인 |
| `"reviewReason": "Bedrock 호출 실패"` | `.env`의 `ANTHROPIC_API_KEY`가 비어있거나 잘못됨 | EC2에서 `cat .env`로 키 확인 |
| `"reviewReason": "이미지 다운로드 실패"` | S3 키가 틀렸거나 버킷 권한 문제 | S3 콘솔에서 실제 키 값 재확인 |
| EC2 Public IP가 이전과 다름 | EC2 재시작 시 IP가 자동으로 바뀜(고정 안 해둠) | AWS 콘솔에서 현재 Public IPv4 address 재확인 |

---

## 4. 참고: 서버 실행/재시작 명령어 (EC2 기준)

```bash
cd ~/BudgetFlow/budgetflow-LLM

# 포그라운드 실행 (터미널 닫으면 같이 꺼짐, 디버깅에 유용)
npx tsx src/app.ts

# 기존 프로세스 종료
pkill -f tsx

# 백그라운드 실행 (터미널 닫아도 유지)
nohup npx tsx src/app.ts > server.log 2>&1 &

# 로그 확인
tail -f server.log
```
