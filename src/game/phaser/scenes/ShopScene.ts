import Phaser from 'phaser';
import EventBus from '../../EventBus';
import LanguageManager from '../../../i18n/LanguageManager';
import GameDataManager from '../managers/GameDataManager';
import { textStyle } from '../managers/TextStyleManager';
import Card from '../objects/Card';
import { CardData } from '../../../types';

interface GameState {
  player: {
    health: number;
    maxHealth: number;
    maxEnergy: number;
    gold: number;
    [key: string]: any;
  };
  deck: any[];
  currentStage: number;
  stagesCleared: number[];
  [key: string]: any;
}

export default class ShopScene extends Phaser.Scene {
  private cardObjects: { card: Card; price: number; data: CardData }[] = [];
  private shopCards: (CardData & { price: number })[] = [];

  constructor() {
    super({ key: 'ShopScene' });
  }

  create(): void {
    EventBus.emit('current-scene-ready', this);

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 배경
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
    graphics.fillRect(0, 0, width, height);

    // 타이틀
    const langManager = LanguageManager.getInstance();
    this.add.text(
      width / 2,
      60,
      langManager.t('shop.title') || '상점',
      textStyle.getStyle('titles.section', { fontSize: '56px' })
    ).setOrigin(0.5);

    // 게임 상태 로드
    const gameState: GameState = this.registry.get('gameState');

    // 골드가 없으면 초기화
    if (gameState.player.gold === undefined) {
      gameState.player.gold = 100;
    }

    // 골드 표시
    this.createGoldDisplay(gameState.player.gold);

    // 상점 카드 생성
    this.generateShopCards();

    // 카드 표시
    this.displayShopCards();

    // 나가기 버튼
    this.createExitButton();
  }

  private createGoldDisplay(gold: number): void {
    const width = this.cameras.main.width;

    const goldContainer = this.add.container(width - 200, 60);

    const goldBg = this.add.rectangle(0, 0, 180, 60, 0x1e293b, 0.95);
    goldBg.setStrokeStyle(3, 0xfbbf24);

    const goldText = this.add.text(
      0,
      0,
      `💰 ${gold}G`,
      textStyle.getStyle('titles.section', { fontSize: '32px', color: '#fbbf24' })
    ).setOrigin(0.5);

    goldContainer.add([goldBg, goldText]);
    goldContainer.setName('goldDisplay');
  }

  private updateGoldDisplay(gold: number): void {
    const goldDisplay = this.children.getByName('goldDisplay') as Phaser.GameObjects.Container;
    if (goldDisplay) {
      const goldText = goldDisplay.getAt(1) as Phaser.GameObjects.Text;
      goldText.setText(`💰 ${gold}G`);
    }
  }

  private generateShopCards(): void {
    const gameDataManager = GameDataManager.getInstance();
    const allCards = gameDataManager.getCardData();

    // 모든 카드를 배열로 변환
    const cardArray = Object.entries(allCards).map(([id, data]) => ({
      id,
      ...data as CardData
    }));

    // 랜덤하게 5개의 카드 선택
    const shuffled = Phaser.Utils.Array.Shuffle([...cardArray]);
    const selectedCards = shuffled.slice(0, 5);

    // 가격 설정 (카드 코스트 기반)
    this.shopCards = selectedCards.map(card => ({
      ...card,
      price: Math.max(30, card.cost * 15)
    }));
  }

  private displayShopCards(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const cardWidth = 168;
    const cardHeight = 240;
    const spacing = 50;
    const totalWidth = this.shopCards.length * cardWidth + (this.shopCards.length - 1) * spacing;
    const startX = (width - totalWidth) / 2 + cardWidth / 2;
    const y = height / 2 + 20;

    this.shopCards.forEach((cardData, index) => {
      const x = startX + index * (cardWidth + spacing);
      this.createCardDisplay(x, y, cardData);
    });
  }

