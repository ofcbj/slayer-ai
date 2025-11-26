import Phaser from 'phaser';
import { textStyle } from '../managers/TextStyleManager';
import UIConfigManager from '../managers/UIConfigManager';
import LanguageManager from '../../../i18n/LanguageManager';
import CardViewManager from '../managers/CardViewManager';
import { CardData } from '../../../types';

/**
 * UI 컴포넌트를 생성하는 유틸리티 클래스
 */
export class UIFactory {
  /**
   * "My Deck" 버튼을 생성합니다.
   * 
   * @param scene - Phaser 씬
   * @param cardViewManager - 카드 뷰 매니저
   * @param getCards - 표시할 카드 목록을 반환하는 함수
   * @param options - 추가 옵션 (위치, depth, scrollFactor 등)
   */
  static createMyDeckButton(
    scene: Phaser.Scene,
    cardViewManager: CardViewManager | null,
    getCards: () => CardData[],
    options?: {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      depth?: number;
      scrollFactor?: number;
      useUIConfig?: boolean;
    }
  ): Phaser.GameObjects.Container {
    // 기본값 설정
    let x = 100;
    let y = 60;
    let width = 160;
    let height = 50;

    // UIConfig 사용 옵션
    if (options?.useUIConfig) {
      const uiConfig = UIConfigManager.getInstance();
      const buttonConfig = uiConfig.getMyDeckButton();
      x = buttonConfig.x;
      y = buttonConfig.y;
      width = buttonConfig.width;
      height = buttonConfig.height;
    }

    // 옵션으로 덮어쓰기
    if (options?.x !== undefined) x = options.x;
    if (options?.y !== undefined) y = options.y;
    if (options?.width !== undefined) width = options.width;
    if (options?.height !== undefined) height = options.height;

    const deckContainer = scene.add.container(x, y);

    const deckBg = scene.add.rectangle(0, 0, width, height, 0x8b5cf6, 0.9);
    deckBg.setStrokeStyle(3, 0x7c3aed);

    const deckText = scene.add.text(
      0,
      0,
      'My Deck',
      textStyle.getStyle('character.name', { fontSize: '20px' })
    ).setOrigin(0.5);

    deckContainer.add([deckBg, deckText]);

    // depth 설정
    if (options?.depth !== undefined) {
      deckContainer.setDepth(options.depth);
    }

    // scrollFactor 설정
    if (options?.scrollFactor !== undefined) {
      deckContainer.setScrollFactor(options.scrollFactor);
    }

    deckBg.setInteractive({ useHandCursor: true });

    // 호버 효과
    deckBg.on('pointerover', () => {
      deckBg.setFillStyle(0x7c3aed);
      scene.tweens.add({
        targets: deckContainer,
        scale: 1.05,
        duration: 200
      });
    });

    deckBg.on('pointerout', () => {
      deckBg.setFillStyle(0x8b5cf6);
      scene.tweens.add({
        targets: deckContainer,
        scale: 1,
        duration: 200
      });
    });

    // 클릭 이벤트
    deckBg.on('pointerdown', () => {
      if (cardViewManager) {
        const langManager = LanguageManager.getInstance();
        const cards = getCards();
        cardViewManager.showCardListView(langManager.t('battle.deck'), cards);
      }
    });

    return deckContainer;
  }
}
