import Phaser from 'phaser';
import { CardData } from './BattleManager';

/**
 * 카드 뷰 및 팝업을 관리하는 클래스
 * 덱 뷰, 버린 카드 더미 뷰, 카드 목록 팝업 등을 관리합니다.
 */
export default class CardViewManager {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * 덱 뷰를 표시합니다.
   */
  public showDeckView(deck: readonly CardData[], onEmpty?: () => void): void {
    if (deck.length === 0) {
      if (onEmpty) {
        onEmpty();
      }
      return;
    }

    this.showCardListView('덱', [...deck]);
  }

  /**
   * 버린 카드 더미 뷰를 표시합니다.
   */
  public showDiscardPileView(discardPile: readonly CardData[], onEmpty?: () => void): void {
    if (discardPile.length === 0) {
      if (onEmpty) {
        onEmpty();
      }
      return;
    }

    this.showCardListView('버린 카드', [...discardPile]);
  }

  /**
   * 카드 목록을 팝업으로 표시합니다.
   */
  private showCardListView(title: string, cards: CardData[]): void {
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;

    // 오버레이 (어둡게)
    const overlay = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.8);
    overlay.setOrigin(0);
    overlay.setDepth(1000);
    overlay.setInteractive();

    // 팝업 배경
    const popupWidth = Math.min(1400, width - 100);
    const popupHeight = Math.min(900, height - 100);
    const popupBg = this.scene.add.rectangle(width / 2, height / 2, popupWidth, popupHeight, 0x1a1a2e);
    popupBg.setStrokeStyle(4, 0x8b5cf6);
    popupBg.setDepth(1001);

    // 타이틀
    const titleText = this.scene.add.text(width / 2, height / 2 - popupHeight / 2 + 40, title, {
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
    const countText = this.scene.add.text(
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
    const cardListContainer = this.scene.add.container(0, 0);
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
    const closeButton = this.scene.add.rectangle(width / 2, height / 2 + popupHeight / 2 - 50, 150, 50, 0xff6b6b);
    closeButton.setStrokeStyle(3, 0xffffff);
    closeButton.setDepth(1002);
    closeButton.setInteractive({ useHandCursor: true });

    const closeText = this.scene.add.text(width / 2, height / 2 + popupHeight / 2 - 50, '닫기', {
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

    this.scene.tweens.add({
      targets: [popupBg, titleText, countText, cardListContainer, closeButton, closeText],
      alpha: 1,
      duration: 200
    });

    this.scene.tweens.add({
      targets: popupBg,
      scaleX: 1,
      scaleY: 1,
      duration: 200,
      ease: 'Back.easeOut'
    });
  }

  /**
   * 미니 카드를 생성합니다.
   */
  private createMiniCard(x: number, y: number, cardData: CardData, count: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);

    const cardWidth = 130;
    const cardHeight = 180;

    // 카드 배경
    const bg = this.scene.add.rectangle(0, 0, cardWidth, cardHeight, 0x2a2a4e);
    const borderColor = this.getCardColorFromData(cardData);
    bg.setStrokeStyle(3, borderColor);

    // 카드 타입에 따른 상단 배경
    const headerBg = this.scene.add.rectangle(0, -cardHeight / 2 + 18, cardWidth, 36, borderColor);

    // 카드 이름
    const nameText = this.scene.add.text(0, -cardHeight / 2 + 18, cardData.name, {
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

    const effectText = this.scene.add.text(0, 10, value > 0 ? `${type} ${value}` : type, {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff'
    });
    effectText.setOrigin(0.5);

    // 코스트
    const costCircle = this.scene.add.circle(-cardWidth / 2 + 20, -cardHeight / 2 + 20, 18, 0x3498db);
    costCircle.setStrokeStyle(2, 0xffffff);

    const costText = this.scene.add.text(-cardWidth / 2 + 20, -cardHeight / 2 + 20, cardData.cost.toString(), {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff'
    });
    costText.setOrigin(0.5);

    // 카드 개수 표시
    if (count > 1) {
      const countBg = this.scene.add.circle(cardWidth / 2 - 20, cardHeight / 2 - 20, 18, 0xe74c3c);
      countBg.setStrokeStyle(2, 0xffffff);

      const countText = this.scene.add.text(cardWidth / 2 - 20, cardHeight / 2 - 20, `x${count}`, {
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
    const descText = this.scene.add.text(0, 50, cleanDescription, {
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

  /**
   * 카드 데이터에서 색상을 가져옵니다.
   */
  private getCardColorFromData(cardData: CardData): number {
    if (cardData.damage)  return 0xff6b6b; // 공격
    if (cardData.block)   return 0x4ecdc4; // 방어
    if (cardData.heal)    return 0x95e1d3; // 치유
    if (cardData.energy)  return 0xf39c12; // 에너지
    return 0x9b59b6; // 스킬
  }

  /**
   * HTML 태그를 제거합니다.
   */
  private stripHtmlTags(text: string): string {
    if (!text) return '';
    // HTML 태그 제거
    return text.replace(/<[^>]*>/g, '');
  }
}

