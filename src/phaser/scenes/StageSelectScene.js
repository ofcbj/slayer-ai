import Phaser from 'phaser';

export default class StageSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'StageSelectScene' });
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 배경
    this.add.rectangle(0, 0, width, height, 0x0f0f1e).setOrigin(0);

    // 타이틀
    this.add.text(width / 2, 50, 'SELECT STAGE', {
      fontSize: '48px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      fill: '#ffffff'
    }).setOrigin(0.5);

    // 플레이어 상태 표시
    const gameState = this.registry.get('gameState');
    this.createPlayerStats(gameState.player);

    // 스테이지 데이터 로드
    const stagesData = this.registry.get('stagesData');
    const currentStage = gameState.currentStage || 1;
    const clearedStages = gameState.stagesCleared || [];

    // 스테이지 맵 렌더링
    this.createStageMap(stagesData, currentStage, clearedStages);
  }

  createPlayerStats(player) {
    const width = this.cameras.main.width;

    const statsContainer = this.add.container(width - 250, 30);

    const bg = this.add.rectangle(0, 0, 220, 100, 0x2a2a3e, 0.8);
    bg.setStrokeStyle(2, 0x4ecdc4);
    bg.setOrigin(0);

    const healthText = this.add.text(10, 10, `HP: ${player.health}/${player.maxHealth}`, {
      fontSize: '20px',
      fontFamily: 'monospace',
      fill: '#ff6b6b'
    });

    const energyText = this.add.text(10, 40, `Energy: ${player.maxEnergy}`, {
      fontSize: '20px',
      fontFamily: 'monospace',
      fill: '#4ecdc4'
    });

    const deckText = this.add.text(10, 70, `Deck: ${this.registry.get('gameState').deck.length} cards`, {
      fontSize: '16px',
      fontFamily: 'monospace',
      fill: '#ffffff'
    });

    statsContainer.add([bg, healthText, energyText, deckText]);
  }

  createStageMap(stagesData, currentStage, clearedStages) {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 스테이지 레이어별로 배치
    const layers = this.calculateLayers(stagesData, currentStage);

    const startY = 150;
    const layerHeight = 120;

    layers.forEach((layer, layerIndex) => {
      const y = startY + (layerIndex * layerHeight);
      const spacing = width / (layer.length + 1);

      layer.forEach((stageId, index) => {
        const x = spacing * (index + 1);
        const stage = stagesData[stageId];

        const isCleared = clearedStages.includes(stageId);
        const isAvailable = stageId === currentStage || isCleared;

        this.createStageNode(x, y, stageId, stage, isAvailable, isCleared);

        // 다음 스테이지로 연결선 그리기
        if (stage.nextStages && stage.nextStages.length > 0) {
          stage.nextStages.forEach(nextId => {
            const nextLayer = layers[layerIndex + 1];
            if (nextLayer && nextLayer.includes(nextId)) {
              const nextIndex = nextLayer.indexOf(nextId);
              const nextX = spacing * (nextIndex + 1);
              const nextY = startY + ((layerIndex + 1) * layerHeight);

              this.drawConnection(x, y + 35, nextX, nextY - 35, isCleared);
            }
          });
        }
      });
    });

    // 뒤로가기 버튼
    this.createBackButton();
  }

  calculateLayers(stagesData, currentStage) {
    // 스테이지를 레이어별로 그룹화
    const layers = [];
    const visited = new Set();

    // 첫 번째 레이어 (시작 스테이지)
    layers.push([1]);
    visited.add(1);

    // BFS로 레이어 계산
    let currentLayer = [1];
    while (currentLayer.length > 0) {
      const nextLayer = [];

      currentLayer.forEach(stageId => {
        const stage = stagesData[stageId];
        if (stage && stage.nextStages) {
          stage.nextStages.forEach(nextId => {
            if (!visited.has(nextId)) {
              nextLayer.push(nextId);
              visited.add(nextId);
            }
          });
        }
      });

      if (nextLayer.length > 0) {
        layers.push(nextLayer);
        currentLayer = nextLayer;
      } else {
        break;
      }
    }

    return layers;
  }

  createStageNode(x, y, stageId, stage, isAvailable, isCleared) {
    const node = this.add.container(x, y);

    // 노드 배경 색상
    let bgColor = 0x3a3a4e; // 기본 (비활성)
    if (isCleared) {
      bgColor = 0x2ecc71; // 클리어
    } else if (isAvailable) {
      bgColor = stage.type === '보스' ? 0xff6b6b :
                stage.type === '중보스' ? 0xf39c12 :
                0x4ecdc4; // 일반
    }

    // 노드 원
    const circle = this.add.circle(0, 0, 35, bgColor);
    circle.setStrokeStyle(3, 0xffffff);

    // 스테이지 번호
    const numberText = this.add.text(0, 0, stageId.toString(), {
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      fill: '#ffffff'
    });
    numberText.setOrigin(0.5);

    // 스테이지 이름
    const nameText = this.add.text(0, 55, stage.name, {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      fill: '#ffffff',
      align: 'center',
      wordWrap: { width: 150 }
    });
    nameText.setOrigin(0.5);

    node.add([circle, numberText, nameText]);

    // 클릭 가능한 노드인 경우
    if (isAvailable && !isCleared) {
      circle.setInteractive({ useHandCursor: true });

      circle.on('pointerover', () => {
        this.tweens.add({
          targets: circle,
          scaleX: 1.2,
          scaleY: 1.2,
          duration: 200
        });
      });

      circle.on('pointerout', () => {
        this.tweens.add({
          targets: circle,
          scaleX: 1,
          scaleY: 1,
          duration: 200
        });
      });

      circle.on('pointerdown', () => {
        // 스테이지 선택
        this.registry.set('selectedStage', { id: stageId, data: stage });
        this.scene.start('BattleScene');
      });

      // 펄스 애니메이션
      this.tweens.add({
        targets: circle,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }

    return node;
  }

  drawConnection(x1, y1, x2, y2, isCleared) {
    const line = this.add.line(0, 0, x1, y1, x2, y2, isCleared ? 0x2ecc71 : 0x666666, 0.5);
    line.setLineWidth(3);
    line.setDepth(-1);
  }

  createBackButton() {
    const backBtn = this.add.text(50, 50, '← Back', {
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif',
      fill: '#ffffff'
    });
    backBtn.setInteractive({ useHandCursor: true });

    backBtn.on('pointerover', () => {
      backBtn.setStyle({ fill: '#4ecdc4' });
    });

    backBtn.on('pointerout', () => {
      backBtn.setStyle({ fill: '#ffffff' });
    });

    backBtn.on('pointerdown', () => {
      this.scene.start('MenuScene');
    });
  }
}
