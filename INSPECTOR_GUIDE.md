# Game Object Inspector 가이드

Material UI를 사용한 게임 오브젝트 인스펙터가 추가되었습니다.

## 기능

### 1. 게임 오브젝트 트리 뷰
- 현재 Scene의 모든 게임 오브젝트를 계층 구조로 표시
- 오브젝트 타입별 색상 구분
- 자식 오브젝트 개수 표시

### 2. 속성 패널
선택한 오브젝트의 상세 정보를 카테고리별로 표시:
- **Basic Properties**: type, active, visible
- **Transform**: position, scale, rotation, angle
- **Other Properties**: 타입별 특수 속성 (텍스트 내용, 텍스처, 색상 등)
- **Children**: 자식 오브젝트 목록

### 3. 실시간 업데이트
- Scene 전환 시 자동으로 데이터 갱신
- 수동 새로고침 버튼 제공

## 사용 방법

### 인스펙터 열기
1. 게임 실행
2. 우측 하단의 **디버그 버튼** (벌레 아이콘) 클릭
3. 인스펙터 패널이 오른쪽에서 슬라이드

### 오브젝트 검사
1. **좌측 트리**에서 게임 오브젝트 선택
2. **우측 패널**에서 속성 확인
3. 아코디언을 펼쳐 상세 정보 확인

### 데이터 새로고침
- 상단 **Refresh 버튼** 클릭
- Scene이 변경되면 자동 갱신

## 구조

### 컴포넌트

```
src/components/
├── GameObjectInspector.tsx  # 메인 인스펙터 컴포넌트
├── GameObjectTree.tsx        # 트리 뷰 컴포넌트
└── PropertyPanel.tsx         # 속성 패널 컴포넌트
```

### 유틸리티

```
src/game/utils/
└── SceneInspector.ts         # Scene 데이터 추출 유틸리티
```

## API

### SceneInspector

#### `inspectScene(scene: Phaser.Scene | null): GameObjectNode | null`
Scene의 모든 게임 오브젝트를 트리 구조로 변환합니다.

```typescript
import { SceneInspector } from '../game/utils/SceneInspector';

const sceneData = SceneInspector.inspectScene(currentScene);
```

#### `inspectRegistry(scene: Phaser.Scene | null): Record<string, any>`
Scene의 Registry 데이터를 추출합니다.

```typescript
const registryData = SceneInspector.inspectRegistry(currentScene);
console.log(registryData.gameState);
```

#### `inspectPhysics(scene: Phaser.Scene | null): any`
Scene의 Physics World 정보를 추출합니다.

```typescript
const physicsData = SceneInspector.inspectPhysics(currentScene);
console.log(physicsData.gravity);
```

### GameObjectNode 타입

```typescript
interface GameObjectNode {
  id: string;              // 고유 ID
  type: string;            // 오브젝트 타입 (Sprite, Text, Container 등)
  name?: string;           // 오브젝트 이름
  properties: Record<string, any>;  // 속성 맵
  children?: GameObjectNode[];      // 자식 오브젝트
}
```

## 커스터마이징

### 색상 테마 변경

[src/App.tsx](src/App.tsx)에서 Material UI 테마를 수정:

```typescript
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#4ecdc4',  // 원하는 색상으로 변경
    },
    secondary: {
      main: '#ff6b6b',
    },
  },
});
```

### 인스펙터 크기 조정

[src/components/GameObjectInspector.tsx](src/components/GameObjectInspector.tsx)에서:

```typescript
const DRAWER_WIDTH = 800;  // 원하는 너비로 변경 (픽셀)
```

### 추출하는 속성 추가

[src/game/utils/SceneInspector.ts](src/game/utils/SceneInspector.ts)의 `extractProperties` 메서드를 수정:

```typescript
// 새로운 오브젝트 타입 추가
if (obj.type === 'MyCustomType') {
  const custom = obj as MyCustomType;
  props.customProperty = custom.myProperty;
}
```

## 지원하는 오브젝트 타입

| 타입 | 색상 | 추출 속성 |
|------|------|-----------|
| Scene | Primary | key, active, visible, isPaused |
| Container | Secondary | childCount, position, scale |
| Text | Info | text, fontSize, color |
| Sprite/Image | Success | texture, frame, position |
| Graphics | Warning | fillStyle |
| Rectangle | Warning | fillColor, fillAlpha, size |
| Arc | Warning | radius, fillColor, fillAlpha |

## 성능 고려사항

- 인스펙터는 **개발 모드에서만 사용**하는 것을 권장합니다
- 오브젝트가 많은 Scene에서는 수동 새로고침을 사용하세요
- 프로덕션 빌드에서는 인스펙터를 제거하거나 비활성화하세요

## 프로덕션 빌드에서 제거

[src/App.tsx](src/App.tsx)에서 조건부 렌더링:

```typescript
const isDevelopment = import.meta.env.DEV;

return (
  <ThemeProvider theme={darkTheme}>
    <CssBaseline />
    <div id="app">
      <PhaserGame ref={phaserRef} currentActiveScene={currentScene} />

      {isDevelopment && (
        <>
          <Fab ... />
          <GameObjectInspector ... />
        </>
      )}
    </div>
  </ThemeProvider>
);
```

## 문제 해결

### 인스펙터가 열리지 않을 때
- 브라우저 콘솔에서 에러 확인
- Scene이 제대로 로드되었는지 확인
- EventBus 이벤트가 발생하는지 확인

### 속성이 표시되지 않을 때
- 해당 오브젝트 타입이 `extractProperties`에서 지원되는지 확인
- 콘솔에 `SceneInspector.inspectScene(scene)` 결과 출력해서 확인

### 빌드 오류
- Material UI 패키지가 모두 설치되었는지 확인:
  ```bash
  npm install @mui/material @emotion/react @emotion/styled @mui/icons-material @mui/x-tree-view
  ```

## 다음 단계

1. **Registry 뷰어 추가**: 게임 상태 데이터를 별도 탭에 표시
2. **Physics 디버거**: 충돌 박스, 속도 벡터 등을 시각화
3. **라이브 에디팅**: 인스펙터에서 속성을 직접 수정
4. **스크린샷 캡처**: 현재 Scene을 이미지로 저장
5. **성능 모니터**: FPS, 메모리 사용량 등 표시
