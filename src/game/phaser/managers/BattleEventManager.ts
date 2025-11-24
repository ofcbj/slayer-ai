import Phaser from 'phaser';
import Card from '../objects/Card';
import Enemy from '../objects/Enemy';
import Player from '../objects/Player';
import BattleManager from './BattleManager';
import CardHandManager from './CardHandManager';
import DeckManager from './DeckManager';
import BattleUIManager from './BattleUIManager';
import SoundManager from './SoundManager';
import { CardData } from '../../../types';


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
    this.scene.events.on('cardDeselected', this.onCardDeselected, this);
    this.scene.events.on('enemyClicked', this.onEnemyClicked, this);
    this.scene.events.on('enemyDefeated', this.onEnemyDefeated, this);
  }

  /**
   * 이벤트 리스너를 해제합니다.
   */
  public unregisterEventListeners(): void {
    this.scene.events.off('cardClicked', this.onCardClicked, this);
    this.scene.events.off('cardDeselected', this.onCardDeselected, this);
    this.scene.events.off('enemyClicked', this.onEnemyClicked, this);
    this.scene.events.off('enemyDefeated', this.onEnemyDefeated, this);
  }

  /**
   * 카드 클릭 이벤트를 처리합니다.
   */
  /**
   * 카드 선택/사용 처리 (클릭과 단축키 공통 로직)
   */
  private handleCardAction = (card: Card): void => {
    if (this.battleManager.getTurn() !== 'player') return;

    const cardData: CardData = (card as any).cardData;
    const playerState = this.battleManager.getPlayerState();

    // 에너지가 부족한 경우
    if (playerState.energy < cardData.cost) {
      this.uiManager.showMessage('Not enough energy!');
      return;
    }

    const currentSelected = this.cardHandManager.getSelectedCard();

    // type으로 원본 확인 (언어 독립적)
    const isAttackCard = cardData.type === 'attack';
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
      // 스킬 카드, 전체 공격 등: 선택 → 한 번 더 클릭하면 사용
      if (currentSelected === card) {
        // 이미 선택된 카드를 다시 클릭하면 사용
        this.useCard(card);
      } else {
        // 처음 클릭하면 선택만
        this.cardHandManager.selectCard(card);
        this.uiManager.showMessage('Click again to use');
      }
    }
  };

  /**
   * 카드 클릭 이벤트 핸들러 (마우스 클릭)
   */
  private onCardClicked = (card: Card): void => {
    this.handleCardAction(card);
  };

  /**
   * 카드 선택 해제 이벤트 핸들러 (마우스가 선택된 카드 영역을 벗어날 때)
   */
  private onCardDeselected = (card: Card): void => {
    // 선택된 카드가 맞는지 확인
    const currentSelected = this.cardHandManager.getSelectedCard();
    if (currentSelected === card) {
      this.cardHandManager.deselectCard();
    }
  };

  /**
   * 카드 단축키 처리 (숫자 키 1-5)
   */
  public handleCardShortcut(cardIndex: number): void {
    if (this.battleManager.getTurn() !== 'player') return;

    const hand = this.cardHandManager.getHand();
    if (cardIndex < 0 || cardIndex >= hand.length) return;

    const card = hand[cardIndex];
    if (!card) return;

    this.handleCardAction(card);
  }

  /**
   * 적 클릭 이벤트를 처리합니다.
   */
  private onEnemyClicked = (enemy: Enemy): void => {
    if (this.battleManager.getTurn() !== 'player') return;

    const selectedCard = this.cardHandManager.getSelectedCard();
    if (!selectedCard) return;

    const cardData: CardData = (selectedCard as any).cardData;
    // type 확인 (언어 독립적)
    if (cardData.type !== 'attack') return;

    this.useCard(selectedCard, enemy);
  };

  /**
   * 적 단축키 처리 (화살표 키)
   * keyIndex: 0 = 왼쪽 화살표, 1 = 아래 화살표, 2 = 오른쪽 화살표
   *
   * 최초 등장 시 위치를 기준으로 키 매핑:
   * - 1마리: 아래(1) → 0번째 위치
   * - 2마리: 왼쪽(0) → 0번째 위치, 오른쪽(2) → 1번째 위치
   * - 3마리: 왼쪽(0) → 0번째 위치, 아래(1) → 1번째 위치, 오른쪽(2) → 2번째 위치
   * 
   * 적이 죽어도 원래 위치 기준으로 단축키가 작동함
   */
  public handleEnemyShortcut(keyIndex: number): void {
    if (this.battleManager.getTurn() !== 'player') return;

    const selectedCard = this.cardHandManager.getSelectedCard();
    if (!selectedCard) return;

    // 모든 적을 원래 인덱스 순서로 가져옴 (죽은 적 포함)
    const allEnemies = this.battleManager.getAllEnemies();
    
    // 최초 등장 시 적의 수를 기준으로 키 매핑
    // (죽은 적도 포함하여 원래 위치를 유지)
    const originalEnemyCount = allEnemies.length;
    
    if (originalEnemyCount === 0) return;

    // 원래 적의 수에 따라 키를 원래 인덱스로 매핑
    let originalEnemyIndex: number;

    if (originalEnemyCount === 1) {
      // 1마리: 아래 화살표만 유효
      if (keyIndex === 1) { // DOWN
        originalEnemyIndex = 0;
      } else {
        return; // 다른 키는 무시
      }
    } else if (originalEnemyCount === 2) {
      // 2마리: 왼쪽, 오른쪽 화살표만 유효
      if (keyIndex === 0) { // LEFT
        originalEnemyIndex = 0;
      } else if (keyIndex === 2) { // RIGHT
        originalEnemyIndex = 1;
      } else {
        return; // 아래 화살표는 무시
      }
    } else {
      // 3마리 이상: 모든 화살표 사용
      originalEnemyIndex = keyIndex;
    }

    if (originalEnemyIndex < 0 || originalEnemyIndex >= allEnemies.length) return;

    // 원래 인덱스에 해당하는 적 찾기
    const enemy = allEnemies.find(e => e.enemyIndex === originalEnemyIndex);
    
    // 적이 없거나 죽었으면 무시
    if (!enemy || enemy.isDead()) return;

    const cardData: CardData = (selectedCard as any).cardData;
    // type 확인 (언어 독립적)
    if (cardData.type !== 'attack') return;

    this.useCard(selectedCard, enemy);
  }

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
    const cardData: CardData = (card as any).cardData;

    // type 확인 (언어 독립적)
    const cardType = cardData.type;
    // 공격 카드이고 타겟이 필요한데 타겟이 없으면 사용 불가
    if (cardType === 'attack' && !cardData.allEnemies && !target) {
      this.uiManager.showMessage('Select a target');
      return;
    }

    // BattleManager를 사용하여 카드 효과 적용 (게임 로직)
    const success = this.battleManager.applyCardEffects(cardData, target);

    if (!success) {
      this.uiManager.showMessage('Not enough energy!');
      return;
    }

    this.playCardEffects(card, cardData, target);
    this.cleanupCard(card, cardData);
  }

  /**
   * 카드 시각/청각 효과를 재생합니다 (사운드, 애니메이션, 파티클)
   */
  private playCardEffects(card: Card, cardData: CardData, target: Enemy | null): void {
    // 카드 사용 사운드 재생
    if (this.soundManager) {
      if (cardData.sound && cardData.sound !== '') {
        this.soundManager.play(cardData.sound);
      }
    }

    // 공격 카드 효과
    if (cardData.type === 'attack') {
      if (this.soundManager) {
        this.soundManager.play('attack', 0.8);
      }
      if (cardData.allEnemies) {
        (card as any).playParticleEffect(this.scene.cameras.main.width / 2, 250);
      } else if (target) {
        const targetMatrix = target.getWorldTransformMatrix();
        const targetWorldX = targetMatrix.tx;
        const targetWorldY = targetMatrix.ty;
        (card as any).playParticleEffect(targetWorldX, targetWorldY);
      }
    }

    // 방어 카드 효과
    if (cardData.block) {
      this.playerCharacter.playDefendAnimation();
      this.scene.time.delayedCall(100, () => {
        if (this.soundManager) {
          this.soundManager.play('defend', 0.7);
        }
      });
    }

    // 치유 카드 효과
    if (cardData.heal) {
      this.playerCharacter.playHealAnimation();
    }
  }

  /**
   * 카드를 정리합니다 (핸드에서 제거, 버린 카드 더미로 이동)
   */
  private cleanupCard(card: Card, cardData: CardData): void {
    this.cardHandManager.removeCardFromHand(card);
    this.deckManager.discardCard(cardData);
    this.cardHandManager.discardCardWithAnimation(card);
    this.cardHandManager.arrangeHand();
    
    if (this.onDeckInfoUpdate) {
      this.onDeckInfoUpdate();
    }
  }
}

