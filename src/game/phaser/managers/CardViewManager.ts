import Phaser from 'phaser';
import { CardData } from './BattleManager';
import CardGridRenderer from '../utils/CardGridRenderer';
import CardInteractionHelper from '../utils/CardInteractionHelper';
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
      onEmpty?.();
      return;
    }

    const langManager = LanguageManager.getInstance();
    this.showCardListView(langManager.t('battle.deck'), [...deck]);
  }

  public showDiscardPileView(discardPile: readonly CardData[], onEmpty?: () => void): void {
    if (discardPile.length === 0) {
      onEmpty?.();
      return;
    }

    const langManager = LanguageManager.getInstance();
    this.showCardListView(langManager.t('battle.discard'), [...discardPile]);
  }

  public showCardListView(
    title: string,
    cards: CardData[],
    options?: { selectable?: boolean; onSelect?: (card: CardData, closePopup: () => void) => void }
  ): void {
    const { width, height } = this.scene.cameras.main;

    // 오버레이
    const overlay = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.8);
    overlay.setOrigin(0);
    overlay.setDepth(1000);
    overlay.setInteractive();

    // 팝업 배경
    const popupWidth = Math.min(1600, width - 80);
    const popupHeight = Math.min(900, height - 100);
    const popupBg = this.scene.add.rectangle(width/2, height/2, popupWidth, popupHeight, 0x1a1a2e);
    popupBg.setStrokeStyle(4, 0x8b5cf6);
    popupBg.setDepth(1001);

    // 타이틀
    const titleText = this.scene.add.text(
      width/2, height/2 - popupHeight/2 + 40,
      title,
      textStyle.getStyle('cardView.title')
    ).setOrigin(0.5).setDepth(1002);

    // 카드 수
    const countText = this.scene.add.text(
      width/2, height/2 - popupHeight/2 + 80,
      `총 ${cards.length}장`,
      textStyle.getStyle('cardView.count', { color: '#94a3b8' })
    ).setOrigin(0.5).setDepth(1002);

    // 닫기 동작
    const closePopup = () => {
      overlay.destroy();
      popupBg.destroy();
      titleText.destroy();
      countText.destroy();
      cardGrid.container.destroy();
    };

    // 카드 그리드 생성 (CardGridRenderer 사용)
    const cardGrid = CardGridRenderer.createGrid(
      this.scene,
      cards,
      width / 2,
      {
        cardWidth: 168,
        cardHeight: 240,
        spacing: 20,
        cardsPerRow: 8,
        startY: height/2 - popupHeight/2 + 230
      },
      options?.selectable ? {
        selectable: true,
        onSelect: (card) => {
          options.onSelect?.(card, closePopup);
        },
        hoverScale: 1.1
      } : undefined
    );

    cardGrid.container.setDepth(1002);

    overlay.on('pointerdown', closePopup);

    // 등장 애니메이션
    CardInteractionHelper.applyAppearAnimation(
      this.scene,
      [popupBg, titleText, countText, cardGrid.container]
    );
  }
}
