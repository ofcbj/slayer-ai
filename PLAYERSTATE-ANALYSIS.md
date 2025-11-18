# PlayerState 조사 결과

## 개요
PlayerState 관련 정보가 여러 곳에 분산되어 있으며, 일부 중복 정의와 버그가 발견되었습니다.

## 발견된 문제점

### 1. 중복된 PlayerState 인터페이스 정의

#### 위치 1: `src/types/index.ts` (공통 타입)
```typescript
export interface PlayerState {
  maxHealth : number;
  health    : number;
  energy    : number;
  maxEnergy : number;
  defense   : number;
}
```

#### 위치 2: `src/game/phaser/managers/BattleUIManager.ts` (로컬 인터페이스)
```typescript
interface PlayerState {
  health: number;
  maxHealth: number;
  energy: number;
  maxEnergy: number;
  defense: number;
}
```

**문제**: BattleUIManager에서 공통 타입을 import하지 않고 로컬 인터페이스를 정의하고 있습니다.

---

### 2. PlayerState 관리가 여러 곳에 분산

#### 관리 위치 1: `PlayerStateObservable` (BattleManager 내부)
- **역할**: 전투 중 플레이어 상태의 단일 소스 (Single Source of Truth)
- **위치**: `src/game/phaser/state/PlayerStateObservable.ts`
- **사용**: BattleManager가 내부적으로 사용하여 상태 변경을 옵저버 패턴으로 관리

#### 관리 위치 2: `GameState.player` (씬 간 데이터 전달)
- **역할**: 씬 간 플레이어 상태 전달 및 저장
- **위치**: `src/types/index.ts`의 GameState 인터페이스
- **사용**: 
  - BattleScene에서 수동 동기화 (`this.gameState.player = { ...state }`)
  - BattleResultHandler에서 동기화
  - StageSelectScene에서 표시

#### 관리 위치 3: `BattleConsoleCommandHandler` (직접 수정)
- **문제**: PlayerState를 직접 수정하여 옵저버 패턴을 우회
- **위치**: `src/game/phaser/controllers/BattleConsoleCommandHandler.ts`
- **예시**:
  ```typescript
  const playerState = this.battleManager.getPlayerState();
  playerState.health = Math.min(playerState.maxHealth, playerState.health + amount);
  // ❌ 옵저버 패턴을 우회하여 직접 수정
  ```

---

### 3. 버그 발견

#### 버그 1: `BattleManager.ts` 278번째 줄
```typescript
} else if (this.playerState.health <= 0) {
```
**문제**: `this.playerState`는 정의되지 않은 속성입니다. 
**수정 필요**: `this.playerStateObservable.getState().health <= 0`로 변경해야 합니다.

---

### 4. 동기화 문제

#### 문제점
1. **수동 동기화**: BattleScene에서 옵저버 콜백 내에서 `gameState.player`를 수동으로 동기화
   ```typescript
   this.unsubscribePlayerState = this.battleManager.subscribeToPlayerState((state) => {
     this.gameState.player = { ...state }; // 수동 동기화
     // ...
   });
   ```

2. **옵저버 패턴 우회**: BattleConsoleCommandHandler에서 직접 수정
   - 옵저버가 통지되지 않아 UI가 업데이트되지 않을 수 있음
   - Player 객체와 GameState가 동기화되지 않을 수 있음

---

## 현재 구조 분석

### PlayerState 흐름도

```
GameState.player (씬 간 전달)
    ↓
BattleManager 생성 시 초기값으로 전달
    ↓
PlayerStateObservable (전투 중 단일 소스)
    ↓
옵저버 패턴으로 통지
    ├─→ Player.updateFromState() (시각화)
    ├─→ BattleUIManager.updateEnergyUI() (UI)
    └─→ BattleScene에서 gameState.player 동기화 (수동)
```

### 사용 위치별 정리

| 파일 | 역할 | PlayerState 접근 방식 |
|------|------|---------------------|
| `types/index.ts` | 타입 정의 | 타입만 정의 |
| `PlayerStateObservable.ts` | 상태 관리 | 내부 상태 저장 및 옵저버 패턴 |
| `BattleManager.ts` | 전투 로직 | PlayerStateObservable을 통해 관리 |
| `BattleScene.ts` | 씬 관리 | 옵저버 구독 + gameState.player 동기화 |
| `Player.ts` | 시각화 | updateFromState()로 상태 받음 |
| `BattleUIManager.ts` | UI 관리 | PlayerState를 파라미터로 받음 |
| `BattleConsoleCommandHandler.ts` | 콘솔 명령 | ❌ 직접 수정 (버그) |
| `BattleResultHandler.ts` | 결과 처리 | getPlayerState()로 읽기 |
| `BattleEventManager.ts` | 이벤트 처리 | getPlayerState()로 읽기 |
| `BattleSceneInitializer.ts` | 초기화 | gameState.player 사용 |

---

## 통합 가능성 검토

### ✅ 통합 가능한 부분

1. **중복 인터페이스 제거**
   - BattleUIManager의 로컬 PlayerState 인터페이스를 제거하고 공통 타입 사용

2. **옵저버 패턴 일관성 확보**
   - BattleConsoleCommandHandler에서 BattleManager의 메서드를 통해 상태 변경
   - 직접 수정 대신 BattleManager에 메서드 추가 (예: `healPlayer()`, `setEnergy()`, `setDefense()`)

3. **버그 수정**
   - BattleManager의 `checkBattleEnd()`에서 올바른 방법으로 상태 읽기

### ⚠️ 통합 시 고려사항

1. **GameState.player의 역할**
   - 씬 간 데이터 전달용으로 필요함 (BattleScene → RewardScene 등)
   - 완전히 제거하기보다는 BattleManager의 PlayerStateObservable을 단일 소스로 유지하고, 씬 전환 시에만 동기화

2. **옵저버 패턴 유지**
   - BattleManager가 PlayerState의 유일한 수정자 역할
   - 다른 컴포넌트는 읽기 전용 접근 또는 BattleManager 메서드를 통한 간접 수정

---

## 권장 리팩토링 방안

### 방안 1: BattleManager에 상태 변경 메서드 추가 (권장)

```typescript
// BattleManager에 추가
public healPlayer(amount: number): void {
  this.playerStateObservable.setState(state => {
    state.health = Math.min(state.maxHealth, state.health + amount);
  });
}

public setEnergy(amount: number): void {
  this.playerStateObservable.setState(state => {
    state.energy = Math.max(0, Math.min(state.maxEnergy, amount));
  });
}

public setDefense(amount: number): void {
  this.playerStateObservable.setState(state => {
    state.defense = Math.max(0, amount);
  });
}
```

**장점**:
- 옵저버 패턴 일관성 유지
- 모든 상태 변경이 BattleManager를 통해 이루어짐
- 디버깅 및 추적 용이

### 방안 2: GameState.player를 옵저버로 동기화

BattleScene에서 옵저버 구독 시 gameState.player를 자동 동기화하도록 유지하되, 다른 곳에서 직접 수정하지 않도록 제한.

---

## 결론

1. **즉시 수정 필요**: BattleManager의 버그 (278번째 줄)
2. **리팩토링 권장**: BattleConsoleCommandHandler의 직접 수정 제거
3. **코드 정리**: BattleUIManager의 중복 인터페이스 제거
4. **구조 개선**: BattleManager에 상태 변경 메서드 추가하여 일관성 확보

PlayerState는 기본적으로 잘 구조화되어 있으나, 일부 컴포넌트에서 옵저버 패턴을 우회하는 부분이 있어 통합이 필요합니다.

