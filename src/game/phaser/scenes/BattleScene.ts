import Phaser from 'phaser';

import EventBus from '../../EventBus';
import Enemy    from '../objects/Enemy';
import Player   from '../objects/Player';

import DeckManager        from '../managers/DeckManager';
import BattleUIManager    from '../managers/BattleUIManager';
import CardHandManager    from '../managers/CardHandManager';
import CardViewManager    from '../managers/CardViewManager';
import BattleEventManager from '../managers/BattleEventManager';
import BattleManager, { BattleCallbacks, EnemyData, GameState } from '../managers/BattleManager';
import SoundManager       from '../managers/SoundManager';
import LanguageManager    from '../../../i18n/LanguageManager';

import BattleSceneInitializer       from '../controllers/BattleSceneInitializer';
import BattleTurnController         from '../controllers/BattleTurnController';
import BattleStateSynchronizer      from '../controllers/BattleStateSynchronizer';
import BattleResultHandler          from '../controllers/BattleResultHandler';
import BattleConsoleCommandHandler  from '../controllers/BattleConsoleCommandHandler';

/**
 * 전투 씬
 * 각 매니저와 컨트롤러를 조율하여 전투를 관리합니다.
 */
export default class BattleScene extends Phaser.Scene {
  // Managers
  private deckManager!          : DeckManager;
  private battleManager!        : BattleManager;
  private uiManager!            : BattleUIManager;
  private cardHandManager!      : CardHandManager;
  private cardViewManager!      : CardViewManager;
  private eventManager!         : BattleEventManager;
  private soundManager!         : SoundManager;

  // Controllers
  private initializer!          : BattleSceneInitializer;
  private turnController!       : BattleTurnController;
  private stateSynchronizer!    : BattleStateSynchronizer;
  private resultHandler!        : BattleResultHandler;
  private consoleCommandHandler!: BattleConsoleCommandHandler;

  // Observer cleanup
  private unsubscribePlayerState?: () => void;

  // State
  private gameState!            : GameState;
  private selectedStage!        : any;
  private playerCharacter!      : Player;

  constructor() {
    super({ key: 'BattleScene' });
  }

