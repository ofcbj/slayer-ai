import Phaser from 'phaser';
import Card from '../objects/Card';
import Enemy from '../objects/Enemy';
import Player from '../objects/Player';
import BattleManager, { NormalizedCardData } from './BattleManager';
import CardHandManager from './CardHandManager';
import DeckManager from './DeckManager';
import BattleUIManager from './BattleUIManager';
import SoundManager from './SoundManager';


/**
 * 전투 이벤트를 처리하는 클래스
 * 카드 클릭, 적 클릭, 카드 사용 등을 처리합니다.
 */
export default class BattleEventManager {
  private scene           : Phaser.Scene;
  private battleManager   : BattleManager;
  private cardHandManager : CardHandManager;
  private deckManager     : DeckManager;
  private uiManager       : BattleUIManager;
  private playerCharacter : Player;
  private soundManager?   : SoundManager;
  private onDeckInfoUpdate?: () => void;

  constructor(
    scene           : Phaser.Scene,
    battleManager   : BattleManager,
    cardHandManager : CardHandManager,
    deckManager     : DeckManager,
    uiManager       : BattleUIManager,
    playerCharacter : Player,
    onDeckInfoUpdate?: () => void,
    soundManager?   : SoundManager
  ) {
    this.scene            = scene;
    this.battleManager    = battleManager;
    this.cardHandManager  = cardHandManager;
    this.deckManager      = deckManager;
    this.uiManager        = uiManager;
    this.playerCharacter  = playerCharacter;
    this.onDeckInfoUpdate = onDeckInfoUpdate;
    this.soundManager     = soundManager;
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

    const currentSelected = this.cardHandManager.getSelectedCard();

    // rawData에서 원본 type 확인 (언어 독립적)
    const isAttackCard = cardData.rawData.type === 'attack';
    const needsTarget = isAttackCard && !cardData.allEnemies;

    // 공격 카드이고 타겟이 필요한 경우
    if (needsTarget) {
      // 이미 같은 카드가 선택되어 있으면 선택 해제
      if (currentSelected === card) {
        this.cardHandManager.deselectCard();
        return;
      }
      // 다른 카드를 선택
      this.cardHandManager.selectCard(card);
      this.uiManager.showMessage('Select a target');
    } else {
      // 방어, 치유, 전체 공격 등은 즉시 사용
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
    // rawData에서 원본 type 확인 (언어 독립적)
    if (cardData.rawData.type !== 'attack') return;

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

    // rawData에서 원본 type 확인 (언어 독립적)
    const rawType = cardData.rawData.type;

    // 공격 카드이고 타겟이 필요한데 타겟이 없으면 사용 불가
    if (rawType === 'attack' && !cardData.allEnemies && !target) {
      this.uiManager.showMessage('Select a target');
      return;
    }

    // BattleManager를 사용하여 카드 사용 (BattleManager가 내부 enemies 배열을 직접 사용)
    const success = this.battleManager.useCard(cardData, target);

    if (!success) {
      this.uiManager.showMessage('Not enough energy!');
      return;
    }

    // 애니메이션 처리
    let shouldDiscardWithAnimation = true; // discardCardWithAnimation을 호출할지 여부
    
    if (rawType === 'attack') {
      // 공격 사운드 재생
      const isHeavy = cardData.value >= 10;
      if (this.soundManager) {
        this.soundManager.playAttack(isHeavy);
      }

      if (cardData.allEnemies) {
        card.playEffect(this.scene.cameras.main.width / 2, 250);
        // playEffect가 카드를 destroy하므로 discardCardWithAnimation 호출하지 않음
        shouldDiscardWithAnimation = false;
      } else if (target) {
        card.playEffect(target.x, target.y);
        // playEffect가 카드를 destroy하므로 discardCardWithAnimation 호출하지 않음
        shouldDiscardWithAnimation = false;
      }
    } else if (cardData.rawData.block) {
      // 방어 카드 (block 속성으로 판단)
      // 방어 사운드 재생
      if (this.soundManager) {
        this.soundManager.playDefend();
      }

      // 플레이어 캐릭터 방어 애니메이션
      this.playerCharacter.playDefendAnimation();
      // playEffect를 호출하지 않고 discardCardWithAnimation만 사용
    } else if (cardData.rawData.heal) {
      // 치유 카드 (heal 속성으로 판단)
      // 플레이어 캐릭터 치유 애니메이션
      this.playerCharacter.playHealAnimation();
      // playEffect를 호출하지 않고 discardCardWithAnimation만 사용
    } else if (cardData.rawData.energy) {
      // 에너지 카드 (rawData의 energy 속성으로 판단)
      // playEffect를 호출하지 않고 discardCardWithAnimation만 사용
    }

    // 카드 사용 사운드 재생
    if (this.soundManager) {
      this.soundManager.playCardPlay();
    }

    // 핸드에서 제거
    this.cardHandManager.removeCardFromHand(card);
    // DeckManager를 사용하여 버린 카드 더미에 추가
    this.deckManager.discardCard(cardData.rawData);
    
    // 카드를 버린 카드 더미로 이동 애니메이션 (playEffect를 사용하지 않은 경우만)
    if (shouldDiscardWithAnimation) {
      this.cardHandManager.discardCardWithAnimation(card);
    }
    
    // 핸드 재배치
    this.cardHandManager.arrangeHand();
    // 덱 정보 업데이트
    if (this.onDeckInfoUpdate) {
      this.onDeckInfoUpdate();
    }
  }
}

