# BudgetFlow 백엔드 진행방법

## 역할 요약

프론트엔드, 슬랙 봇, LLM/OCR 모듈을 연결하는 **시스템 중심 역할**이다.
데이터 저장, 비동기 분석 파이프라인 실행, 파일 관리, 권한 제어를 담당한다.

---

## 기술 스택

| 영역        | 기술                            | 용도                               |
| ----------- | ------------------------------- | ---------------------------------- |
| 인프라 정의 | AWS CDK (TypeScript)            | 모든 AWS 리소스를 코드로 관리      |
| API         | Amazon API Gateway + AWS Lambda | HTTP 요청 처리                     |
| 파이프라인  | AWS Step Functions              | OCR → LLM → 저장 비동기 워크플로우 |
| DB          | Amazon DynamoDB                 | 조직, 프로젝트, 지출 데이터        |
| 파일 저장   | Amazon S3                       | 영수증 이미지, 엑셀 파일           |
| 인증        | Amazon Cognito                  | 관리자 로그인 및 권한              |
| 이벤트      | Amazon EventBridge              | 알림, 마감 이벤트 처리             |
| 모니터링    | Amazon CloudWatch               | 로그 및 오류 추적                  |

---

## 개발 순서

### Phase 1 — CDK 프로젝트 및 기반 인프라 (Day 1~2)

```
1. CDK 프로젝트 초기화
   npx cdk init app --language typescript

2. 기반 리소스 먼저 생성
   - Cognito User Pool (프론트 팀이 바로 연동할 수 있도록 최우선)
   - DynamoDB 테이블
   - S3 버킷 (영수증 이미지, 엑셀 파일 분리)
   - API Gateway

3. cdk deploy 후 Cognito User Pool ID를 프론트 팀에 공유
```

**Cognito를 가장 먼저 배포하는 이유:**
프론트엔드 팀이 로그인 화면을 구현하려면 Cognito 설정값이 필요하다.
Day 1 내에 공유하지 않으면 프론트 개발이 블로킹된다.

### Phase 2 — 핵심 CRUD Lambda 구현 (Day 3~5)

```
우선순위 순서:

① 조직/프로젝트 관리
   - 프로젝트 생성·조회·마감 처리

② 지출 항목 관리
   - 지출 등록·조회·수정·상태 변경
   - needs_review → confirmed / rejected 전환

③ Slack Workspace 연동
   - Slack OAuth 처리
   - slack_user_id로 멤버 식별 (별도 가입 불필요)
```

### Phase 3 — Step Functions 비동기 파이프라인 (Day 6~8)

슬랙 봇이 전달한 입력을 분석하는 핵심 파이프라인이다.

```
Step Functions 워크플로우:

START
  ↓
[입력 유형 분기]
  텍스트 → LLM/OCR 팀 Lambda 호출 (텍스트 파싱)
  이미지 → LLM/OCR 팀 Lambda 호출 (OCR + 정제)
  ↓
[결과 수신 및 DB 저장]
  ↓
[needs_review 판정]
  신뢰도 낮음 OR 예산 초과 OR 영수증 없음 → needs_review
  그 외 → confirmed
  ↓
[슬랙 봇 팀 Lambda 호출 - 결과 메시지 전송]
END
```

**LLM/OCR 팀과의 협업 방식:**
Step Functions에서 LLM/OCR 팀의 Lambda를 직접 호출한다.
입출력 데이터 형식은 별도 협의 후 확정한다. (현재 TBD)

### Phase 4 — 엑셀 생성 및 파일 관리 (Day 9~10)

```
① S3에서 업로드된 엑셀 양식 읽기
② confirmed 항목을 양식에 삽입 (openpyxl 또는 ExcelJS)
③ 결과 파일을 S3에 저장
④ Presigned URL 생성 후 프론트에 반환
```

---

## DynamoDB 테이블 설계 방향

단일 테이블 설계(Single Table Design)를 권장한다.

```
PK / SK 패턴 예시 (구체적인 필드명은 팀 내 협의 후 확정):

Organization   PK: ORG#<id>      SK: METADATA
Project        PK: ORG#<id>      SK: PROJ#<id>
Expense        PK: PROJ#<id>     SK: EXP#<id>
SlackUser      PK: SLACK#<ws_id> SK: USER#<slack_uid>
```

GSI(Global Secondary Index)는 자주 조회하는 패턴 확인 후 추가한다.

---

## 팀 내 의존성

| 받아야 하는 것                 | 제공하는 팀 | 시점            |
| ------------------------------ | ----------- | --------------- |
| LLM 분석 Lambda 함수 ARN       | LLM/OCR     | Phase 3 시작 전 |
| 슬랙 봇 결과 전송 Lambda ARN   | 봇          | Phase 3 시작 전 |
| Slack App 자격증명 (Bot Token) | 봇          | Phase 1 완료 전 |

| 제공해야 하는 것                     | 받는 팀        | 시점            |
| ------------------------------------ | -------------- | --------------- |
| Cognito User Pool ID / App Client ID | 프론트엔드     | Day 1 최우선    |
| API Gateway 엔드포인트 URL           | 프론트엔드, 봇 | Phase 2 완료 후 |
| S3 업로드 Presigned URL 발급 방식    | 프론트엔드     | Phase 2 완료 후 |
| Step Functions 실행 트리거 방식      | 봇             | Phase 3 완료 후 |

---

## 주의사항

- **Lambda 콜드 스타트:** 분석 파이프라인 Lambda는 메모리를 넉넉히 설정해 콜드 스타트를 줄인다. (512MB 이상 권장)
- **Slack Webhook 3초 제한:** 봇 팀에서 Webhook을 받아 즉시 ACK를 보내고, 분석은 Step Functions로 비동기 실행한다. 이 흐름이 깨지면 슬랙에서 타임아웃 오류가 발생한다.
- **S3 버킷 정책:** 영수증 이미지는 외부 공개 차단, 반드시 Presigned URL로만 접근하도록 설정한다.
- **DynamoDB 비용:** On-Demand 모드로 시작하고 트래픽 패턴 확인 후 Provisioned로 전환 여부를 결정한다.
- **CDK는 하나의 스택으로 시작:** 나중에 분리해도 되지만 초반에 스택을 여러 개로 나누면 의존성 관리가 복잡해진다.
