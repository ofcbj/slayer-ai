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

  public showCardListView(title: string, cards: CardData[], options?: { selectable?: boolean; onSelect?: (card: CardData, closePopup: () => void) => void }): void {
    const width   = this.scene.cameras.main.width;
    const height  = this.scene.cameras.main.height;

    // 오버레이 (어둡게)
    const overlay = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.8);
    overlay.setOrigin(0);
    overlay.setDepth(1000);
    overlay.setInteractive();

    // 팝업 배경 - 7장을 한 줄에 표시하기 위해 너비 증가
    const popupWidth  = Math.min(1600, width - 80);
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

    // 닫기 동작 - 먼저 선언
    const closePopup = () => {
      overlay.destroy();
      popupBg.destroy();
      titleText.destroy();
      countText.destroy();
      cardListContainer.destroy();
    };

    // 카드 목록 표시 (그리드 형식) - 핸드와 동일한 크기, 한 줄에 7장
    const cardWidth   = 168;
    const cardHeight  = 240;
    const cardSpacing = 20;
    const cardsPerRow = 8; // 한 줄에 8장 고정
    const startX      = width/2 - (cardsPerRow*(cardWidth+cardSpacing)-cardSpacing)/2 + 80;
    const startY      = height/2 - popupHeight / 2 + 230;

    // 모든 카드를 개별적으로 표시
    cards.forEach((card, index) => {
      const row = Math.floor(index/cardsPerRow);
      const col = index % cardsPerRow;
      const x   = startX + col*(cardWidth+cardSpacing);
      const y   = startY + row*(cardHeight+cardSpacing);

      // CardRenderer를 사용하여 카드 생성 (핸드와 동일한 모양)
      const miniCard = CardRenderer.createCardContainer(this.scene, x, y, card, {
        width: cardWidth,
        height: cardHeight,
        showInteraction: false
      });

      // 선택 가능 모드인 경우 인터랙션 추가
      if (options?.selectable && options.onSelect) {
        const cardBg = miniCard.getAt(0) as Phaser.GameObjects.Rectangle;
        cardBg.setInteractive({ useHandCursor: true });

        cardBg.on('pointerover', () => {
          this.scene.tweens.add({
            targets: miniCard,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 150
          });
        });

        cardBg.on('pointerout', () => {
          this.scene.tweens.add({
            targets: miniCard,
            scaleX: 1,
            scaleY: 1,
            duration: 150
          });
        });

        cardBg.on('pointerdown', () => {
          if (options.onSelect) {
            options.onSelect(card, closePopup);
          }
        });
      }

      cardListContainer.add(miniCard);
    });

    overlay.on('pointerdown', closePopup);

    // 등장 애니메이션
    popupBg.setScale(0.8);
    popupBg.setAlpha(0);
    titleText.setAlpha(0);
    countText.setAlpha(0);
    cardListContainer.setAlpha(0);

    this.scene.tweens.add({
      targets : [popupBg, titleText, countText, cardListContainer],
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

