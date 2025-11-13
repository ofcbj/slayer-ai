# JavaScript 게임 엔진 사용 검토

## 현재 상황 분석

### 현재 방식: DOM 기반
```javascript
// renderer.js
renderEnemies(enemies) {
    this.elements.enemyArea.innerHTML = '';
    enemies.forEach((enemy, index) => {
        const enemyEl = document.createElement('div');
        enemyEl.className = 'enemy';
        enemyEl.innerHTML = `...`;
        this.elements.enemyArea.appendChild(enemyEl);
    });
}
```

**장점:**
- ✅ HTML/CSS로 쉽게 스타일링
- ✅ 텍스트 렌더링이 간단
- ✅ 반응형 디자인 쉬움
- ✅ 브라우저 개발자 도구로 디버깅 용이
- ✅ 추가 라이브러리 불필요

**단점:**
- ❌ 많은 요소 렌더링 시 성능 저하
- ❌ 복잡한 애니메이션 구현 어려움
- ❌ 파티클 효과 등 게임 이펙트 한계
- ❌ 프레임 단위 제어 어려움

---

## JavaScript 게임 엔진 옵션

### 1. Phaser 3 ⭐️⭐️⭐️⭐️⭐️ (추천)

**개요:**
- 가장 인기 있는 HTML5 게임 엔진
- 2D 게임에 최적화
- 카드 게임에 완벽하게 맞음

**장점:**
```javascript
// Phaser로 카드 렌더링 예시
class CardSprite extends Phaser.GameObjects.Container {
    constructor(scene, x, y, cardData) {
        super(scene, x, y);

        // 배경 이미지
        this.bg = scene.add.rectangle(0, 0, 120, 180, 0x8b5cf6);
        this.add(this.bg);

        // 카드 이미지 (이모지를 텍스처로)
        this.image = scene.add.text(0, -40, cardData.image, {
            fontSize: '48px'
        });
        this.add(this.image);

        // 카드 이름
        this.name = scene.add.text(0, 20, cardData.name, {
            fontSize: '16px',
            color: '#ffffff'
        });
        this.add(this.name);

        // 트윈 애니메이션
        this.setInteractive();
        this.on('pointerover', () => {
            scene.tweens.add({
                targets: this,
                scaleX: 1.1,
                scaleY: 1.1,
                duration: 200
            });
        });
    }
}
```

**장점:**
- ✅ 부드러운 애니메이션 (Tween, Timeline)
- ✅ 파티클 시스템 내장
- ✅ 스프라이트 관리 편리
- ✅ 물리 엔진 (Arcade, Matter.js)
- ✅ 사운드 관리 시스템
- ✅ 카메라 효과 (shake, zoom)
- ✅ 입력 처리 (마우스, 터치, 키보드)
- ✅ Scene 관리 (스테이지 전환)

**단점:**
- ❌ 번들 크기 증가 (~1.3MB minified)
- ❌ 학습 곡선
- ❌ 텍스트 렌더링이 DOM보다 복잡

**적용 예시:**
```javascript
// main-phaser.js
import Phaser from 'phaser';

class BattleScene extends Phaser.Scene {
    constructor() {
        super('BattleScene');
    }

    preload() {
        // 리소스 로드
    }

    create() {
        // 배경
        this.add.rectangle(400, 300, 800, 600, 0x0f172a);

        // 적 생성
        this.enemies = this.add.group();
        this.createEnemies();

        // 플레이어 핸드
        this.hand = this.add.group();
        this.createHand();
    }

    createEnemies() {
        const enemyData = this.gameData.enemies;
        enemyData.forEach((enemy, index) => {
            const sprite = new EnemySprite(this, 200 + index * 150, 200, enemy);
            this.enemies.add(sprite);
        });
    }

    // 적 공격 애니메이션
    attackPlayer(enemy) {
        this.tweens.add({
            targets: enemy,
            x: enemy.x + 50,
            duration: 200,
            yoyo: true,
            onComplete: () => {
                this.cameras.main.shake(200, 0.01);
                this.showDamage();
            }
        });
    }

    // 파티클 효과
    showDamage() {
        const particles = this.add.particles('red');
        const emitter = particles.createEmitter({
            speed: 100,
            scale: { start: 1, end: 0 },
            blendMode: 'ADD'
        });
        emitter.explode(20, this.player.x, this.player.y);
    }
}

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    scene: [BattleScene]
};

const game = new Phaser.Game(config);
```

**사용 사례:**
- Vampire Survivors (히트 게임)
- CrossCode
- 수많은 인디 게임

---

### 2. PixiJS ⭐️⭐️⭐️⭐️

**개요:**
- 초고속 2D 렌더링 라이브러리
- WebGL 기반
- Phaser보다 저수준

