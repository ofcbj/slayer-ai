import Phaser from 'phaser';
import { CardData, NormalizedCardData } from '../managers/BattleManager';
import { textStyle } from '../managers/TextStyleManager';

/**
 * 카드 렌더링 설정
 */
export interface CardRenderOptions {
  width?: number;
  height?: number;
  showInteraction?: boolean; // 인터랙션 활성화 여부
}

/**
 * 카드 렌더링을 위한 공통 유틸리티
 * Card 클래스와 CardViewManager에서 동일한 카드 모양을 사용하도록 합니다.
 */
export default class CardRenderer {
  /**
   * 카드 컨테이너를 생성합니다.
   */
  static createCardContainer(
    scene: Phaser.Scene,
    x: number,
    y: number,
    cardData: CardData | NormalizedCardData,
    options: CardRenderOptions = {}
  ): Phaser.GameObjects.Container {
    const container = scene.add.container(x, y);

    const width = options.width || 140;
    const height = options.height || 200;

    // 카드 배경
    const bg = scene.add.rectangle(0, 0, width, height, 0x2a2a4e);
    const borderColor = this.getCardColor(cardData);
    bg.setStrokeStyle(3, borderColor);

    // 카드 타입에 따른 상단 배경
    const headerBg = scene.add.rectangle(0, -height / 2 + 18, width, 36, borderColor);

    // 카드 이름
    const nameText = scene.add.text(0, -height/2+18, cardData.name,
      textStyle.getStyle('cards.name', { wordWrap: { width: width - 10 } })
    );
    nameText.setOrigin(0.5);

    // 코스트 (카드 색상과 동일하게)
    const costCircle = scene.add.circle(-width/2+20, -height/2+18, 15, borderColor);
    costCircle.setStrokeStyle(2, 0xffffff);

    const costText = scene.add.text(-width/2+20, -height/2+18,
      cardData.cost.toString(),
      textStyle.getStyle('cards.cost')
    );
    costText.setOrigin(0.5);

    // 카드 이미지 - 중앙에 크게 표시 (PNG 또는 이모지)
    let cardImage: Phaser.GameObjects.GameObject;
    const imageKey = this.getCardImageKey(cardData);

    // PNG 이미지가 있으면 Sprite로, 없으면 Text(이모지)로 표시
    if (imageKey && scene.textures.exists(imageKey)) {
      const sprite = scene.add.sprite(0, -25, imageKey);
      sprite.setDisplaySize(80, 80); // 이미지 크기 조정
      cardImage = sprite;
    } else {
      const text = scene.add.text(0, -25, this.getCardImage(cardData),
        textStyle.getStyle('cards.emoji')
      );
      text.setOrigin(0.5);
      cardImage = text;
    }

    // 카드 값 (데미지, 방어도 등) - 이미지 아래
    const valueText = scene.add.text(0, 25, this.getValueDisplay(cardData),
      textStyle.getStyle('cards.value', { color: this.getValueColor(cardData), stroke: '#000000', strokeThickness: 4 })
    );
    valueText.setOrigin(0.5);

    // 카드 효과 설명 - 하단
    const descText = scene.add.text(0, 65, this.getEffectDescription(cardData),
      textStyle.getStyle('cards.emojiSmall', { color: '#cccccc', wordWrap: { width: width - 30, useAdvancedWrap: true }, lineSpacing: 2 })
    );
    descText.setOrigin(0.5, 0.5);

    // 설명이 카드 하단을 넘어가면 스케일을 줄여서 맞춤
    const maxDescHeight = height / 2 - 75; // 하단 여백 고려
    if (descText.height > maxDescHeight) {
      const scale = maxDescHeight / descText.height;
      descText.setScale(scale);
    }

    container.add([bg, headerBg, nameText, costCircle, costText, cardImage, valueText, descText]);

    // 컨테이너에 bg 참조 저장 (인터랙션용)
    (container as any).bg = bg;
    container.setSize(width, height);

    return container;
  }

