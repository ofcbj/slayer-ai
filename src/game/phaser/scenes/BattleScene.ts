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
  }

  private initializeBattleManager(enemies: Enemy[]): void {
    const callbacks: BattleCallbacks = {
      onPlayerTurnStart: () => {
        // 카드 뽑기 (5장)
        this.cardHandManager.drawCards(5, () => {
          this.stateSynchronizer.updateDeckInfo();
        });
      },
      onEnemyTurnStart: () => {
        // 적 턴 시작 애니메이션 등
      },
      onEnemyAction: (enemy: Enemy, intent) => {
        if (intent.type === 'attack') {
          enemy.playAttackAnimation(() => {
            this.battleManager.playerTakeDamage(intent.value);
          });
        }
      },
      onPlayerTakeDamage: (actualDamage: number, blockedDamage: number) => {
        // 데미지 표시만 담당 (상태는 옵저버가 처리)
        if (blockedDamage > 0) {
          // 방어도로 막은 데미지 표시
          const blockText = this.add.text(this.playerCharacter.x - 40, this.playerCharacter.y - 50, `🛡️-${blockedDamage}`, {
            fontSize  : '28px',
            fontFamily: 'Arial, sans-serif',
            fontStyle : 'bold',
            color     : '#4ecdc4',
            stroke    : '#000000',
            strokeThickness : 4
          });
          blockText.setOrigin(0.5);

          this.tweens.add({
            targets   : blockText,
            y         : blockText.y - 40,
            alpha     : 0,
            duration  : 1000,
            ease      : 'Power2',
            onComplete: () => blockText.destroy()
          });
        }

        if (actualDamage > 0) {
          // 실제 체력 데미지 표시
          const damageText = this.add.text(this.playerCharacter.x + 40, this.playerCharacter.y - 50, `-${actualDamage} HP`, {
            fontSize  : '36px',
            fontFamily: 'Arial, sans-serif',
            fontStyle : 'bold',
            color     : '#ff6b6b',
            stroke    : '#000000',
            strokeThickness: 5
          });
          damageText.setOrigin(0.5);

          this.tweens.add({
            targets   : damageText,
            y         : damageText.y - 60,
            alpha     : 0,
            duration  : 1000,
            ease      : 'Power2',
            onComplete: () => damageText.destroy()
          });

          // 피격 애니메이션
          this.playerCharacter.playHitAnimationPublic();
        } else if (blockedDamage > 0) {
          // 완전히 막았을 때는 방어 애니메이션
          this.playerCharacter.playDefendAnimation();
        }

        // 체력이 0 이하면 화면 빨갛게 + 게임 오버 체크
        const playerState = this.battleManager.getPlayerState();
        if (playerState.health <= 0) {
          this.cameras.main.flash(200, 255, 0, 0, false, (_camera: any, progress: number) => {
            if (progress === 1) {
              this.resultHandler.checkGameOver();
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

    this.battleManager = new BattleManager(this.gameState.player, enemies, callbacks);
    // 플레이어 상태 옵저버 구독
    this.unsubscribePlayerState = this.battleManager.subscribeToPlayerState((state) => {
      // 1. GameState 동기화 (React UI 및 씬 간 데이터 전달용)
      this.gameState.player = { ...state };
      // 2. Player 시각화 업데이트
      this.playerCharacter.updateFromState(state);
      // 3. UI 업데이트
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
}
