import Phaser from 'phaser';
import Card from '../objects/Card';
import DeckManager from './DeckManager';
import BattleUIManager from './BattleUIManager';
import { CardData, NormalizedCardData } from './BattleManager';

/**
 * 카드 핸드를 관리하는 클래스
 * 카드 드로우, 배치, 버리기, 선택 등을 관리합니다.
 */
export default class CardHandManager {
  private scene: Phaser.Scene;
  private deckManager: DeckManager;
  private uiManager: BattleUIManager;
  private hand: Card[] = [];
  private selectedCard: Card | null = null;
  private handContainer!: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, deckManager: DeckManager, uiManager: BattleUIManager) {
    this.scene = scene;
    this.deckManager = deckManager;
    this.uiManager = uiManager;

    this.initializeHandContainer();
  }

  /**
   * 핸드 컨테이너를 초기화합니다.
   */
  public initializeHandContainer(): void {
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;

    // 핸드 영역
    this.handContainer = this.scene.add.container(width / 2, height - 130);
  }

  /**
   * 카드를 드로우합니다.
   */
  public drawCards(count: number, onComplete?: () => void): void {
    const cardsToDrawData: CardData[] = [];

    // 먼저 모든 카드 데이터를 가져옴
    for (let i = 0; i < count; i++) {
      const cardData = this.deckManager.drawCard();
      if (cardData) {
        cardsToDrawData.push(cardData);
      } else {
        // 덱이 비어있으면 중단 (DeckManager의 drawCard가 이미 리셔플 처리)
        break;
      }
    }

    const cardsDrawn = cardsToDrawData.length;
    const currentHandSize = this.hand.length;

    // 순차적으로 카드 추가 애니메이션
    cardsToDrawData.forEach((cardData, index) => {
      this.scene.time.delayedCall(index * 150, () => {
        this.addCardToHandWithAnimation(cardData, currentHandSize + index, currentHandSize + cardsDrawn);
      });
    });

    // 모든 카드가 드로우된 후 콜백 실행
    // 마지막 카드의 애니메이션 시작 시간(cardsDrawn * 150) + 애니메이션 duration(400) + 여유시간(100)
    this.scene.time.delayedCall(cardsDrawn * 150 + 500, () => {
      if (onComplete) {
        onComplete();
      }
    });
  }

  /**
   * 애니메이션과 함께 카드를 핸드에 추가합니다.
   */
  private addCardToHandWithAnimation(cardData: CardData, cardIndex: number, finalHandSize: number): void {
    // 카드 타입 정규화
    const normalizedCard = this.normalizeCardData(cardData);

    // 덱 위치에서 카드 생성
    const deckPileContainer = this.uiManager.getDeckPileContainer();
    const deckWorldPos = deckPileContainer.getWorldTransformMatrix();
    const startX = deckWorldPos.tx;
    const startY = deckWorldPos.ty;

    const card = new Card(this.scene, startX, startY, normalizedCard as any);
    card.setScale(0.8);

    this.hand.push(card);
    this.scene.add.existing(card);

    // 덱 파일 애니메이션
    this.uiManager.animateDeckPile();

    // 최종 위치 계산 (모든 카드가 드로우된 후의 핸드 배치 기준)
    const spacing = 150;
    const totalWidth = (finalHandSize - 1) * spacing;
    const startHandX = -totalWidth / 2;

    // 핸드 컨테이너의 월드 좌표
    const handWorldPos = this.handContainer.getWorldTransformMatrix();
    const handCenterX = handWorldPos.tx;
    const handCenterY = handWorldPos.ty;

    // 이 카드의 최종 로컬 및 월드 좌표
    const finalLocalX = startHandX + (cardIndex * spacing);
    const targetX = handCenterX + finalLocalX;
    const targetY = handCenterY;

    this.scene.tweens.add({
      targets: card,
      x: targetX,
      y: targetY,
      scaleX: 1,
      scaleY: 1,
      duration: 400,
      ease: 'Power2',
      onComplete: () => {
        // 카드를 핸드 컨테이너로 이동
        this.handContainer.add(card);
        // 핸드 컨테이너 내에서의 로컬 좌표 설정
        card.setPosition(finalLocalX, 0);
        (card as any).originalY = 0;
      }
    });
  }

  /**
   * 카드 데이터를 정규화합니다.
   */
  private normalizeCardData(cardData: CardData): NormalizedCardData {
    // 기존 카드 데이터를 Card 클래스가 기대하는 형식으로 변환
    // rawData도 깊은 복사하여 객체 참조 문제 방지
    return {
      name: cardData.name,
      type: cardData.damage ? '공격' : cardData.block ? '방어' : cardData.heal ? '치유' : cardData.energy ? '에너지' : '스킬',
      cost: cardData.cost,
      value: cardData.damage || cardData.block || cardData.heal || cardData.energy || 0,
      allEnemies: cardData.allEnemies || false,
      hits: cardData.hits || 1,
      selfDamage: cardData.selfDamage || 0,
      description: cardData.description,
      rawData: { ...cardData }
    };
  }

  /**
   * 핸드를 재배치합니다.
   */
  public arrangeHand(): void {
    const cardCount = this.hand.length;
    const spacing = 150;
    const totalWidth = (cardCount - 1) * spacing;
    const startX = -totalWidth / 2;

    this.hand.forEach((card, index) => {
      const targetX = startX + (index * spacing);
      const targetY = 0;

      this.scene.tweens.add({
        targets: card,
        x: targetX,
        y: targetY,
        duration: 300,
        ease: 'Back.easeOut'
      });

      (card as any).originalY = targetY;
    });
  }

  /**
   * 카드를 선택합니다.
   */
  public selectCard(card: Card): void {
    // 이전에 선택된 카드 해제
    if (this.selectedCard && this.selectedCard !== card) {
      this.selectedCard.deselect();
    }

    // 카드 선택
    this.selectedCard = card;
    card.select();
  }

  /**
   * 선택된 카드를 해제합니다.
   */
  public deselectCard(): void {
    if (this.selectedCard) {
      this.selectedCard.deselect();
      this.selectedCard = null;
    }
  }

  /**
   * 카드를 핸드에서 제거합니다.
   */
  public removeCardFromHand(card: Card): void {
    const index = this.hand.indexOf(card);
    if (index > -1) {
      this.hand.splice(index, 1);
    }

    // 선택된 카드였다면 해제
    if (this.selectedCard === card) {
      this.selectedCard = null;
    }
  }

  /**
   * 카드를 버린 카드 더미로 이동하는 애니메이션을 재생합니다.
   */
  public discardCardWithAnimation(card: Card, onComplete?: () => void): void {
    // 카드를 핸드 컨테이너에서 제거하고 월드 좌표로 변환
    const matrix = card.getWorldTransformMatrix();
    const worldX = matrix.tx;
    const worldY = matrix.ty;

    this.handContainer.remove(card);
    card.setPosition(worldX, worldY);

    // 버린 카드 더미 위치
    const discardPileContainer = this.uiManager.getDiscardPileContainer();
    const discardWorldPos = discardPileContainer.getWorldTransformMatrix();
    const targetX = discardWorldPos.tx;
    const targetY = discardWorldPos.ty;

    // 카드를 버린 카드 더미로 이동
    this.scene.tweens.add({
      targets: card,
      x: targetX,
      y: targetY,
      scaleX: 0.5,
      scaleY: 0.5,
      alpha: 0.7,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        card.destroy();
        if (onComplete) {
          onComplete();
        }
      }
    });

    // 버린 카드 더미 애니메이션
    this.uiManager.animateDiscardPile();
  }

  /**
   * 모든 카드를 버립니다.
   */
  public discardAllCards(onCardDiscarded?: (card: Card, index: number) => void, onComplete?: () => void): void {
    const cardsToDiscard = [...this.hand];
    this.hand = [];

    // DeckManager를 사용하여 모든 카드를 버린 카드 더미에 추가
    const cardsDataToDiscard = cardsToDiscard.map(card => {
      const cardData: any = (card as any).cardData;
      return cardData.rawData;
    });
    this.deckManager.discardCards(cardsDataToDiscard);

    cardsToDiscard.forEach((card, index) => {
      // 순차적으로 카드 버리기
      this.scene.time.delayedCall(index * 100, () => {
        this.discardCardWithAnimation(card);
        if (onCardDiscarded) {
          onCardDiscarded(card, index);
        }
      });
    });

    // 모든 카드가 버려진 후 콜백 호출
    const totalDelay = cardsToDiscard.length * 100 + 400;
    this.scene.time.delayedCall(totalDelay, () => {
      if (onComplete) {
        onComplete();
      }
    });

    // 선택 해제
    this.selectedCard = null;
  }

  /**
   * 선택된 카드를 반환합니다.
   */
  public getSelectedCard(): Card | null {
    return this.selectedCard;
  }

  /**
   * 핸드의 카드 목록을 반환합니다.
   */
  public getHand(): readonly Card[] {
    return [...this.hand];
  }

  /**
   * 핸드의 카드 수를 반환합니다.
   */
  public getHandSize(): number {
    return this.hand.length;
  }

  /**
   * 핸드를 초기화합니다.
   */
  public clearHand(): void {
    this.hand.forEach(card => card.destroy());
    this.hand = [];
    this.selectedCard = null;
  }

  /**
   * 핸드 컨테이너를 반환합니다.
   */
  public getHandContainer(): Phaser.GameObjects.Container {
    return this.handContainer;
  }
}

