import Phaser from 'phaser';
import Card from '../objects/Card';
import DeckManager from './DeckManager';
import BattleUIManager from './BattleUIManager';
import SoundManager from './SoundManager';
import { CardData } from '../../../types';

/**
 * 카드 핸드를 관리하는 클래스
 * 카드 드로우, 배치, 버리기, 선택 등을 관리합니다.
 */
export default class CardHandManager {
  private scene: Phaser.Scene;
  private deckManager: DeckManager;
  private uiManager: BattleUIManager;
  private soundManager?: SoundManager;
  private hand: Card[] = [];
  private selectedCard: Card | null = null;
  private handContainer!: Phaser.GameObjects.Container;
  private setEndTurnAllowed?: (allowed: boolean) => void;

  constructor(
    scene: Phaser.Scene,
    deckManager: DeckManager,
    uiManager: BattleUIManager,
    soundManager?: SoundManager,
    setEndTurnAllowed?: (allowed: boolean) => void
  ) {
    this.scene = scene;
    this.deckManager = deckManager;
    this.uiManager = uiManager;
    this.soundManager = soundManager;
    this.setEndTurnAllowed = setEndTurnAllowed;

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
    // 드로우 시작 - 턴 종료 불가 및 버튼 비활성화
    if (this.setEndTurnAllowed) {
      this.setEndTurnAllowed(false);
    }
    this.uiManager.setEndTurnButtonEnabled(false);

    this.drawCardsRecursive(count, 0, onComplete);
  }

  /**
   * 재귀적으로 카드를 드로우합니다. (리셔플 연출 포함)
   */
  private drawCardsRecursive(totalCount: number, drawnCount: number, onComplete?: () => void): void {
    if (drawnCount >= totalCount) {
      // 모든 카드 드로우 완료
      if (this.setEndTurnAllowed) {
        this.setEndTurnAllowed(true);
      }
      this.uiManager.setEndTurnButtonEnabled(true);

      if (onComplete) {
        onComplete();
      }
      return;
    }

    // 현재 드로우 가능한 카드 수 확인
    const remainingToDraw = totalCount - drawnCount;
    const availableInDeck = this.deckManager.getDeckSize();
    const canDrawNow = Math.min(remainingToDraw, availableInDeck);

    // 현재 배치에서 드로우할 카드들
    const cardsToDrawData: CardData[] = [];
    for (let i = 0; i < canDrawNow; i++) {
      const cardData = this.deckManager.drawCardWithoutReshuffle();
      if (cardData) {
        cardsToDrawData.push(cardData);
      }
    }

    const currentHandSize = this.hand.length;
    const cardsDrawn = cardsToDrawData.length;
    const finalHandSize = currentHandSize + cardsDrawn;

    // 드로우할 카드가 없고 리셔플도 불가능하면 즉시 종료
    if (cardsDrawn === 0 && !this.deckManager.needsReshuffle()) {
      // 드로우 가능한 카드가 더 이상 없음
      if (this.setEndTurnAllowed) {
        this.setEndTurnAllowed(true);
      }
      this.uiManager.setEndTurnButtonEnabled(true);

      if (onComplete) {
        onComplete();
      }
      return;
    }

    // 기존 카드들을 finalHandSize 기준으로 재배치
    if (currentHandSize > 0 && cardsDrawn > 0) {
      this.rearrangeExistingCards(finalHandSize);
    }

    // 순차적으로 카드 추가 애니메이션
    cardsToDrawData.forEach((cardData, index) => {
      this.scene.time.delayedCall(index * 150, () => {
        this.addCardToHandWithAnimation(cardData, currentHandSize + index, finalHandSize);
        // 카드 드로우 사운드 재생
        if (this.soundManager) {
          this.soundManager.playCardDraw();
        }
      });
    });

    // 이번 배치의 카드 드로우가 끝난 후
    const batchDuration = cardsDrawn * 150 + 500;

    this.scene.time.delayedCall(batchDuration, () => {
      const newDrawnCount = drawnCount + cardsDrawn;

      // 아직 더 드로우해야 하는데 덱이 비었다면 리셔플
      if (newDrawnCount < totalCount && this.deckManager.needsReshuffle()) {
        // 리셔플 연출
        this.playReshuffleAnimation(() => {
          this.deckManager.reshuffleDiscardIntoDeck();
          // 리셔플 후 나머지 카드 드로우
          this.drawCardsRecursive(totalCount, newDrawnCount, onComplete);
        });
      } else {
        // 더 드로우할 카드가 있으면 계속, 없으면 종료
        this.drawCardsRecursive(totalCount, newDrawnCount, onComplete);
      }
    });
  }

