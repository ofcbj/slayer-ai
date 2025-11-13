# 리팩토링 가이드

## 개요
이 문서는 기존 바닐라 JS 카드 게임을 모던 JS 패턴으로 리팩토링한 내용을 설명합니다.

## 주요 개선 사항

### 1. 데이터와 로직 분리
**Before:**
- 스테이지, 적, 카드 데이터가 코드 안에 하드코딩됨
- 데이터 변경 시 코드 수정 필요

**After:**
```
data/
  ├── enemies.json        # 적 데이터
  ├── stages.json         # 스테이지 데이터
  ├── boss-patterns.json  # 보스 패턴
  └── cards.json          # 카드 데이터
```

**장점:**
- 데이터 수정이 쉬움 (코드 변경 없이)
- 밸런스 조정 용이
- 확장성 향상

### 2. ES6 모듈 시스템
**Before:**
```javascript
// 모든 클래스가 전역 스코프
class GameEngine { }
class CardManager { }
class UIManager { }
```

**After:**
```javascript
// 명확한 모듈 구조
import GameEngine from './core/game-engine.js';
import CardManager from './managers/card-manager.js';
import UIManager from './managers/ui-manager.js';
```

**장점:**
- 의존성 명확
- 네임스페이스 오염 방지
- 트리 쉐이킹 가능 (미래 번들링 시)

### 3. 상태 관리 패턴 (State Manager)
**Before:**
```javascript
this.player = { hp: 80, ... };
this.enemies = [];
this.deck = [];
// 상태가 여러 곳에 산재
```

**After:**
```javascript
// 중앙 집중식 상태 관리
this.stateManager = new StateManager({
  player: { ... },
  enemies: [],
  deck: []
});

// 옵저버 패턴으로 상태 변경 감지
this.stateManager.subscribe('player', (newPlayer) => {
  this.updatePlayerUI(newPlayer);
});
```

**장점:**
- 상태 변경 추적 용이
- 디버깅 편의성 (히스토리 기능)
- UI 자동 업데이트
- Undo/Redo 구현 가능

### 4. 이벤트 위임 패턴
**Before:**
```javascript
// 각 카드/적마다 onclick 핸들러
cardEl.onclick = () => this.selectCard(index);
```

**After:**
```javascript
// 부모 요소에서 이벤트 위임
delegate(this.elements.handArea, '.card', 'click', (event) => {
  const index = Array.from(handArea.children).indexOf(cardElement);
  this.emit('card:select', index);
});
```

**장점:**
- 메모리 효율적 (이벤트 리스너 수 감소)
- 동적으로 추가된 요소도 자동 처리
- 성능 향상

### 5. 유틸리티 함수 분리
**Before:**
```javascript
// 중복된 코드
for (let i = array.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [array[i], array[j]] = [array[j], array[i]];
}
```

**After:**
```javascript
// 재사용 가능한 헬퍼 함수
import { shuffleArray, clamp, delay } from './utils/helpers.js';

shuffleArray(deck);
player.hp = clamp(newHp, 0, maxHp);
await delay(1000);
```

**장점:**
- 코드 중복 제거
- 테스트 용이
- 재사용성 향상

### 6. 관심사 분리
**Before:**
```javascript
// UI 로직과 게임 로직이 섞여 있음
selectCard(index) {
  document.querySelectorAll('.card')[index].classList.add('selected');
  this.playCard();
}
```

**After:**
```javascript
// GameEngine: 게임 로직만
selectCard(index) {
  this.stateManager.setState({ selectedCard: index });
}

// UIManager: UI 렌더링만
selectCard(index) {
  const cards = document.querySelectorAll('.card');
  cards[index].classList.add('selected');
}
```

## 프로젝트 구조

