# Slayer AI - Phaser 3 Version

🎮 Phaser 3로 완전히 재구성된 카드 배틀 로그라이크 게임입니다!

## 🚀 실행 방법

1. **개발 서버 실행**
   ```bash
   npm run dev
   ```

2. **브라우저에서 접속**
   ```
   http://localhost:3000/phaser-index.html
   ```

3. **빌드 (배포용)**
   ```bash
   npm run build
   ```

## 🎯 주요 개선 사항

### ✨ 화려한 애니메이션
- **Tween 시스템**: 부드러운 카드 이동, 호버 효과, 스케일 애니메이션
- **파티클 효과**:
  - 카드 사용 시 폭발 파티클
  - 적 처치 시 폭발 효과
  - 승리 시 축하 파티클
  - 메인 메뉴 배경 파티클

### 🎬 게임스러운 연출
- **카메라 효과**:
  - 피격 시 화면 흔들림 (shake)
  - 피격 시 빨간 플래시 효과
  - 부드러운 장면 전환

- **카드 연출**:
  - 카드 뽑을 때 백 이징 애니메이션
  - 카드 선택 시 노란색 테두리 강조
  - 카드 사용 시 목표로 날아가는 애니메이션
  - 타입별 색상 구분 (공격/방어/치유/에너지)

- **적 연출**:
  - 피격 시 흔들림 효과
  - 공격 시 전진 모션
  - 사망 시 페이드 아웃 + 파티클
  - 의도 표시 (공격력, 방어력 미리보기)

### 🎨 시각적 개선
- Canvas/WebGL 렌더링으로 성능 최적화
- 그라디언트 배경
- 동적 색상 시스템
- 깔끔한 UI 레이아웃

## 📁 프로젝트 구조

```
slayer-ai/
├── src/phaser/
│   ├── main.js                    # Phaser 게임 설정
│   ├── scenes/
│   │   ├── BootScene.js           # 로딩 씬
│   │   ├── PreloadScene.js        # 에셋 로드
│   │   ├── MenuScene.js           # 메인 메뉴
│   │   ├── StageSelectScene.js    # 스테이지 선택
│   │   ├── BattleScene.js         # 전투 씬 (핵심)
│   │   ├── RewardScene.js         # 보상 선택
│   │   └── GameOverScene.js       # 승리/패배
│   └── objects/
│       ├── Card.js                # 카드 GameObject
│       └── Enemy.js               # 적 GameObject
├── data/                          # 게임 데이터 (기존 유지)
│   ├── cards.json
│   ├── enemies.json
│   ├── stages.json
│   └── boss-patterns.json
├── phaser-index.html              # Phaser 버전 진입점
├── package.json
└── vite.config.js
```

## 🎮 게임 플레이

### 메인 메뉴
- 타이틀이 맥동하며 빛남
- 배경에 떠다니는 파티클 효과
- 호버 시 버튼 확대 애니메이션

### 스테이지 선택
- 계층형 스테이지 맵
- 현재 진행 가능한 스테이지는 펄스 애니메이션
- 클리어한 스테이지는 초록색으로 표시
- 스테이지 타입별 색상 구분 (일반/중보스/보스)

### 전투
1. **카드 선택**: 카드 위에 마우스를 올리면 위로 올라옴
2. **적 선택**: 공격 카드 선택 후 적 클릭
3. **카드 사용**: 카드가 목표로 날아가며 파티클 효과
4. **적 공격**: 적이 전진하며 공격, 화면 흔들림
5. **턴 종료**: 손패 버리고 적 턴 시작

### 특수 효과
- **데미지 숫자**: 위로 떠오르며 사라짐
- **체력바**: 부드럽게 감소
- **적 처치**: 폭발 파티클과 함께 페이드 아웃
- **승리**: 축하 파티클 효과

## 🔧 기술 스택

- **Phaser 3.80.1**: 게임 엔진
- **Vite 5.0**: 빌드 도구 (빠른 HMR)
- **ES6 Modules**: 모던 JavaScript

## 📊 성능

- 60 FPS 안정적 유지
- 부드러운 애니메이션
- 파티클 최적화
- Canvas/WebGL 렌더링

## 🎨 앞으로 추가 가능한 기능

### 사운드 시스템
```javascript
// PreloadScene에서 로드
this.load.audio('cardPlay', 'assets/sounds/card-play.mp3');
this.load.audio('attack', 'assets/sounds/attack.mp3');
this.load.audio('victory', 'assets/sounds/victory.mp3');

// 사용
this.sound.play('cardPlay');
```

### 스프라이트 애니메이션
```javascript
// 적 스프라이트 시트 사용
this.anims.create({
  key: 'enemy-attack',
  frames: this.anims.generateFrameNumbers('enemy', { start: 0, end: 5 }),
  frameRate: 10,
  repeat: 0
});
```

### 고급 파티클
```javascript
// Phaser 파티클 시스템 사용
const particles = this.add.particles('particle');
const emitter = particles.createEmitter({
  speed: { min: -100, max: 100 },
  scale: { start: 1, end: 0 },
  blendMode: 'ADD',
  lifespan: 1000
});
```

## 🐛 알려진 이슈

현재 버전은 기본 에셋 없이 도형과 텍스트로 구성되어 있습니다.
실제 게임 에셋을 추가하면 더욱 화려해집니다!

## 📝 기존 버전과의 비교

| 기능 | DOM 버전 | Phaser 3 버전 |
|------|----------|---------------|
| 번들 크기 | 0KB | ~1.3MB |
| 애니메이션 | CSS | Tween System |
| 파티클 | ❌ | ✅ |
| 성능 | 보통 | 우수 |
| 카메라 효과 | ❌ | ✅ |
| 확장성 | 제한적 | 우수 |

## 🎉 결과

**완성된 기능:**
✅ 메인 메뉴 씬
✅ 스테이지 선택 씬
✅ 전투 씬 (완전한 게임 로직)
✅ 보상 선택 씬
✅ 게임 오버 씬
✅ 카드 GameObject (파티클 효과 포함)
✅ 적 GameObject (애니메이션 포함)
✅ Tween 애니메이션 시스템
✅ 파티클 효과 시스템
✅ 카메라 효과 (흔들림, 플래시)

이제 진정한 게임다운 경험을 제공합니다! 🎮
