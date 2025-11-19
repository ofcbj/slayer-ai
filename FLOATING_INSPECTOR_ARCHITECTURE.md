# FloatingInspector 아키텍처 문서

이 문서는 `FloatingInspector` 컴포넌트의 구조, 데이터 수집 방법, 통신 패턴을 상세히 설명합니다.

## 📋 목차

1. [개요](#개요)
2. [컴포넌트 계층 구조](#컴포넌트-계층-구조)
3. [데이터 수집 메커니즘](#데이터-수집-메커니즘)
4. [통신 패턴](#통신-패턴)
5. [상태 관리](#상태-관리)
6. [Phaser ↔ React 상호작용](#phaser--react-상호작용)
7. [주요 디자인 패턴](#주요-디자인-패턴)
8. [성능 고려사항](#성능-고려사항)

---

## 개요

**FloatingInspector**는 Phaser 게임의 실시간 디버깅을 위한 React 기반 인스펙터 패널입니다. 게임 오브젝트 트리 탐색, 속성 검사, 이벤트 로깅, 콘솔 명령어 실행 기능을 제공합니다.

### 핵심 기능

- 🎮 **게임 오브젝트 탐색**: 씬의 모든 GameObject를 트리 구조로 표시
- 🔍 **속성 검사**: 선택한 오브젝트의 모든 속성을 카테고리별로 표시
- 📡 **이벤트 로깅**: EventBus와 Scene 이벤트를 실시간 모니터링
- 💻 **콘솔 명령**: 게임 상태를 실시간으로 조작하는 명령어 실행
- 🎯 **비주얼 하이라이트**: 선택한 오브젝트를 게임 화면에서 강조 표시

### 파일 구조

```
src/
├── components/
│   ├── FloatingInspector.tsx     # 메인 컨테이너
│   ├── GameObjectTree.tsx         # 게임 오브젝트 트리 뷰
│   ├── PropertyPanel.tsx          # 속성 패널
│   ├── EventLogger.tsx            # 이벤트 로거
│   └── ConsoleCommand.tsx         # 콘솔 명령어
└── game/
    ├── EventBus.ts                # 글로벌 이벤트 버스
    └── utils/
        ├── SceneInspector.ts      # 씬 데이터 수집
        └── ObjectHighlighter.ts   # 오브젝트 하이라이트
```

---

## 컴포넌트 계층 구조

```
FloatingInspector (루트 컨테이너)
│
├── Header (AppBar)
│   ├── 드래그 인디케이터
│   ├── 타이틀: "Game Object Inspector"
│   ├── 새로고침 버튼
│   ├── 최소화/최대화 버튼
│   └── 닫기 버튼
│
├── Scene Info Panel (현재 씬 정보)
│   ├── 씬 이름 표시
│   └── 새로고침 버튼
│
├── Tab Navigation (탭 메뉴)
│   ├── Objects 탭 (기본)
│   ├── Events 탭
│   └── Console 탭
│
└── Tab Content (활성 탭 내용)
    │
    ├── Objects Tab (오브젝트 탭)
    │   ├── GameObjectTree (왼쪽 50%)
    │   │   └── SimpleTreeView
    │   │       └── TreeItem (재귀적 렌더링)
    │   └── PropertyPanel (오른쪽 50%)
    │       └── Accordion (카테고리별 속성)
    │
    ├── Events Tab (이벤트 탭)
    │   └── EventLogger
    │       ├── 필터/검색 UI
    │       ├── 이벤트 로그 리스트
    │       └── 로그 통계
    │
    └── Console Tab (콘솔 탭)
        └── ConsoleCommand
            ├── 명령어 히스토리
            └── 명령어 입력 (자동완성)
```

### 컴포넌트 다이어그램

```
┌─────────────────────────────────────────────────────────────┐
│                    FloatingInspector                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                  Header (드래그 가능)                    │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Scene Info: BattleScene                    │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │    [ Objects ]  [ Events ]  [ Console ]                │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌──────────────────────┬─────────────────────────────────┐ │
│  │  GameObjectTree      │    PropertyPanel                │ │
│  │  ├─ Scene            │    ┌─────────────────────────┐ │ │
│  │  ├─ Managers         │    │ Basic Properties        │ │ │
│  │  │  ├─ BattleManager │    │ ├─ type: "Sprite"      │ │ │
│  │  │  └─ DeckManager   │    │ ├─ active: true        │ │ │
│  │  └─ Display List     │    │ └─ visible: true       │ │ │
│  │     ├─ Player        │    ├─────────────────────────┤ │ │
│  │     ├─ Enemy [0]     │    │ Transform               │ │ │
│  │     └─ Card [0]      │    │ ├─ x: 100              │ │ │
│  │                      │    │ └─ y: 200              │ │ │
│  │                      │    └─────────────────────────┘ │ │
│  └──────────────────────┴─────────────────────────────────┘ │
│                                              ┌──────┐        │
│                                              │ 크기  │        │
│                                              │ 조절  │        │
│                                              └──────┘        │
└─────────────────────────────────────────────────────────────┘
```

---

## 데이터 수집 메커니즘

### SceneInspector 클래스

**위치**: `src/game/utils/SceneInspector.ts`

`SceneInspector`는 Phaser 씬의 모든 정보를 재귀적으로 수집하여 트리 구조로 변환합니다.

#### 데이터 구조

```typescript
interface GameObjectNode {
  id: string;                                  // 고유 식별자
  type: string;                                // "Scene", "Container", "Sprite" 등
  name: string;                                // 표시 이름
  properties: Record<string, any>;             // 추출된 속성들
  children: GameObjectNode[];                  // 자식 노드들
  gameObject?: Phaser.GameObjects.GameObject;  // 실제 Phaser 오브젝트 참조
}
```

#### 데이터 수집 프로세스

```
SceneInspector.inspectScene(scene)
│
├─ 1. Scene 노드 생성
│   ├─ type: "Scene"
│   ├─ name: scene.scene.key
│   └─ properties: { key, active, visible, isPaused }
│
├─ 2. Managers 탐지 (동적)
│   ├─ Scene 속성 스캔 (패턴 매칭)
│   │   └─ 패턴: *Manager, *Handler, *Controller, *Service
│   ├─ 각 Manager 속성 추출 (깊이: 3)
│   └─ Managers 노드 생성
│
└─ 3. Display List 순회
    ├─ scene.children.list 반복
    ├─ 각 GameObject에 inspectGameObject() 호출
    │   ├─ 기본 속성 추출
    │   ├─ 트랜스폼 속성
    │   ├─ 렌더링 속성
    │   └─ 타입별 특수 속성
    └─ Container는 재귀적으로 자식 검사
```

#### 속성 추출 메서드

```typescript
extractProperties(obj, depth = 0, maxDepth = 3)
│
├─ 순환 참조 방지 (WeakSet 사용)
├─ 깊이 제한 검사 (maxDepth)
├─ private 필드 제외 (_로 시작)
│
└─ 속성 타입별 처리
    ├─ null/undefined → 문자열 표시
    ├─ Function → 제외
    ├─ Array → 길이 제한 (> 10: 요약)
    ├─ Object → 재귀 호출 (depth + 1)
    └─ Primitive → 직접 저장
```

### GameObject 타입별 속성

```typescript
// 공통 속성 (모든 GameObject)
basic: {
  type,      // GameObject 타입
  active,    // 활성 상태
  visible,   // 표시 여부
  name       // 이름
}

transform: {
  x, y,              // 위치
  scaleX, scaleY,    // 스케일
  rotation, angle,   // 회전
  originX, originY   // 원점
}

rendering: {
  alpha,            // 투명도
  tint,             // 색조
  depth,            // 깊이
  blendMode,        // 블렌드 모드
  displayWidth,     // 표시 너비
  displayHeight     // 표시 높이
}

// 타입별 특수 속성
Text: { text, fontSize, fontFamily, align, color }
Container: { length, list }
Sprite/Image: { texture, frame }
Graphics: { fillColor, lineColor }
```

### 안전성 메커니즘

```typescript
보호 장치:
├─ 순환 참조 감지 (WeakSet)
├─ 최대 깊이 제한 (3단계)
├─ 최대 키 개수 제한 (20개)
├─ 배열 크기 제한 (10개 이상은 요약)
├─ private 필드 제외 (_prefix)
├─ Function 속성 제외
└─ try-catch로 접근 불가 속성 처리
```

---

## 통신 패턴

### EventBus 아키텍처

**위치**: `src/game/EventBus.ts`

```typescript
const EventBus = new Phaser.Events.EventEmitter();
```

EventBus는 Phaser와 React 간의 주요 통신 채널입니다.

### 이벤트 흐름 다이어그램

```
┌──────────────┐                    ┌──────────────────┐
│ Phaser Game  │                    │ FloatingInspector│
│   (Scene)    │                    │   (React)        │
└──────┬───────┘                    └────────┬─────────┘
       │                                     │
       │ 1. Scene 준비 완료                   │
       ├──────────────────────────────────────>
       │ EventBus.emit('current-scene-ready') │
       │                                     │
       │                                     ├─ 2. Scene 저장
       │                                     ├─ 3. SceneInspector 실행
       │                                     │    └─> sceneData 생성
       │                                     │
       │ 4. 사용자가 트리에서 노드 선택        │
       │                                     ├─ 5. selectedNode 업데이트
       │                                     │
       │                                     ├─ 6. ObjectHighlighter.highlight()
       │ <──────────────────────────────────┤
       │ 7. Phaser Graphics로 오브젝트 강조   │
       │                                     │
       │                                     │
       │ 8. 사용자가 콘솔 명령어 입력          │
       │ <──────────────────────────────────┤
       │ EventBus.emit('console-damage-player')
       │                                     │
       ├─ 9. BattleScene이 이벤트 수신        │
       ├─ 10. 게임 상태 변경                  │
       │                                     │
└──────┴───────┘                    └────────┴─────────┘
```

### 주요 이벤트 목록

#### 1. 씬 준비 이벤트

```typescript
// Phaser → React
EventBus.emit('current-scene-ready', scene);

// FloatingInspector에서 수신
EventBus.on('current-scene-ready', (scene: Phaser.Scene) => {
  setCurrentScene(scene);
  refreshSceneData(scene);
  ObjectHighlighter.initialize(scene);
});
```

#### 2. 콘솔 명령어 이벤트

```typescript
// React → Phaser
EventBus.emit('console-damage-player', amount);
EventBus.emit('console-heal-player', amount);
EventBus.emit('console-set-energy', amount);
EventBus.emit('console-set-defense', amount);
EventBus.emit('console-add-card', cardName);
EventBus.emit('console-draw-cards', count);
EventBus.emit('console-damage-enemy', { index, amount });
EventBus.emit('console-heal-enemy', { index, amount });
EventBus.emit('console-next-turn');
EventBus.emit('console-win-battle');
EventBus.emit('console-lose-battle');
```

### EventLogger의 이벤트 인터셉션

EventLogger는 모든 이벤트를 투명하게 로깅합니다:

```typescript
// 원본 emit 메서드 래핑
const originalEmit = EventBus.emit.bind(EventBus);

(EventBus as any).emit = (event: string, ...args: any[]) => {
  // 로그 추가
  addLog(event, args, 'EventBus');

  // 원본 emit 호출 (기능 유지)
  return originalEmit(event, ...args);
};

// 정리 시 원본 복원
EventBus.emit = originalEmit;
```

### 이벤트 필터링

```typescript
// 프레임마다 발생하는 이벤트 제외 (성능)
const FRAME_EVENTS = [
  'preupdate', 'update', 'postupdate',
  'prerender', 'render', 'postrender',
  'step', 'poststep'
];

if (!FRAME_EVENTS.includes(eventName)) {
  addLog(eventName, data, source);
}
```

---

## 상태 관리

### FloatingInspector의 상태 변수

```typescript
const [sceneData, setSceneData] = useState<GameObjectNode | null>(null);
// SceneInspector가 생성한 완전한 씬 오브젝트 트리

const [selectedNode, setSelectedNode] = useState<GameObjectNode | null>(null);
// 트리에서 현재 선택된 노드
// PropertyPanel과 ObjectHighlighter에 전달됨

const [currentScene, setCurrentScene] = useState<Phaser.Scene | null>(null);
// 활성 Phaser 씬 참조
// SceneInspector와 ObjectHighlighter가 사용

const [isMinimized, setIsMinimized] = useState(false);
// 패널 최소화 상태

const [size, setSize] = useState({ width: 900, height: 700 });
// 동적 패널 크기

const [isResizing, setIsResizing] = useState(false);
// 리사이즈 드래그 상태

const [activeTab, setActiveTab] = useState(0);
// 활성 탭: Objects(0), Events(1), Console(2)
```

### Effect 훅 라이프사이클

```typescript
// 1. Scene 준비 리스너
useEffect(() => {
  const handleSceneReady = (scene: Phaser.Scene) => {
    setCurrentScene(scene);
    refreshSceneData(scene);
    ObjectHighlighter.initialize(scene);
  };

  EventBus.on('current-scene-ready', handleSceneReady);

  return () => {
    EventBus.off('current-scene-ready', handleSceneReady);
    ObjectHighlighter.destroy();
  };
}, []);

// 2. 선택된 노드 하이라이트
useEffect(() => {
  if (selectedNode && selectedNode.gameObject) {
    ObjectHighlighter.highlight(selectedNode.gameObject);
  } else {
    ObjectHighlighter.clear();
  }
}, [selectedNode]);

// 3. 인스펙터 닫힐 때 정리
useEffect(() => {
  if (!open) {
    ObjectHighlighter.clear();
  }
}, [open]);

// 4. 리사이즈 핸들러
useEffect(() => {
  if (!isResizing) return;

  const handleMouseMove = (e: MouseEvent) => {
    // 크기 업데이트 (최소/최대 제한)
    setSize({
      width: Math.max(600, Math.min(newWidth, window.innerWidth - 100)),
      height: Math.max(400, Math.min(newHeight, window.innerHeight - 100)),
    });
  };

  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', () => setIsResizing(false));

  return () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };
}, [isResizing]);
```

---

## Phaser ↔ React 상호작용

### ObjectHighlighter (비주얼 브릿지)

**위치**: `src/game/utils/ObjectHighlighter.ts`

ObjectHighlighter는 선택된 게임 오브젝트를 Phaser Graphics로 시각적으로 강조합니다.

#### 주요 메서드

```typescript
class ObjectHighlighter {
  private static graphics: Phaser.GameObjects.Graphics | null;
  private static scene: Phaser.Scene | null;

  // 1. 초기화
  static initialize(scene: Phaser.Scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(10000); // 최상위 표시
  }

  // 2. 오브젝트 하이라이트
  static highlight(obj: Phaser.GameObjects.GameObject) {
    const bounds = this.getObjectBounds(obj);

    this.graphics.clear();

    // 노란색 외곽선
    this.graphics.lineStyle(3, 0xffff00, 1);
    this.graphics.strokeRect(
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height
    );

    // 반투명 노란색 채우기
    this.graphics.fillStyle(0xffff00, 0.1);
    this.graphics.fillRect(
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height
    );

    // 중심점 표시 (빨간 원)
    this.graphics.fillStyle(0xff0000, 1);
    this.graphics.fillCircle(bounds.centerX, bounds.centerY, 5);

    // 깜빡임 애니메이션
    scene.tweens.add({
      targets: this.graphics,
      alpha: { from: 1, to: 0.3 },
      duration: 500,
      yoyo: true,
      repeat: 2
    });
  }

  // 3. 하이라이트 제거
  static clear() {
    this.graphics?.clear();
  }

  // 4. 정리
  static destroy() {
    this.graphics?.destroy();
    this.graphics = null;
    this.scene = null;
  }
}
```

#### 오브젝트 경계 계산

```typescript
static getObjectBounds(obj: Phaser.GameObjects.GameObject) {
  // 월드 좌표 변환 매트릭스
  const matrix = obj.getWorldTransformMatrix();

  let x, y, width, height;

  // 타입별 경계 계산
  if (obj.type === 'Rectangle') {
    const rect = obj as Phaser.GameObjects.Rectangle;
    width = rect.displayWidth;
    height = rect.displayHeight;
    x = matrix.tx - rect.originX * width;
    y = matrix.ty - rect.originY * height;
  }
  else if (obj.type === 'Arc' || obj.type === 'Circle') {
    const arc = obj as Phaser.GameObjects.Arc;
    const radius = arc.radius * arc.scaleX;
    width = height = radius * 2;
    x = matrix.tx - radius;
    y = matrix.ty - radius;
  }
  else if (obj.type === 'Text') {
    const text = obj as Phaser.GameObjects.Text;
    const bounds = text.getBounds();
    return bounds; // Text는 이미 정확한 bounds 제공
  }
  else if (obj.type === 'Sprite' || obj.type === 'Image') {
    const sprite = obj as Phaser.GameObjects.Sprite;
    width = sprite.displayWidth;
    height = sprite.displayHeight;
    x = matrix.tx - sprite.originX * width;
    y = matrix.ty - sprite.originY * height;
  }
  else if (obj.type === 'Container') {
    const container = obj as Phaser.GameObjects.Container;
    const bounds = container.getBounds();
    return bounds; // Container는 자식들의 bounds 합산
  }
  else {
    // 기본값 (알 수 없는 타입)
    width = height = 50;
    x = matrix.tx - 25;
    y = matrix.ty - 25;
  }

  return {
    x,
    y,
    width,
    height,
    centerX: x + width / 2,
    centerY: y + height / 2
  };
}
```

### 데이터 흐름: Phaser → React

```
┌─────────────────────────────────────────────────────────────┐
│ 1. 씬 준비 이벤트                                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Phaser Game                                                │
│  └─ EventBus.emit('current-scene-ready', scene)            │
│      └─ React FloatingInspector                             │
│          └─ SceneInspector.inspectScene(scene)             │
│              └─ GameObjectNode 트리 생성                     │
│                  └─ setSceneData(tree)                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 2. 사용자가 트리에서 게임 오브젝트 선택                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  User clicks TreeItem                                        │
│  └─ onSelectedItemsChange handler                           │
│      └─ findNodeById(nodeId)                                │
│          └─ Returns GameObjectNode with gameObject ref      │
│              └─ onNodeSelect(node)                          │
│                  └─ setSelectedNode(node)                   │
│                      ├─ useEffect detects change            │
│                      │   └─ ObjectHighlighter.highlight()   │
│                      │       └─ Phaser Graphics draws box   │
│                      └─ PropertyPanel renders properties    │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 3. 속성 검사                                                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  PropertyPanel                                               │
│  └─ Receives selectedNode prop                              │
│      └─ node.properties 접근                                │
│          └─ 카테고리별 Accordion 렌더링                      │
│              ├─ Basic Properties                            │
│              ├─ Transform                                   │
│              ├─ Rendering                                   │
│              └─ Custom Properties                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 명령어 실행 흐름: React → Phaser

```
┌─────────────────────────────────────────────────────────────┐
│ ConsoleCommand Component                                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  User types: "damage 10"                                    │
│  └─ TextField onChange                                      │
│      └─ Submit (Enter key)                                  │
│          └─ parseCommand("damage 10")                       │
│              └─ { cmd: "damage", args: ["10"] }            │
│                  └─ switch (cmd)                            │
│                      └─ case 'damage':                      │
│                          └─ EventBus.emit(                  │
│                                'console-damage-player',     │
│                                parseInt(args[0])            │
│                             )                                │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  BattleScene (Phaser)                                       │
│  └─ EventBus.on('console-damage-player', (amount) => {     │
│        battleManager.playerTakeDamage(amount);             │
│        updateUI();                                          │
│     })                                                      │
│                                                              │
│  Result: Player takes 10 damage                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 주요 디자인 패턴

### 1. Observer Pattern (EventBus)

```typescript
// 발행자: 게임 씬, ConsoleCommand
EventBus.emit('event-name', data);

// 구독자: FloatingInspector, EventLogger
EventBus.on('event-name', handler);

// 장점: Phaser와 React 로직 분리
```

### 2. Tree-walking Pattern (SceneInspector)

```typescript
// 재귀적으로 씬 그래프 순회
function inspectScene(scene) {
  const node = createNode(scene);

  scene.children.list.forEach(child => {
    node.children.push(inspectGameObject(child)); // 재귀
  });

  return node;
}

// 장점: 계층 구조 완벽 표현
```

### 3. Interception Pattern (EventLogger)

```typescript
// 원본 메서드 래핑
const originalEmit = EventBus.emit;

EventBus.emit = (event, ...args) => {
  logEvent(event, args); // 인터셉트
  return originalEmit(event, ...args); // 원본 호출
};

// 장점: 투명한 로깅, 원본 기능 유지
```

### 4. Command Pattern (ConsoleCommand)

```typescript
// 명령어 → 이벤트 매핑
const commands = {
  'damage': (amount) => EventBus.emit('console-damage-player', amount),
  'heal': (amount) => EventBus.emit('console-heal-player', amount),
  // ...
};

// 장점: 명령어 추가 용이, 실행 취소 가능
```

### 5. Highlight Pattern (ObjectHighlighter)

```typescript
// 정적 유틸리티 클래스
class ObjectHighlighter {
  private static graphics: Graphics;

  static highlight(obj) {
    const bounds = this.getObjectBounds(obj);
    this.graphics.strokeRect(...bounds);
  }
}

// 장점: 단일 Graphics 객체, 전역 접근
```

### 6. Containment Pattern (FloatingInspector)

```typescript
// 게임 입력 상태 관리
useEffect(() => {
  if (open) {
    currentScene.input.enabled = false; // 충돌 방지
  } else {
    currentScene.input.enabled = true;
  }
}, [open]);

// 장점: UI-게임 입력 충돌 방지
```

---

## 성능 고려사항

### 데이터 수집 안전장치

```typescript
성능 제한:
├─ 최대 재귀 깊이: 3단계
├─ 최대 오브젝트 키: 20개
├─ 배열 크기: 10개 이상은 요약 표시
├─ 이벤트 필터링: 프레임 이벤트 제외
└─ 로그 제한: 최대 500개 (오래된 항목 제거)

메모리 관리:
├─ WeakSet으로 순환 참조 방지
├─ private 필드 제외 (_prefix)
├─ 순환 참조 감지 ("[Circular]" 표시)
└─ ObjectHighlighter cleanup on unmount
```

### 이벤트 필터링

```typescript
// 프레임 이벤트 제외 (초당 60회 발생)
const FRAME_EVENTS = [
  'preupdate', 'update', 'postupdate',
  'prerender', 'render', 'postrender',
  'step', 'poststep'
];

// EventLogger에서 필터링
if (!FRAME_EVENTS.includes(eventName)) {
  addLog(eventName, data, source);
}
```

### 로그 크기 제한

```typescript
// EventLogger의 로그 제한
const MAX_LOGS = 500;

const addLog = (event: string, data: any, source: string) => {
  setLogs(prev => {
    const newLogs = [...prev, newLog];

    // 최대 크기 초과 시 오래된 로그 제거
    if (newLogs.length > MAX_LOGS) {
      return newLogs.slice(-MAX_LOGS);
    }

    return newLogs;
  });
};
```

---

## 전체 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────────────┐
│                   FLOATING INSPECTOR SYSTEM                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────┐                 ┌─────────────────────┐   │
│  │   PHASER GAME       │                 │   REACT UI          │   │
│  │                     │                 │                     │   │
│  │  ┌──────────────┐   │                 │  ┌──────────────┐   │   │
│  │  │ Scene        │   │                 │  │ Floating     │   │   │
│  │  │ ├─ children  │   │                 │  │ Inspector    │   │   │
│  │  │ ├─ Managers  │◄──┼─────────────────┼──┤ ├─ Tree      │   │   │
│  │  │ ├─ Registry  │   │                 │  │ ├─ Props     │   │   │
│  │  │ └─ Events    │   │                 │  │ ├─ Events    │   │   │
│  │  └──────────────┘   │                 │  │ └─ Console   │   │   │
│  │                     │                 │  └──────────────┘   │   │
│  │  ┌──────────────┐   │                 │                     │   │
│  │  │ EventBus     │◄──┼─────────────────┼───────────┐         │   │
│  │  └──────────────┘   │                 │           │         │   │
│  │         ▲           │                 │           ▼         │   │
│  │         │           │                 │  ┌──────────────┐   │   │
│  │         │           │                 │  │ Scene        │   │   │
│  │         └───────────┼─────────────────┼──┤ Inspector    │   │   │
│  │                     │                 │  └──────────────┘   │   │
│  │  ┌──────────────┐   │                 │                     │   │
│  │  │ Graphics     │◄──┼─────────────────┼──┐                  │   │
│  │  │ (Highlight)  │   │                 │  │                  │   │
│  │  └──────────────┘   │                 │  │  ┌──────────┐    │   │
│  │                     │                 │  └──┤ Object   │    │   │
│  └─────────────────────┘                 │     │ Highlight│    │   │
│                                          │     └──────────┘    │   │
│                                          └─────────────────────┘   │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                   COMMUNICATION CHANNELS                        │ │
│  ├────────────────────────────────────────────────────────────────┤ │
│  │  • EventBus: 글로벌 이벤트 발행/구독 (Phaser ↔ React)          │ │
│  │  • Props: React 컴포넌트 데이터 전달 (sceneData, selectedNode) │ │
│  │  • State: React Hooks로 UI 상태 관리                           │ │
│  │  • Refs: Phaser 오브젝트 직접 참조 (gameObject)                │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 사용 예시

### 1. 게임 오브젝트 검사

```typescript
// 1. 인스펙터 열기
setInspectorOpen(true);

// 2. 씬이 자동으로 로드됨 (current-scene-ready 이벤트)
// 3. 트리에서 Player 노드 클릭
// 4. 오른쪽 패널에 Player 속성 표시
{
  type: "Sprite",
  x: 400,
  y: 300,
  health: 80,
  maxHealth: 100,
  defense: 5
}

// 5. 게임 화면에서 Player가 노란색으로 하이라이트됨
```

### 2. 이벤트 모니터링

```typescript
// 1. Events 탭 선택
// 2. 게임에서 카드 플레이
// 3. 로그에 표시:
[EventBus] cardClicked { cardId: "strike_1", cost: 1 }
[Scene] enemyClicked { enemyId: 0 }
[EventBus] cardPlayed { card: {...}, target: {...} }

// 4. 필터로 특정 이벤트만 표시
Filter: "card"
→ cardClicked, cardPlayed만 표시
```

### 3. 콘솔 명령어 실행

```typescript
// 1. Console 탭 선택
// 2. 명령어 입력
> damage 20
Result: Player took 20 damage

> heal 50
Result: Player healed 50 HP

> addcard Strike
Result: Added card "Strike" to hand

> win
Result: Battle won!
```

---

## 확장 가능성

### 새로운 명령어 추가

```typescript
// ConsoleCommand.tsx에서
const executeCommand = (command: string, args: string[]) => {
  switch (command) {
    // 기존 명령어...

    case 'spawn':
      // 새 적 생성
      EventBus.emit('console-spawn-enemy', args[0]);
      break;

    case 'clear':
      // 손패 비우기
      EventBus.emit('console-clear-hand');
      break;
  }
};
```

### 새로운 속성 카테고리 추가

```typescript
// PropertyPanel.tsx에서
const categorizeProperties = (props: Record<string, any>) => {
  return {
    // 기존 카테고리...

    animation: {
      animationKey: props.animationKey,
      isPlaying: props.isPlaying,
      frameRate: props.frameRate
    },

    audio: {
      volume: props.volume,
      muted: props.muted,
      soundKey: props.soundKey
    }
  };
};
```

---

## 문제 해결

### 인스펙터가 게임 오브젝트를 표시하지 않을 때

```typescript
// 1. current-scene-ready 이벤트가 발생했는지 확인
console.log('Scene ready event fired?');

// 2. sceneData 상태 확인
console.log(sceneData);

// 3. 수동으로 새로고침
refreshSceneData();
```

### 하이라이트가 표시되지 않을 때

```typescript
// 1. ObjectHighlighter 초기화 확인
ObjectHighlighter.initialize(scene);

// 2. Graphics 객체 확인
console.log(ObjectHighlighter.graphics);

// 3. 오브젝트 bounds 확인
const bounds = ObjectHighlighter.getObjectBounds(obj);
console.log(bounds);
```

### 콘솔 명령어가 작동하지 않을 때

```typescript
// 1. EventBus 리스너 등록 확인
EventBus.listenerCount('console-damage-player');

// 2. BattleScene에서 이벤트 핸들러 등록 확인
// BattleScene.ts의 registerConsoleCommands() 호출 여부

// 3. 이벤트 로거로 이벤트 발생 확인
// Events 탭에서 console-* 이벤트 검색
```

---

## 결론

FloatingInspector는 Phaser와 React를 우아하게 연결하여 강력한 디버깅 환경을 제공합니다. EventBus를 통한 느슨한 결합, SceneInspector의 깊이 있는 데이터 수집, ObjectHighlighter의 비주얼 피드백이 조화롭게 작동하여 개발자 경험을 크게 향상시킵니다.

주요 장점:
- ✅ 실시간 게임 상태 검사
- ✅ 비파괴적 디버깅 (게임 로직 분리)
- ✅ 확장 가능한 아키텍처
- ✅ 성능 최적화 (깊이 제한, 이벤트 필터링)
- ✅ 사용자 친화적 UI (드래그, 리사이즈, 탭)

이 시스템을 통해 복잡한 게임 상태를 쉽게 이해하고 디버그할 수 있습니다.
