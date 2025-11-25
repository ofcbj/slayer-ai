import Phaser from 'phaser';

import EventBus from '../../EventBus';
import Enemy    from '../objects/Enemy';
import Player   from '../objects/Player';

import DeckManager        from '../managers/DeckManager';
import BattleUIManager    from '../managers/BattleUIManager';
import CardHandManager    from '../managers/CardHandManager';
import CardViewManager    from '../managers/CardViewManager';
import BattleEventManager from '../managers/BattleEventManager';
import BattleManager, { BattleCallbacks, GameState } from '../managers/BattleManager';
import SoundManager       from '../managers/SoundManager';
import LanguageManager    from '../../../i18n/LanguageManager';

import BattleSceneInitializer       from '../controllers/BattleSceneInitializer';
import BattleTurnController         from '../controllers/BattleTurnController';
import BattleStateSynchronizer      from '../controllers/BattleStateSynchronizer';
import BattleResultHandler          from '../controllers/BattleResultHandler';
import BattleConsoleCommandHandler  from '../controllers/BattleConsoleCommandHandler';
import { Logger }                   from '../../utils/Logger';

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
  private gameState!    : GameState;
  private selectedStage!: any;
  private player!       : Player;

  constructor() {
    super({ key: 'BattleScene' });
  }

  init(): void {
    Logger.debug('BattleScene init called');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.shutdown, this);
    this.deckManager = new DeckManager();
  }

  shutdown(): void {
    Logger.debug('BattleScene shutdown called - START');

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
    if (this.player && this.player.scene) {
      this.player.destroy();
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

    Logger.debug('BattleScene shutdown called - END');
  }

  create(): void {
    Logger.debug('BattleScene create called');

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
    Logger.debug('BattleScene create - Stage:', this.selectedStage?.id);

    this.soundManager   = new SoundManager(this);
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
    this.player = this.initializer.createPlayer();

    // UI 생성
    this.initializer.createUI(
      () => this.onEndTurnButtonClick(),
      () => this.onDeckPileClick(),
      () => this.onDiscardPileClick()
    );

    // My Deck 버튼 생성
    this.createMyDeckButton();

    // 적 생성 (먼저 생성하여 BattleManager에 전달)
    const enemies = this.initializer.createEnemies();
    // BattleManager 초기화 (enemies를 받아서 생성)
    this.initializeBattleManager(enemies);

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

    // Controllers 생성
    this.turnController = new BattleTurnController(
      this,
      this.battleManager,
      this.cardHandManager,
      this.uiManager,
      this.stateSynchronizer,
      this.resultHandler
    );

    // CardHandManager에 setEndTurnAllowed 콜백 설정
    (this.cardHandManager as any).setEndTurnAllowed = (allowed: boolean) =>
      this.turnController.setEndTurnAllowed(allowed);

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
      this.player,
      this.soundManager,
      () => this.stateSynchronizer.updateDeckInfo()
    );
    this.eventManager.registerEventListeners();
    // 콘솔 명령어 이벤트 리스너 등록
    this.consoleCommandHandler.registerEventListeners();
    // 초기 덱 설정
    this.initializer.setupDeck();
    // 게임 시작 사운드 재생
    this.soundManager.play('game-start');
    // TurnController 초기화 및 첫 턴 시작
    this.turnController.initialize();
    this.turnController.startPlayerTurn();
    // 키보드 단축키 등록
    this.registerKeyboardShortcuts();
  }

  private initializeBattleManager(enemies: Enemy[]): void {
    const callbacks: BattleCallbacks = {
      onEnemyDefeated: (_enemy: Enemy) => {
        // BattleManager에서 enemies 배열 처리 완료
        // 여기서는 추가 UI 업데이트만 필요하면 처리
        const remainingEnemies = this.battleManager.getAllEnemies();
        Logger.debug(`BattleScene onEnemyDefeated callback - Enemy removed, remaining: ${remainingEnemies.length}`);
      },
      onBattleEnd: (victory: boolean) => {
        this.turnController.handleBattleEnd(victory);
      },
      onDrawCards: (count: number) => {
        // 카드 드로우 효과 처리
        this.cardHandManager.drawCards(count, () => {
          this.stateSynchronizer.updateDeckInfo();
        });
      }
    };

    this.battleManager = new BattleManager(this.player, enemies, callbacks);
    // 플레이어 상태 옵저버 구독
    this.unsubscribePlayerState = this.player.subscribeToState((state) => {
      // 1. GameState 동기화 (React UI 및 씬 간 데이터 전달용)
      this.gameState.player = { ...state };
      // 2. UI 업데이트
      this.uiManager.updateEnergyUI(state);
    });

    // 플레이어 사망 이벤트 리스닝
    this.events.on('playerDied', () => {
      this.cameras.main.flash(200, 255, 0, 0);
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

    // 화살표 키: 적 선택 (적의 수에 따라 동적 매핑)
    // 1마리: 아래 화살표
    // 2마리: 왼쪽/오른쪽 화살표
    // 3마리: 왼쪽/아래/오른쪽 화살표
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

  private handleCardShortcut(cardIndex: number): void {
    this.eventManager.handleCardShortcut(cardIndex);
  }

  private handleEnemyShortcut(enemyIndex: number): void {
    this.eventManager.handleEnemyShortcut(enemyIndex);
  }

  private handleEndTurnShortcut(): void {
    if (this.battleManager.getTurn() === 'player') {
      this.turnController.endPlayerTurn();
    }
  }

  private createMyDeckButton(): void {
    const deckContainer = this.add.container(100, 60);

    const deckBg = this.add.rectangle(0, 0, 160, 50, 0x8b5cf6, 0.9);
    deckBg.setStrokeStyle(3, 0x7c3aed);

    const deckText = this.add.text(
      0, 0,
      'My Deck',
      { fontSize: '20px', fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold' }
    ).setOrigin(0.5);

    deckContainer.add([deckBg, deckText]);
    deckContainer.setDepth(1000); // 최상단에 표시

    deckBg.setInteractive({ useHandCursor: true });

    deckBg.on('pointerover', () => {
      deckBg.setFillStyle(0x7c3aed);
      this.tweens.add({
        targets: deckContainer,
        scale: 1.05,
        duration: 200
      });
    });

    deckBg.on('pointerout', () => {
      deckBg.setFillStyle(0x8b5cf6);
      this.tweens.add({
        targets: deckContainer,
        scale: 1,
        duration: 200
      });
    });

    deckBg.on('pointerdown', () => {
      const handCards = this.cardHandManager.getHand().map(card => (card as any).cardData);
      const allCards = [
        ...this.deckManager.getDeck(),
        ...handCards,
        ...this.deckManager.getDiscardPile()
      ];
      const langManager = LanguageManager.getInstance();
      this.cardViewManager.showCardListView(langManager.t('battle.deck'), allCards);
    });
  }
}