**장점:**
```javascript
import * as PIXI from 'pixi.js';

const app = new PIXI.Application({
    width: 800,
    height: 600,
    backgroundColor: 0x0f172a
});

// 카드 스프라이트
class Card extends PIXI.Container {
    constructor(cardData) {
        super();

        const bg = new PIXI.Graphics();
        bg.beginFill(0x8b5cf6);
        bg.drawRoundedRect(0, 0, 120, 180, 10);
        bg.endFill();
        this.addChild(bg);

        const text = new PIXI.Text(cardData.name, {
            fontSize: 16,
            fill: 0xffffff
        });
        text.x = 10;
        text.y = 150;
        this.addChild(text);

        // 인터랙션
        this.interactive = true;
        this.buttonMode = true;
        this.on('pointerdown', this.onClick);
    }

    onClick() {
        // 카드 선택 로직
    }
}
```

**장점:**
- ✅ 매우 빠른 렌더링
- ✅ 작은 번들 크기 (~400KB)
- ✅ WebGL/Canvas 자동 선택
- ✅ 필터 효과 (blur, glow 등)
- ✅ 커스터마이징 자유도 높음

**단점:**
- ❌ 게임 로직은 직접 구현 필요
- ❌ 물리 엔진 별도 통합 필요
- ❌ Scene 관리 직접 구현

---

### 3. Three.js ⭐️⭐️

**개요:**
- 3D 그래픽 라이브러리
- WebGL 기반

**장점:**
- ✅ 3D 효과 가능
- ✅ 카드를 3D로 회전 가능

**단점:**
- ❌ 2D 카드 게임에는 오버킬
- ❌ 번들 크기 큼 (~600KB)
- ❌ 2D UI 구현이 복잡

**적용 예시:**
```javascript
// 3D 카드 뒤집기 효과
const card = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 3),
    new THREE.MeshBasicMaterial({ map: cardTexture })
);

// 회전 애니메이션
gsap.to(card.rotation, {
    y: Math.PI,
    duration: 0.5
});
```

---

### 4. Babylon.js ⭐️⭐️

**개요:**
- 강력한 3D 게임 엔진
- 3D 카드 게임에 적합

**장점:**
- ✅ 물리 엔진 내장
- ✅ 멋진 3D 효과

**단점:**
- ❌ 너무 무거움 (~2MB)
- ❌ 2D 게임에는 과함

---

### 5. Konva.js ⭐️⭐️⭐️

**개요:**
- Canvas 2D API를 쉽게 사용
- DOM과 Canvas의 중간

**장점:**
```javascript
import Konva from 'konva';

const stage = new Konva.Stage({
    container: 'container',
    width: 800,
    height: 600
});

const layer = new Konva.Layer();

// 카드 생성
const card = new Konva.Group({
    x: 100,
    y: 100,
    draggable: true
});

const rect = new Konva.Rect({
    width: 120,
    height: 180,
    fill: '#8b5cf6',
    cornerRadius: 10
});

const text = new Konva.Text({
    text: '강타',
    fontSize: 20,
    fill: 'white',
    x: 10,
    y: 150
});

card.add(rect);
card.add(text);
layer.add(card);
stage.add(layer);

// 애니메이션
card.to({
    scaleX: 1.2,
    scaleY: 1.2,
    duration: 0.3
});
```

**장점:**
- ✅ DOM과 비슷한 API
- ✅ 드래그 앤 드롭 쉬움
- ✅ 이벤트 처리 간단
- ✅ 가벼움 (~200KB)

**단점:**
- ❌ 복잡한 애니메이션 제한적
- ❌ 파티클 효과 없음

---

## 카드 게임에 가장 적합한 엔진: Phaser 3

### 이유

1. **카드 게임 최적화**
   - 스프라이트 기반 렌더링
   - 트윈 애니메이션 (카드 이동, 회전, 크기)
   - 컨테이너로 복잡한 UI 구성

2. **완전한 게임 엔진**
   - Scene 관리 (메뉴, 전투, 보상)
   - Input 시스템 (클릭, 드래그)
   - 사운드 관리

3. **시각 효과**
   - 파티클 시스템 (불, 번개 효과)
   - 카메라 효과 (흔들림, 페이드)
   - 블렌딩 모드 (빛나는 효과)

4. **커뮤니티**
   - 풍부한 예제
   - 활발한 커뮤니티
   - 좋은 문서

---

## 구체적 적용 방안

