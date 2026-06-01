# BudgetFlow 텍스트 파싱 테스트 케이스

> 프롬프트 수정 시마다 아래 케이스를 실행하고 결과를 기록합니다.
> 기대 결과와 실제 결과가 다르면 프롬프트를 수정하고 재실행합니다.

requestDate 기준: 2026-05-17 (테스트 실행 시 실제 날짜로 교체)
timezone: Asia/Seoul
submittedBy: { userId: "U12345", displayName: "진수연" }
categories:
  - { id: "cat_01", name: "다과비", keywords: ["간식", "음료", "다과", "케이터링"] }
  - { id: "cat_02", name: "식비",   keywords: ["식사", "밥", "점심", "저녁", "삼겹살", "회식"] }
  - { id: "cat_03", name: "교통비", keywords: ["택시", "버스", "지하철", "교통"] }
  - { id: "cat_04", name: "회의비", keywords: ["회의", "미팅", "세미나"] }

---

## TC-01. 정상 케이스 — 날짜·금액·카테고리 모두 추출 가능

**입력**
```
어제 행사 다과 32,000원
```

**기대 출력**
```json
{
  "date": "2026-05-16",
  "amount": 32000,
  "merchant": null,
  "description": "행사 다과",
  "categoryId": "cat_01",
  "payerName": null,
  "confidence": {
    "date": true,
    "amount": true,
    "category": true,
    "payerName": false
  }
}
```

**기대 판정**
- aiConfidence: 0.9
- missingFields: ["merchant", "payerName", "evidence"]
- needsReview: true (증빙 없음 무조건)

**실제 결과** _(테스트 후 기록)_
```
날짜:
```

---

## TC-02. 결제자 포함 — payerName 추출

**입력**
```
삼겹살 158000 홍길동
```

**기대 출력**
```json
{
  "date": null,
  "amount": 158000,
  "merchant": null,
  "description": "삼겹살",
  "categoryId": "cat_02",
  "payerName": "홍길동",
  "confidence": {
    "date": false,
    "amount": true,
    "category": true,
    "payerName": true
  }
}
```

**기대 판정**
- aiConfidence: 0.7
- missingFields: ["date", "merchant", "evidence"]
- needsReview: true (증빙 없음 + 날짜 미확인)

**실제 결과** _(테스트 후 기록)_
```
날짜:
```

---

## TC-03. 금액 없음 — amount null

**입력**
```
5/12 OO마트 영수증
```

**기대 출력**
```json
{
  "date": "2026-05-12",
  "amount": null,
  "merchant": "OO마트",
  "description": "OO마트 영수증",
  "categoryId": null,
  "payerName": null,
  "confidence": {
    "date": true,
    "amount": false,
    "category": false,
    "payerName": false
  }
}
```

**기대 판정**
- shouldRequestReInput: true → Expense 미저장, 봇 재입력 요청

**실제 결과** _(테스트 후 기록)_
```
날짜:
```

---

## TC-04. 최소 입력 — 모든 필드 추출 불가

**입력**
```
회식비
```

**기대 출력**
```json
{
  "date": null,
  "amount": null,
  "merchant": null,
  "description": "회식비",
  "categoryId": "cat_02",
  "payerName": null,
  "confidence": {
    "date": false,
    "amount": false,
    "category": true,
    "payerName": false
  }
}
```

**기대 판정**
- shouldRequestReInput: true → Expense 미저장, 봇 재입력 요청

**실제 결과** _(테스트 후 기록)_
```
날짜:
```

---

## TC-05. 금액만 있음 — 항목 없음

**입력**
```
2만원
```

**기대 출력**
```json
{
  "date": null,
  "amount": 20000,
  "merchant": null,
  "description": "2만원",
  "categoryId": null,
  "payerName": null,
  "confidence": {
    "date": false,
    "amount": true,
    "category": false,
    "payerName": false
  }
}
```

**기대 판정**
- aiConfidence: 0.4
- missingFields: ["date", "merchant", "category", "payerName", "evidence"]
- needsReview: true (신뢰도 < 0.7)

**실제 결과** _(테스트 후 기록)_
```
날짜:
```

---

## TC-06. 금액 표현 다양성 — 한글 금액

**입력**
```
택시비 오만원
```

**기대 출력**
```json
{
  "date": null,
  "amount": 50000,
  "merchant": null,
  "description": "택시비",
  "categoryId": "cat_03",
  "payerName": null,
  "confidence": {
    "date": false,
    "amount": true,
    "category": true,
    "payerName": false
  }
}
```

