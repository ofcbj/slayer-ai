import Phaser from 'phaser';
import Card from '../objects/Card';
import Enemy from '../objects/Enemy';
import Player from '../objects/Player';
import BattleManager, { NormalizedCardData } from './BattleManager';
import CardHandManager from './CardHandManager';
import DeckManager from './DeckManager';
import BattleUIManager from './BattleUIManager';


/**
 * 전투 이벤트를 처리하는 클래스
 * 카드 클릭, 적 클릭, 카드 사용 등을 처리합니다.
 */
export default class BattleEventManager {
  private scene: Phaser.Scene;
  private battleManager: BattleManager;
  private cardHandManager: CardHandManager;
  private deckManager: DeckManager;
  private uiManager: BattleUIManager;
  private playerCharacter: Player;
  private onDeckInfoUpdate?: () => void;

  constructor(
    scene: Phaser.Scene,
    battleManager: BattleManager,
    cardHandManager: CardHandManager,
    deckManager: DeckManager,
    uiManager: BattleUIManager,
    playerCharacter: Player,
    onDeckInfoUpdate?: () => void
  ) {
    this.scene = scene;
    this.battleManager = battleManager;
    this.cardHandManager = cardHandManager;
    this.deckManager = deckManager;
    this.uiManager = uiManager;
    this.playerCharacter = playerCharacter;
    this.onDeckInfoUpdate = onDeckInfoUpdate;
  }

  /**
   * 이벤트 리스너를 등록합니다.
   */
  public registerEventListeners(): void {
    this.unregisterEventListeners();
    this.scene.events.on('cardClicked', this.onCardClicked, this);
    this.scene.events.on('enemyClicked', this.onEnemyClicked, this);
    this.scene.events.on('enemyDefeated', this.onEnemyDefeated, this);
  }

  /**
   * 이벤트 리스너를 해제합니다.
   */
  public unregisterEventListeners(): void {
    this.scene.events.off('cardClicked', this.onCardClicked, this);
    this.scene.events.off('enemyClicked', this.onEnemyClicked, this);
    this.scene.events.off('enemyDefeated', this.onEnemyDefeated, this);
  }

  /**
   * 카드 클릭 이벤트를 처리합니다.
   */
  private onCardClicked = (card: Card): void => {
    if (this.battleManager.getTurn() !== 'player') return;

    const cardData: NormalizedCardData = (card as any).cardData;
    const playerState = this.battleManager.getPlayerState();

    // 에너지가 부족한 경우
    if (playerState.energy < cardData.cost) {
      this.uiManager.showMessage('Not enough energy!');
      return;
    }

    // 카드 선택
    this.cardHandManager.selectCard(card);

    // 공격 카드인 경우 적 선택 대기, 아니면 즉시 사용
    if (cardData.type === '공격' && !cardData.allEnemies) {
      this.uiManager.showMessage('Select a target');
    } else {
      // 자동 사용 (방어, 치유, 전체 공격 등)
      this.useCard(card);
    }
  };

  /**
   * 적 클릭 이벤트를 처리합니다.
   */
  private onEnemyClicked = (enemy: Enemy): void => {
    if (this.battleManager.getTurn() !== 'player') return;

    const selectedCard = this.cardHandManager.getSelectedCard();
    if (!selectedCard) return;

    const cardData: NormalizedCardData = (selectedCard as any).cardData;
    if (cardData.type !== '공격') return;

    this.useCard(selectedCard, enemy);
  };

  /**
   * 적 패배 이벤트를 처리합니다.
   */
  private onEnemyDefeated = (enemy: Enemy): void => {
    // BattleManager에서 처리 (콜백에서 checkBattleEnd 호출됨)
    this.battleManager.onEnemyDefeated(enemy);
  };

  /**
   * 카드를 사용합니다.
   */
  public useCard(card: Card, target: Enemy | null = null): void {
    const cardData: NormalizedCardData = (card as any).cardData;

    // BattleManager를 사용하여 카드 사용 (BattleManager가 내부 enemies 배열을 직접 사용)
    const success = this.battleManager.useCard(cardData, target);

    if (!success) {
      this.uiManager.showMessage('Not enough energy!');
      return;
    }

    // 애니메이션 처리
    if (cardData.type === '공격') {
      if (cardData.allEnemies) {
        card.playEffect(this.scene.cameras.main.width / 2, 250);
      } else if (target) {
        card.playEffect(target.x, target.y);
      }
    } else if (cardData.type === '방어') {
      // 플레이어 캐릭터 방어 애니메이션
      this.playerCharacter.playDefendAnimation();
      card.playEffect(this.playerCharacter.x, this.playerCharacter.y, undefined);
    } else if (cardData.type === '치유') {
      // 플레이어 캐릭터 치유 애니메이션
      this.playerCharacter.playHealAnimation();
      card.playEffect(this.playerCharacter.x, this.playerCharacter.y, undefined);
    } else if (cardData.type === '에너지') {
      card.playEffect(this.playerCharacter.x, this.playerCharacter.y, undefined);
    }

    // 핸드에서 제거
    this.cardHandManager.removeCardFromHand(card);

    // DeckManager를 사용하여 버린 카드 더미에 추가
    this.deckManager.discardCard(cardData.rawData);

    // 카드를 버린 카드 더미로 이동 애니메이션
    this.cardHandManager.discardCardWithAnimation(card);

    // 핸드 재배치
    this.cardHandManager.arrangeHand();

    // 덱 정보 업데이트
    if (this.onDeckInfoUpdate) {
      this.onDeckInfoUpdate();
    }
  }
}

