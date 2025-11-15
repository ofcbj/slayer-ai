# BattleScene 리팩토링 계획

## 현재 문제점
- BattleScene이 1200+ 줄로 비대함
- UI, 카드 핸들링, 이벤트 처리 등 여러 책임이 혼재
- 유지보수 및 테스트가 어려움

## 분리 계획

### 1. BattleUIManager
**책임**: 모든 UI 요소 생성 및 관리
- 에너지 UI (구슬 생성, 업데이트)
- 턴 종료 버튼
- 덱/버린 카드 더미 UI
- 덱 정보 텍스트
- 메시지 표시

**메서드**:
- `createEnergyUI()`
- `updateEnergyUI()`
- `createEndTurnButton()`
- `createDeckPileUI()`
- `createDiscardPileUI()`
- `updateDeckInfo()`
- `showMessage()`

### 2. CardHandManager
**책임**: 카드 핸드 관리 및 애니메이션
- 카드 드로우 및 애니메이션
- 카드 핸드 배치
- 카드 버리기 애니메이션
- 카드 선택 관리
- 카드 데이터 정규화

**메서드**:
- `drawCards()`
- `addCardToHand()`
- `arrangeHand()`
- `discardCard()`
- `selectCard()`
- `normalizeCardData()`

### 3. CardViewManager
**책임**: 카드 목록 뷰 및 팝업 관리
- 덱 뷰 표시
- 버린 카드 더미 뷰 표시
- 카드 목록 팝업
- 미니 카드 생성

**메서드**:
- `showDeckView()`
- `showDiscardPileView()`
- `showCardListView()`
- `createMiniCard()`
- `getCardColorFromData()`
- `stripHtmlTags()`

### 4. BattleEventManager
**책임**: 이벤트 처리 및 카드 사용 로직
- 카드 클릭 처리
- 적 클릭 처리
- 카드 사용 로직
- 이벤트 리스너 등록

**메서드**:
- `onCardClicked()`
- `onEnemyClicked()`
- `useCard()`
- `registerEventListeners()`

## 구조

```
BattleScene (씬 초기화 및 조율)
├── BattleUIManager (UI 관리)
├── CardHandManager (카드 핸드 관리)
├── CardViewManager (카드 뷰 관리)
└── BattleEventManager (이벤트 처리)
```

## 예상 효과
- 각 클래스가 단일 책임을 가짐
- 코드 재사용성 향상
- 테스트 용이성 증가
- 유지보수성 향상
- BattleScene 코드가 300-400줄로 감소 예상

