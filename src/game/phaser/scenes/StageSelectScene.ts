import Phaser from 'phaser';
import EventBus from '../../EventBus';
import LanguageManager from '../../../i18n/LanguageManager';
import { tweenConfig } from '../managers/TweenConfigManager';
import { textStyle } from '../managers/TextStyleManager';

interface StageData {
  id: number;
  name: string;
  type: string;
  description?: string;
  nextStages?: number[];
  [key: string]: any;
}

interface StagesDataMap {
  [key: number]: StageData;
}

interface Player {
  health: number;
  maxHealth: number;
  maxEnergy: number;
  [key: string]: any;
}

interface GameState {
  player: Player;
  currentStage: number;
  stagesCleared: number[];
  deck: any[];
  [key: string]: any;
}

interface SelectedStage {
  id: number;
  data: StageData;
}

export default class StageSelectScene extends Phaser.Scene {
  private stageNodes: Map<number, Phaser.GameObjects.Container>;

  constructor() {
    super({ key: 'StageSelectScene' });
    this.stageNodes = new Map();
  }

  create(): void {
    // React에 현재 Scene이 준비되었음을 알림
    EventBus.emit('current-scene-ready', this);

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 배경 그라데이션
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x0f172a, 0x0f172a, 0x1e293b, 0x1e293b, 1);
    graphics.fillRect(0, 0, width, height);

    // 타이틀
    const langManager = LanguageManager.getInstance();
    this.add.text(
      width / 2,
      60,
      langManager.t('stage.select'),
      textStyle.getStyle('titles.section', { fontSize: '56px' })
    ).setOrigin(0.5);

    // 플레이어 상태 표시
    const gameState: GameState = this.registry.get('gameState');
    this.createPlayerStats(gameState.player);

    // 스테이지 데이터 로드 (번역된 데이터 사용)
    const stagesData: StagesDataMap = langManager.getAllStageData();
    const currentStage: number = gameState.currentStage || 1;
    const clearedStages: number[] = gameState.stagesCleared || [];

    // 스테이지 맵 렌더링 (트리 구조)
    this.createStageMapTree(stagesData, currentStage, clearedStages);

