# BudgetFlow Bot

슬랙 채널에 영수증과 지출 설명을 보내면 AI가 자동으로 분석·분류하고, 관리자가 지정한 엑셀 양식에 맞춰 지출내역서를 생성하는 **팀 단위 예산 정산 자동화 서비스**의 슬랙 봇입니다.

## 역할

- 슬랙 채널에서 팀원의 메시지(텍스트/이미지) 수신
- 메시지 유형 분기 처리 (텍스트 / 이미지 / 텍스트+이미지)
- 즉시 접수 확인 메시지 응답
- 백엔드 분석 파이프라인에 데이터 전달 (예정)
- 분석 완료 후 결과 메시지 전송 (예정)

## 기술 스택

| 영역 | 기술 |
|---|---|
| 봇 프레임워크 | Slack Bolt for JavaScript |
| 언어 | TypeScript (Node.js) |
| 로컬 터널링 | ngrok |

## 시작하기

### 1. 패키지 설치

```bash
npm install
```

### 2. 환경변수 설정

루트에 `.env` 파일을 생성하고 아래 값을 입력합니다.

```
SLACK_BOT_TOKEN=xoxb-xxxx-xxxx
SLACK_SIGNING_SECRET=xxxx
PORT=3000
```

> Slack App은 [api.slack.com/apps](https://api.slack.com/apps)에서 생성합니다.

### 3. Slack App 설정

**Bot Token Scopes** (OAuth & Permissions):
- `channels:read`
- `chat:write`
- `files:read`
- `users:read`

**Subscribe to bot events** (Event Subscriptions):
- `message.channels`

**Request URL** (Event Subscriptions):
```
https://<ngrok-url>/slack/events
```

### 4. 로컬 실행

터미널 1 — 봇 실행:
```bash
npx ts-node src/app.ts
```

터미널 2 — ngrok 실행:
```bash
ngrok http 3000
```

ngrok에서 발급된 URL을 Slack App Event Subscriptions의 Request URL에 입력합니다.

## 메시지 유형 분기

| 유형 | 처리 |
|---|---|
| 📝 텍스트만 | 텍스트 지출 파싱 요청 |
| 📷 이미지만 | 영수증 OCR 분석 요청 |
| 📷📝 텍스트 + 이미지 | 텍스트 + OCR 분석 요청 |

## 주의사항

- `.env` 파일은 절대 깃헙에 올리지 않습니다.
- ngrok을 재시작하면 URL이 바뀌므로 Slack App Request URL을 다시 등록해야 합니다.
- `message.channels`는 public 채널만 수신합니다. private 채널은 `message.groups`를 추가해야 합니다.
- 봇 자신의 메시지는 무한루프 방지를 위해 무시합니다.
