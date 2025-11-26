import Phaser from 'phaser';

import Card             from '../objects/Card';
import DeckManager      from './DeckManager';
import BattleUIManager  from './BattleUIManager';
import SoundManager     from './SoundManager';
import UIConfigManager  from './UIConfigManager';
import { tweenConfig }  from './TweenConfigManager';
import { CardData }     from '../../../types';

/**
 * 카드 핸드를 관리하는 클래스
 * 카드 드로우, 배치, 버리기, 선택 등을 관리합니다.
 */
export default class CardHandManager {
  private scene             : Phaser.Scene;
  private deckManager       : DeckManager;
  private uiManager         : BattleUIManager;
  private soundManager?     : SoundManager;
  private hand              : Card[] = [];
  private selectedCard      : Card | null = null;
  private handContainer!    : Phaser.GameObjects.Container;
  private setEndTurnAllowed?: (allowed: boolean) => void;

  constructor(
    scene         : Phaser.Scene,
    deckManager   : DeckManager,
    uiManager     : BattleUIManager,
    soundManager? : SoundManager,
    setEndTurnAllowed?: (allowed: boolean) => void
  ) {
    this.scene        = scene;
    this.deckManager  = deckManager;
    this.uiManager    = uiManager;
    this.soundManager = soundManager;
    this.setEndTurnAllowed = setEndTurnAllowed;

    this.initializeHandContainer();
    this.registerEventListeners();
  }
  
  /**
   * 이벤트 리스너를 등록합니다.
   */
  private registerEventListeners(): void {
    this.scene.events.on('cardHoverOut', this.onCardHoverOut, this);
  }
  
  /**
   * 카드 호버 해제 이벤트 핸들러
   */
  private onCardHoverOut = (card: Card): void => {
    // 호버 해제 시 컨테이너 내부 순서 재정렬
    this.reorderContainerAfterHoverOut(card);
  };
  
  /**
   * 카드 호버 해제 후 컨테이너 내부 순서를 재정렬합니다.
   */
  private reorderContainerAfterHoverOut(hoveredCard: Card): void {
    if (!this.handContainer) return;
    
    const targetIndex = (hoveredCard as any).originalDepth;
    const currentIndex = this.handContainer.list.indexOf(hoveredCard);
    
    if (currentIndex === -1 || currentIndex === targetIndex) {
      return;
    }
    
    // 모든 카드를 제거하고 올바른 순서로 다시 추가
    const cards = [...this.handContainer.list] as Card[];
    const savedPositions = cards.map(card => ({ card, x: card.x, y: card.y }));
    
    // 모든 카드 제거
    cards.forEach(card => this.handContainer.remove(card, false));
    
    // 올바른 순서로 다시 추가 (originalDepth 순서대로)
    savedPositions.sort((a, b) => {
      const aIndex = (a.card as any).originalDepth ?? 0;
      const bIndex = (b.card as any).originalDepth ?? 0;
      return aIndex - bIndex;
    });
    
    savedPositions.forEach(({ card, x, y }) => {
      this.handContainer.add(card);
      card.setPosition(x, y);
    });
  }

  public initializeHandContainer(): void {
    const uiConfig = UIConfigManager.getInstance();
    const pos = uiConfig.getHandContainerPosition(this.scene.cameras.main);

    // 핸드 영역 (20px 위로 올림)
    this.handContainer = this.scene.add.container(pos.x, pos.y);
  }

  public drawCards(count: number, onComplete?: () => void): void {
    // 드로우 시작 - 턴 종료 불가 및 버튼 비활성화
    if (this.setEndTurnAllowed) {
      this.setEndTurnAllowed(false);
    }
    this.uiManager.setEndTurnButtonEnabled(false);

    this.drawCardsRecursive(count, 0, onComplete);
  }

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
    const canDrawNow      = Math.min(remainingToDraw, availableInDeck);

    // 현재 배치에서 드로우할 카드들
    const cardsToDrawData: CardData[] = [];
    for (let i = 0; i < canDrawNow; i++) {
      const cardData = this.deckManager.drawCardWithoutReshuffle();
      if (cardData) {
        cardsToDrawData.push(cardData);
      }
    }