### 프로젝트 구조
```
slayer-ai/
├── src/
│   ├── phaser/
│   │   ├── scenes/
│   │   │   ├── MenuScene.js          # 메인 메뉴
│   │   │   ├── StageSelectScene.js   # 스테이지 선택
│   │   │   ├── BattleScene.js        # 전투
│   │   │   └── RewardScene.js        # 보상
│   │   ├── sprites/
│   │   │   ├── Card.js               # 카드 스프라이트
│   │   │   ├── Enemy.js              # 적 스프라이트
│   │   │   └── Player.js             # 플레이어 UI
│   │   ├── effects/
│   │   │   ├── AttackParticle.js     # 공격 효과
│   │   │   └── HealParticle.js       # 치유 효과
│   │   └── ui/
│   │       ├── PlayerStats.js        # 플레이어 스탯 UI
│   │       └── EndTurnButton.js      # 턴 종료 버튼
│   ├── core/
│   │   └── (기존 게임 로직 유지)
│   └── main-phaser.js
├── assets/
│   ├── images/
│   ├── sounds/
│   └── fonts/
└── index-phaser.html
```

### BattleScene 예시
```javascript
// src/phaser/scenes/BattleScene.js
export default class BattleScene extends Phaser.Scene {
    constructor() {
        super('BattleScene');
    }

    create(data) {
        const { stageId, gameData } = data;

        // 배경
        this.createBackground();

        // 플레이어 UI
        this.playerStats = new PlayerStats(this, 50, 50);

        // 적들
        this.enemyGroup = this.add.group();
        this.createEnemies(gameData.enemies);

        // 카드 핸드
        this.hand = [];
        this.createHand();

        // 턴 종료 버튼
        this.endTurnButton = new EndTurnButton(this, 700, 550);
        this.endTurnButton.on('click', () => this.endTurn());
    }

    createEnemies(enemyData) {
        enemyData.forEach((data, index) => {
            const enemy = new EnemySprite(this, 200 + index * 150, 200, data);
            enemy.on('click', () => this.attackEnemy(enemy));
            this.enemyGroup.add(enemy);
        });
    }

    createHand() {
        const startX = 150;
        const startY = 500;

        for (let i = 0; i < 5; i++) {
            const card = new CardSprite(this, startX + i * 130, startY, this.deck.pop());

            // 드래그 가능
            this.input.setDraggable(card);

            // 드래그 이벤트
            card.on('dragstart', () => {
                card.setScale(1.1);
                this.highlightEnemies();
            });

            card.on('drop', (pointer, target) => {
                if (target instanceof EnemySprite) {
                    this.playCard(card, target);
                }
            });

            this.hand.push(card);
        }
    }

    playCard(card, enemy) {
        // 카드 사용 애니메이션
        this.tweens.add({
            targets: card,
            x: enemy.x,
            y: enemy.y,
            scale: 0,
            duration: 500,
            onComplete: () => {
                card.destroy();
                this.applyCardEffect(card, enemy);
            }
        });
    }

    applyCardEffect(card, enemy) {
        if (card.data.damage) {
            // 공격 이펙트
            this.showAttackEffect(enemy.x, enemy.y);

            // 적 피해
            enemy.takeDamage(card.data.damage);

            // 카메라 흔들림
            this.cameras.main.shake(100, 0.005);
        }
    }

    showAttackEffect(x, y) {
        const particles = this.add.particles('particle');
        const emitter = particles.createEmitter({
            speed: { min: -100, max: 100 },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            blendMode: 'ADD',
            lifespan: 600,
            gravityY: 200
        });

        emitter.explode(30, x, y);

        // 폭발 후 파티클 제거
        this.time.delayedCall(1000, () => particles.destroy());
    }

    async enemyTurn() {
        for (const enemy of this.enemyGroup.getChildren()) {
            if (enemy.isDead()) continue;

            // 적 공격 애니메이션
            await this.animateEnemyAttack(enemy);

            // 플레이어 피해
            this.playerStats.takeDamage(enemy.attack);
        }
    }

    animateEnemyAttack(enemy) {
        return new Promise(resolve => {
            this.tweens.add({
                targets: enemy,
                x: enemy.x - 50,
                duration: 200,
                yoyo: true,
                onYoyo: () => {
                    this.cameras.main.shake(100, 0.005);
                    this.showDamageNumber(400, 300, enemy.attack);
                },
                onComplete: resolve
            });
        });
    }

    showDamageNumber(x, y, damage) {
        const text = this.add.text(x, y, `-${damage}`, {
            fontSize: '32px',
            color: '#ff4444',
            fontStyle: 'bold'
        });

        this.tweens.add({
            targets: text,
            y: y - 50,
            alpha: 0,
            duration: 1000,
            onComplete: () => text.destroy()
        });
    }
}
```

