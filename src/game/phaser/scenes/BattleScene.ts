import Phaser from 'phaser';
import EventBus from '../../EventBus';
import Enemy from '../objects/Enemy';
import Player from '../objects/Player';
import DeckManager from '../managers/DeckManager';
import BattleManager, { BattleCallbacks, CardData, EnemyData, StageData, GameState } from '../managers/BattleManager';
import BattleUIManager from '../managers/BattleUIManager';
import CardHandManager from '../managers/CardHandManager';
import CardViewManager from '../managers/CardViewManager';
import BattleEventManager from '../managers/BattleEventManager';

/**
 * 전투 씬
 * 각 매니저를 조율하여 전투를 관리합니다.
 */
export default class BattleScene extends Phaser.Scene {
  private deckManager!: DeckManager;
  private battleManager!: BattleManager;
  private uiManager!: BattleUIManager;
  private cardHandManager!: CardHandManager;
  private cardViewManager!: CardViewManager;
  private eventManager!: BattleEventManager;

  private gameState!: GameState;
  private selectedStage!: StageData;
  private playerCharacter!: Player;

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

    // 이벤트 리스너 정리
    if (this.eventManager) {
      this.eventManager.unregisterEventListeners();
    }

    // 콘솔 명령어 이벤트 리스너 제거
    this.unregisterConsoleCommands();

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

    // 매니저 참조 정리
    this.battleManager = null as any;
    this.eventManager = null as any;
    this.uiManager = null as any;
    this.cardHandManager = null as any;
    this.cardViewManager = null as any;
    this.deckManager = null as any;

