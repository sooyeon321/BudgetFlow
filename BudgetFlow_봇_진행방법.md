# BudgetFlow 슬랙 봇 진행방법

## 역할 요약

팀원이 가장 먼저 만나는 **입력 창구**를 담당한다.
슬랙 채널에서 영수증·텍스트를 수신하고, 백엔드에 전달하고, 분석 결과를 팀원과 관리자에게 알린다.

---

## 기술 스택

| 영역          | 기술                      | 용도                        |
| ------------- | ------------------------- | --------------------------- |
| 봇 프레임워크 | Slack Bolt for JavaScript | Webhook 수신, 메시지 전송   |
| Slack API     | Slack Web API             | 채널 메시지, 멘션, 파일 URL |
| 런타임        | AWS Lambda                | Webhook Handler 실행        |
| API 진입점    | Amazon API Gateway        | 슬랙 → Lambda 연결          |
| 언어          | TypeScript (Node.js)      | 백엔드 팀과 언어 통일       |

---

## 개발 순서

### Phase 1 — Slack App 생성 및 기본 연동 (Day 1~2)

```
1. api.slack.com에서 새 Slack App 생성
   - From Scratch → App Name 입력 → Workspace 선택

2. 필요한 Bot Token Scopes 설정 (OAuth & Permissions)
   channels:read        → 채널 정보 조회
   chat:write           → 메시지 전송
   files:read           → 업로드된 파일(영수증 이미지) 접근
   users:read           → 워크스페이스 멤버 정보 조회
   users:read.email     → 이메일 기반 사용자 식별 (필요 시)

3. Event Subscriptions 활성화
   → Request URL: API Gateway 엔드포인트 입력
   → 구독할 이벤트: message.channels, file_shared

4. Bot Token을 Lambda 환경변수에 저장 (코드에 하드코딩 금지)
```

**백엔드 팀에 공유해야 하는 것:**

- Slack App Bot Token
- Slack Signing Secret (Webhook 요청 검증용)

### Phase 2 — Webhook 수신 및 즉시 ACK 패턴 구현 (Day 3~4, MVP 1차 핵심)

슬랙의 **3초 응답 제한**을 반드시 지켜야 한다.
분석 처리를 기다렸다가 응답하면 슬랙에서 재시도 요청이 쏟아진다.

```
[올바른 흐름]

슬랙 이벤트 수신
  ↓
즉시 HTTP 200 ACK 반환 (3초 이내)
  ↓ (비동기)
백엔드 분석 파이프라인 트리거
  ↓ (분석 완료 후, 별도 Lambda에서)
슬랙 채널에 결과 메시지 전송
```

**Slack Bolt에서 비동기 처리하는 방법:**

```typescript
app.event("message", async ({ event, ack, client }) => {
  await ack(); // 즉시 ACK — 이 줄이 핵심

  // 이 아래는 ACK 이후 비동기로 실행
  await triggerAnalysisPipeline(event);
});
```

**주의:** Lambda 환경에서는 `ack()` 이후 Lambda가 종료될 수 있다.
백엔드 Step Functions를 트리거하는 방식으로 처리를 넘기고 Lambda는 종료한다.

### Phase 3 — 메시지 유형 분기 처리 (Day 5~6)

슬랙에서 들어오는 입력은 3가지 유형이다.

```
① 텍스트만 있는 경우
   "어제 행사 다과 32,000원"
   → 텍스트를 백엔드로 전달

② 이미지 첨부 (영수증)
   → 슬랙 파일 URL에서 이미지 다운로드
   → S3에 업로드 (또는 백엔드에 URL 전달)
   → OCR 분석 요청

③ 텍스트 + 이미지 혼합
   → 텍스트와 이미지 모두 전달
```

**슬랙 파일 접근 시 주의:**
슬랙 이미지 URL은 인증이 필요하다. `files:read` 스코프와 Bot Token으로 다운로드해야 한다.
공개 URL을 바로 Textract에 넘기면 403 오류가 발생한다.