### Card 스프라이트
```javascript
// src/phaser/sprites/Card.js
export default class CardSprite extends Phaser.GameObjects.Container {
    constructor(scene, x, y, cardData) {
        super(scene, x, y);

        this.cardData = cardData;

        // 카드 배경
        this.bg = scene.add.nineslice(0, 0, 'card-bg', 0, 120, 180);
        this.add(this.bg);

        // 코스트 배지
        this.costBg = scene.add.circle(-50, -80, 20, 0x3b82f6);
        this.add(this.costBg);

        this.costText = scene.add.text(-50, -80, cardData.cost, {
            fontSize: '20px',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.add(this.costText);

        // 카드 이미지
        this.image = scene.add.text(0, -40, cardData.image, {
            fontSize: '48px'
        }).setOrigin(0.5);
        this.add(this.image);

        // 카드 이름
        this.nameText = scene.add.text(0, 20, cardData.name, {
            fontSize: '16px',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.add(this.nameText);

        // 카드 설명
        this.descText = scene.add.text(0, 60, cardData.description, {
            fontSize: '12px',
            wordWrap: { width: 100 },
            align: 'center'
        }).setOrigin(0.5);
        this.add(this.descText);

        // 인터랙티브
        this.setSize(120, 180);
        this.setInteractive();

        // 호버 효과
        this.on('pointerover', () => this.onHover());
        this.on('pointerout', () => this.onHoverOut());

        scene.add.existing(this);
    }

    onHover() {
        this.scene.tweens.add({
            targets: this,
            scaleX: 1.1,
            scaleY: 1.1,
            y: this.y - 20,
            duration: 200,
            ease: 'Back.easeOut'
        });

        // 빛나는 효과
        this.bg.setTint(0xffff00);
    }

    onHoverOut() {
        this.scene.tweens.add({
            targets: this,
            scaleX: 1,
            scaleY: 1,
            y: this.y + 20,
            duration: 200
        });

        this.bg.clearTint();
    }

    playAnimation() {
        // 카드 사용 시 빛나는 효과
        this.scene.tweens.add({
            targets: this,
            scaleX: 1.3,
            scaleY: 1.3,
            alpha: 0,
            duration: 500,
            ease: 'Cubic.easeOut',
            onComplete: () => this.destroy()
        });
    }
}
```

---

## 성능 비교

| 항목 | DOM | Phaser | PixiJS |
|------|-----|--------|--------|
| 초기 로딩 | ⚡ 빠름 | 🔶 보통 | ⚡ 빠름 |
| 렌더링 속도 | 🔶 보통 | ⚡ 빠름 | ⚡ 매우 빠름 |
| 애니메이션 | 🔶 제한적 | ⚡ 부드러움 | ⚡ 부드러움 |
| 파티클 효과 | ❌ 어려움 | ✅ 쉬움 | ✅ 쉬움 |
| 메모리 사용 | ✅ 적음 | 🔶 보통 | ✅ 적음 |
| 번들 크기 | ✅ 0KB | ❌ 1.3MB | 🔶 400KB |
| 학습 곡선 | ✅ 쉬움 | 🔶 보통 | 🔶 보통 |
| 텍스트 렌더링 | ✅ 쉬움 | 🔶 보통 | 🔶 보통 |

---

## 마이그레이션 계획

### Phase 1: Phaser 기본 설정
```bash
npm install phaser
```

### Phase 2: Scene 구조 구현
- MenuScene
- BattleScene
- RewardScene

### Phase 3: 스프라이트 구현
- Card
- Enemy
- Player UI

### Phase 4: 기존 로직 통합
- StateManager 연결
- CardManager 연결
- CombatManager 연결

### Phase 5: 시각 효과 추가
- 파티클 효과
- 카메라 효과
- 트랜지션

---

## 권장 사항

### 현재 프로젝트에는:
**Phaser 3 사용을 강력 추천** ⭐️⭐️⭐️⭐️⭐️

**이유:**
1. 카드 게임에 최적화된 기능
2. 부드러운 애니메이션
3. 풍부한 시각 효과 가능
4. Scene 관리 편리
5. 학습 리소스 풍부

### 대안:
- **간단하고 가벼운 것 원하면**: Konva.js
- **최고 성능 필요하면**: PixiJS
- **3D 효과 원하면**: Three.js

### 혼합 접근:
- UI는 DOM으로 (체력, 에너지 바)
- 전투 화면만 Phaser로 (카드, 적, 이펙트)
- 최고의 밸런스!

---

## 결론

현재 DOM 방식도 충분히 좋지만, Phaser 3로 전환하면:
- 🎮 더 게임답게 보임
- ✨ 멋진 시각 효과 추가 가능
- 🎯 부드러운 애니메이션
- 🚀 확장성 증가

**다음 단계:** Phaser 3 프로토타입을 만들어볼까요?