**기대 판정**
- aiConfidence: 0.6
- needsReview: true (신뢰도 < 0.7 + 증빙 없음)

**실제 결과** _(테스트 후 기록)_
```
날짜:
```

---

## TC-07. 카테고리 동점 — 분류 불가

**입력**
```
커피 회의 15000원
```

**기대 출력**
```json
{
  "date": null,
  "amount": 15000,
  "merchant": null,
  "description": "커피 회의",
  "categoryId": null,
  "payerName": null,
  "confidence": {
    "date": false,
    "amount": true,
    "category": false,
    "payerName": false
  }
}
```

> 다과비(커피)와 회의비(회의)가 동시 매칭 → categoryId null 처리

**기대 판정**
- aiConfidence: 0.4
- missingFields: ["date", "merchant", "category", "payerName", "evidence"]
- needsReview: true

**실제 결과** _(테스트 후 기록)_
```
날짜:
```

---

## TC-08. 특정 날짜 표현 — MM/DD 형식

**입력**
```
4/30 점심 식대 12000원
```

**기대 출력**
```json
{
  "date": "2026-04-30",
  "amount": 12000,
  "merchant": null,
  "description": "점심 식대",
  "categoryId": "cat_02",
  "payerName": null,
  "confidence": {
    "date": true,
    "amount": true,
    "category": true,
    "payerName": false
  }
}
```

**기대 판정**
- aiConfidence: 0.9
- missingFields: ["merchant", "payerName", "evidence"]
- needsReview: true (증빙 없음)

**실제 결과** _(테스트 후 기록)_
```
날짜:
```

---

## TC-09. 상호명 포함 — merchant 추출

**입력**
```
GS25 편의점 간식 8500원
```

**기대 출력**
```json
{
  "date": null,
  "amount": 8500,
  "merchant": "GS25",
  "description": "편의점 간식",
  "categoryId": "cat_01",
  "payerName": null,
  "confidence": {
    "date": false,
    "amount": true,
    "category": true,
    "payerName": false
  }
}
```

**기대 판정**
- aiConfidence: 0.6
- missingFields: ["date", "payerName", "evidence"]
- needsReview: true (신뢰도 < 0.7 + 증빙 없음)

**실제 결과** _(테스트 후 기록)_
```
날짜:
```

---

## TC-10. 모든 필드 포함 — 최고 신뢰도

**입력**
```
2026-05-15 스타벅스 다과비 홍길동 43000원
```

**기대 출력**
```json
{
  "date": "2026-05-15",
  "amount": 43000,
  "merchant": "스타벅스",
  "description": "스타벅스 다과비",
  "categoryId": "cat_01",
  "payerName": "홍길동",
  "confidence": {
    "date": true,
    "amount": true,
    "category": true,
    "payerName": true
  }
}
```

**기대 판정**
- aiConfidence: 1.0
- missingFields: ["evidence"]
- needsReview: true (증빙 없음 무조건)

**실제 결과** _(테스트 후 기록)_
```
날짜:
```

---

## TC-11. 지원 범위 외 날짜 표현 — null 반환 확인

**입력**
```
저번 주 화요일 세미나 간식 25000원
```

**기대 출력**
```json
{
  "date": null,
  "amount": 25000,
  "merchant": null,
  "description": "세미나 간식",
  "categoryId": "cat_01",
  "payerName": null,
  "confidence": {
    "date": false,
    "amount": true,
    "category": true,
    "payerName": false
  }
}
```

> "저번 주 화요일"은 지원 범위 외 → date null 처리 확인

**기대 판정**
- aiConfidence: 0.6
- needsReview: true

**실제 결과** _(테스트 후 기록)_
```
날짜:
```

---

## TC-12. 쉼표 포함 금액 — 정규화 확인

**입력**
```
행사 홍보물 제작비 1,250,000원
```

**기대 출력**
```json
{
  "date": null,
  "amount": 1250000,
  "merchant": null,
  "description": "행사 홍보물 제작비",
  "categoryId": null,
  "payerName": null,
  "confidence": {
    "date": false,
    "amount": true,
    "category": false,
    "payerName": false
  }
}
```

> 쉼표 제거 후 정수로 변환 확인

**기대 판정**
- aiConfidence: 0.4
- needsReview: true

**실제 결과** _(테스트 후 기록)_
```
날짜:
```

---

## 프롬프트 버전별 결과 기록

| 버전 | 수정 내용 | TC 통과 수 | 주요 실패 케이스 |
|---|---|---|---|
| v1 | 초안 | - | - |
