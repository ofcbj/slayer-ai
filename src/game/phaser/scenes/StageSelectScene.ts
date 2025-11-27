import { tweenConfig } from '../managers/TweenConfigManager';
import { textStyle } from '../managers/TextStyleManager';
import { StageData, GameState } from '../../../types';
import BaseScene from './BaseScene';

interface StagesDataMap {
  [key: number]: StageData;
}

interface SelectedStage {
  id: number;
  data: StageData;
}

export default class StageSelectScene extends BaseScene {
  private stageNodes: Map<number, Phaser.GameObjects.Container>;
  private scrollContainer: Phaser.GameObjects.Container | null = null;
  private isDragging: boolean = false;
  private dragStartY: number = 0;
  private scrollY: number = 0;

  constructor() {
    super({ key: 'StageSelectScene' });
    this.stageNodes = new Map();
  }

  create(): void {
    this.initializeBase();

    const { width, height } = this.getCameraDimensions();

    // 배경 그라데이션 (스크롤되지 않는 고정 배경)
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x0f172a, 0x0f172a, 0x1e293b, 0x1e293b, 1);
    graphics.fillRect(0, 0, width, height);
    graphics.setScrollFactor(0);

    // 타이틀 (고정)
    this.add.text(
      width / 2,
      60,
      this.langManager.t('stage.select'),
      textStyle.getStyle('titles.section', { fontSize: '56px' })
    ).setOrigin(0.5).setScrollFactor(0);

    // 플레이어 상태 표시 (고정)
    const gameState = this.getGameState();
    this.createPlayerStats(gameState.player);

    // 스크롤 가능한 컨테이너 생성
    this.scrollContainer = this.add.container(0, 0);

    // 스테이지 데이터 로드 (번역된 데이터 사용)
    const stagesData: StagesDataMap = this.gameDataManager.getStageData();
    const currentStage: number = gameState.currentStage || 1;
    const clearedStages: number[] = gameState.stagesCleared || [];

    // 스테이지 맵 렌더링 (트리 구조)
    this.createStageMapTree(stagesData, currentStage, clearedStages);

    // My Deck 버튼 (고정)
    this.initializeCardViewManager();
    this.createMyDeckButton(
      () => gameState.deck,
      { scrollFactor: 0 }
    );

    // 스크롤 기능 설정
    this.setupScrolling();