### Phase 4 — 결과 메시지 전송 (Day 7~8)

분석이 완료되면 백엔드가 이 Lambda를 호출해 결과를 슬랙에 전송한다.

**confirmed 항목 메시지:**

```
✅ 지출이 등록됐습니다.

날짜: 2026-05-12
금액: 158,000원
항목: 식비
내용: 행사 뒷풀이 식사비
```

**needs_review 항목 메시지:**

```
⚠️ 검토가 필요한 항목이 있습니다.

사유: 영수증 없음
금액: 32,000원
항목: 다과비

<@관리자_슬랙_ID> 대시보드에서 확인해주세요.
[대시보드 바로가기]
```

**관리자 슬랙 ID 가져오는 방법:**
프로젝트 생성 시 관리자가 자신의 슬랙 채널에서 봇을 등록하면,
해당 Workspace + Channel에서 관리자 역할의 `slack_user_id`를 DB에 저장해둔다.

### Phase 5 — 프로젝트-채널 연결 (Day 9)

관리자가 웹에서 슬랙 채널을 선택하면, 해당 채널 ID가 프로젝트에 저장된다.
이후 해당 채널에서 들어오는 모든 메시지는 이 프로젝트로 귀속된다.

```
봇이 채널에 처음 추가될 때:
  → member_joined_channel 이벤트 수신
  → 해당 채널 ID를 백엔드에 등록 요청

메시지 수신 시:
  → channel_id로 어느 프로젝트인지 조회
  → 프로젝트 미등록 채널이면 무시 또는 안내 메시지
```

---

## 팀 내 의존성

| 받아야 하는 것                                                     | 제공하는 팀 | 시점            |
| ------------------------------------------------------------------ | ----------- | --------------- |
| 분석 파이프라인 트리거 방법 (API 엔드포인트 또는 Lambda 직접 호출) | 백엔드      | Phase 2 시작 전 |
| 결과 메시지 전송 Lambda 호출 방식                                  | 백엔드      | Phase 4 시작 전 |
| 관리자 슬랙 ID 조회 방법                                           | 백엔드      | Phase 4 시작 전 |

| 제공해야 하는 것                         | 받는 팀               | 시점            |
| ---------------------------------------- | --------------------- | --------------- |
| Slack App Bot Token, Signing Secret      | 백엔드                | Day 1 완료 후   |
| API Gateway Webhook URL                  | Slack App 설정에 입력 | Phase 1 완료 후 |
| 채널 ID → 프로젝트 연결 이벤트 처리 방식 | 백엔드                | Phase 5 시작 전 |

---

## 주의사항

- **Signing Secret 검증 필수:** 슬랙이 보낸 요청인지 검증하지 않으면 외부에서 악의적인 요청을 보낼 수 있다. Slack Bolt는 기본으로 검증하므로 직접 구현할 필요 없다.
- **슬랙 재시도 요청:** 3초 내에 응답하지 않으면 슬랙이 같은 이벤트를 최대 3회 재전송한다. 중복 처리 방지를 위해 `event_id`를 DynamoDB에 저장하고 중복 수신 시 무시한다.
- **봇이 보낸 메시지에 반응 금지:** `event.bot_id`가 있으면 봇 자신의 메시지이므로 처리를 건너뛴다. 무한 루프를 방지한다.
- **파일 URL 만료:** 슬랙 파일 URL은 일정 시간 후 만료된다. 수신 즉시 다운로드해서 S3에 저장한다.
- **로컬 개발:** `ngrok`으로 로컬 서버를 슬랙에 노출시켜 개발한다. Lambda 배포 없이도 봇 동작을 바로 테스트할 수 있다.
  ```
  ngrok http 3000
  → 발급된 URL을 Slack App Event Subscriptions에 입력
  ```
