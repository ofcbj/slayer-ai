# 최종 리팩토링 가이드 - 작은 모듈로 분리

## 개요
기존 리팩토링에서 더 나아가 큰 파일들을 **응집성 높은 작은 모듈**로 분리했습니다.

## 📊 파일 크기 비교

| 파일 | Before | After | 분리 개수 |
|------|--------|-------|----------|
| ui-manager.js | ~480줄 | ~140줄 + 5개 모듈 | 6개 |
| game-engine.js | ~350줄 | ~120줄 + 4개 모듈 | 5개 |

## 🗂️ 새로운 프로젝트 구조

```
src/
├── core/
│   ├── state-manager.js           # 상태 관리 (변경 없음)
│   ├── game-engine-refactored.js  # 통합 게임 엔진 (조합)
│   ├── combat/                    # 전투 관련
│   │   └── combat-manager.js      # 카드 선택, 전투 로직
│   ├── stage/                     # 스테이지 관련
│   │   └── stage-manager.js       # 스테이지 관리
│   ├── reward/                    # 보상 관련
│   │   └── reward-manager.js      # 보상 계산 및 선택
│   └── game/                      # 게임 상태
│       └── game-state-initializer.js  # 초기화
├── managers/
│   ├── card-manager.js            # 카드 관리 (변경 없음)
│   ├── ui-manager-refactored.js   # 통합 UI 매니저 (조합)
│   └── ui/                        # UI 서브 모듈
│       ├── event-manager.js       # 이벤트 처리
│       ├── renderer.js            # 렌더링
│       ├── animation-manager.js   # 애니메이션
│       ├── modal-manager.js       # 모달 관리
│       └── stage-map-renderer.js  # 스테이지 맵
├── utils/
│   ├── data-loader.js            # 데이터 로딩
│   └── helpers.js                # 유틸리티
└── main-refactored.js            # 진입점
```

## 🎯 모듈 분리 원칙

### 1. 단일 책임 원칙 (SRP)
각 모듈은 **하나의 명확한 책임**만 가집니다.

**Before:**
```javascript
// ui-manager.js - 모든 UI 기능이 한 파일에
class UIManager {
  renderEnemies() { }
  animateEnemyAttack() { }
  showModal() { }
  renderStageMap() { }
  // ... 480줄
}
```

**After:**
```javascript
// ui/renderer.js - 렌더링만
class Renderer {
  renderEnemies() { }
  renderHand() { }
}

// ui/animation-manager.js - 애니메이션만
class AnimationManager {
  animateEnemyAttack() { }
  showPlayerDamage() { }
}

// ui/modal-manager.js - 모달 관리만
class ModalManager {
  showGameOverModal() { }
  hideGameOverModal() { }
}
```

### 2. 조합 패턴 (Composition)
큰 클래스를 **여러 작은 클래스의 조합**으로 구성합니다.

```javascript
class UIManager {
  constructor(stateManager) {
    // 작은 매니저들을 조합
    this.eventManager = new EventManager();
    this.renderer = new Renderer(elements);
    this.animationManager = new AnimationManager(elements);
    this.modalManager = new ModalManager(elements);
    this.stageMapRenderer = new StageMapRenderer(elements);
  }

  // 메서드 위임
  renderEnemies(enemies) {
    return this.renderer.renderEnemies(enemies);
  }

  animateEnemyAttack(index) {
    return this.animationManager.animateEnemyAttack(index);
  }
}
```

### 3. 응집성 (Cohesion)
**관련된 기능끼리 모으기**

| 모듈 | 책임 | 응집된 기능 |
|------|------|------------|
| combat-manager.js | 전투 | 카드 선택, 플레이, 적 턴, 보스 패턴 |
| stage-manager.js | 스테이지 | 스테이지 초기화, 적 생성, 진행 관리 |
| reward-manager.js | 보상 | 보상 계산, 체력 회복, 카드 선택 |
| event-manager.js | 이벤트 | 이벤트 위임, 발행/구독 |
| renderer.js | 렌더링 | DOM 생성 및 업데이트 |

## 📦 모듈별 상세 설명

### UI 모듈 분리

#### 1. EventManager (이벤트 처리)
```javascript
// 이벤트 위임과 발행/구독 패턴
class EventManager {
  initEventDelegation(elements)  // 이벤트 위임 설정
  emit(eventName, data)           // 이벤트 발행
  on(eventName, handler)          // 이벤트 구독
}
```

**책임:** 사용자 입력 처리 및 이벤트 중개