    console.log('[BattleScene] shutdown called - END');
  }

  create(): void {
    console.log('[BattleScene] create called');

    // Scene에 EventBus 참조 추가 (Card, Enemy에서 사용)
    (this as any).eventBus = EventBus;

    // React에 현재 Scene이 준비되었음을 알림
    EventBus.emit('current-scene-ready', this);

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 배경
    this.add.rectangle(0, 0, width, height, 0x0f0f1e).setOrigin(0);

    // 게임 상태 가져오기
    this.gameState = this.registry.get('gameState');
    this.selectedStage = this.registry.get('selectedStage');
    console.log('[BattleScene] create - Stage:', this.selectedStage?.id);

    // 플레이어 캐릭터 생성
    this.createPlayerCharacter();

    // UI Manager와 Card Managers 먼저 초기화 (BattleManager는 적 생성 후)
    this.uiManager = new BattleUIManager(this);
    this.cardHandManager = new CardHandManager(this, this.deckManager, this.uiManager);
    this.cardHandManager.initializeHandContainer();
    this.cardViewManager = new CardViewManager(this);

    // UI 생성
    this.createUI();

    // 적 생성 (먼저 생성하여 BattleManager에 전달)
    const enemies = this.createEnemies();

    // BattleManager 초기화 (enemies를 받아서 생성)
    this.initializeBattleManager(enemies);

    // Event Manager 초기화
    this.eventManager = new BattleEventManager(
      this,
      this.battleManager,
      this.cardHandManager,
      this.deckManager,
      this.uiManager,
      this.playerCharacter,
      () => this.updateDeckInfo()
    );
    this.eventManager.registerEventListeners();

    // 콘솔 명령어 이벤트 리스너 등록
    this.registerConsoleCommands();

    // 초기 덱 설정
    this.setupDeck();

    // 적 의도 설정
    enemies.forEach((enemy: Enemy) => {
      const enemyData: EnemyData = (enemy as any).enemyData;
      this.battleManager.setEnemyIntent(enemy, enemyData, () => Phaser.Math.Between(0, 100) / 100);
    });

    // 첫 턴 시작
    this.startPlayerTurn();
  }

  // initializeManagers는 더 이상 사용하지 않음 (create에서 직접 처리)

  private initializeBattleManager(enemies: Enemy[]): void {
    const callbacks: BattleCallbacks = {
      onPlayerTurnStart: () => {
        // 카드 뽑기 (5장)
        this.cardHandManager.drawCards(5, () => {
          this.updateUI();
          this.updateDeckInfo();
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
        // BattleManager에서 이미 방어도 계산이 완료되었으므로
        // playerCharacter의 상태만 동기화
        const playerState = this.battleManager.getPlayerState();
        
        // Player 객체의 상태 동기화
        this.playerCharacter.health = playerState.health;
        this.playerCharacter.defense = playerState.defense;
        this.playerCharacter.updateStats(playerState.health, playerState.defense);

        // 데미지 표시를 위해 직접 처리
        if (blockedDamage > 0) {
          // 방어도로 막은 데미지 표시
          const blockText = this.add.text(this.playerCharacter.x - 40, this.playerCharacter.y - 50, `🛡️-${blockedDamage}`, {
            fontSize: '28px',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            color: '#4ecdc4',
            stroke: '#000000',
            strokeThickness: 4
          });
          blockText.setOrigin(0.5);

          this.tweens.add({
            targets: blockText,
            y: blockText.y - 40,
            alpha: 0,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => blockText.destroy()
          });
        }

        if (actualDamage > 0) {
          // 실제 체력 데미지 표시
          const damageText = this.add.text(this.playerCharacter.x + 40, this.playerCharacter.y - 50, `-${actualDamage} HP`, {
            fontSize: '36px',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            color: '#ff6b6b',
            stroke: '#000000',
            strokeThickness: 5
          });
          damageText.setOrigin(0.5);

          this.tweens.add({
            targets: damageText,
            y: damageText.y - 60,
            alpha: 0,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => damageText.destroy()
          });

          // 피격 애니메이션
          this.playerCharacter.playHitAnimationPublic();
        } else if (blockedDamage > 0) {
          // 완전히 막았을 때는 방어 애니메이션
          this.playerCharacter.playDefendAnimation();
        }

        // gameState 동기화
        this.gameState.player.health = playerState.health;
        this.gameState.player.defense = playerState.defense;

        // 체력이 0 이하면 화면 빨갛게 + 게임 오버 체크
        if (this.playerCharacter.health <= 0) {
          this.cameras.main.flash(200, 255, 0, 0, false, (_camera: any, progress: number) => {
            if (progress === 1) {
              this.checkGameOver();
            }
          });
        }

        this.updateUI();
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
            this.winBattle();
          });
        } else {
          this.time.delayedCall(1000, () => {
            this.checkGameOver();
          });
        }
      },
      onPlayerEnergyChange: (energy: number) => {
        this.gameState.player.energy = energy;
        this.updateUI();
      },
      onPlayerDefenseChange: (defense: number) => {
        this.gameState.player.defense = defense;
        this.updateUI();
      },
      onPlayerHealthChange: (health: number) => {
        this.gameState.player.health = health;
        this.updateUI();
      }
    };

    this.battleManager = new BattleManager(this.gameState.player, enemies, callbacks);
  }

  private createPlayerCharacter(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 플레이어 캐릭터를 중앙 하단에 배치 (적과 카드 사이)
    this.playerCharacter = new Player(this, width / 2, height / 2 + 100, this.gameState.player.maxHealth);
    this.playerCharacter.updateStats(this.gameState.player.health, this.gameState.player.defense);
    this.playerCharacter.idle(); // 아이들 애니메이션 시작
  }

  private createUI(): void {
    // Energy UI
    this.uiManager.createEnergyUI(this.gameState.player);

    // 턴 종료 버튼
    this.uiManager.createEndTurnButton(() => {
      if (this.battleManager.getTurn() === 'player') {
        this.endPlayerTurn();
      }
    });

    // 덱 더미 UI
    this.uiManager.createDeckPile(() => {
      const deck = this.deckManager.getDeck();
      this.cardViewManager.showDeckView(deck, () => {
        this.uiManager.showMessage('덱이 비어있습니다!');
      });
    });

    // 버린 카드 더미 UI
    this.uiManager.createDiscardPile(() => {
      const discardPile = this.deckManager.getDiscardPile();
      this.cardViewManager.showDiscardPileView(discardPile, () => {
        this.uiManager.showMessage('버린 카드가 없습니다!');
      });
    });

    // 덱 정보 텍스트
    this.uiManager.createDeckInfoText();
  }

  private createEnemies(): Enemy[] {
    const width = this.cameras.main.width;
    const enemiesData: Record<string, EnemyData> = this.registry.get('enemiesData');
    const stageEnemies: string[] = this.selectedStage.data.enemies;

    console.log(`[BattleScene] createEnemies - Stage: ${this.selectedStage.id}, Expected enemies:`, stageEnemies);

    const spacing = Math.min(300, width / (stageEnemies.length + 1));
    const startX = (width - (spacing * (stageEnemies.length - 1))) / 2;

    const createdEnemies: Enemy[] = [];
    stageEnemies.forEach((enemyName: string, index: number) => {
      const enemyData = enemiesData[enemyName];
      if (enemyData) {
        const x = startX + (index * spacing);
        const y = 220; // 적들을 상단에 배치

        const enemy = new Enemy(this, x, y, enemyData, index);
        createdEnemies.push(enemy);
      }
    });

    console.log(`[BattleScene] createEnemies - Created ${createdEnemies.length} enemies`);
    return createdEnemies;
  }

  private setupDeck(): void {
    const cardsData: { basic: CardData[] } = this.registry.get('cardsData');

    console.log(`[BattleScene] setupDeck - gameState.deck.length: ${this.gameState.deck.length}`);

    // 기본 덱 생성 (플레이어 덱이 비어있으면)
    if (this.gameState.deck.length === 0) {
      this.gameState.deck = [
        ...Array(5).fill(null).map(() => ({ ...cardsData.basic[0] })), // 강타 x5
        ...Array(4).fill(null).map(() => ({ ...cardsData.basic[1] })), // 방어 x4
        ...Array(1).fill(null).map(() => ({ ...cardsData.basic[4] }))  // 집중 x1
      ];
      console.log(`[BattleScene] setupDeck - Created basic deck with ${this.gameState.deck.length} cards`);
    }

    // DeckManager를 사용하여 덱 초기화
    this.deckManager.initializeDeck(this.gameState.deck);
    console.log(`[BattleScene] setupDeck - Initialized deck with ${this.deckManager.getDeckSize()} cards`);
  }

  private startPlayerTurn(): void {
    this.battleManager.startPlayerTurn();
  }

  private endPlayerTurn(): void {
    // BattleManager에 턴 종료 알림
    this.battleManager.endPlayerTurn();

    // 모든 카드 버리기
    this.cardHandManager.discardAllCards(
      undefined,
      () => {
        // 모든 카드가 버려진 후 적 턴 시작
        this.startEnemyTurn();
      }
    );

    this.updateDeckInfo();
  }

  private startEnemyTurn(): void {
    this.battleManager.startEnemyTurn();

    let delay = 0;
    const aliveEnemies = this.battleManager.getAliveEnemies();

    aliveEnemies.forEach(enemy => {
      this.time.delayedCall(delay, () => {
        this.executeEnemyAction(enemy);
      });
      delay += 1000;
    });

    // 모든 적 행동 후 플레이어 턴
    this.time.delayedCall(delay + 500, () => {
      this.startPlayerTurn();
    });
  }

  private executeEnemyAction(enemy: Enemy): void {
    // BattleManager에서 적 행동 실행 (콜백에서 애니메이션 처리)
    this.battleManager.executeEnemyAction(enemy);

    // 다음 의도 설정
    const enemyData: EnemyData = (enemy as any).enemyData;
    this.battleManager.setEnemyIntent(enemy, enemyData, () => Phaser.Math.Between(0, 100) / 100);
  }

  private checkGameOver(): void {
    if (this.gameState.player.health <= 0) {
      this.time.delayedCall(1000, () => {
        this.scene.start('GameOverScene');
      });
    }
  }

  private winBattle(): void {
    console.log('[BattleScene] winBattle called - Stage:', this.selectedStage?.id);

    // BattleManager에서 승리 처리
    this.battleManager.winBattle(this.selectedStage, this.gameState);

    // gameState 동기화
    const playerState = this.battleManager.getPlayerState();
    this.gameState.player = { ...playerState };

    console.log('[BattleScene] winBattle - Starting RewardScene');
    // 보상 씬으로
    this.scene.start('RewardScene');
  }

  private updateUI(): void {
    // 플레이어 캐릭터 스탯 업데이트
    this.playerCharacter.updateStats(
      this.gameState.player.health,
      this.gameState.player.defense
    );

    // 에너지 UI 업데이트
    this.uiManager.updateEnergyUI(this.gameState.player);
  }

  private updateDeckInfo(): void {
    const deckSize = this.deckManager.getDeckSize();
    const handSize = this.cardHandManager.getHandSize();
    const discardSize = this.deckManager.getDiscardPileSize();

    this.uiManager.updateDeckInfo(deckSize, handSize, discardSize);
  }

  /**
   * 콘솔 명령어 이벤트 리스너 등록
   */
  private registerConsoleCommands(): void {
    // 플레이어 피해
    EventBus.on('console-damage-player', (amount: number) => {
      if (this.battleManager) {
        this.battleManager.playerTakeDamage(amount);
        this.updateUI();
      }
    });

    // 플레이어 치유
    EventBus.on('console-heal-player', (amount: number) => {
      if (this.battleManager) {
        const playerState = this.battleManager.getPlayerState();
        playerState.health = Math.min(playerState.maxHealth, playerState.health + amount);
        if (this.playerCharacter) {
          this.playerCharacter.health = playerState.health;
          this.playerCharacter.updateStats(playerState.health, playerState.defense);
        }
        this.gameState.player.health = playerState.health;
        this.updateUI();
      }
    });

    // 에너지 설정
    EventBus.on('console-set-energy', (amount: number) => {
      if (this.battleManager) {
        const playerState = this.battleManager.getPlayerState();
        playerState.energy = Math.max(0, Math.min(playerState.maxEnergy, amount));
        this.gameState.player.energy = playerState.energy;
        this.updateUI();
      }
    });

    // 방어도 설정
    EventBus.on('console-set-defense', (amount: number) => {
      if (this.battleManager) {
        const playerState = this.battleManager.getPlayerState();
        playerState.defense = Math.max(0, amount);
        if (this.playerCharacter) {
          this.playerCharacter.defense = playerState.defense;
          this.playerCharacter.updateStats(playerState.health, playerState.defense);
        }
        this.gameState.player.defense = playerState.defense;
        this.updateUI();
      }
    });

    // 카드 추가
    EventBus.on('console-add-card', (cardName: string) => {
      if (this.deckManager && this.cardHandManager) {
        // 이미 로드된 카드 데이터 사용 (PreloadScene에서 로드됨)
        const cardsData = this.cache.json.get('cards') as any[];
        if (!cardsData) {
          console.warn('[Console] Cards data not loaded');
          return;
        }
        
        const card = cardsData.find((c: any) => c.name === cardName || c.name.toLowerCase() === cardName.toLowerCase());
        
        if (card) {
          // 카드를 핸드에 추가 (drawCards 메서드 사용)
          const handSize = this.cardHandManager.getHandSize();
          // 덱에 카드를 추가한 후 드로우
          (this.deckManager as any).deck.push({ ...card });
          this.cardHandManager.drawCards(1, () => {
            this.updateDeckInfo();
          });
        } else {
          console.warn(`[Console] Card not found: ${cardName}`);
        }
      }
    });

    // 카드 뽑기
    EventBus.on('console-draw-cards', (count: number) => {
      if (this.cardHandManager) {
        this.cardHandManager.drawCards(count, () => {
          this.updateUI();
          this.updateDeckInfo();
        });
      }
    });

    // 적 피해
    EventBus.on('console-damage-enemy', ({ index, amount }: { index: number; amount: number }) => {
      if (this.battleManager) {
        const enemies = this.battleManager.getAllEnemies();
        if (enemies[index]) {
          enemies[index].takeDamage(amount);
          this.updateUI();
        }
      }
    });

    // 적 치유
    EventBus.on('console-heal-enemy', ({ index, amount }: { index: number; amount: number }) => {
      if (this.battleManager) {
        const enemies = this.battleManager.getAllEnemies();
        if (enemies[index]) {
          const enemy = enemies[index] as any;
          enemy.health = Math.min(enemy.maxHealth || 100, (enemy.health || 0) + amount);
          enemy.updateHealthBar();
          this.updateUI();
        }
      }
    });

    // 다음 턴
    EventBus.on('console-next-turn', () => {
      if (this.battleManager) {
        if (this.battleManager.getTurn() === 'player') {
          this.endPlayerTurn();
        } else {
          this.startPlayerTurn();
        }
      }
    });

    // 전투 승리
    EventBus.on('console-win-battle', () => {
      this.winBattle();
    });

    // 전투 패배
    EventBus.on('console-lose-battle', () => {
      this.checkGameOver();
    });
  }

  /**
   * 콘솔 명령어 이벤트 리스너 제거
   */
  private unregisterConsoleCommands(): void {
    EventBus.off('console-damage-player');
    EventBus.off('console-heal-player');
    EventBus.off('console-set-energy');
    EventBus.off('console-set-defense');
    EventBus.off('console-add-card');
    EventBus.off('console-draw-cards');
    EventBus.off('console-damage-enemy');
    EventBus.off('console-heal-enemy');
    EventBus.off('console-next-turn');
    EventBus.off('console-win-battle');
    EventBus.off('console-lose-battle');
  }
}