  /**
   * 리셔플 애니메이션을 재생합니다.
   */
  private playReshuffleAnimation(onComplete: () => void): void {
    // 버린 카드 더미에서 덱으로 카드가 이동하는 연출
    const discardPileContainer = this.uiManager.getDiscardPileContainer();
    const deckPileContainer = this.uiManager.getDeckPileContainer();

    const discardWorldPos = discardPileContainer.getWorldTransformMatrix();
    const deckWorldPos = deckPileContainer.getWorldTransformMatrix();

    // 버린 카드 더미의 카드 수 가져오기
    const discardPileSize = this.deckManager.getDiscardPileSize();
    const cardsToShow = Math.min(discardPileSize, 10); // 최대 10장까지만 연출

    const tempCards: Phaser.GameObjects.Rectangle[] = [];

    // 버린 카드 더미 애니메이션
    this.uiManager.animateDiscardPile();

    // 여러 장의 카드를 시간차를 두고 이동
    for (let i = 0; i < cardsToShow; i++) {
      this.scene.time.delayedCall(i * 50, () => {
        // 임시 카드 이미지 생성 (연출용)
        const tempCard = this.scene.add.rectangle(
          discardWorldPos.tx,
          discardWorldPos.ty,
          100,
          140,
          0x6366f1,
          0.8
        );
        tempCard.setDepth(1000 + i);
        tempCards.push(tempCard);

        // 카드가 버린 더미에서 덱으로 이동
        this.scene.tweens.add({
          targets: tempCard,
          x: deckWorldPos.tx,
          y: deckWorldPos.ty,
          scaleX: 0.8,
          scaleY: 0.8,
          duration: 400,
          ease: 'Power2',
          onComplete: () => {
            tempCard.destroy();

            // 마지막 카드일 때만 추가 처리
            if (i === cardsToShow - 1) {
              // 덱 파일 애니메이션
              this.uiManager.animateDeckPile();

              // 리셔플 사운드 재생 (있다면)
              if (this.soundManager) {
                this.soundManager.playCardDraw();
              }

              // 약간의 딜레이 후 콜백
              this.scene.time.delayedCall(200, onComplete);
            }
          }
        });

        // 카드 이동 사운드 (첫 번째와 중간중간만)
        if (i % 3 === 0 && this.soundManager) {
          this.soundManager.playCardDraw();
        }
      });
    }
  }

  /**
   * 애니메이션과 함께 카드를 핸드에 추가합니다.
   */
  private addCardToHandWithAnimation(cardData: CardData, cardIndex: number, finalHandSize: number): void {
    // 덱 위치에서 카드 생성
    const deckPileContainer = this.uiManager.getDeckPileContainer();
    const deckWorldPos = deckPileContainer.getWorldTransformMatrix();
    const startX = deckWorldPos.tx;
    const startY = deckWorldPos.ty;

    const card = new Card(this.scene, startX, startY, cardData);
    card.setScale(0.8);

    // 드로우 애니메이션 중에는 인터랙션 비활성화
    card.disableInteraction();

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

        // 애니메이션 완료 후 인터랙션 활성화
        card.enableInteraction();
      }
    });
  }

  /**
   * 기존 카드들을 새로운 finalHandSize 기준으로 재배치합니다.
   */
  private rearrangeExistingCards(finalHandSize: number): void {
    const spacing = 150;
    const totalWidth = (finalHandSize - 1) * spacing;
    const startX = -totalWidth / 2;

    this.hand.forEach((card, index) => {
      const targetX = startX + (index * spacing);
      const targetY = 0;

      this.scene.tweens.add({
        targets: card,
        x: targetX,
        y: targetY,
        duration: 300,
        ease: 'Power2'
      });

      (card as any).originalY = targetY;
    });
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
    // 같은 카드를 다시 선택하는 경우는 소리 재생 안 함
    const isDifferentCard = this.selectedCard !== card;

    // 이전에 선택된 카드 해제
    if (this.selectedCard && this.selectedCard !== card) {
      this.selectedCard.deselect();
    }

    // 카드 선택
    this.selectedCard = card;
    card.select();

    // 새로운 카드를 선택할 때만 소리 재생
    if (isDifferentCard && this.soundManager) {
      this.soundManager.playCardClick();
    }
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
      return (card as any).cardData as CardData;
    });
    this.deckManager.discardCards(cardsDataToDiscard);

    // 카드 버리기 시작 - 턴 종료 불가 및 버튼 비활성화
    // (이미 endPlayerTurn에서 canEndTurn을 false로 설정했으므로 중복이지만 명시적으로 표시)
    if (this.setEndTurnAllowed) {
      this.setEndTurnAllowed(false);
    }
    this.uiManager.setEndTurnButtonEnabled(false);

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
      // 카드 버리기 완료
      // (적 턴으로 넘어가므로 turnController에서 관리)
      this.uiManager.setEndTurnButtonEnabled(true);

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