#### 2. Renderer (렌더링)
```javascript
// 화면에 그리는 모든 로직
class Renderer {
  renderEnemies(enemies)           // 적 렌더링
  renderHand(hand, energy)         // 카드 렌더링
  updatePlayerUI(player)           // 플레이어 UI 업데이트
  clearSelections()                // 선택 상태 초기화
  highlightEnemies()               // 적 하이라이트
}
```

**책임:** DOM 생성 및 업데이트

#### 3. AnimationManager (애니메이션)
```javascript
// 모든 애니메이션 효과
class AnimationManager {
  animateEnemyAttack(index)       // 적 공격 애니메이션
  showPlayerDamage(damage)        // 플레이어 피해 표시
  animateCardPlay(index)          // 카드 사용 애니메이션
}
```

**책임:** 시각적 효과 및 애니메이션

#### 4. ModalManager (모달 관리)
```javascript
// 모달 표시/숨김
class ModalManager {
  showGameOverModal(victory, stage, rewards)
  hideGameOverModal()
  showCardListModal(title, renderCallback)
  closeCardListModal()
}
```

**책임:** 모달 창 관리

#### 5. StageMapRenderer (스테이지 맵)
```javascript
// 스테이지 선택 화면
class StageMapRenderer {
  showStageSelectModal(...)        // 스테이지 선택 모달
  renderStageMap(stageData, ...)   // 스테이지 맵 렌더링
  buildStageTree(stageData)        // 스테이지 트리 구축
  drawStageConnections(stageData)  // 연결선 그리기
}
```

**책임:** 스테이지 맵 시각화

### Game Engine 모듈 분리

#### 1. CombatManager (전투 관리)
```javascript
// 전투 관련 모든 로직
class CombatManager {
  selectCard(index)                // 카드 선택
  selectEnemy(index)               // 적 선택
  playCard()                       // 카드 사용
  endTurn()                        // 턴 종료
  enemyTurn()                      // 적 턴 처리
  handleBossAction(enemy, pattern) // 보스 패턴
}
```

**책임:** 전투 흐름 제어

#### 2. StageManager (스테이지 관리)
```javascript
// 스테이지 진행 관리
class StageManager {
  startStage(stageId)              // 스테이지 시작
  initEnemiesForStage(stageId)     // 적 초기화
  completeStage()                  // 스테이지 완료
  getBossPattern(bossName)         // 보스 패턴 가져오기
}
```

**책임:** 스테이지 생명주기 관리

#### 3. RewardManager (보상 관리)
```javascript
// 보상 계산 및 처리
class RewardManager {
  getRewardCardCount()             // 보상 카드 개수 계산
  getRewardCards()                 // 보상 카드 가져오기
  selectRewardCard(card)           // 보상 카드 선택
  getHealAmount(stageInfo)         // 체력 회복량 계산
}
```

**책임:** 보상 시스템

#### 4. GameStateInitializer (상태 초기화)
```javascript
// 게임 상태 초기화
class GameStateInitializer {
  getInitialState()                // 초기 상태 정의
  prepareGameStart(stateManager)   // 게임 시작 준비
  resetGame(stateManager)          // 게임 재시작
}
```

**책임:** 게임 초기화

## 🔄 조합 패턴의 이점

### Before (거대한 클래스)
```javascript
class GameEngine {
  // 350줄의 코드
  startGame() { }
  selectCard() { }
  endTurn() { }
  enemyTurn() { }
  handleBossAction() { }
  showRewardCards() { }
  initEnemies() { }
  // ...
}
```

**문제점:**
- ❌ 하나의 파일이 너무 큼
- ❌ 여러 책임이 섞여 있음
- ❌ 테스트가 어려움
- ❌ 코드 이해가 어려움

### After (작은 모듈의 조합)
```javascript
class GameEngine {
  constructor(gameData) {
    // 작은 매니저들을 조합
    this.combatManager = new CombatManager(...);
    this.stageManager = new StageManager(...);
    this.rewardManager = new RewardManager(...);
  }

  // 간단한 위임
  selectCard(index) {
    return this.combatManager.selectCard(index);
  }

  async endTurn() {
    const success = await this.combatManager.endTurn();
    if (!success) {
      this.endGame(false);
    }
  }
}
```

**장점:**
- ✅ 각 파일이 작고 명확함
- ✅ 단일 책임 원칙 준수
- ✅ 독립적으로 테스트 가능
- ✅ 코드 이해가 쉬움
- ✅ 재사용 가능

## 📈 코드 품질 지표

| 지표 | Before | After | 개선 |
|------|--------|-------|------|
| 파일당 평균 줄 수 | ~400줄 | ~150줄 | 62.5% 감소 |
| 클래스당 메서드 수 | ~25개 | ~6개 | 76% 감소 |
| 순환 복잡도 | 높음 | 낮음 | ⬇️ |
| 테스트 용이성 | 어려움 | 쉬움 | ⬆️ |
| 코드 재사용성 | 낮음 | 높음 | ⬆️ |