    // 현재 플레이 가능한 스테이지로 스크롤
    this.scrollToAvailableStage(clearedStages);
  }

  private createPlayerStats(player: GameState['player']): void {
    const width = this.cameras.main.width;

    const statsContainer = this.add.container(width - 280, 40);

    // 배경 (높이 증가)
    const bg = this.add.rectangle(0, 0, 250, 170, 0x1e293b, 0.95);
    bg.setStrokeStyle(3, 0x8b5cf6);
    bg.setOrigin(0);

    // 타이틀
    const titleText = this.add.text(
      125, 15,
      this.langManager.t('stage.playerInfo'),
      textStyle.getStyle('character.name', { color: '#8b5cf6' })
    ).setOrigin(0.5, 0);

    const healthText = this.add.text(
      20, 50,
      `❤️ 체력: ${player.health}/${player.maxHealth}`,
      textStyle.getStyle('character.hp', { fontSize: '20px' })
    );

    const energyText = this.add.text(
      20, 80,
      `⚡ 에너지: ${player.maxEnergy}`,
      textStyle.getStyle('ui.label', { fontSize: '20px', color: '#4ecdc4' })
    );

    const goldText = this.add.text(
      20, 110,
      `💰 골드: ${player.gold}G`,
      textStyle.getStyle('ui.label', { fontSize: '20px', color: '#fbbf24' })
    );

    const gameState = this.getGameState();
    const deckText = this.add.text(
      20, 140,
      `🎴 덱: ${gameState.deck.length}장`,
      textStyle.getStyle('character.name')
    );

    statsContainer.add([bg, titleText, healthText, energyText, goldText, deckText]);
    statsContainer.setScrollFactor(0); // 고정
  }

  private createStageMapTree(stagesData: StagesDataMap, currentStage: number, clearedStages: number[]): void {
    const width = this.cameras.main.width;

    // 스테이지를 트리 구조로 계산
    const stageTree = this.buildStageTree(stagesData);
    // 세로 방향으로 배치 (위에서 아래로)
    const startY = 200;
    const verticalSpacing = 150;
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

    // 스크롤 컨테이너에 추가
    if (this.scrollContainer) {
      this.scrollContainer.add(graphics);
    }
  }

  private isStageAvailable(
    stageId: number,
    currentStage: number,
    clearedStages: number[],
    stagesData: StagesDataMap
  ): boolean {
    // 이미 클리어한 스테이지는 다시 갈 수 없음
    if (clearedStages.includes(stageId)) {
      return false;
    }

    // 현재 스테이지 자체는 항상 가능
    if (stageId === currentStage) {
      return true;
    }

    // 시작 스테이지(1번)는 항상 가능
    if (stageId === 1) {
      return true;
    }

    // 클리어한 스테이지가 없으면 시작 스테이지만 가능
    if (clearedStages.length === 0) {
      return false;
    }

    // 가장 최근에 클리어한 스테이지의 nextStages만 확인
    // clearedStages는 클리어 순서대로 추가되므로, 마지막 요소가 최근 클리어한 스테이지
    const lastClearedStageId = clearedStages[clearedStages.length - 1];
    const lastClearedStageData = stagesData[lastClearedStageId];
    
    if (lastClearedStageData && lastClearedStageData.nextStages) {
      if (lastClearedStageData.nextStages.includes(stageId)) {
        return true;
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
      if (stage.type === '보스' || stage.type === 'ボス' || stage.type === 'boss') {
        bgColor = 0xef4444; // 빨강
        borderColor = 0xdc2626;
      } else if (stage.type === '중보스' || stage.type === '中ボス' || stage.type === 'mid_boss') {
        bgColor = 0xf59e0b; // 주황
        borderColor = 0xd97706;
      } else if (stage.type === '상점' || stage.type === 'ショップ' || stage.type === 'shop') {
        bgColor = 0x10b981; // 청록 (상점)
        borderColor = 0x059669;
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

    // 스테이지 ID (아이콘 위에 표시)
    const stageIdText = this.add.text(
      0,
      -35,
      `#${stageId}`,
      textStyle.getStyle('stage.nodeName', {
        fontSize: '16px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
        fontStyle: 'bold'
      })
    ).setOrigin(0.5);

    // 아이콘/이름
    const iconText = this.add.text(
      0, -5,
      stageIcon,
      textStyle.getStyle('stageSelect.icon')
    ).setOrigin(0.5);

    const nameText = this.add.text(
      0, 20,
      stage.name,
      textStyle.getStyle('stage.nodeName')
    ).setOrigin(0.5);

    // 스테이지 설명
    const descText = this.add.text(
      0, 75,
      stage.description || '',
      textStyle.getStyle('stage.nodeName', { fontSize: '14px', stroke: '#000000', strokeThickness: 2 })
    ).setOrigin(0.5);

    node.add([nodeBg, stageIdText, iconText, nameText, descText]);
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

        // 상점 스테이지인지 확인
        const isShop = stage.type === '상점' || stage.type === 'ショップ' || stage.type === 'shop';

        // 클릭 효과
        this.tweens.add({
          targets: node,
          scale: 0.9,
          duration: 100,
          yoyo: true,
          onComplete: () => {
            // 상점이면 ShopScene, 아니면 BattleScene
            this.scene.start(isShop ? 'ShopScene' : 'BattleScene');
          }
        });
      });

      // 펄스 애니메이션 (현재 가능한 스테이지만)
      tweenConfig.apply(this, 'transitions.stageNodePulse', nodeBg);
    }

    // 스크롤 컨테이너에 추가
    if (this.scrollContainer) {
      this.scrollContainer.add(node);
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
      '상점': '🏪',
      'ノーマル': '⚔️',
      'エリート': '👹',
      '中ボス': '👹',
      'ボス': '👑',
      'ショップ': '🏪',
      // 원본 타입도 지원 (번역 실패 시 대비)
      'normal': '⚔️',
      'elite': '👹',
      'mid_boss': '👹',
      'boss': '👑',
      'shop': '🏪'
    };
    return icons[type] || '❓';
  }



  private setupScrolling(): void {
    const height = this.cameras.main.height;

    if (!this.scrollContainer) return;

    // 스크롤 컨테이너의 총 높이 계산
    const bounds = this.scrollContainer.getBounds();
    const contentHeight = bounds.height;
    const viewHeight = height - 200; // 타이틀과 여백 제외

    // 컨텐츠가 화면보다 클 때만 스크롤 활성화
    if (contentHeight > viewHeight) {
      const maxScroll = contentHeight - viewHeight + 200;

      // 마우스 휠 스크롤
      this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: any[], _deltaX: number, deltaY: number) => {
        if (this.scrollContainer) {
          this.scrollY += deltaY * 0.5;
          this.scrollY = Phaser.Math.Clamp(this.scrollY, -maxScroll, 0);
          this.scrollContainer.y = this.scrollY;
        }
      });

      // 터치/드래그 스크롤
      this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        this.isDragging = true;
        this.dragStartY = pointer.y;
      });

      this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
        if (this.isDragging && this.scrollContainer) {
          const dragDelta = pointer.y - this.dragStartY;
          this.scrollY += dragDelta;
          this.scrollY = Phaser.Math.Clamp(this.scrollY, -maxScroll, 0);
          this.scrollContainer.y = this.scrollY;
          this.dragStartY = pointer.y;
        }
      });

      this.input.on('pointerup', () => {
        this.isDragging = false;
      });

      // 스크롤 인디케이터 추가
      this.createScrollIndicator(maxScroll);
    }
  }

  private createScrollIndicator(maxScroll: number): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 스크롤바 배경
    const scrollBarBg = this.add.rectangle(width - 20, height / 2, 10, height - 240, 0x1e293b, 0.5);
    scrollBarBg.setScrollFactor(0);

    // 스크롤바 핸들
    const scrollBarHandle = this.add.rectangle(width - 20, 200, 10, 100, 0x8b5cf6, 0.8);
    scrollBarHandle.setScrollFactor(0);

    // 스크롤 위치 업데이트
    this.events.on('update', () => {
      if (this.scrollContainer) {
        const scrollRatio = Math.abs(this.scrollY) / maxScroll;
        const handleY = 200 + scrollRatio * (height - 340);
        scrollBarHandle.y = handleY;
      }
    });
  }

  private scrollToAvailableStage(clearedStages: number[]): void {
    if (!this.scrollContainer) return;

    const height = this.cameras.main.height;
    const bounds = this.scrollContainer.getBounds();
    const contentHeight = bounds.height;
    const viewHeight = height - 200;

    // 스크롤이 필요 없으면 리턴
    if (contentHeight <= viewHeight) return;

    // 현재 플레이 가능한 스테이지 찾기
    let targetStageId: number | null = null;

    if (clearedStages.length === 0) {
      // 클리어한 스테이지가 없으면 1번 스테이지
      targetStageId = 1;
    } else {
      // 가장 최근에 클리어한 스테이지의 다음 스테이지들 중 첫 번째
      const lastClearedId = clearedStages[clearedStages.length - 1];
      const stagesData = this.gameDataManager.getStageData();
      const lastClearedStage = stagesData[lastClearedId];

      if (lastClearedStage && lastClearedStage.nextStages && lastClearedStage.nextStages.length > 0) {
        targetStageId = lastClearedStage.nextStages[0];
      }
    }

    if (targetStageId === null) return;

    // 해당 스테이지 노드 찾기
    const targetNode = this.stageNodes.get(targetStageId);
    if (!targetNode) return;

    // 노드의 월드 좌표 가져오기
    const nodeY = targetNode.y;

    // 화면 중앙에 오도록 스크롤 계산
    const targetScrollY = -(nodeY - height / 2);

    // 스크롤 범위 제한
    const maxScroll = contentHeight - viewHeight + 200;
    this.scrollY = Phaser.Math.Clamp(targetScrollY, -maxScroll, 0);

    // 부드러운 스크롤 애니메이션
    if (this.scrollContainer) {
      this.tweens.add({
        targets: this.scrollContainer,
        y: this.scrollY,
        duration: 800,
        ease: 'Cubic.easeInOut'
      });
    }
  }
}