  init(): void {
    console.log('[BattleScene] init called');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.shutdown, this);
    this.deckManager = new DeckManager();
  }

  shutdown(): void {
    console.log('[BattleScene] shutdown called - START');

    // 옵저버 구독 해제
    if (this.unsubscribePlayerState) {
      this.unsubscribePlayerState();
    }
    // 이벤트 리스너 정리
    if (this.eventManager) {
      this.eventManager.unregisterEventListeners();
    }
    // 콘솔 명령어 이벤트 리스너 제거
    if (this.consoleCommandHandler) {
      this.consoleCommandHandler.unregisterEventListeners();
    }
    // 적 객체 정리 (BattleManager를 통해 접근)
    if (this.battleManager) {
      const enemies = this.battleManager.getAllEnemies();
      enemies.forEach((enemy: Enemy) => {
        if (enemy && enemy.scene) {
          enemy.destroy();
        }
      });
    }
    // 플레이어 캐릭터 정리
    if (this.playerCharacter && this.playerCharacter.scene) {
      this.playerCharacter.destroy();
    }
    // 카드 핸드 정리
    if (this.cardHandManager) {
      this.cardHandManager.clearHand();
    }

    // 매니저 및 컨트롤러 참조 정리
    this.battleManager        = null as any;
    this.eventManager         = null as any;
    this.uiManager            = null as any;
    this.cardHandManager      = null as any;
    this.cardViewManager      = null as any;
    this.deckManager          = null as any;
    this.initializer          = null as any;
    this.turnController       = null as any;
    this.stateSynchronizer    = null as any;
    this.resultHandler        = null as any;
    this.consoleCommandHandler= null as any;

    console.log('[BattleScene] shutdown called - END');
  }

  create(): void {
    console.log('[BattleScene] create called');

    // Scene에 EventBus 참조 추가 (Card, Enemy에서 사용)
    (this as any).eventBus = EventBus;

    // React에 현재 Scene이 준비되었음을 알림
    EventBus.emit('current-scene-ready', this);

    const width   = this.cameras.main.width;
    const height  = this.cameras.main.height;
    // 배경
    this.add.rectangle(0, 0, width, height, 0x0f0f1e).setOrigin(0);

    // 게임 상태 가져오기
    this.gameState      = this.registry.get('gameState');
    this.selectedStage  = this.registry.get('selectedStage');
    console.log('[BattleScene] create - Stage:', this.selectedStage?.id);

    // Sound Manager 초기화
    this.soundManager = new SoundManager(this);
    this.soundManager.initialize();

    // UI Manager와 Card Managers 먼저 초기화
    this.uiManager      = new BattleUIManager(this);
    this.cardHandManager= new CardHandManager(this, this.deckManager, this.uiManager, this.soundManager);
    this.cardViewManager= new CardViewManager(this);

    // Initializer 생성 및 초기화
    this.initializer = new BattleSceneInitializer(
      this,
      this.gameState,
      this.selectedStage,
      this.deckManager,
      this.uiManager
    );

    // 플레이어 캐릭터 생성
    this.playerCharacter = this.initializer.createPlayerCharacter();

    // UI 생성
    this.initializer.createUI(
      () => this.onEndTurnButtonClick(),
      () => this.onDeckPileClick(),
      () => this.onDiscardPileClick()
    );

    // 적 생성 (먼저 생성하여 BattleManager에 전달)
    const enemies = this.initializer.createEnemies();
    // BattleManager 초기화 (enemies를 받아서 생성)
    this.initializeBattleManager(enemies);

    // Controllers 생성
    this.turnController = new BattleTurnController(
      this,
      this.battleManager,
      this.cardHandManager,
      () => this.stateSynchronizer.updateDeckInfo()
    );

    // CardHandManager에 setEndTurnAllowed 콜백 설정
    (this.cardHandManager as any).setEndTurnAllowed = (allowed: boolean) =>
      this.turnController.setEndTurnAllowed(allowed);

    this.stateSynchronizer = new BattleStateSynchronizer(
      this.uiManager,
      this.deckManager,
      this.cardHandManager
    );

    this.resultHandler = new BattleResultHandler(
      this,
      this.battleManager,
      this.gameState,
      this.selectedStage
    );

    this.consoleCommandHandler = new BattleConsoleCommandHandler(
      this,
      this.battleManager,
      this.deckManager,
      this.cardHandManager,
      () => this.stateSynchronizer.updateDeckInfo(),
      () => this.resultHandler.winBattle(),
      () => this.resultHandler.checkGameOver(),
      () => this.turnController.endPlayerTurn(),
      () => this.turnController.startPlayerTurn()
    );

    // Event Manager 초기화
    this.eventManager = new BattleEventManager(
      this,
      this.battleManager,
      this.cardHandManager,
      this.deckManager,
      this.uiManager,
      this.playerCharacter,
      () => this.stateSynchronizer.updateDeckInfo(),
      this.soundManager
    );
    this.eventManager.registerEventListeners();
    // 콘솔 명령어 이벤트 리스너 등록
    this.consoleCommandHandler.registerEventListeners();
    // 초기 덱 설정
    this.initializer.setupDeck();
    // 적 의도 설정
    enemies.forEach((enemy: Enemy) => {
      const enemyData: EnemyData = (enemy as any).enemyData;
      this.battleManager.setEnemyIntent(enemy, enemyData, () => Phaser.Math.Between(0, 100) / 100);
    });
    // 게임 시작 사운드 재생
    this.soundManager.playGameStart();

    // 첫 턴 시작
    this.turnController.startPlayerTurn();

    // 키보드 단축키 등록
    this.registerKeyboardShortcuts();
  }

  private initializeBattleManager(enemies: Enemy[]): void {
    const callbacks: BattleCallbacks = {
      onPlayerTurnStart: () => {
        // 카드 뽑기 (5장)
        // drawCards 내부에서 자동으로 버튼 비활성화/활성화 처리됨
        this.cardHandManager.drawCards(5, () => {
          this.stateSynchronizer.updateDeckInfo();
        });
      },
      onEnemyTurnStart: () => {
        // 적 턴 동안 턴 종료 버튼 비활성화
        this.uiManager.setEndTurnButtonEnabled(false);
      },
      onEnemyAction: (enemy: Enemy, intent) => {
        if (intent.type === 'attack') {
          enemy.playAttackAnimation(() => {
            // Player에게 직접 데미지 적용
            this.playerCharacter.takeDamage(intent.value);

            // 플레이어 사망 시 처리
            if (this.playerCharacter.isDead()) {
              this.cameras.main.flash(200, 255, 0, 0);
              this.battleManager.checkBattleEnd();
            }
          });
        }
      },
      onEnemyDefeated: (_enemy: Enemy) => {
        // BattleManager에서 enemies 배열 처리 완료
        // 여기서는 추가 UI 업데이트만 필요하면 처리
        const remainingEnemies = this.battleManager.getAllEnemies();
        console.log(`[BattleScene] onEnemyDefeated callback - Enemy removed, remaining: ${remainingEnemies.length}`);
      },
      onBattleEnd: (victory: boolean) => {
        if (victory) {
          this.time.delayedCall(1000, () => {
            this.resultHandler.winBattle();
          });
        } else {
          this.time.delayedCall(1000, () => {
            this.resultHandler.checkGameOver();
          });
        }
      }
    };

    this.battleManager = new BattleManager(this.playerCharacter, enemies, callbacks);
    // 플레이어 상태 옵저버 구독
    this.unsubscribePlayerState = this.playerCharacter.subscribeToState((state) => {
      // 1. GameState 동기화 (React UI 및 씬 간 데이터 전달용)
      this.gameState.player = { ...state };
      // 2. UI 업데이트
      this.uiManager.updateEnergyUI(state);
    });
  }

  private onEndTurnButtonClick(): void {
    if (this.battleManager.getTurn() === 'player') {
      this.turnController.endPlayerTurn();
    }
  }

  private onDeckPileClick(): void {
    const langManager = LanguageManager.getInstance();
    const deck = this.deckManager.getDeck();
    this.cardViewManager.showDeckView(deck, () => {
      this.uiManager.showMessage(langManager.t('battle.deckEmpty'));
    });
  }

  private onDiscardPileClick(): void {
    const langManager = LanguageManager.getInstance();
    const discardPile = this.deckManager.getDiscardPile();
    this.cardViewManager.showDiscardPileView(discardPile, () => {
      this.uiManager.showMessage(langManager.t('battle.discardEmpty'));
    });
  }

  /**
   * 키보드 단축키를 등록합니다.
   */
  private registerKeyboardShortcuts(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;

    // 숫자 키 1-5: 카드 선택/사용
    const numberKeys = [
      Phaser.Input.Keyboard.KeyCodes.ONE,
      Phaser.Input.Keyboard.KeyCodes.TWO,
      Phaser.Input.Keyboard.KeyCodes.THREE,
      Phaser.Input.Keyboard.KeyCodes.FOUR,
      Phaser.Input.Keyboard.KeyCodes.FIVE
    ];
    numberKeys.forEach((keyCode, index) => {
      const key = keyboard.addKey(keyCode);
      key.on('down', () => {
        this.handleCardShortcut(index);
      });
    });

    // F1-F3: 적 선택
    const functionKeys = [
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.RIGHT
    ];
    functionKeys.forEach((keyCode, index) => {
      const key = keyboard.addKey(keyCode);
      key.on('down', () => {
        this.handleEnemyShortcut(index);
      });
    });

    // 스페이스바: 턴 종료
    const spaceKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    spaceKey.on('down', () => {
      this.handleEndTurnShortcut();
    });
  }

  /**
   * 카드 단축키 처리 (1-5)
   */
  private handleCardShortcut(cardIndex: number): void {
    if (this.battleManager.getTurn() !== 'player') return;

    const hand = this.cardHandManager.getHand();
    if (cardIndex < 0 || cardIndex >= hand.length) return;

    const card = hand[cardIndex];
    if (!card) return;

    // BattleEventManager의 onCardClicked 로직과 동일하게 처리
    const cardData: any = (card as any).cardData;
    const playerState = this.battleManager.getPlayerState();

    // 에너지가 부족한 경우
    if (playerState.energy < cardData.cost) {
      this.uiManager.showMessage('Not enough energy!');
      return;
    }

    const currentSelected = this.cardHandManager.getSelectedCard();
    const isAttackCard = cardData.type === 'attack';
    const needsTarget = isAttackCard && !cardData.allEnemies;

    // 공격 카드이고 타겟이 필요한 경우
    if (needsTarget) {
      // 이미 같은 카드가 선택되어 있으면 선택 해제
      if (currentSelected === card) {
        this.cardHandManager.deselectCard();
        return;
      }
      // 다른 카드를 선택 (selectCard가 자동으로 이전 선택 해제)
      this.cardHandManager.selectCard(card);
      this.uiManager.showMessage('Select a target');
    } else {
      // 스킬 카드, 전체 공격 등: 선택 → 한 번 더 누르면 사용
      if (currentSelected === card) {
        // 이미 선택된 카드를 다시 누르면 사용
        this.eventManager.useCard(card);
      } else {
        // 처음 누르면 선택만
        // 이전 선택이 있으면 해제
        if (currentSelected) {
          this.cardHandManager.deselectCard();
        }
        this.cardHandManager.selectCard(card);
        this.uiManager.showMessage('Press again to use');
      }
    }
  }

  /**
   * 적 단축키 처리 (F1-F3)
   */
  private handleEnemyShortcut(enemyIndex: number): void {
    if (this.battleManager.getTurn() !== 'player') return;

    const selectedCard = this.cardHandManager.getSelectedCard();
    if (!selectedCard) return;

    const aliveEnemies = this.battleManager.getAliveEnemies();
    if (enemyIndex < 0 || enemyIndex >= aliveEnemies.length) return;

    const enemy = aliveEnemies[enemyIndex];
    if (!enemy || enemy.isDead()) return;

    const cardData: any = (selectedCard as any).cardData;
    // type 확인 (언어 독립적)
    if (cardData.type !== 'attack') return;

    // BattleEventManager의 onEnemyClicked 로직과 동일하게 처리
    this.eventManager.useCard(selectedCard, enemy);
  }

  /**
   * 턴 종료 단축키 처리 (스페이스바)
   */
  private handleEndTurnShortcut(): void {
    if (this.battleManager.getTurn() === 'player') {
      this.turnController.endPlayerTurn();
    }
  }
}