## 🎨 설계 패턴 적용

### 1. Facade 패턴
`UIManager`와 `GameEngine`은 복잡한 서브시스템을 단순한 인터페이스로 제공

```javascript
// 외부에서는 간단하게
gameEngine.selectCard(0);

// 내부에서는 복잡한 조합
// combatManager.selectCard()
//   -> stateManager.setState()
//   -> uiManager.selectCard()
//   -> renderer.selectCard()
```

### 2. Composition 패턴
상속 대신 조합으로 기능 구성

```javascript
class UIManager {
  // 상속이 아닌 조합
  constructor() {
    this.renderer = new Renderer();
    this.animator = new AnimationManager();
    this.modal = new ModalManager();
  }
}
```

### 3. Delegation 패턴
메서드를 서브 모듈에 위임

```javascript
class UIManager {
  // 직접 구현하지 않고 위임
  renderEnemies(enemies) {
    return this.renderer.renderEnemies(enemies);
  }
}
```

## 🚀 사용 방법

### 실행
```bash
# 로컬 서버 실행
python -m http.server 8000

# 브라우저에서
http://localhost:8000/index-final.html
```

### 개발
각 모듈을 독립적으로 수정 가능:

```javascript
// 애니메이션만 수정하고 싶다면
// src/managers/ui/animation-manager.js만 수정

// 전투 로직만 수정하고 싶다면
// src/core/combat/combat-manager.js만 수정
```

## 🧪 테스트 용이성

### Before (테스트 어려움)
```javascript
// GameEngine 전체를 테스트해야 함
const engine = new GameEngine(mockData);
// 수많은 의존성...
```

### After (테스트 쉬움)
```javascript
// 각 모듈을 독립적으로 테스트
const combatManager = new CombatManager(
  mockStateManager,
  mockCardManager,
  mockUIManager
);

combatManager.selectCard(0);
// 명확한 입출력
```

## 📊 모듈 의존성 그래프

```
main-refactored.js
  └─ GameEngine
      ├─ StateManager (독립)
      ├─ CardManager (독립)
      ├─ UIManager
      │   ├─ EventManager (독립)
      │   ├─ Renderer (독립)
      │   ├─ AnimationManager (독립)
      │   ├─ ModalManager (독립)
      │   └─ StageMapRenderer (독립)
      ├─ CombatManager
      │   ├─ StateManager (의존)
      │   ├─ CardManager (의존)
      │   └─ UIManager (의존)
      ├─ StageManager
      │   └─ StateManager (의존)
      ├─ RewardManager
      │   ├─ StateManager (의존)
      │   ├─ CardManager (의존)
      │   └─ StageManager (의존)
      └─ GameStateInitializer
          └─ CardManager (의존)
```

## 🎓 배운 점

1. **큰 클래스는 나쁘다**
   - 400줄이 넘는 클래스는 여러 책임을 가짐
   - 작은 클래스(100-150줄)가 이해하기 쉬움

2. **조합 > 상속**
   - 유연성과 재사용성이 높음
   - 의존성 주입으로 테스트 용이

3. **명확한 책임 분리**
   - 각 모듈이 무엇을 하는지 이름만 봐도 알 수 있음
   - `CombatManager`, `RewardManager`, `AnimationManager`

4. **위임 패턴**
   - 통합 클래스는 단순한 위임자 역할
   - 실제 로직은 서브 모듈에

## 🔮 다음 단계

1. **단위 테스트 작성**
```javascript
// combat-manager.test.js
test('카드 선택 시 에너지가 감소한다', () => {
  // ...
});
```

2. **타입스크립트 적용**
```typescript
interface CombatManager {
  selectCard(index: number): void;
  endTurn(): Promise<boolean>;
}
```

3. **번들러 도입**
```bash
npm install vite
npm run build
```

## 📝 요약

| 개선 사항 | 설명 |
|----------|------|
| 모듈 분리 | 2개 대형 파일 → 11개 작은 모듈 |
| 평균 파일 크기 | 400줄 → 150줄 (62.5% 감소) |
| 설계 패턴 | Facade, Composition, Delegation |
| 테스트 용이성 | 어려움 → 쉬움 |
| 코드 가독성 | 낮음 → 높음 |
| 유지보수성 | 어려움 → 쉬움 |

**결론:** 프레임워크 없이도 모던 소프트웨어 설계 원칙을 적용하여 **유지보수하기 좋은 코드**를 작성할 수 있습니다! 🎉
