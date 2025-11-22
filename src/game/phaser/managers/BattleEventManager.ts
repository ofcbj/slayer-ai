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
   * 적의 수에 따른 키 매핑:
   * - 1마리: 아래(1) → 0번째 적
   * - 2마리: 왼쪽(0) → 0번째 적, 오른쪽(2) → 1번째 적
   * - 3마리: 왼쪽(0) → 0번째 적, 아래(1) → 1번째 적, 오른쪽(2) → 2번째 적
   */
  public handleEnemyShortcut(keyIndex: number): void {
    if (this.battleManager.getTurn() !== 'player') return;

    const selectedCard = this.cardHandManager.getSelectedCard();
    if (!selectedCard) return;

    // 모든 적 목록을 가져옴 (죽은 적 포함, 위치 고정)
    const allEnemies = this.battleManager.getAllEnemies();
    const enemyCount = allEnemies.length;

    // 적의 수에 따라 키를 적 인덱스로 매핑
    let enemyIndex: number;

    if (enemyCount === 1) {
      // 1마리: 아래 화살표만 유효
      if (keyIndex === 1) { // DOWN
        enemyIndex = 0;
      } else {
        return; // 다른 키는 무시
      }
    } else if (enemyCount === 2) {
      // 2마리: 왼쪽, 오른쪽 화살표만 유효
      if (keyIndex === 0) { // LEFT
        enemyIndex = 0;
      } else if (keyIndex === 2) { // RIGHT
        enemyIndex = 1;
      } else {
        return; // 아래 화살표는 무시
      }
    } else {
      // 3마리 이상: 모든 화살표 사용
      enemyIndex = keyIndex;
    }

    if (enemyIndex < 0 || enemyIndex >= allEnemies.length) return;

    const enemy = allEnemies[enemyIndex];
    // 죽은 적은 선택 불가
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

    // BattleManager를 사용하여 카드 사용 (BattleManager가 내부 enemies 배열을 직접 사용)
    const success = this.battleManager.useCard(cardData, target);

    if (!success) {
      this.uiManager.showMessage('Not enough energy!');
      return;
    }

    // 카드 사용 사운드 재생 (애니메이션보다 먼저)
    if (this.soundManager) {
      // 카드에 커스텀 사운드가 있으면 그것을 재생, 없으면 기본 사운드
      if (cardData.sound && cardData.sound !== '') {
        this.soundManager.play(cardData.sound);
      } else {
        this.soundManager.playCardPlay();
      }
    }

    // 애니메이션 처리
    let shouldDiscardWithAnimation = true; // discardCardWithAnimation을 호출할지 여부

    if (cardType === 'attack') {
      // 공격 사운드 재생
      const damageValue = cardData.damage || 0;
      const isHeavy = damageValue >= 10;
      if (this.soundManager) {
        this.soundManager.playAttack(isHeavy);
      }

      if (cardData.allEnemies) {
        // 전체 공격: 파티클만 화면 중앙으로 날아가고, 카드는 버린 카드 더미로
        (card as any).playParticleEffect(this.scene.cameras.main.width / 2, 250);
      } else if (target) {
        // 단일 공격: 파티클만 타겟으로 날아가고, 카드는 버린 카드 더미로
        const targetMatrix = target.getWorldTransformMatrix();
        const targetWorldX = targetMatrix.tx;
        const targetWorldY = targetMatrix.ty;
        (card as any).playParticleEffect(targetWorldX, targetWorldY);
      }
      // 공격 카드도 버린 카드 더미로 이동
    } else if (cardData.block) {
      // 방어 카드 (block 속성으로 판단)
      // 플레이어 캐릭터 방어 애니메이션
      this.playerCharacter.playDefendAnimation();

      // 방어 사운드 재생 (약간 딜레이를 줘서 카드 사용 사운드와 겹치지 않도록)
      this.scene.time.delayedCall(100, () => {
        if (this.soundManager) {
          this.soundManager.playDefend();
        }
      });
      // playEffect를 호출하지 않고 discardCardWithAnimation만 사용
    } else if (cardData.heal) {
      // 치유 카드 (heal 속성으로 판단)
      // 플레이어 캐릭터 치유 애니메이션
      this.playerCharacter.playHealAnimation();
      // playEffect를 호출하지 않고 discardCardWithAnimation만 사용
    } else if (cardData.energy) {
      // 에너지 카드 (energy 속성으로 판단)
      // playEffect를 호출하지 않고 discardCardWithAnimation만 사용
    }

    // 핸드에서 제거
    this.cardHandManager.removeCardFromHand(card);
    // DeckManager를 사용하여 버린 카드 더미에 추가
    this.deckManager.discardCard(cardData);
    
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

