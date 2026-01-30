import Phaser from 'phaser';
import { CardData } from '../../../types';
import CardRenderer from './CardRenderer';
import CardInteractionHelper from './CardInteractionHelper';

export interface CardGridConfig {
  /** 카드 너비 (기본: 168) */
  cardWidth?: number;
  /** 카드 높이 (기본: 240) */
  cardHeight?: number;
  /** 카드 간격 (기본: 20) */
  spacing?: number;
  /** 한 줄당 카드 수 (기본: 8) */
  cardsPerRow?: number;
  /** 시작 Y 위치 */
  startY?: number;
}

export interface CardGridInteractionOptions {
  /** 선택 가능 여부 */
  selectable?: boolean;
  /** 카드 선택 시 콜백 */
  onSelect?: (card: CardData, index: number) => void;
  /** 호버 시 스케일 */
  hoverScale?: number;
}

export interface CardGridResult {
  container: Phaser.GameObjects.Container;
  cardContainers: Phaser.GameObjects.Container[];
}

/**
 * 카드 그리드 표시를 공통으로 처리하는 유틸리티
 * CardViewManager, ShopCardDisplayManager 등에서 사용
 */
export default class CardGridRenderer {
  /**
   * 카드 그리드 생성 (CardRenderer 사용)
   */
  static createGrid(
    scene: Phaser.Scene,
    cards: CardData[],
    centerX: number,
    config: CardGridConfig = {},
    interaction?: CardGridInteractionOptions
  ): CardGridResult {
    const {
      cardWidth = 168,
      cardHeight = 240,
      spacing = 20,
      cardsPerRow = 8,
      startY = 0
    } = config;

    const container = scene.add.container(0, 0);
    const cardContainers: Phaser.GameObjects.Container[] = [];

    // 그리드 시작 X 계산
    const totalWidthPerRow = cardsPerRow * (cardWidth + spacing) - spacing;
    const startX = centerX - totalWidthPerRow / 2 + cardWidth / 2;

    cards.forEach((card, index) => {
      const row = Math.floor(index / cardsPerRow);
      const col = index % cardsPerRow;
      const x = startX + col * (cardWidth + spacing);
      const y = startY + row * (cardHeight + spacing);

      // CardRenderer를 사용하여 카드 생성
      const cardContainer = CardRenderer.createCardContainer(scene, x, y, card, {
        width: cardWidth,
        height: cardHeight,
        showInteraction: false
      });

      // 인터랙션 설정
      if (interaction?.selectable && interaction.onSelect) {
        const cardBg = cardContainer.getAt(0) as Phaser.GameObjects.Rectangle;
        
        CardInteractionHelper.setupCardInteraction(
          scene,
          cardBg,
          () => interaction.onSelect!(card, index),
          { hoverScale: interaction.hoverScale || 1.1 }
        );
      }

      container.add(cardContainer);
      cardContainers.push(cardContainer);
    });

    return { container, cardContainers };
  }

  /**
   * 그리드 레이아웃 계산 (위치만 계산, 렌더링 X)
   */
  static calculateLayout(
    cardCount: number,
    centerX: number,
    config: CardGridConfig = {}
  ): { x: number; y: number }[] {
    const {
      cardWidth = 168,
      cardHeight = 240,
      spacing = 20,
      cardsPerRow = 8,
      startY = 0
    } = config;

    const totalWidthPerRow = cardsPerRow * (cardWidth + spacing) - spacing;
    const startX = centerX - totalWidthPerRow / 2 + cardWidth / 2;

    const positions: { x: number; y: number }[] = [];

    for (let i = 0; i < cardCount; i++) {
      const row = Math.floor(i / cardsPerRow);
      const col = i % cardsPerRow;
      positions.push({
        x: startX + col * (cardWidth + spacing),
        y: startY + row * (cardHeight + spacing)
      });
    }

    return positions;
  }

  /**
   * 가로 한 줄 카드 배치 계산
   */
  static calculateHorizontalLayout(
    cardCount: number,
    centerX: number,
    y: number,
    cardWidth: number = 168,
    spacing: number = 50
  ): { x: number; y: number }[] {
    const totalWidth = cardCount * cardWidth + (cardCount - 1) * spacing;
    const startX = centerX - totalWidth / 2 + cardWidth / 2;

    const positions: { x: number; y: number }[] = [];
    for (let i = 0; i < cardCount; i++) {
      positions.push({
        x: startX + i * (cardWidth + spacing),
        y
      });
    }

    return positions;
  }
}
