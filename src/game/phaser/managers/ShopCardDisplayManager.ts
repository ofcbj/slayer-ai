import Phaser from 'phaser';
import Card from '../objects/Card';
import { CardData, GameState } from '../../../types';
import { textStyle } from './TextStyleManager';
import CardInteractionHelper from '../utils/CardInteractionHelper';
import CardGridRenderer from '../utils/CardGridRenderer';
import GameDataManager from './GameDataManager';
import LanguageManager from '../../../i18n/LanguageManager';

export interface ShopCardItem {
  card: Card;
  price: number;
  data: CardData & { price: number };
  priceContainer: Phaser.GameObjects.Container;
}

/**
 * 상점 카드 표시 및 관리를 담당하는 매니저
 */
export default class ShopCardDisplayManager {
  private scene: Phaser.Scene;
  private shopCards: (CardData & { price: number })[] = [];
  private cardObjects: ShopCardItem[] = [];
  private langManager: LanguageManager;
  private gameDataManager: GameDataManager;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.langManager = LanguageManager.getInstance();
    this.gameDataManager = GameDataManager.getInstance();
  }

  /**
   * 상점 카드 생성 및 표시
   */
  initialize(
    onPurchase: (cardData: CardData & { price: number }, card: Card, priceContainer: Phaser.GameObjects.Container) => void,
    onRemoveCard: () => void
  ): void {
    this.generateShopCards();
    this.displayShopCards(onPurchase, onRemoveCard);
  }

  /**
   * 상점에 표시할 카드 목록 생성
   */
  private generateShopCards(): void {
    const allCards = this.gameDataManager.getCardData();

    // 모든 카드를 배열로 변환
    const cardArray = Object.entries(allCards).map(([id, data]) => ({
      id,
      ...data as Omit<CardData, 'id'>
    }));

    // 랜덤하게 5개의 카드 선택
    const shuffled = Phaser.Utils.Array.Shuffle([...cardArray]);
    const selectedCards = shuffled.slice(0, 5);

    this.shopCards = selectedCards.map(card => ({
      ...card,
      price: (card as any).price || Math.max(30, card.cost * 15)
    }));

    // 카드 삭제 카드 추가
    const gameState = this.scene.registry.get('gameState') as GameState;
    const removeCardData: CardData & { price: number } = {
      id    : 'card-removal',
      name  : this.langManager.t('shop.removeCard'),
      type  : 'skill',
      cost  : 0,
      price : gameState.removalCost || 50,
      image : '❌',
      rarity: 'common',
      description: this.langManager.t('shop.removeCardDesc') || '덱에서 카드를 한 장 제거합니다.',
      damage: 0, defense: 0, block: 0, heal: 0, energy: 0, selfDamage: 0, draw: 0,
      effect: '', effects: [], sound: '', allEnemies: false, hits: 0, buff: ''
    };

    this.shopCards.push(removeCardData);
  }

  /**
   * 상점 카드 화면에 표시
   */
  private displayShopCards(
    onPurchase: (cardData: CardData & { price: number }, card: Card, priceContainer: Phaser.GameObjects.Container) => void,
    onRemoveCard: () => void
  ): void {
    const { width, height } = this.scene.cameras.main;
    const y = height / 2 + 20;

    // CardGridRenderer로 레이아웃 계산
    const positions = CardGridRenderer.calculateHorizontalLayout(
      this.shopCards.length,
      width / 2,
      y,
      168,  // cardWidth
      50    // spacing
    );

    this.shopCards.forEach((cardData, index) => {
      this.createCardDisplay(
        positions[index].x,
        positions[index].y,
        cardData,
        onPurchase,
        onRemoveCard
      );
    });
  }

  /**
   * 개별 카드 표시 생성
   */
  private createCardDisplay(
    x: number,
    y: number,
    cardData: CardData & { price: number },
    onPurchase: (cardData: CardData & { price: number }, card: Card, priceContainer: Phaser.GameObjects.Container) => void,
    onRemoveCard: () => void
  ): void {
    // Card 객체 생성
    const card = new Card(this.scene, x, y, cardData);
    
    // 가격 표시를 위한 컨테이너
    const priceContainer = this.scene.add.container(x, y + 150);
    
    const priceBg = this.scene.add.rectangle(0, 0, 168, 50, 0x1e293b, 0.95);
    priceBg.setStrokeStyle(3, 0xfbbf24);

    const priceText = this.scene.add.text(
      0, 0,
      `💰 ${cardData.price}G`,
      textStyle.getStyle('character.name', { fontSize: '24px', color: '#fbbf24' })
    ).setOrigin(0.5).setName('priceText');

    priceContainer.add([priceBg, priceText]);

    // 인터랙션 설정
    card.disableInteraction();
    const cardBg = card.bg;

    CardInteractionHelper.setupCardInteraction(
      this.scene,
      cardBg,
      () => {
        if (cardData.id === 'card-removal') {
          onRemoveCard();
        } else {
          onPurchase(cardData, card, priceContainer);
        }
      },
      {
        hoverTweenKey: 'shop.cardHover',
        hoverOutTweenKey: 'shop.cardHoverOut',
        additionalTargets: [priceContainer]
      }
    );

    // 등장 애니메이션
    CardInteractionHelper.applyAppearAnimation(
      this.scene,
      [card, priceContainer],
      'shop.cardAppear'
    );

    this.cardObjects.push({ card, price: cardData.price, data: cardData, priceContainer });
  }

  /**
   * 카드 제거 (구매 후)
   */
  removeCard(cardId: string): void {
    this.shopCards = this.shopCards.filter(c => c.id !== cardId);
    this.cardObjects = this.cardObjects.filter(obj => obj.data.id !== cardId);
  }

  /**
   * 카드 삭제 가격 업데이트
   */
  updateRemovalCardPrice(newPrice: number): void {
    const removalCardData = this.shopCards.find(c => c.id === 'card-removal');
    if (removalCardData) {
      removalCardData.price = newPrice;
    }

    const removalCardObj = this.cardObjects.find(obj => obj.data.id === 'card-removal');
    if (removalCardObj) {
      removalCardObj.price = newPrice;
      
      const priceText = removalCardObj.priceContainer.getByName('priceText') as Phaser.GameObjects.Text;
      if (priceText) {
        priceText.setText(`💰 ${newPrice}G`);
      }
    }
  }

  getShopCards(): (CardData & { price: number })[] {
    return this.shopCards;
  }

  getCardObjects(): ShopCardItem[] {
    return this.cardObjects;
  }
}
