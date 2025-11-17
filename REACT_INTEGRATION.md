# React + Phaser 통합 가이드

## 프로젝트 구조

```
slayer-ai/
├── src/
│   ├── components/          # React 컴포넌트
│   │   └── PhaserGame.tsx   # Phaser 게임을 감싸는 React 컴포넌트
│   ├── game/                # Phaser 게임 로직
│   │   ├── EventBus.ts      # React ↔ Phaser 통신 레이어
│   │   ├── main.ts          # Phaser 게임 설정
│   │   └── phaser/          # 기존 Phaser 코드
│   │       ├── scenes/      # Phaser Scene들
│   │       ├── objects/     # 게임 오브젝트
│   │       └── managers/    # 게임 매니저들
│   ├── App.tsx              # React 메인 컴포넌트
│   ├── App.css              # 앱 스타일
│   ├── main.tsx             # React 진입점
│   └── index.css            # 글로벌 스타일
├── index.html               # HTML 진입점
├── vite.config.js           # Vite 설정 (React 플러그인 포함)
└── tsconfig.json            # TypeScript 설정 (JSX 포함)
```

## 핵심 개념

### 1. EventBus
React와 Phaser 간 통신을 위한 이벤트 시스템입니다.

```typescript
// 이벤트 발송 (Phaser에서)
EventBus.emit('event-name', data);

// 이벤트 수신 (React에서)
EventBus.on('event-name', (data) => {
  console.log(data);
});

// 리스너 제거
EventBus.off('event-name', callback);
```

### 2. PhaserGame 컴포넌트
Phaser 게임을 React 컴포넌트로 감싸서 통합합니다.

- **Props**: `currentActiveScene` - Scene이 준비되면 호출되는 콜백
- **Ref**: 게임 인스턴스와 현재 Scene에 접근 가능

```tsx
const phaserRef = useRef<IRefPhaserGame | null>(null);

<PhaserGame ref={phaserRef} currentActiveScene={handleSceneReady} />

// 게임 인스턴스 접근
phaserRef.current?.game

// 현재 Scene 접근
phaserRef.current?.scene
```

### 3. Scene 통합
각 Phaser Scene은 준비되면 `current-scene-ready` 이벤트를 발송해야 합니다.

```typescript
import EventBus from '../../EventBus';

export default class MyScene extends Phaser.Scene {
  create(): void {
    // React에 Scene이 준비되었음을 알림
    EventBus.emit('current-scene-ready', this);

    // 나머지 Scene 로직...
  }
}
```

## 개발 및 빌드

### 개발 서버 실행
```bash
npm run dev
```
- 포트: 3000 (사용 중이면 자동으로 다른 포트 사용)
- HMR (Hot Module Replacement) 지원

### 프로덕션 빌드
```bash
npm run build
```
- 출력 디렉토리: `dist/`
- 자동 코드 분할: React, Phaser 별도 청크

### 미리보기
```bash
npm run preview
```

## React로 UI 확장하기

### 예제: React UI 오버레이 추가

```tsx
// src/components/GameUI.tsx
import { useEffect, useState } from 'react';
import EventBus from '../game/EventBus';

export function GameUI() {
  const [playerHealth, setPlayerHealth] = useState(100);

  useEffect(() => {
    // Phaser에서 체력 업데이트 수신
    EventBus.on('player-health-changed', (health: number) => {
      setPlayerHealth(health);
    });

    return () => {
      EventBus.off('player-health-changed');
    };
  }, []);

  return (
    <div className="game-ui">
      <div className="health-bar">HP: {playerHealth}</div>
    </div>
  );
}
```

```tsx
// src/App.tsx
import { PhaserGame } from './components/PhaserGame';
import { GameUI } from './components/GameUI';

function App() {
  return (
    <div id="app">
      <PhaserGame />
      <GameUI />  {/* UI 오버레이 */}
    </div>
  );
}
```

### Phaser에서 이벤트 발송

```typescript
// src/game/phaser/objects/Player.ts
import EventBus from '../../EventBus';

class Player {
  takeDamage(amount: number) {
    this.health -= amount;

    // React에 체력 변화 알림
    EventBus.emit('player-health-changed', this.health);
  }
}
```

## 다음 단계

1. **React로 UI 컴포넌트 추가**
   - 메인 메뉴 (MenuScene → React)
   - 전투 UI (BattleScene → React)
   - 카드 선택 UI

2. **상태 관리 도입**
   - Zustand 또는 Redux로 글로벌 상태 관리
   - 게임 상태와 UI 상태 동기화

3. **라우팅 추가**
   - React Router로 화면 전환 관리
   - Scene과 Route 매핑

4. **스타일링 개선**
   - Tailwind CSS 또는 styled-components
   - 반응형 디자인

## 문제 해결

### HMR이 작동하지 않는 경우
Vite 개발 서버를 재시작하세요:
```bash
npm run dev
```

### 빌드 오류
TypeScript 설정을 확인하세요. `tsconfig.json`에 `"jsx": "react-jsx"`가 있어야 합니다.

### EventBus 이벤트가 수신되지 않는 경우
1. Scene에서 `EventBus.emit('current-scene-ready', this)`를 호출했는지 확인
2. React 컴포넌트에서 useEffect cleanup으로 이벤트 리스너를 제거했는지 확인

## 참고 자료

- [Phaser 3 공식 문서](https://photonstorm.github.io/phaser3-docs/)
- [React 공식 문서](https://react.dev/)
- [Vite 공식 문서](https://vitejs.dev/)
- [Phaser React 템플릿](https://github.com/phaserjs/template-react-ts)