  private createCardDisplay(
    x: number,
    y: number,
    cardData: CardData & { price: number }
  ): void {
    // Card 객체 생성
    const card = new Card(this, x, y, cardData);

    // 가격 표시를 위한 컨테이너
    const priceContainer = this.add.container(x, y + 150);

    // 가격 배경
    const priceBg = this.add.rectangle(0, 0, 168, 50, 0x1e293b, 0.95);
    priceBg.setStrokeStyle(3, 0xfbbf24);

    // 가격 텍스트
    const priceText = this.add.text(
      0,
      0,
      `💰 ${cardData.price}G`,
      textStyle.getStyle('character.name', { fontSize: '24px', color: '#fbbf24' })
    ).setOrigin(0.5);

    priceContainer.add([priceBg, priceText]);

    // 인터랙티브 설정 (카드의 기본 인터랙션 비활성화)
    card.disableInteraction();

    // 커스텀 인터랙션 설정
    const cardBg = (card as any).bg;
    cardBg.setInteractive({ useHandCursor: true });

    cardBg.on('pointerover', () => {
      this.tweens.add({
        targets: [card, priceContainer],
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 200
      });
    });

    cardBg.on('pointerout', () => {
      this.tweens.add({
        targets: [card, priceContainer],
        scaleX: 1,
        scaleY: 1,
        duration: 200
      });
    });

    cardBg.on('pointerdown', () => {
      this.purchaseCard(cardData, card, priceContainer);
    });

    // 등장 애니메이션
    card.setAlpha(0);
    card.setScale(0.8);
    priceContainer.setAlpha(0);
    priceContainer.setScale(0.8);

    this.tweens.add({
      targets: [card, priceContainer],
      alpha: 1,
      scale: 1,
      duration: 400,
      ease: 'Back.easeOut'
    });

    this.cardObjects.push({ card, price: cardData.price, data: cardData });
  }

  private purchaseCard(cardData: CardData & { price: number }, card: Card, priceContainer: Phaser.GameObjects.Container): void {
    const gameState: GameState = this.registry.get('gameState');
    const langManager = LanguageManager.getInstance();

    // 골드가 충분한지 확인
    if (gameState.player.gold < cardData.price) {
      // 골드 부족 알림
      this.showMessage(langManager.t('shop.notEnoughGold'), 0xef4444);

      // 컨테이너 흔들기
      this.tweens.add({
        targets: [card, priceContainer],
        x: '-=10',
        duration: 50,
        yoyo: true,
        repeat: 3
      });
      return;
    }

    // 골드 차감
    gameState.player.gold -= cardData.price;
    this.updateGoldDisplay(gameState.player.gold);

    // 덱에 카드 추가 (전체 카드 데이터를 복사)
    gameState.deck.push({
      ...cardData,
      // price 필드는 제거
      price: undefined
    } as any);

    // 구매 성공 메시지
    this.showMessage(`${cardData.name} ${langManager.t('shop.purchased')}`, 0x22c55e);

    // 카드 제거 애니메이션
    this.tweens.add({
      targets: [card, priceContainer],
      alpha: 0,
      scaleX: 0.5,
      scaleY: 0.5,
      duration: 300,
      onComplete: () => {
        card.destroy();
        priceContainer.destroy();
      }
    });

    // 상점 카드 배열에서 제거
    this.shopCards = this.shopCards.filter(c => c.id !== cardData.id);
    this.cardObjects = this.cardObjects.filter(obj => obj.data.id !== cardData.id);
  }

  private showMessage(text: string, color: number): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const message = this.add.text(
      width / 2,
      height / 2 - 150,
      text,
      textStyle.getStyle('titles.section', { fontSize: '32px', color: `#${color.toString(16)}` })
    ).setOrigin(0.5);

    message.setAlpha(0);

    this.tweens.add({
      targets: message,
      alpha: 1,
      y: height / 2 - 200,
      duration: 300,
      onComplete: () => {
        this.time.delayedCall(1500, () => {
          this.tweens.add({
            targets: message,
            alpha: 0,
            duration: 300,
            onComplete: () => {
              message.destroy();
            }
          });
        });
      }
    });
  }

  private createExitButton(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const exitContainer = this.add.container(width / 2, height - 80);

    const exitBg = this.add.rectangle(0, 0, 200, 60, 0x8b5cf6, 0.9);
    exitBg.setStrokeStyle(3, 0x7c3aed);

    const langManager = LanguageManager.getInstance();
    const exitText = this.add.text(
      0,
      0,
      langManager.t('shop.exit') || '나가기',
      textStyle.getStyle('character.name', { fontSize: '24px' })
    ).setOrigin(0.5);

    exitContainer.add([exitBg, exitText]);

    exitBg.setInteractive({ useHandCursor: true });

    exitBg.on('pointerover', () => {
      exitBg.setFillStyle(0x7c3aed);
      this.tweens.add({
        targets: exitContainer,
        scale: 1.05,
        duration: 200
      });
    });

    exitBg.on('pointerout', () => {
      exitBg.setFillStyle(0x8b5cf6);
      this.tweens.add({
        targets: exitContainer,
        scale: 1,
        duration: 200
      });
    });

    exitBg.on('pointerdown', () => {
      // 스테이지 클리어 처리
      const gameState: GameState = this.registry.get('gameState');
      const selectedStage = this.registry.get('selectedStage');

      if (selectedStage) {
        gameState.stagesCleared.push(selectedStage.id);
      }

      this.scene.start('StageSelectScene');
    });
  }
}