    const currentHandSize = this.hand.length;
    const cardsDrawn      = cardsToDrawData.length;
    const finalHandSize   = currentHandSize + cardsDrawn;

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
          this.soundManager.play('card-draw', 0.7);
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
    const deckPileContainer    = this.uiManager.getDeckPileContainer();
    const discardWorldPos      = discardPileContainer.getWorldTransformMatrix();
    const deckWorldPos         = deckPileContainer.getWorldTransformMatrix();
    // 버린 카드 더미의 카드 수 가져오기
    const discardPileSize      = this.deckManager.getDiscardPileSize();
    const cardsToShow          = Math.min(discardPileSize, 10); // 최대 10장까지만 연출

    // 버린 카드 더미 애니메이션
    this.uiManager.animateDiscardPile();

    // 여러 장의 카드를 시간차를 두고 이동
    for (let i = 0; i < cardsToShow; i++) {
      this.scene.time.delayedCall(i * 50, () => {
        // 임시 카드 이미지 생성 (연출용)
        const uiConfig = UIConfigManager.getInstance();
        const reshuffleConfig = uiConfig.getCardReshuffleConfig();
        const tempCard = this.scene.add.rectangle(
          discardWorldPos.tx, discardWorldPos.ty,
          reshuffleConfig.tempCardWidth, reshuffleConfig.tempCardHeight,
          uiConfig.getColor('RESHUFFLE_TEMP_CARD'), 0.8
        );
        tempCard.setDepth(1000 + i);

        // 카드가 버린 더미에서 덱으로 이동
        tweenConfig.apply(this.scene, 'cards.reshuffle', tempCard, {
          x: deckWorldPos.tx,
          y: deckWorldPos.ty,
          onComplete: () => {
            tempCard.destroy();

            // 마지막 카드일 때만 추가 처리
            if (i === cardsToShow - 1) {
              // 덱 파일 애니메이션
              this.uiManager.animateDeckPile();
              // 리셔플 사운드 재생 (있다면)
              if (this.soundManager) {
                this.soundManager.play('card-draw', 0.7);
              }
              // 약간의 딜레이 후 콜백
              this.scene.time.delayedCall(200, onComplete);
            }
          }
        });

        // 카드 이동 사운드 (첫 번째와 중간중간만)
        if (i % 3 === 0 && this.soundManager) {
          this.soundManager.play('card-draw', 0.7);
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
    const deckWorldPos      = deckPileContainer.getWorldTransformMatrix();
    const startX            = deckWorldPos.tx;
    const startY            = deckWorldPos.ty;
    const card              = new Card(this.scene, startX, startY, cardData);
    card.setScale(0.8);

    // 드로우 애니메이션 중에는 인터랙션 비활성화
    card.disableInteraction();

    this.hand.push(card);
    this.scene.add.existing(card);

    // 덱 파일 애니메이션
    this.uiManager.animateDeckPile();

    // 최종 위치 계산 (모든 카드가 드로우된 후의 핸드 배치 기준)
    const uiConfig = UIConfigManager.getInstance();
    const spacing = uiConfig.getHandCardConfig().spacing;
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

    tweenConfig.apply(this.scene, 'cards.draw', card, {
      x: targetX,
      y: targetY,
      onComplete: () => {
        // 카드를 핸드 컨테이너로 이동
        this.handContainer.add(card);
        // 핸드 컨테이너 내에서의 로컬 좌표 설정
        card.setPosition(finalLocalX, 0);
        (card as any).originalY = 0;
        // 카드의 depth를 index 기반으로 설정 (왼쪽부터 오른쪽으로 쌓임)
        card.setDepth(cardIndex);
        // 원래 depth도 함께 설정 (호버 해제 시 복원용)
        card.setOriginalDepth(cardIndex);
        // 핸드 컨테이너 참조 설정 (호버 시 컨테이너에서 제거하기 위해 필요)
        card.setHandContainer(this.handContainer);

        // 애니메이션 완료 후 인터랙션 활성화
        card.enableInteraction();
        // 단축키 인덱스 설정
        card.setHotkeyIndex(cardIndex);
      }
    });
  }

  /**
   * 기존 카드들을 새로운 finalHandSize 기준으로 재배치합니다.
   */
  private rearrangeExistingCards(finalHandSize: number): void {
    const uiConfig = UIConfigManager.getInstance();
    const spacing = uiConfig.getHandCardConfig().spacing;
    const totalWidth = (finalHandSize - 1) * spacing;
    const startX = -totalWidth / 2;

    this.hand.forEach((card, index) => {
      const targetX = startX + (index * spacing);
      const targetY = 0;

      tweenConfig.apply(this.scene, 'cards.rearrange', card, {
        x: targetX,
        y: targetY
      });

      (card as any).originalY = targetY;
      // 카드의 depth를 index 기반으로 재설정
      card.setDepth(index);
      // 원래 depth도 함께 설정 (호버 해제 시 복원용)
      card.setOriginalDepth(index);
      // 단축키 인덱스 업데이트
      card.setHotkeyIndex(index);
    });
  }

  public arrangeHand(): void {
    const cardCount = this.hand.length;
    const uiConfig = UIConfigManager.getInstance();
    const spacing = uiConfig.getHandCardConfig().spacing;
    const totalWidth = (cardCount - 1) * spacing;
    const startX = -totalWidth / 2;

    this.hand.forEach((card, index) => {
      const targetX = startX + (index * spacing);
      const targetY = 0;

      tweenConfig.apply(this.scene, 'cards.arrange', card, {
        x: targetX, y: targetY
      });

      (card as any).originalY = targetY;
      // 카드의 depth를 index 기반으로 설정
      card.setDepth(index);
      // 원래 depth도 함께 설정 (호버 해제 시 복원용)
      card.setOriginalDepth(index);
      // 단축키 인덱스 설정
      card.setHotkeyIndex(index);
    });
  }

  public selectCard(card: Card): void {
    // 같은 카드를 다시 선택하는 경우는 소리 재생 안 함
    const isDifferentCard = this.selectedCard !== card;

    // 이전에 선택된 카드 해제
    if (this.selectedCard && this.selectedCard !== card) {
      this.selectedCard.deselect();
      // 선택 해제 후 컨테이너 내부 순서 재정렬
      this.reorderContainerAfterDeselect(this.selectedCard);
    }

    // 카드 선택
    this.selectedCard = card;
    card.select();

    // 새로운 카드를 선택할 때만 소리 재생
    if (isDifferentCard && this.soundManager) {
      this.soundManager.play('card-click', 0.5);
    }
  }
  
  /**
   * 카드 선택 해제 후 컨테이너 내부 순서를 재정렬합니다.
   * Phaser 컨테이너는 list 배열의 순서로 렌더링되므로, 올바른 순서로 재정렬해야 합니다.
   */
  private reorderContainerAfterDeselect(deselectedCard: Card): void {
    if (!this.handContainer) return;
    
    const targetIndex = (deselectedCard as any).selectedOriginalDepth;
    const currentIndex = this.handContainer.list.indexOf(deselectedCard);
    
    if (currentIndex === -1 || currentIndex === targetIndex) {
      return;
    }
    
    // 모든 카드를 제거하고 올바른 순서로 다시 추가
    const cards = [...this.handContainer.list] as Card[];
    const savedPositions = cards.map(card => ({ card, x: card.x, y: card.y }));
    
    // 모든 카드 제거
    cards.forEach(card => this.handContainer.remove(card, false));
    
    // 올바른 순서로 다시 추가 (원래 인덱스 순서대로)
    savedPositions.sort((a, b) => {
      const aIndex = (a.card as any).selectedOriginalDepth ?? (a.card as any).originalDepth ?? 0;
      const bIndex = (b.card as any).selectedOriginalDepth ?? (b.card as any).originalDepth ?? 0;
      return aIndex - bIndex;
    });
    
    savedPositions.forEach(({ card, x, y }) => {
      this.handContainer.add(card);
      card.setPosition(x, y);
    });
  }

  public deselectCard(): void {
    if (this.selectedCard) {
      const card = this.selectedCard;
      card.deselect();
      // 선택 해제 후 컨테이너 내부 순서 재정렬
      this.reorderContainerAfterDeselect(card);
      this.selectedCard = null;
    }
  }

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
    tweenConfig.apply(this.scene, 'cards.discard', card, {
      x: targetX,
      y: targetY,
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

  public getSelectedCard(): Card | null {
    return this.selectedCard;
  }

  public getHand(): readonly Card[] {
    return [...this.hand];
  }

  public getHandSize(): number {
    return this.hand.length;
  }

  public clearHand(): void {
    this.hand.forEach(card => card.destroy());
    this.hand = [];
    this.selectedCard = null;
  }

  public getHandContainer(): Phaser.GameObjects.Container {
    return this.handContainer;
  }
}