```
slayer-ai/
├── data/                      # 게임 데이터 (JSON)
│   ├── enemies.json
│   ├── stages.json
│   ├── boss-patterns.json
│   └── cards.json
├── src/
│   ├── core/                  # 핵심 로직
│   │   ├── game-engine.js    # 게임 엔진
│   │   └── state-manager.js  # 상태 관리
│   ├── managers/              # 기능별 매니저
│   │   ├── card-manager.js   # 카드 관리
│   │   └── ui-manager.js     # UI 관리
│   ├── utils/                 # 유틸리티
│   │   ├── data-loader.js    # 데이터 로딩
│   │   └── helpers.js        # 헬퍼 함수
│   └── main.js               # 진입점
├── index-refactored.html      # 새 HTML
└── (기존 파일들...)
```

## 사용 방법

### 1. 로컬 서버 실행
ES6 모듈을 사용하므로 로컬 서버가 필요합니다:

```bash
# Python 3
python -m http.server 8000

# Node.js (http-server)
npx http-server

# VS Code Live Server 확장 사용
```

### 2. 브라우저에서 열기
```
http://localhost:8000/index-refactored.html
```

## 코드 비교 예제

### 카드 효과 실행

**Before:**
```javascript
executeCardEffect(card, gameState) {
  if (card.damage) {
    if (card.allEnemies) {
      enemies.forEach(enemy => {
        enemy.hp -= card.damage;
      });
    }
  }
  if (card.block) {
    player.block += card.block;
  }
  // ... 더 많은 if 문
}
```

**After:**
```javascript
executeCardEffect(card, gameState) {
  const results = { damageDealt: 0, blockGained: 0 };

  if (card.damage) {
    results.damageDealt = this.applyDamage(card, gameState);
  }
  if (card.block) {
    results.blockGained = this.applyBlock(card, gameState);
  }

  return results; // 결과 반환으로 테스트 가능
}
```

## 향후 개선 가능 사항

### 1. 타입스크립트 도입
```typescript
interface Player {
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  block: number;
}

interface Card {
  name: string;
  type: CardType;
  cost: number;
  damage?: number;
  block?: number;
}
```

### 2. 번들러 사용 (Vite, Webpack)
- 빌드 최적화
- 코드 스플리팅
- 개발 서버 자동 새로고침

### 3. 테스트 추가
```javascript
// 예: CardManager 테스트
describe('CardManager', () => {
  it('should deal damage to enemy', () => {
    const enemy = { hp: 30 };
    cardManager.dealDamageToEnemy(enemy, 10);
    expect(enemy.hp).toBe(20);
  });
});
```

### 4. 더 나은 상태 관리
- Zustand, Redux 같은 라이브러리 사용
- 상태 불변성 보장
- 타임 트래블 디버깅

### 5. 성능 최적화
- Virtual DOM 또는 가상 리스트
- RequestAnimationFrame 활용
- 메모이제이션

## 마이그레이션 체크리스트

- [x] 데이터 JSON으로 분리
- [x] ES6 모듈 적용
- [x] 상태 관리 패턴 구현
- [x] 이벤트 위임 적용
- [x] 유틸리티 함수 분리
- [x] 관심사 분리
- [ ] 단위 테스트 작성
- [ ] 타입스크립트 적용
- [ ] 번들러 설정

## 주의사항

1. **CORS 이슈**: JSON 파일 로드를 위해 로컬 서버 필수
2. **브라우저 지원**: ES6 모듈은 모던 브라우저만 지원
3. **기존 코드**: 기존 파일들은 그대로 유지 (롤백 가능)

## 성능 비교

| 항목 | Before | After | 개선 |
|------|--------|-------|------|
| 초기 로딩 | ~100ms | ~150ms | -50ms (데이터 로드) |
| 카드 렌더링 | O(n) 이벤트 | O(1) 이벤트 | 메모리 절약 |
| 상태 업데이트 | 수동 | 자동 | 버그 감소 |
| 코드 라인 수 | ~800줄 | ~1200줄 | 구조화됨 |

## 결론

이 리팩토링은:
- ✅ 유지보수성 향상
- ✅ 확장성 개선
- ✅ 테스트 가능성 증가
- ✅ 코드 가독성 향상
- ✅ 디버깅 편의성 증가

프레임워크 없이도 모던 JS 패턴을 적용하여 코드 품질을 크게 개선했습니다.
