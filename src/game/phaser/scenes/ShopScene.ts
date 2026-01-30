import { textStyle } from '../managers/TextStyleManager';
import { tweenConfig } from '../managers/TweenConfigManager';
import Card from '../objects/Card';
import { CardData, GameState } from '../../../types';
import BaseScene from './BaseScene';
import ConfirmDialog from '../components/ConfirmDialog';
import ShopGoldManager from '../managers/ShopGoldManager';
import ShopCardDisplayManager from '../managers/ShopCardDisplayManager';

/**
 * 상점 씬
 * 
 * 주요 기능:
 * - 카드 구매/삭제
 * - 골드 관리
 * - UI 표시 및 상호작용
 */
export default class ShopScene extends BaseScene {
  private goldManager!: ShopGoldManager;
  private cardDisplayManager!: ShopCardDisplayManager;

  constructor() {
    super({ key: 'ShopScene' });
  }

  // ============================================================
  // Lifecycle Methods
  // ============================================================

  create(): void {
    this.initializeBase();

    const { width, height } = this.getCameraDimensions();

    // 배경
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
    graphics.fillRect(0, 0, width, height);

    // 타이틀
    this.add.text(
      width/2, 60,
      this.langManager.t('shop.title') || '상점',
      textStyle.getStyle('titles.section', { fontSize: '56px' })
    ).setOrigin(0.5);

    // 게임 상태 로드 및 초기화
    const gameState: GameState = this.registry.get('gameState');
    if (gameState.player.gold === undefined) {
      gameState.player.gold = 100;
    }
    if (gameState.removalCost === undefined) {
      gameState.removalCost = 50;
    }

    // 매니저 초기화
    this.goldManager = new ShopGoldManager(this);
    this.goldManager.createDisplay(gameState.player.gold);

    this.cardDisplayManager = new ShopCardDisplayManager(this);
    this.cardDisplayManager.initialize(
      (cardData, card, priceContainer) => this.purchaseCard(cardData, card, priceContainer),
      () => this.handleRemoveCard()
    );

    this.initializeCardViewManager();
    this.createMyDeckButton(() => gameState.deck);
    this.createExitButton();
  }

  // ============================================================
  // Shop Operations - Purchase
  // ============================================================

  private purchaseCard(
    cardData: CardData & { price: number },
    card: Card,
    priceContainer: Phaser.GameObjects.Container
  ): void {
    const gameState = this.getGameState();

    // 골드가 충분한지 확인
    if ((gameState.player.gold ?? 0) < cardData.price) {
      this.showMessage(this.langManager.t('shop.notEnoughGold'), { color: 0xef4444 });
      this.tweens.add({
        targets: [card, priceContainer],
        x: '-=10',
        duration: 50,
        yoyo: true,
        repeat: 3
      });
      return;
    }

    // 골드 차감
    this.goldManager.consumeGold(cardData.price);

    // 덱에 카드 추가
    gameState.deck.push({
      ...cardData,
      price: undefined
    } as any);

    // 구매 성공 메시지
    this.showMessage(`${cardData.name} ${this.langManager.t('shop.purchased')}`, { color: 0x22c55e });

    // 카드 제거 애니메이션
    tweenConfig.apply(this, 'shop.cardPurchase', [card, priceContainer], {
      onComplete: () => {
        card.destroy();
        priceContainer.destroy();
      }
    });

    // 상점 카드 배열에서 제거
    this.cardDisplayManager.removeCard(cardData.id);
  }

  // ============================================================
  // Shop Operations - Card Removal
  // ============================================================

  private handleRemoveCard(): void {
    const gameState = this.getGameState();
    const cost = gameState.removalCost || 50;

    // 골드가 충분한지 확인
    if ((gameState.player.gold ?? 0) < cost) {
      this.showMessage(this.langManager.t('shop.notEnoughGold'), { color: 0xef4444 });
      return;
    }

    // 덱이 비어있는지 확인
    if (gameState.deck.length === 0) {
      this.showMessage(this.langManager.t('shop.deckEmpty'), { color: 0xef4444 });
      return;
    }

    // 카드 선택 모드로 CardViewManager 열기
    if (this.cardViewManager) {
      this.cardViewManager.showCardListView(
        this.langManager.t('shop.selectCardToRemove'),
        gameState.deck,
        {
          selectable: true,
          onSelect: (selectedCard: CardData, closeCardView: () => void) => {
            this.showConfirmDialog(selectedCard, closeCardView);
          }
        }
      );
    }
  }

  private showConfirmDialog(card: CardData, closeCardView: () => void): void {
    const dialog = new ConfirmDialog(this);
    
    dialog.show({
      message: this.langManager.t('shop.confirmRemove').replace('{cardName}', card.name),
      subMessage: `${this.langManager.t('shop.removeCost')}: ${this.getGameState().removalCost || 50}G`,
      confirmLabel: this.langManager.t('shop.confirm'),
      cancelLabel: this.langManager.t('shop.cancel'),
      onConfirm: () => {
        this.executeRemoveCard(card);
        closeCardView();
      }
    });
  }

  private executeRemoveCard(card: CardData): void {
    const gameState = this.getGameState();
    const cost = gameState.removalCost || 50;

    // 골드 차감
    this.goldManager.consumeGold(cost);

    // 삭제 비용 증가
    gameState.removalCost = cost + 25;

    // 상점에 있는 삭제 카드의 가격 업데이트
    this.cardDisplayManager.updateRemovalCardPrice(gameState.removalCost);

    // 덱에서 카드 제거
    const cardIndex = gameState.deck.findIndex(c => c.id === card.id);
    if (cardIndex !== -1) {
      gameState.deck.splice(cardIndex, 1);
      this.showMessage(
        this.langManager.t('shop.cardRemoved').replace('{cardName}', card.name),
        { color: 0x22c55e }
      );
    }
  }

  // ============================================================
  // UI Creation - Exit Button
  // ============================================================

  private createExitButton(): void {
    const { width, height } = this.getCameraDimensions();

    const exitContainer = this.add.container(width/2, height-80);

    const exitBg = this.add.rectangle(0, 0, 200, 60, 0x8b5cf6, 0.9);
    exitBg.setStrokeStyle(3, 0x7c3aed);

    const exitText = this.add.text(
      0, 0,
      this.langManager.t('shop.exit') || '나가기',
      textStyle.getStyle('character.name', { fontSize: '24px' })
    ).setOrigin(0.5);

    exitContainer.add([exitBg, exitText]);

    exitBg.setInteractive({ useHandCursor: true });

    exitBg.on('pointerover', () => {
      exitBg.setFillStyle(0x7c3aed);
      tweenConfig.apply(this, 'shop.buttonHover', exitContainer);
    });

    exitBg.on('pointerout', () => {
      exitBg.setFillStyle(0x8b5cf6);
      tweenConfig.apply(this, 'shop.buttonHoverOut', exitContainer);
    });

    exitBg.on('pointerdown', () => {
      // 스테이지 클리어 처리
      const gameState = this.getGameState();
      const selectedStage = this.registry.get('selectedStage');

      if (selectedStage) {
        gameState.stagesCleared.push(selectedStage.id);
      }

      this.scene.start('StageSelectScene');
    });
  }
}
