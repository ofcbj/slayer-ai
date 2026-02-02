import Phaser from 'phaser';
import { CardData } from '../../../types';
import UIConfigManager from '../managers/UIConfigManager';
import { textStyle } from '../managers/TextStyleManager';
import LanguageManager from '../../../i18n/LanguageManager';

/**
 * 카드 렌더링 설정
 */
export interface CardRenderOptions {
  width?           : number;
  height?          : number;
  showInteraction? : boolean; // 인터랙션 활성화 여부
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
    scene   : Phaser.Scene,
    x       : number,
    y       : number,
    cardData: CardData,
    options : CardRenderOptions = {}
  ): Phaser.GameObjects.Container {
    const container = scene.add.container(x, y);

    const uiConfig = UIConfigManager.getInstance();
    const config = uiConfig.getCardRendererConfig();
    
    const width = options.width || config.defaultWidth;
    const height = options.height || config.defaultHeight;

    // 카드 배경
    const bg = scene.add.rectangle(0, 0, width, height, uiConfig.getColor('CARD_BACKGROUND'));
    const borderColor = this.getCardColor(cardData);
    bg.setStrokeStyle(3, borderColor);

    // 카드 타입에 따른 상단 배경
    const headerBg = scene.add.rectangle(0, -height / 2 + config.headerYOffset, width, config.headerHeight, borderColor);

    // 카드 이름
    const nameText = scene.add.text(0, -height/2+config.headerYOffset, cardData.name,
      textStyle.getStyle('cards.name', { wordWrap: { width: width - 10 } })
    );
    nameText.setOrigin(0.5);

    // 코스트 (카드 색상과 동일하게)
    const costCircle = scene.add.circle(
      -width/2+config.costCircle.xOffset, 
      -height/2+config.costCircle.yOffset, 
      config.costCircle.radius, 
      borderColor
    );
    costCircle.setStrokeStyle(2, uiConfig.getColor('STROKE_WHITE'));

    const costValue = cardData.cost ?? 0; // cost가 undefined일 때 기본값 0 사용
    const costText = scene.add.text(
      -width/2+config.costCircle.xOffset, 
      -height/2+config.costCircle.yOffset,
      costValue.toString(),
      textStyle.getStyle('cards.cost')
    );
    costText.setOrigin(0.5);

    // 카드 이미지 - 중앙에 크게 표시 (PNG 또는 이모지)
    const text = scene.add.text(0, config.image.yOffset, this.getCardImage(cardData),
      textStyle.getStyle('cards.emoji')
    );
    text.setOrigin(0.5);
    
    let cardImage: Phaser.GameObjects.GameObject;
    cardImage = text;

    // 카드 값 (데미지, 방어도 등) - 이미지 아래
    const valueText = scene.add.text(0, config.value.yOffset, this.getValueDisplay(cardData),
      textStyle.getStyle('cards.value', { color: this.getValueColor(cardData), stroke: uiConfig.getColorString('TEXT_BLACK'), strokeThickness: 4 })
    );
    valueText.setOrigin(0.5);

    // 카드 효과 설명 - 하단
    const descText = scene.add.text(0, config.description.yOffset, this.getEffectDescription(cardData),
      textStyle.getStyle('cards.emojiSmall', { color: uiConfig.getColorString('TEXT_GRAY'), wordWrap: { width: width - 30 }, lineSpacing: 2 })
    );
    descText.setOrigin(0.5, 0.5);

    // 설명이 카드 하단을 넘어가면 스케일을 줄여서 맞춤
    const maxDescHeight = height / 2 - 45; // 하단 여백 감소하여 설명 영역 30px 증가
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

  static getCardImage(cardData: CardData): string {
    // CardData에서 이미지(이모지) 가져오기
    if (cardData.image) {
      return cardData.image;
    }
    // 기본 이모지 (타입별)
    if (cardData.type === 'attack') return '⚔️';
    if (cardData.type === 'skill') {
      if (cardData.block)   return '🛡️';
      if (cardData.heal)    return '💚';
      if (cardData.energy)  return '🧘';
    }
    return '✨';
  }

  static getCardType(cardData: CardData): string | undefined {
    // CardData 타입 추론
    if (cardData.type === 'attack') return 'attack';
    if (cardData.type === 'skill') {
      if (cardData.block)   return 'defend';
      if (cardData.heal)    return 'heal';
      if (cardData.energy)  return 'energy';
    }
    return 'skill';
  }

  static getCardValue(cardData: CardData): number {
    return cardData.damage || cardData.block || cardData.heal || cardData.energy || 0;
  }

  static getCardColor(cardData: CardData): number {
    const uiConfig = UIConfigManager.getInstance();
    const type = this.getCardType(cardData);
    if (type === 'attack') return uiConfig.getColor('CARD_TYPE_ATTACK');
    if (type === 'defend') return uiConfig.getColor('CARD_TYPE_DEFEND');
    if (type === 'heal')   return uiConfig.getColor('CARD_TYPE_HEAL');
    if (type === 'energy') return uiConfig.getColor('CARD_TYPE_ENERGY');
    return uiConfig.getColor('CARD_TYPE_SKILL');
  }

  static getValueColor(cardData: CardData): string {
    const uiConfig = UIConfigManager.getInstance();
    const type = this.getCardType(cardData);
    if (type === 'attack') return uiConfig.getColorString('TEXT_ATTACK');
    if (type === 'defend') return uiConfig.getColorString('TEXT_DEFEND');
    if (type === 'heal')   return uiConfig.getColorString('TEXT_HEAL');
    if (type === 'energy') return uiConfig.getColorString('TEXT_ENERGY');
    return uiConfig.getColorString('TEXT_WHITE');
  }

  static getValueDisplay(cardData: CardData): string {
    const type = this.getCardType(cardData);
    const value = this.getCardValue(cardData);

    if (type === 'attack') return value.toString();
    if (type === 'defend') return value.toString();
    if (type === 'heal')   return `+${value}`;
    if (type === 'energy') return `+${value}`;
    return '';
  }

  static getEffectDescription(cardData: CardData): string {
    const langManager = LanguageManager.getInstance();
    const effects: string[] = [];

    if (cardData.damage) {
      if (cardData.allEnemies) {
        effects.push(langManager.t('cardEffects.damageAll', { value: cardData.damage }));
      } else {
        effects.push(langManager.t('cardEffects.damage', { value: cardData.damage }));
      }
    }
    if (cardData.block) {
      effects.push(langManager.t('cardEffects.block', { value: cardData.block }));
    }
    if (cardData.heal) {
      effects.push(langManager.t('cardEffects.heal', { value: cardData.heal }));
    }
    if (cardData.energy) {
      effects.push(langManager.t('cardEffects.energy', { value: cardData.energy }));
    }
    if (cardData.draw) {
      effects.push(langManager.t('cardEffects.draw', { value: cardData.draw }));
    }
    if (cardData.selfDamage) {
      effects.push(langManager.t('cardEffects.selfDamage', { value: cardData.selfDamage }));
    }
    if (cardData.buff) {
      const buffName = langManager.t(`buffs.${cardData.buff}`);
      effects.push(langManager.t('cardEffects.applyBuff', { buff: buffName }));
    }

    // 효과들을 구분자로 연결
    const separator = langManager.t('cardEffects.separator');
    return effects.join(separator);
  }
}
