import Phaser from 'phaser';
import Card from '../objects/Card';
import Enemy from '../objects/Enemy';
import Player from '../objects/Player';

// Interfaces
interface CardData {
  name: string;
  damage?: number;
  block?: number;
  heal?: number;
  energy?: number;
  cost: number;
  allEnemies?: boolean;
  hits?: number;
  selfDamage?: number;
  description: string;
}

interface NormalizedCardData {
  name: string;
  type: string;
  cost: number;
  value: number;
  allEnemies: boolean;
  hits: number;
  selfDamage: number;
  description: string;
  rawData: CardData;
}

interface EnemyIntent {
  type: 'attack' | 'defend';
  value: number;
}

interface EnemyData {
  name: string;
  attack?: number;
  defense?: number;
}

interface StageData {
  id: string;
  data: {
    enemies: string[];
    type: string;
    nextStages?: string[];
  };
}

interface GameState {
  player: {
    health: number;
    maxHealth: number;
    energy: number;
    maxEnergy: number;
    defense: number;
  };
  deck: CardData[];
  stagesCleared: string[];
  currentStage: string;
}

interface EnergyOrbData {
  orb: Phaser.GameObjects.Circle;
  glow: Phaser.GameObjects.Circle;
  active: boolean;
}

export default class BattleScene extends Phaser.Scene {
  private selectedCard: Card | null = null;
  private hand: Card[] = [];
  private deck: CardData[] = [];
  private discardPile: CardData[] = [];
  private enemies: Enemy[] = [];
  private turn: 'player' | 'enemy' = 'player';
  private gameState!: GameState;
  private selectedStage!: StageData;
  private playerCharacter!: Player;
  private handContainer!: Phaser.GameObjects.Container;
  private energyContainer!: Phaser.GameObjects.Container;
  private energyOrbs: EnergyOrbData[] = [];
  private deckText!: Phaser.GameObjects.Text;
  private endTurnButton!: Phaser.GameObjects.Container;
  private deckPileContainer!: Phaser.GameObjects.Container;
  private discardPileContainer!: Phaser.GameObjects.Container;
  private deckCountText!: Phaser.GameObjects.Text;
  private discardCountText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'BattleScene' });
  }

  init(): void {
    this.selectedCard = null;
    this.hand = [];
    this.deck = [];
    this.discardPile = [];
    this.enemies = [];
    this.turn = 'player';
  }

  create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 배경
    this.add.rectangle(0, 0, width, height, 0x0f0f1e).setOrigin(0);

    // 게임 상태 가져오기
    this.gameState = this.registry.get('gameState');
    this.selectedStage = this.registry.get('selectedStage');

    // 플레이어 에너지 초기화
    this.gameState.player.energy = this.gameState.player.maxEnergy;
    this.gameState.player.defense = 0;

    // 플레이어 캐릭터 생성 (중앙 하단)
    this.createPlayerCharacter();

    // UI 생성
    this.createPlayerUI();
    this.createEnemies();
    this.createDeckArea();

    // 이벤트 리스너
    this.events.on('cardClicked', this.onCardClicked, this);
    this.events.on('enemyClicked', this.onEnemyClicked, this);
    this.events.on('enemyDefeated', this.onEnemyDefeated, this);

    // 초기 덱 설정
    this.setupDeck();

    // 첫 턴 시작
    this.startPlayerTurn();
  }

  private createPlayerCharacter(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 플레이어 캐릭터를 중앙 하단에 배치 (적과 카드 사이)
    this.playerCharacter = new Player(this, width / 2, height / 2 + 100, this.gameState.player.maxHealth);
    this.playerCharacter.updateStats(this.gameState.player.health, this.gameState.player.defense);
    this.playerCharacter.idle(); // 아이들 애니메이션 시작
  }

  private createPlayerUI(): void {
    // Energy (오른쪽)
    this.createEnergyUI();

    // 턴 종료 버튼
    this.createEndTurnButton();
  }

  private createEnergyUI(): void {
    const width = this.cameras.main.width;
    const x = width - 300;
    const y = 580;

    // Energy 컨테이너
    const energyContainer = this.add.container(x, y);

    // Energy 아이콘들 (구슬)
    this.energyOrbs = [];
    const orbSpacing = 50;

    for (let i = 0; i < this.gameState.player.maxEnergy; i++) {
      const orb = this.add.circle(i * orbSpacing, 0, 20, 0xf39c12);
      orb.setStrokeStyle(3, 0xffffff);

      // 빛나는 효과
      const glow = this.add.circle(i * orbSpacing, 0, 24, 0xffcc00, 0.3);

      this.energyOrbs.push({ orb, glow, active: true });
      energyContainer.add([glow, orb]);

      // 펄스 애니메이션
      this.tweens.add({
        targets: glow,
        scaleX: 1.2,
        scaleY: 1.2,
        alpha: 0.5,
        duration: 800,
        yoyo: true,
        repeat: -1,
        delay: i * 100
      });
    }

    this.energyContainer = energyContainer;
  }

  private createEndTurnButton(): void {
    const width = this.cameras.main.width;

    const button = this.add.container(width - 200, 50);

    const bg = this.add.rectangle(0, 0, 150, 60, 0xff6b6b);
    bg.setStrokeStyle(3, 0xffffff);

    const text = this.add.text(0, 0, 'End Turn', {
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff'
    });
    text.setOrigin(0.5);

    button.add([bg, text]);
    button.setSize(150, 60);
    button.setInteractive({ useHandCursor: true });

    button.on('pointerover', () => {
      this.tweens.add({
        targets: button,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 100
      });
      bg.setFillStyle(0xff8888);
    });

    button.on('pointerout', () => {
      this.tweens.add({
        targets: button,
        scaleX: 1,
        scaleY: 1,
        duration: 100
      });
      bg.setFillStyle(0xff6b6b);
    });

    button.on('pointerdown', () => {
      if (this.turn === 'player') {
        this.endPlayerTurn();
      }
    });

    this.endTurnButton = button;
  }

  private createEnemies(): void {
    const width = this.cameras.main.width;
    const enemiesData: Record<string, EnemyData> = this.registry.get('enemiesData');
    const stageEnemies: string[] = this.selectedStage.data.enemies;

    const spacing = Math.min(300, width / (stageEnemies.length + 1));
    const startX = (width - (spacing * (stageEnemies.length - 1))) / 2;

    stageEnemies.forEach((enemyName: string, index: number) => {
      const enemyData = enemiesData[enemyName];
      if (enemyData) {
        const x = startX + (index * spacing);
        const y = 220; // 적들을 상단에 배치

        const enemy = new Enemy(this, x, y, enemyData, index);
        this.enemies.push(enemy);

        // 적 의도 설정
        this.setEnemyIntent(enemy);
      }
    });
  }

  private setEnemyIntent(enemy: Enemy): void {
    const enemyData: EnemyData = (enemy as any).enemyData;

    // 적 데이터에 따라 의도 설정
    if (enemyData.defense && Phaser.Math.Between(0, 100) < 30) {
      // 30% 확률로 방어
      enemy.setIntent({ type: 'defend', value: enemyData.defense });
    } else if (enemyData.attack) {
      // 기본은 공격
      enemy.setIntent({ type: 'attack', value: enemyData.attack });
    } else {
      // 공격력이 없으면 랜덤
      const damage = Phaser.Math.Between(5, 10);
      enemy.setIntent({ type: 'attack', value: damage });
    }
  }

  private createDeckArea(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 핸드 영역
    this.handContainer = this.add.container(width / 2, height - 130);

    // 덱 정보
    this.deckText = this.add.text(50, height - 50, '', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#ffffff'
    });

    // 덱 파일 (오른쪽)
    this.createDeckPile();

    // 버린 카드 더미 (왼쪽)
    this.createDiscardPile();

    this.updateDeckInfo();
  }

  private createDeckPile(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 덱의 위치 (핸드 오른쪽)
    const deckX = width - 200;
    const deckY = height - 250;

    this.deckPileContainer = this.add.container(deckX, deckY);

    // 카드 더미 시각화 (여러 장 겹쳐진 효과)
    for (let i = 0; i < 5; i++) {
      const cardBg = this.add.rectangle(-i * 2, -i * 2, 120, 160, 0x2c3e50);
      cardBg.setStrokeStyle(3, 0x34495e);
      this.deckPileContainer.add(cardBg);
    }

    // 덱 아이콘
    const deckIcon = this.add.text(0, 0, '🎴', {
      fontSize: '48px'
    }).setOrigin(0.5);
    this.deckPileContainer.add(deckIcon);

    // 덱 카드 수 텍스트
    this.deckCountText = this.add.text(0, 100, '0', {
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);
    this.deckPileContainer.add(this.deckCountText);

    // 라벨
    const deckLabel = this.add.text(0, 130, '덱', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#95a5a6'
    }).setOrigin(0.5);
    this.deckPileContainer.add(deckLabel);

    // 클릭 가능한 영역 추가
    const clickArea = this.add.rectangle(0, 0, 150, 200, 0x000000, 0);
    clickArea.setInteractive({ useHandCursor: true });
    this.deckPileContainer.add(clickArea);

    clickArea.on('pointerover', () => {
      this.tweens.add({
        targets: this.deckPileContainer,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 100
      });
    });

    clickArea.on('pointerout', () => {
      this.tweens.add({
        targets: this.deckPileContainer,
        scaleX: 1,
        scaleY: 1,
        duration: 100
      });
    });

    clickArea.on('pointerdown', () => {
      this.showDeckView();
    });
  }

  private createDiscardPile(): void {
    const height = this.cameras.main.height;

    // 버린 카드 더미의 위치 (핸드 왼쪽)
    const discardX = 200;
    const discardY = height - 250;

    this.discardPileContainer = this.add.container(discardX, discardY);

    // 카드 더미 시각화 (여러 장 겹쳐진 효과)
    for (let i = 0; i < 5; i++) {
      const cardBg = this.add.rectangle(i * 2, -i * 2, 120, 160, 0x34495e);
      cardBg.setStrokeStyle(3, 0x7f8c8d);
      this.discardPileContainer.add(cardBg);
    }

    // 버린 카드 더미 아이콘
    const discardIcon = this.add.text(0, 0, '🗑️', {
      fontSize: '48px'
    }).setOrigin(0.5);
    this.discardPileContainer.add(discardIcon);

    // 버린 카드 수 텍스트
    this.discardCountText = this.add.text(0, 100, '0', {
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);
    this.discardPileContainer.add(this.discardCountText);

    // 라벨
    const discardLabel = this.add.text(0, 130, '버린 카드', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#95a5a6'
    }).setOrigin(0.5);
    this.discardPileContainer.add(discardLabel);

    // 클릭 가능한 영역 추가
    const clickArea = this.add.rectangle(0, 0, 150, 200, 0x000000, 0);
    clickArea.setInteractive({ useHandCursor: true });
    this.discardPileContainer.add(clickArea);

    clickArea.on('pointerover', () => {
      this.tweens.add({
        targets: this.discardPileContainer,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 100
      });
    });

    clickArea.on('pointerout', () => {
      this.tweens.add({
        targets: this.discardPileContainer,
        scaleX: 1,
        scaleY: 1,
        duration: 100
      });
    });

    clickArea.on('pointerdown', () => {
      this.showDiscardPileView();
    });
  }

  private setupDeck(): void {
    const cardsData: { basic: CardData[] } = this.registry.get('cardsData');

    console.log(`[BattleScene] setupDeck - gameState.deck.length: ${this.gameState.deck.length}`);

    // 기본 덱 생성 (플레이어 덱이 비어있으면)
    if (this.gameState.deck.length === 0) {
      this.gameState.deck = [
        ...Array(5).fill(null).map(() => ({ ...cardsData.basic[0] })), // 강타 x5
        ...Array(4).fill(null).map(() => ({ ...cardsData.basic[1] })), // 방어 x4
        ...Array(1).fill(null).map(() => ({ ...cardsData.basic[4] }))  // 집중 x1
      ];
      console.log(`[BattleScene] setupDeck - Created basic deck with ${this.gameState.deck.length} cards`);
    }

    // 덱을 복사하고 섞기
    this.deck = [...this.gameState.deck];
    Phaser.Utils.Array.Shuffle(this.deck);
    console.log(`[BattleScene] setupDeck - Copied and shuffled deck: ${this.deck.length} cards`);
  }

  private startPlayerTurn(): void {
    this.turn = 'player';

    // 에너지 회복
    this.gameState.player.energy = this.gameState.player.maxEnergy;

    // 방어도 초기화
    this.gameState.player.defense = 0;

    // 카드 뽑기 (5장)
    this.drawCards(5);

    this.updateUI();
  }

  private drawCards(count: number): void {
    let cardsDrawn = 0;

    for (let i = 0; i < count; i++) {
      if (this.deck.length === 0) {
        // 덱이 비었으면 버린 카드 더미를 섞어서 덱으로
        if (this.discardPile.length > 0) {
          this.reshuffleDiscardIntoDeck();
        }

        if (this.deck.length === 0) break; // 그래도 비었으면 중단
      }

      const cardData = this.deck.pop();
      if (cardData) {
        // 애니메이션과 함께 카드 추가 (순차적으로)
        this.time.delayedCall(i * 150, () => {
          this.addCardToHandWithAnimation(cardData);
        });
        cardsDrawn++;
      }
    }

    // 모든 카드가 드로우된 후 핸드 재배치
    // 마지막 카드의 애니메이션 시작 시간(cardsDrawn * 150) + 애니메이션 duration(400) + 여유시간(100)
    this.time.delayedCall(cardsDrawn * 150 + 500, () => {
      this.arrangeHand();
    });

    this.updateDeckInfo();
  }

  private reshuffleDiscardIntoDeck(): void {
    // 버린 카드 더미에서 덱으로 리셔플하는 효과
    this.deck = [...this.discardPile];
    this.discardPile = [];
    Phaser.Utils.Array.Shuffle(this.deck);

    // 리셔플 효과
    this.tweens.add({
      targets: this.discardPileContainer,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 200,
      yoyo: true,
      onComplete: () => {
        this.tweens.add({
          targets: this.deckPileContainer,
          scaleX: 1.2,
          scaleY: 1.2,
          duration: 200,
          yoyo: true
        });
      }
    });

    // 메시지 표시
    const message = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height - 400,
      '덱 리셔플!',
      {
        fontSize: '28px',
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold',
        color: '#4ecdc4',
        stroke: '#000000',
        strokeThickness: 4
      }
    ).setOrigin(0.5);

    this.tweens.add({
      targets: message,
      alpha: 0,
      y: message.y - 50,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => message.destroy()
    });

    this.updateDeckInfo();
  }

  private addCardToHandWithAnimation(cardData: CardData): void {
    // 카드 타입 정규화
    const normalizedCard = this.normalizeCardData(cardData);

    // 덱 위치에서 카드 생성
    const deckWorldPos = this.deckPileContainer.getWorldTransformMatrix();
    const startX = deckWorldPos.tx;
    const startY = deckWorldPos.ty;

    const card = new Card(this, startX, startY, normalizedCard as any);
    card.setScale(0.8);

    this.hand.push(card);
    this.add.existing(card);

    // 덱 파일 애니메이션
    this.tweens.add({
      targets: this.deckPileContainer,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 100,
      yoyo: true
    });

    // 핸드 컨테이너의 월드 좌표
    const handWorldPos = this.handContainer.getWorldTransformMatrix();
    const targetX = handWorldPos.tx;
    const targetY = handWorldPos.ty;

    this.tweens.add({
      targets: card,
      x: targetX,
      y: targetY,
      scaleX: 1,
      scaleY: 1,
      duration: 400,
      ease: 'Power2',
      onComplete: () => {
        // 카드를 핸드 컨테이너로 이동
        // 먼저 카드를 핸드 컨테이너에 추가
        this.handContainer.add(card);
        // 핸드 컨테이너 내에서의 로컬 좌표는 (0, 0)으로 설정
        // arrangeHand에서 최종 위치를 계산함
        card.setPosition(0, 0);
      }
    });

    // updateDeckInfo()는 drawCards에서 한 번만 호출하도록 제거
  }


  private normalizeCardData(cardData: CardData): NormalizedCardData {
    // 기존 카드 데이터를 Card 클래스가 기대하는 형식으로 변환
    return {
      name: cardData.name,
      type: cardData.damage ? '공격' : cardData.block ? '방어' : cardData.heal ? '치유' : cardData.energy ? '에너지' : '스킬',
      cost: cardData.cost,
      value: cardData.damage || cardData.block || cardData.heal || cardData.energy || 0,
      allEnemies: cardData.allEnemies || false,
      hits: cardData.hits || 1,
      selfDamage: cardData.selfDamage || 0,
      description: cardData.description,
      rawData: cardData
    };
  }

  private arrangeHand(): void {
    const cardCount = this.hand.length;
    const spacing = 150;
    const totalWidth = (cardCount - 1) * spacing;
    const startX = -totalWidth / 2;

    this.hand.forEach((card, index) => {
      const targetX = startX + (index * spacing);
      const targetY = 0;

      this.tweens.add({
        targets: card,
        x: targetX,
        y: targetY,
        duration: 300,
        ease: 'Back.easeOut'
      });

      (card as any).originalY = targetY;
    });
  }

  private onCardClicked(card: Card): void {
    if (this.turn !== 'player') return;

    const cardData: any = (card as any).cardData;

    // 에너지가 부족한 경우
    if (this.gameState.player.energy < cardData.cost) {
      this.showMessage('Not enough energy!');
      return;
    }

    // 이전에 선택된 카드 해제
    if (this.selectedCard && this.selectedCard !== card) {
      this.selectedCard.deselect();
    }

    // 카드 선택
    this.selectedCard = card;
    card.select();

    // 공격 카드인 경우 적 선택 대기, 아니면 즉시 사용
    if (cardData.type === '공격' && !cardData.allEnemies) {
      this.showMessage('Select a target');
    } else {
      // 자동 사용 (방어, 치유, 전체 공격 등)
      this.useCard(card);
    }
  }

  private onEnemyClicked(enemy: Enemy): void {
    if (this.turn !== 'player') return;
    if (!this.selectedCard) return;

    const cardData: any = (this.selectedCard as any).cardData;
    if (cardData.type !== '공격') return;

    this.useCard(this.selectedCard, enemy);
  }

  private useCard(card: Card, target: Enemy | null = null): void {
    const cardData: any = (card as any).cardData;

    // 에너지 소모
    this.gameState.player.energy -= cardData.cost;

    // 카드 효과 적용
    if (cardData.type === '공격') {
      if (cardData.allEnemies) {
        // 모든 적에게 공격
        this.enemies.forEach(enemy => {
          if (!enemy.isDead()) {
            for (let i = 0; i < cardData.hits; i++) {
              enemy.takeDamage(cardData.value);
            }
          }
        });

        card.playEffect(this.cameras.main.width / 2, 250, () => {
          this.checkBattleEnd();
        });
      } else if (target) {
        // 단일 적 공격
        for (let i = 0; i < cardData.hits; i++) {
          target.takeDamage(cardData.value);
        }

        card.playEffect(target.x, target.y, () => {
          this.checkBattleEnd();
        });
      }

      // 자신에게 피해
      if (cardData.selfDamage) {
        this.playerTakeDamage(cardData.selfDamage);
      }
    } else if (cardData.type === '방어') {
      this.gameState.player.defense += cardData.value;

      // 플레이어 캐릭터 방어 애니메이션
      this.playerCharacter.playDefendAnimation();

      card.playEffect(this.playerCharacter.x, this.playerCharacter.y, null);
    } else if (cardData.type === '치유') {
      this.gameState.player.health = Math.min(
        this.gameState.player.maxHealth,
        this.gameState.player.health + cardData.value
      );

      // 플레이어 캐릭터 치유 애니메이션
      this.playerCharacter.playHealAnimation();

      card.playEffect(this.playerCharacter.x, this.playerCharacter.y, null);
    } else if (cardData.type === '에너지') {
      this.gameState.player.energy += cardData.value;

      card.playEffect(this.playerCharacter.x, this.playerCharacter.y, null);
    }

    // 핸드에서 제거
    const index = this.hand.indexOf(card);
    if (index > -1) {
      this.hand.splice(index, 1);
    }

    // 버린 카드 더미로
    this.discardPile.push(cardData.rawData);

    // 선택 해제
    this.selectedCard = null;

    // 카드를 버린 카드 더미로 이동 애니메이션
    this.discardCardWithAnimation(card);

    // 핸드 재배치
    this.arrangeHand();

    // UI 업데이트
    this.updateUI();
  }

  private discardCardWithAnimation(card: Card): void {
    // 카드를 핸드 컨테이너에서 제거하고 월드 좌표로 변환
    const matrix = card.getWorldTransformMatrix();
    const worldX = matrix.tx;
    const worldY = matrix.ty;

    this.handContainer.remove(card);
    card.setPosition(worldX, worldY);

    // 버린 카드 더미 위치
    const discardWorldPos = this.discardPileContainer.getWorldTransformMatrix();
    const targetX = discardWorldPos.tx;
    const targetY = discardWorldPos.ty;

    // 카드를 버린 카드 더미로 이동
    this.tweens.add({
      targets: card,
      x: targetX,
      y: targetY,
      scaleX: 0.5,
      scaleY: 0.5,
      alpha: 0.7,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        card.destroy();
      }
    });

    // 버린 카드 더미 애니메이션
    this.tweens.add({
      targets: this.discardPileContainer,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 100,
      yoyo: true
    });

    this.updateDeckInfo();
  }

  private playerTakeDamage(amount: number): void {
    // Player의 takeDamage 메서드 사용 (공통 로직)
    this.playerCharacter.takeDamage(amount);

    // gameState 동기화
    this.gameState.player.health = this.playerCharacter.health;
    this.gameState.player.defense = this.playerCharacter.defense;

    // 체력이 0 이하면 화면 빨갛게 + 게임 오버 체크
    if (this.playerCharacter.health <= 0) {
      this.cameras.main.flash(200, 255, 0, 0, false, (camera, progress) => {
        if (progress === 1) {
          this.checkGameOver();
        }
      });
    }

    this.updateUI();
  }

  private endPlayerTurn(): void {
    // 손에 있는 모든 카드 버리기 (애니메이션과 함께)
    const cardsToDiscard = [...this.hand];
    this.hand = [];

    cardsToDiscard.forEach((card, index) => {
      const cardData: any = (card as any).cardData;
      this.discardPile.push(cardData.rawData);

      // 순차적으로 카드 버리기
      this.time.delayedCall(index * 100, () => {
        this.discardCardWithAnimation(card);
      });
    });

    this.updateDeckInfo();

    // 모든 카드가 버려진 후 적 턴 시작
    const totalDelay = cardsToDiscard.length * 100 + 400;
    this.time.delayedCall(totalDelay, () => {
      this.startEnemyTurn();
    });
  }

  private startEnemyTurn(): void {
    this.turn = 'enemy';

    let delay = 0;

    this.enemies.forEach(enemy => {
      if (!enemy.isDead()) {
        this.time.delayedCall(delay, () => {
          this.executeEnemyAction(enemy);
        });
        delay += 1000;
      }
    });

    // 모든 적 행동 후 플레이어 턴
    this.time.delayedCall(delay + 500, () => {
      this.startPlayerTurn();
    });
  }

  private executeEnemyAction(enemy: Enemy): void {
    const intent: EnemyIntent = (enemy as any).intent;

    if (intent.type === 'attack') {
      enemy.playAttackAnimation(() => {
        this.playerTakeDamage(intent.value);
      });
    } else if (intent.type === 'defend') {
      // 적 방어도 증가
      enemy.applyDefense(intent.value);
    }

    // 다음 의도 설정
    this.setEnemyIntent(enemy);
  }

  private onEnemyDefeated(enemy: Enemy): void {
    const index = this.enemies.indexOf(enemy);
    if (index > -1) {
      this.enemies.splice(index, 1);
    }

    this.checkBattleEnd();
  }

  private checkBattleEnd(): void {
    const aliveEnemies = this.enemies.filter(e => !e.isDead());

    if (aliveEnemies.length === 0) {
      this.time.delayedCall(1000, () => {
        this.winBattle();
      });
    }
  }

  private checkGameOver(): void {
    if (this.gameState.player.health <= 0) {
      this.time.delayedCall(1000, () => {
        this.scene.start('GameOverScene');
      });
    }
  }

  private winBattle(): void {
    // 스테이지 클리어 처리
    if (!this.gameState.stagesCleared.includes(this.selectedStage.id)) {
      this.gameState.stagesCleared.push(this.selectedStage.id);
    }

    // 체력 회복
    const healPercent = this.selectedStage.data.type === '보스' ? 0.6 :
                        this.selectedStage.data.type === '중보스' ? 0.4 : 0.25;
    const healAmount = Math.floor(this.gameState.player.maxHealth * healPercent);
    this.gameState.player.health = Math.min(
      this.gameState.player.maxHealth,
      this.gameState.player.health + healAmount
    );

    // 다음 스테이지 설정
    const nextStages = this.selectedStage.data.nextStages;
    if (nextStages && nextStages.length > 0) {
      this.gameState.currentStage = nextStages[0];
    }

    // 보상 씬으로
    this.scene.start('RewardScene');
  }

  private updateUI(): void {
    // 플레이어 캐릭터 스탯 업데이트
    this.playerCharacter.updateStats(
      this.gameState.player.health,
      this.gameState.player.defense
    );

    // 현재 에너지에 맞춰 필요한 구슬 개수 계산
    const currentEnergy = this.gameState.player.energy;
    const maxEnergy = this.gameState.player.maxEnergy;
    const requiredOrbs = Math.max(currentEnergy, maxEnergy);
    const currentOrbCount = this.energyOrbs.length;

    // 필요하면 구슬 추가 (에너지가 maxEnergy를 초과한 경우)
    if (requiredOrbs > currentOrbCount) {
      const orbSpacing = 50;
      for (let i = currentOrbCount; i < requiredOrbs; i++) {
        const orb = this.add.circle(i * orbSpacing, 0, 20, 0xf39c12);
        orb.setStrokeStyle(3, 0xffffff);

        // 빛나는 효과
        const glow = this.add.circle(i * orbSpacing, 0, 24, 0xffcc00, 0.3);

        this.energyOrbs.push({ orb, glow, active: true });
        this.energyContainer.add([glow, orb]);

        // 펄스 애니메이션
        this.tweens.add({
          targets: glow,
          scaleX: 1.2,
          scaleY: 1.2,
          alpha: 0.5,
          duration: 800,
          yoyo: true,
          repeat: -1,
          delay: i * 100
        });

        // 등장 애니메이션
        orb.setScale(0);
        glow.setScale(0);
        this.tweens.add({
          targets: [orb, glow],
          scaleX: 1,
          scaleY: 1,
          duration: 300,
          ease: 'Back.easeOut'
        });
      }
    }

    // Energy 구슬 상태 업데이트
    this.energyOrbs.forEach((orbData, index) => {
      if (index < currentEnergy) {
        // 활성 에너지
        const isBonus = index >= maxEnergy;
        orbData.orb.setFillStyle(isBonus ? 0xffcc00 : 0xf39c12); // 보너스 에너지는 더 밝은 색
        orbData.orb.setAlpha(1);
        orbData.glow.setAlpha(isBonus ? 0.5 : 0.3);
        orbData.active = true;
      } else {
        // 비활성 에너지
        orbData.orb.setFillStyle(0x666666);
        orbData.orb.setAlpha(0.5);
        orbData.glow.setAlpha(0);
        orbData.active = false;
      }
    });
  }

  private updateDeckInfo(): void {
    const totalCards = this.deck.length + this.hand.length + this.discardPile.length;
    console.log(`[BattleScene] updateDeckInfo - Deck: ${this.deck.length}, Hand: ${this.hand.length}, Discard: ${this.discardPile.length}, Total: ${totalCards}`);

    this.deckText.setText(`Deck: ${this.deck.length} | Hand: ${this.hand.length} | Discard: ${this.discardPile.length}`);

    // 덱 카운트 업데이트
    this.deckCountText.setText(this.deck.length.toString());

    // 버린 카드 더미 카운트 업데이트
    this.discardCountText.setText(this.discardPile.length.toString());
  }

  private showMessage(text: string): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const message = this.add.text(width / 2, height / 2, text, {
      fontSize: '32px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 6
    });
    message.setOrigin(0.5);

    this.tweens.add({
      targets: message,
      alpha: 0,
      y: height / 2 - 50,
      duration: 1500,
      onComplete: () => message.destroy()
    });
  }

  private showDeckView(): void {
    if (this.deck.length === 0) {
      this.showMessage('덱이 비어있습니다!');
      return;
    }

    this.showCardListView('덱', this.deck);
  }

  private showDiscardPileView(): void {
    if (this.discardPile.length === 0) {
      this.showMessage('버린 카드가 없습니다!');
      return;
    }

    this.showCardListView('버린 카드', this.discardPile);
  }

  private showCardListView(title: string, cards: CardData[]): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 오버레이 (어둡게)
    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.8);
    overlay.setOrigin(0);
    overlay.setDepth(1000);
    overlay.setInteractive();

    // 팝업 배경
    const popupWidth = Math.min(1400, width - 100);
    const popupHeight = Math.min(900, height - 100);
    const popupBg = this.add.rectangle(width / 2, height / 2, popupWidth, popupHeight, 0x1a1a2e);
    popupBg.setStrokeStyle(4, 0x8b5cf6);
    popupBg.setDepth(1001);

    // 타이틀
    const titleText = this.add.text(width / 2, height / 2 - popupHeight / 2 + 40, title, {
      fontSize: '36px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4
    });
    titleText.setOrigin(0.5);
    titleText.setDepth(1002);

    // 카드 수
    const countText = this.add.text(
      width / 2,
      height / 2 - popupHeight / 2 + 80,
      `총 ${cards.length}장`,
      {
        fontSize: '20px',
        fontFamily: 'Arial, sans-serif',
        color: '#94a3b8'
      }
    );
    countText.setOrigin(0.5);
    countText.setDepth(1002);

    // 카드 목록 컨테이너
    const cardListContainer = this.add.container(0, 0);
    cardListContainer.setDepth(1002);

    // 카드 목록 표시 (그리드 형식)
    const cardWidth = 130;
    const cardHeight = 180;
    const cardSpacing = 20;
    const cardsPerRow = Math.floor((popupWidth - 100) / (cardWidth + cardSpacing));
    const startX = width / 2 - (cardsPerRow * (cardWidth + cardSpacing) - cardSpacing) / 2;
    const startY = height / 2 - popupHeight / 2 + 150;

    // 모든 카드를 개별적으로 표시
    cards.forEach((card, index) => {
      const row = Math.floor(index / cardsPerRow);
      const col = index % cardsPerRow;
      const x = startX + col * (cardWidth + cardSpacing);
      const y = startY + row * (cardHeight + cardSpacing);

      // 카드 미니 표시 (개별 카드이므로 count는 표시하지 않음)
      const miniCard = this.createMiniCard(x, y, card, 0);
      cardListContainer.add(miniCard);
    });

    // 닫기 버튼
    const closeButton = this.add.rectangle(width / 2, height / 2 + popupHeight / 2 - 50, 150, 50, 0xff6b6b);
    closeButton.setStrokeStyle(3, 0xffffff);
    closeButton.setDepth(1002);
    closeButton.setInteractive({ useHandCursor: true });

    const closeText = this.add.text(width / 2, height / 2 + popupHeight / 2 - 50, '닫기', {
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff'
    });
    closeText.setOrigin(0.5);
    closeText.setDepth(1003);

    closeButton.on('pointerover', () => {
      closeButton.setFillStyle(0xff8888);
    });

    closeButton.on('pointerout', () => {
      closeButton.setFillStyle(0xff6b6b);
    });

    // 닫기 동작
    const closePopup = () => {
      overlay.destroy();
      popupBg.destroy();
      titleText.destroy();
      countText.destroy();
      cardListContainer.destroy();
      closeButton.destroy();
      closeText.destroy();
    };

    closeButton.on('pointerdown', closePopup);
    overlay.on('pointerdown', closePopup);

    // 등장 애니메이션
    popupBg.setScale(0.8);
    popupBg.setAlpha(0);
    titleText.setAlpha(0);
    countText.setAlpha(0);
    cardListContainer.setAlpha(0);
    closeButton.setAlpha(0);
    closeText.setAlpha(0);

    this.tweens.add({
      targets: [popupBg, titleText, countText, cardListContainer, closeButton, closeText],
      alpha: 1,
      duration: 200
    });

    this.tweens.add({
      targets: popupBg,
      scaleX: 1,
      scaleY: 1,
      duration: 200,
      ease: 'Back.easeOut'
    });
  }

  private createMiniCard(x: number, y: number, cardData: CardData, count: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const cardWidth = 130;
    const cardHeight = 180;

    // 카드 배경
    const bg = this.add.rectangle(0, 0, cardWidth, cardHeight, 0x2a2a4e);
    const borderColor = this.getCardColorFromData(cardData);
    bg.setStrokeStyle(3, borderColor);

    // 카드 타입에 따른 상단 배경
    const headerBg = this.add.rectangle(0, -cardHeight / 2 + 18, cardWidth, 36, borderColor);

    // 카드 이름
    const nameText = this.add.text(0, -cardHeight / 2 + 18, cardData.name, {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: cardWidth - 10 }
    });
    nameText.setOrigin(0.5);

    // 카드 타입/효과
    const type = cardData.damage ? '공격' : cardData.block ? '방어' : cardData.heal ? '치유' : cardData.energy ? '에너지' : '스킬';
    const value = cardData.damage || cardData.block || cardData.heal || cardData.energy || 0;

    const effectText = this.add.text(0, 10, value > 0 ? `${type} ${value}` : type, {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff'
    });
    effectText.setOrigin(0.5);

    // 코스트
    const costCircle = this.add.circle(-cardWidth / 2 + 20, -cardHeight / 2 + 20, 18, 0x3498db);
    costCircle.setStrokeStyle(2, 0xffffff);

    const costText = this.add.text(-cardWidth / 2 + 20, -cardHeight / 2 + 20, cardData.cost.toString(), {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff'
    });
    costText.setOrigin(0.5);

    // 카드 개수 표시
    if (count > 1) {
      const countBg = this.add.circle(cardWidth / 2 - 20, cardHeight / 2 - 20, 18, 0xe74c3c);
      countBg.setStrokeStyle(2, 0xffffff);

      const countText = this.add.text(cardWidth / 2 - 20, cardHeight / 2 - 20, `x${count}`, {
        fontSize: '14px',
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold',
        color: '#ffffff'
      });
      countText.setOrigin(0.5);

      container.add([countBg, countText]);
    }

    // 설명 (HTML 태그 제거)
    const cleanDescription = this.stripHtmlTags(cardData.description || '');
    const descText = this.add.text(0, 50, cleanDescription, {
      fontSize: '11px',
      fontFamily: 'Arial, sans-serif',
      color: '#bdc3c7',
      align: 'center',
      wordWrap: { width: cardWidth - 20 }
    });
    descText.setOrigin(0.5);

    container.add([bg, headerBg, nameText, effectText, costCircle, costText, descText]);

    return container;
  }

  private getCardColorFromData(cardData: CardData): number {
    if (cardData.damage) return 0xff6b6b; // 공격
    if (cardData.block) return 0x4ecdc4; // 방어
    if (cardData.heal) return 0x95e1d3; // 치유
    if (cardData.energy) return 0xf39c12; // 에너지
    return 0x9b59b6; // 스킬
  }

  private stripHtmlTags(text: string): string {
    if (!text) return '';
    // HTML 태그 제거
    return text.replace(/<[^>]*>/g, '');
  }
}