  /**
   * 카드 이미지 키 가져오기 (PNG 파일용)
   */
  static getCardImageKey(cardData: CardData | NormalizedCardData): string | null {
    // rawData에서 imageKey 가져오기 (NormalizedCardData인 경우)
    if ('rawData' in cardData && cardData.rawData && cardData.rawData.imageKey) {
      return cardData.rawData.imageKey;
    }

    // CardData에서 직접 가져오기
    if ('imageKey' in cardData && cardData.imageKey) {
      return cardData.imageKey;
    }

    return null;
  }

  /**
   * 카드 이미지 (이모지) 가져오기
   */
  static getCardImage(cardData: CardData | NormalizedCardData): string {
    // rawData에서 이미지(이모지) 가져오기 (NormalizedCardData인 경우)
    if ('rawData' in cardData && cardData.rawData && cardData.rawData.image) {
      return cardData.rawData.image;
    }

    // CardData에서 직접 가져오기
    if ('image' in cardData && cardData.image) {
      return cardData.image;
    }

    // 기본 이모지 (타입별)
    const type = this.getCardType(cardData);
    if (type === '공격') return '⚔️';
    if (type === '방어') return '🛡️';
    if (type === '치유') return '💚';
    if (type === '에너지') return '🧘';
    return '✨';
  }

  /**
   * 카드 타입 가져오기
   */
  static getCardType(cardData: CardData | NormalizedCardData): string | undefined {
    // NormalizedCardData인 경우 (rawData 속성으로 구분)
    if ('rawData' in cardData && cardData.rawData) {
      return cardData.type;
    }

    // CardData인 경우 타입 추론
    const data = cardData as CardData;
    if (data.damage) return '공격';
    if (data.block) return '방어';
    if (data.heal) return '치유';
    if (data.energy) return '에너지';
    return '스킬';
  }

  /**
   * 카드 값 가져오기
   */
  static getCardValue(cardData: CardData | NormalizedCardData): number {
    // NormalizedCardData인 경우
    if ('value' in cardData && typeof cardData.value === 'number') {
      return cardData.value;
    }

    // CardData인 경우
    const data = cardData as CardData;
    return data.damage || data.block || data.heal || data.energy || 0;
  }

  /**
   * 카드 색상 가져오기
   */
  static getCardColor(cardData: CardData | NormalizedCardData): number {
    const type = this.getCardType(cardData);
    if (type === '공격') return 0xff6b6b;
    if (type === '방어') return 0x4ecdc4;
    if (type === '치유') return 0x2ecc71;
    if (type === '에너지') return 0xf39c12;
    return 0x9b59b6;
  }

  /**
   * 값 색상 가져오기 (문자열)
   */
  static getValueColor(cardData: CardData | NormalizedCardData): string {
    const type = this.getCardType(cardData);
    if (type === '공격') return '#ff6b6b';
    if (type === '방어') return '#4ecdc4';
    if (type === '치유') return '#2ecc71';
    if (type === '에너지') return '#f39c12';
    return '#ffffff';
  }

  /**
   * 값 표시 텍스트 가져오기
   */
  static getValueDisplay(cardData: CardData | NormalizedCardData): string {
    const type = this.getCardType(cardData);
    const value = this.getCardValue(cardData);

    if (type === '공격') return value.toString();
    if (type === '방어') return value.toString();
    if (type === '치유') return `+${value}`;
    if (type === '에너지') return `+${value}`;
    return '';
  }

  /**
   * 효과 설명 가져오기
   */
  static getEffectDescription(cardData: CardData | NormalizedCardData): string {
    // description이 있으면 우선 사용 (HTML 태그 제거)
    if (cardData.description) {
      return this.stripHtmlTags(cardData.description);
    }

    // description이 없으면 기본 텍스트 사용
    const type = this.getCardType(cardData);
    const value = this.getCardValue(cardData);

    if (type === '공격') return `Deal ${value} damage`;
    if (type === '방어') return `Gain ${value} defense`;
    if (type === '치유') return `Heal ${value} HP`;
    if (type === '에너지') return `Gain ${value} energy`;

    return '';
  }

  /**
   * HTML 태그를 제거합니다.
   */
  private static stripHtmlTags(text: string): string {
    if (!text) return '';
    // HTML 태그 제거
    return text.replace(/<[^>]*>/g, '');
  }
}
