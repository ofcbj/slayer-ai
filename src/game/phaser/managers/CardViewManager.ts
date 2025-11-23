import Phaser from 'phaser';
import { CardData } from './BattleManager';
import CardRenderer from '../utils/CardRenderer';
import LanguageManager from '../../../i18n/LanguageManager';
import { textStyle } from './TextStyleManager';

/**
 * 카드 뷰 및 팝업을 관리하는 클래스
 * 덱 뷰, 버린 카드 더미 뷰, 카드 목록 팝업 등을 관리합니다.
 */
export default class CardViewManager {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public showDeckView(deck: readonly CardData[], onEmpty?: () => void): void {
    if (deck.length === 0) {
      if (onEmpty) {
        onEmpty();
      }
      return;
    }

    const langManager = LanguageManager.getInstance();
    this.showCardListView(langManager.t('battle.deck'), [...deck]);
  }

  public showDiscardPileView(discardPile: readonly CardData[], onEmpty?: () => void): void {
    if (discardPile.length === 0) {
      if (onEmpty) {
        onEmpty();
      }
      return;
    }

    const langManager = LanguageManager.getInstance();
    this.showCardListView(langManager.t('battle.discard'), [...discardPile]);
  }

  private showCardListView(title: string, cards: CardData[]): void {
    const width   = this.scene.cameras.main.width;
    const height  = this.scene.cameras.main.height;

    // 오버레이 (어둡게)
    const overlay = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.8);
    overlay.setOrigin(0);
    overlay.setDepth(1000);
    overlay.setInteractive();

    // 팝업 배경
    const popupWidth  = Math.min(1400, width - 100);
    const popupHeight = Math.min(900, height - 100);
    const popupBg     = this.scene.add.rectangle(width/2, height/2, popupWidth, popupHeight, 0x1a1a2e);
    popupBg.setStrokeStyle(4, 0x8b5cf6);
    popupBg.setDepth(1001);

    // 타이틀
    const titleText = this.scene.add.text(width/2, height/2-popupHeight/2+40,
      title,
      textStyle.getStyle('cardView.title')
    );
    titleText.setOrigin(0.5);
    titleText.setDepth(1002);

    // 카드 수
    const countText = this.scene.add.text(width/2, height/2-popupHeight/2+80,
      `총 ${cards.length}장`,
      textStyle.getStyle('cardView.count', { color: '#94a3b8' })
    );
    countText.setOrigin(0.5);
    countText.setDepth(1002);

    // 카드 목록 컨테이너
    const cardListContainer = this.scene.add.container(0, 0);
    cardListContainer.setDepth(1002);

    // 카드 목록 표시 (그리드 형식)
    const cardWidth   = 140;
    const cardHeight  = 200;
    const cardSpacing = 20;
    const cardsPerRow = Math.floor((popupWidth - 100) / (cardWidth + cardSpacing));
    const startX      = width / 2 - (cardsPerRow * (cardWidth+cardSpacing) - cardSpacing)/2 + 20;
    const startY      = height / 2 - popupHeight / 2 + 220;

    // 모든 카드를 개별적으로 표시
    cards.forEach((card, index) => {
      const row = Math.floor(index / cardsPerRow);
      const col = index % cardsPerRow;
      const x   = startX + col * (cardWidth + cardSpacing);
      const y   = startY + row * (cardHeight + cardSpacing);

      // CardRenderer를 사용하여 카드 생성 (핸드와 동일한 모양)
      const miniCard = CardRenderer.createCardContainer(this.scene, x, y, card, {
        width: cardWidth,
        height: cardHeight,
        showInteraction: false
      });
      cardListContainer.add(miniCard);
    });

    // 닫기 버튼
    const closeButton = this.scene.add.rectangle(width / 2, height / 2 + popupHeight / 2 - 50, 150, 50, 0xff6b6b);
    closeButton.setStrokeStyle(3, 0xffffff);
    closeButton.setDepth(1002);
    closeButton.setInteractive({ useHandCursor: true });

    const langManager = LanguageManager.getInstance();
    const closeText = this.scene.add.text(width/2, height/2+popupHeight/2-50,
      langManager.t('battle.close'),
      textStyle.getStyle('buttons.secondary')
    );
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
      targets : [popupBg, titleText, countText, cardListContainer, closeButton, closeText],
      alpha   : 1,
      duration: 200
    });

    this.scene.tweens.add({
      targets : popupBg,
      scaleX  : 1, scaleY  : 1,
      duration: 200,
      ease    : 'Back.easeOut'
    });
  }

}

