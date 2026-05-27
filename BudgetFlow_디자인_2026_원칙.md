# BudgetFlow 2026 UI 원칙 및 적용 기록

작성일: 2026-05-15

## 조사 기반 원칙

1. **기능 우선의 모던 UI**
   - 2026년형 UI는 장식적 트렌드보다 사용자의 판단과 다음 행동을 빠르게 만드는 위계, 상태 표시, 명확한 affordance를 우선한다.
   - BudgetFlow는 예산/증빙/승인처럼 실무 리스크가 있는 화면이므로 “멋진 효과”보다 검토 대상, 금액, 상태, 다음 행동을 가장 먼저 보이게 한다.

2. **반응형 내비게이션**
   - Android/Material 가이드는 compact 폭에서 bottom navigation, medium/expanded 폭에서 rail/drawer 같은 다른 내비게이션 영역을 권장한다.
   - 적용: 모바일에서는 하단 3탭 내비게이션을 제공하고, 데스크톱에서는 상단 nav를 유지한다.

3. **Window size class와 fluid layout**
   - Material 3는 고정 크기 breakpoint가 아니라 compact/medium/expanded 맥락과 유연한 layout region을 권장한다.
   - 적용: 모바일은 카드/단일 컬럼, 데스크톱은 목록+검토 패널의 supporting pane 구조를 유지한다.

4. **접근성과 조작 안정성**
   - WCAG 2.2는 focus visibility, target size, consistent help, accessible authentication 등 조작 가능성과 예측 가능성을 강화한다.
   - 적용: 주요 버튼 기본 높이를 40px로 상향하고, 모바일 nav는 56px 이상 터치 영역과 명확한 active 상태를 제공한다.

5. **AI/자동화 결과에 대한 인간 검토성**
   - 2026 HCI 연구에서는 AI 생성/분석 UI에서 위험 신호, 명시적 개입 지점, 검토 가능한 피드백 루프가 중요하다고 본다.
   - 적용: 지출 검토 화면에서 `검토 필요`, `증빙 누락`, `AI 신뢰도`, `검토 사유`를 행동 버튼 가까이에 배치한다.

6. **프라이버시와 신뢰의 UI**
   - 개인정보/지출 데이터가 포함되는 예산 정산 도구는 권한, 추적 가능성, 민감 정보 노출 최소화가 UI 단계부터 고려되어야 한다.
   - 적용: MVP에서는 Mock 인증/Mock API 상태를 명확히 노출하고, AWS/Cognito 전환 시 환경 변수 및 API 계약 기반으로 연결한다.

## 이번 적용 사항

- 모바일 상단 아이콘-only nav를 하단 라벨 포함 nav로 전환해 엄지 조작성과 현재 위치 인지를 개선했다.
- 데스크톱 nav는 상단에 유지하되 active 상태를 검은 배경/흰 텍스트로 명확히 표시한다.
- 모바일은 `header / scrollable body / bottom nav` 앱 셸 구조로 구성해 하단 nav가 콘텐츠를 덮지 않게 했다.
- 버튼 기본 높이를 40px로 상향해 클릭/터치 안정성을 개선했다.
- 개발 서버 Next indicator는 유지보수 화면 캡처를 방해하지 않도록 비활성화했다.

## 참고 자료

- Android Developers, “Build responsive navigation”: compact width에서는 bottom navigation, medium/expanded에서는 rail/drawer 패턴 권장.
- Android Developers, “Design an Adaptive Layout with Material Design”: window size class, layout regions, canonical layouts, 유동적 크기 조정 원칙.
- W3C WAI, “What’s New in WCAG 2.2”: focus not obscured, target size, accessible authentication 등 추가 기준.
- arXiv 2602.13745, “Human Oversight-by-Design for Accessible Generative IUIs”: AI 지원 UI에서 명시적 위험 신호와 인간 개입 지점 필요.
- arXiv 2601.13342, “Privacy Starts with UI”: UI/UX 단계의 privacy pattern과 실무 고려사항.