    // 뒤로가기 버튼
    this.createBackButton();
  }

  private createPlayerStats(player: Player): void {
    const width = this.cameras.main.width;

    const statsContainer = this.add.container(width - 280, 40);

    // 배경
    const bg = this.add.rectangle(0, 0, 250, 140, 0x1e293b, 0.95);
    bg.setStrokeStyle(3, 0x8b5cf6);
    bg.setOrigin(0);

    // 타이틀
    const langManager = LanguageManager.getInstance();
    const titleText = this.add.text(
      125,
      15,
      langManager.t('stage.playerInfo'),
      textStyle.getStyle('character.name', { color: '#8b5cf6' })
    ).setOrigin(0.5, 0);

    const healthText = this.add.text(
      20,
      50,
      `❤️ 체력: ${player.health}/${player.maxHealth}`,
      textStyle.getStyle('character.hp', { fontSize: '20px' })
    );

    const energyText = this.add.text(
      20,
      80,
      `⚡ 에너지: ${player.maxEnergy}`,
      textStyle.getStyle('ui.label', { fontSize: '20px', color: '#4ecdc4' })
    );

    const gameState: GameState = this.registry.get('gameState');
    const deckText = this.add.text(
      20,
      110,
      `🎴 덱: ${gameState.deck.length}장`,
      textStyle.getStyle('character.name')
    );

    statsContainer.add([bg, titleText, healthText, energyText, deckText]);
  }

  private createStageMapTree(stagesData: StagesDataMap, currentStage: number, clearedStages: number[]): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 스테이지를 트리 구조로 계산
    const stageTree = this.buildStageTree(stagesData);

    // 세로 방향으로 배치 (위에서 아래로)
    const startY = 200;
    const verticalSpacing = 150;
    const maxLevels = stageTree.length;

    // 먼저 모든 연결선을 그리기 (노드 뒤에 표시되도록)
    this.drawAllConnections(stageTree, stagesData, startY, verticalSpacing, width, clearedStages);

    // 각 레벨의 노드 그리기 (역순으로)
    stageTree.forEach((level, levelIndex) => {
      const y = startY + levelIndex * verticalSpacing;
      const horizontalSpacing = Math.min(300, width / (level.length + 2));
      const totalWidth = horizontalSpacing * level.length;
      const startX = (width - totalWidth) / 2 + horizontalSpacing / 2;

      level.forEach((stageId, index) => {
        const x = startX + index * horizontalSpacing;
        const stage = stagesData[stageId];

        const isCleared = clearedStages.includes(stageId);
        const isAvailable = this.isStageAvailable(stageId, currentStage, clearedStages, stagesData);

        this.createStageNode(x, y, stageId, stage, isAvailable, isCleared);
      });
    });
  }

  private buildStageTree(stagesData: StagesDataMap): number[][] {
    const tree: number[][] = [];
    const visited = new Set<number>();
    const depths = new Map<number, number>();

    // DFS로 각 노드의 깊이 계산
    const calculateDepth = (stageId: number, depth: number = 0) => {
      if (visited.has(stageId)) return;
      visited.add(stageId);

      const stage = stagesData[stageId];
      if (!stage) return;

      depths.set(stageId, depth);

      if (stage.nextStages) {
        stage.nextStages.forEach(nextId => {
          calculateDepth(nextId, depth + 1);
        });
      }
    };

    // 시작 스테이지부터 계산
    calculateDepth(1);

    // 깊이별로 그룹화 (역순으로 - 보스가 위, 시작이 아래)
    const maxDepth = Math.max(...Array.from(depths.values()));
    for (let depth = maxDepth; depth >= 0; depth--) {
      const levelStages: number[] = [];
      depths.forEach((d, stageId) => {
        if (d === depth) {
          levelStages.push(stageId);
        }
      });
      if (levelStages.length > 0) {
        tree.push(levelStages.sort((a, b) => a - b));
      }
    }

    return tree;
  }

  private drawAllConnections(
    stageTree: number[][],
    stagesData: StagesDataMap,
    startY: number,
    verticalSpacing: number,
    width: number,
    clearedStages: number[]
  ): void {
    // 역순 트리이므로 이전 스테이지를 찾아야 함
    stageTree.forEach((level, levelIndex) => {
      const y = startY + levelIndex * verticalSpacing;
      const horizontalSpacing = Math.min(300, width / (level.length + 2));
      const totalWidth = horizontalSpacing * level.length;
      const startX = (width - totalWidth) / 2 + horizontalSpacing / 2;

      level.forEach((stageId, index) => {
        const x = startX + index * horizontalSpacing;

        // 다음 레벨(아래쪽)에서 현재 스테이지로 연결되는 스테이지 찾기
        if (levelIndex < stageTree.length - 1) {
          const nextLevel = stageTree[levelIndex + 1];
          const nextY = startY + (levelIndex + 1) * verticalSpacing;
          const nextHorizontalSpacing = Math.min(300, width / (nextLevel.length + 2));
          const nextTotalWidth = nextHorizontalSpacing * nextLevel.length;
          const nextStartX = (width - nextTotalWidth) / 2 + nextHorizontalSpacing / 2;

          nextLevel.forEach((nextStageId, nextIndex) => {
            const nextStage = stagesData[nextStageId];
            if (nextStage && nextStage.nextStages && nextStage.nextStages.includes(stageId)) {
              const nextX = nextStartX + nextIndex * nextHorizontalSpacing;
              const isPathCleared = clearedStages.includes(nextStageId);

              // 아래에서 위로 화살표 그리기
              this.drawConnectionArrow(nextX, nextY - 60, x, y + 60, isPathCleared);
            }
          });
        }
      });
    });
  }

  private drawConnectionArrow(x1: number, y1: number, x2: number, y2: number, isCleared: boolean): void {
    const graphics = this.add.graphics();
    graphics.setDepth(0); // 노드보다 위에 표시

    // 선 색상 - 매우 밝고 명확하게
    const lineColor = isCleared ? 0xc084fc : 0x94a3b8;
    const lineWidth = 8; // 매우 두껍게

    // 직선 그리기
    const dx = x2 - x1;
    const dy = y2 - y1;

    if (!isCleared) {
      // 점선 효과
      graphics.lineStyle(lineWidth, lineColor, 0.8);
      const segments = 12;

      for (let i = 0; i < segments; i += 2) {
        const startRatio = i / segments;
        const endRatio = Math.min((i + 1) / segments, 1);

        graphics.beginPath();
        graphics.moveTo(
          x1 + dx * startRatio,
          y1 + dy * startRatio
        );
        graphics.lineTo(
          x1 + dx * endRatio,
          y1 + dy * endRatio
        );
        graphics.strokePath();
      }
    } else {
      // 실선
      graphics.lineStyle(lineWidth, lineColor, 1);
      graphics.beginPath();
      graphics.moveTo(x1, y1);
      graphics.lineTo(x2, y2);
      graphics.strokePath();
    }

    // 화살표 헤드 - 매우 크고 명확하게
    const angle = Math.atan2(dy, dx);
    const arrowSize = 30;

    // 화살표 배경 (더 밝게)
    graphics.fillStyle(0xffffff, 0.3);
    graphics.beginPath();
    graphics.arc(x2, y2, arrowSize, 0, Math.PI * 2);
    graphics.fillPath();

    // 화살표 본체
    graphics.fillStyle(lineColor, 1);
    graphics.beginPath();

    // 화살표 끝점
    graphics.moveTo(x2, y2);

    // 왼쪽 날개
    graphics.lineTo(
      x2 - arrowSize * Math.cos(angle - Math.PI / 6),
      y2 - arrowSize * Math.sin(angle - Math.PI / 6)
    );

    // 중간 움푹한 부분
    graphics.lineTo(
      x2 - arrowSize * 0.6 * Math.cos(angle),
      y2 - arrowSize * 0.6 * Math.sin(angle)
    );

    // 오른쪽 날개
    graphics.lineTo(
      x2 - arrowSize * Math.cos(angle + Math.PI / 6),
      y2 - arrowSize * Math.sin(angle + Math.PI / 6)
    );

    graphics.closePath();
    graphics.fillPath();

    // 화살표 테두리 (강조)
    graphics.lineStyle(3, 0xffffff, isCleared ? 1 : 0.6);
    graphics.strokePath();

    // 추가 광택 효과
    if (isCleared) {
      graphics.fillStyle(0xffffff, 0.4);
      graphics.beginPath();
      graphics.moveTo(x2 - 5, y2 - 5);
      graphics.lineTo(x2 - 10, y2 - 10);
      graphics.lineTo(x2 - 8, y2 - 12);
      graphics.closePath();
      graphics.fillPath();
    }
  }

  private isStageAvailable(
    stageId: number,
    currentStage: number,
    clearedStages: number[],
    stagesData: StagesDataMap
  ): boolean {
    // 현재 스테이지거나 이미 클리어한 경우
    if (stageId === currentStage || clearedStages.includes(stageId)) {
      return true;
    }

    // 첫 스테이지는 항상 가능
    if (stageId === 1) {
      return true;
    }

    // 이전 스테이지가 클리어되었는지 확인
    for (const [id, stage] of Object.entries(stagesData)) {
      if (stage.nextStages && stage.nextStages.includes(stageId)) {
        if (clearedStages.includes(parseInt(id))) {
          return true;
        }
      }
    }

    return false;
  }

  private createStageNode(
    x: number,
    y: number,
    stageId: number,
    stage: StageData,
    isAvailable: boolean,
    isCleared: boolean
  ): Phaser.GameObjects.Container {
    const node = this.add.container(x, y);

    // 스테이지 타입별 아이콘
    const stageIcon = this.getStageIcon(stage.type);

    // 노드 상태별 색상
    let bgColor: number;
    let borderColor: number;

    if (isCleared) {
      bgColor = 0x22c55e; // 초록 (완료)
      borderColor = 0x16a34a;
    } else if (isAvailable) {
      if (stage.type === '보스') {
        bgColor = 0xef4444; // 빨강
        borderColor = 0xdc2626;
      } else if (stage.type === '중보스') {
        bgColor = 0xf59e0b; // 주황
        borderColor = 0xd97706;
      } else {
        bgColor = 0x8b5cf6; // 보라
        borderColor = 0x7c3aed;
      }
    } else {
      bgColor = 0x1e293b; // 회색 (잠김)
      borderColor = 0x475569;
    }

    // 노드 배경
    const nodeBg = this.add.circle(0, 0, 50, bgColor);
    nodeBg.setStrokeStyle(4, borderColor);

    // 아이콘/번호
    const iconText = this.add.text(0, -5, stageIcon, {
      fontSize: '32px',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0.5);

    const numberText = this.add.text(
      0,
      20,
      stageId.toString(),
      textStyle.getStyle('stage.nodeName')
    ).setOrigin(0.5);

    // 스테이지 이름
    const nameText = this.add.text(
      0,
      75,
      stage.name,
      textStyle.getStyle('stage.nodeName', { stroke: '#000000', strokeThickness: 3 })
    ).setOrigin(0.5);

    // 스테이지 설명
    if (stage.description) {
      const descText = this.add.text(
        0,
        95,
        stage.description,
        textStyle.getStyle('stage.description', { wordWrap: { width: 200 } })
      ).setOrigin(0.5);
      node.add(descText);
    }

    node.add([nodeBg, iconText, numberText, nameText]);
    node.setDepth(1); // 노드를 화살표보다 위에 표시

    // 클릭 가능한 노드
    if (isAvailable && !isCleared) {
      nodeBg.setInteractive({ useHandCursor: true });

      nodeBg.on('pointerover', () => {
        tweenConfig.apply(this, 'transitions.stageNodeHover', nodeBg);
        nodeBg.setStrokeStyle(4, 0xfbbf24);
      });

      nodeBg.on('pointerout', () => {
        tweenConfig.apply(this, 'transitions.stageNodeHoverOut', nodeBg);
        nodeBg.setStrokeStyle(4, borderColor);
      });

      nodeBg.on('pointerdown', () => {
        const selectedStage: SelectedStage = { id: stageId, data: stage };
        this.registry.set('selectedStage', selectedStage);

        // 클릭 효과
        this.tweens.add({
          targets: node,
          scale: 0.9,
          duration: 100,
          yoyo: true,
          onComplete: () => {
            this.scene.start('BattleScene');
          }
        });
      });

      // 펄스 애니메이션 (현재 가능한 스테이지만)
      tweenConfig.apply(this, 'transitions.stageNodePulse', nodeBg);
    }

    this.stageNodes.set(stageId, node);
    return node;
  }

  private getStageIcon(type: string): string {
    // type 값이 이미 번역된 값이므로 직접 매칭
    const icons: { [key: string]: string } = {
      '일반': '⚔️',
      '중보스': '👹',
      '보스': '👑',
      'ノーマル': '⚔️',
      '中ボス': '👹',
      'ボス': '👑'
    };
    return icons[type] || '❓';
  }

  private createBackButton(): void {
    const langManager = LanguageManager.getInstance();
    const backContainer = this.add.container(80, 60);

    const backBg = this.add.rectangle(0, 0, 120, 50, 0x1e293b, 0.9);
    backBg.setStrokeStyle(2, 0x475569);

    const backText = this.add.text(
      0,
      0,
      langManager.t('stage.back'),
      textStyle.getStyle('character.name')
    ).setOrigin(0.5);

    backContainer.add([backBg, backText]);

    backBg.setInteractive({ useHandCursor: true });

    backBg.on('pointerover', () => {
      backBg.setFillStyle(0x8b5cf6);
      this.tweens.add({
        targets: backContainer,
        scale: 1.05,
        duration: 200
      });
    });

    backBg.on('pointerout', () => {
      backBg.setFillStyle(0x1e293b);
      this.tweens.add({
        targets: backContainer,
        scale: 1,
        duration: 200
      });
    });

    backBg.on('pointerdown', () => {
      this.scene.start('MenuScene');
    });
  }
}
