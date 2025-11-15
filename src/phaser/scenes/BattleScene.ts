import Phaser from 'phaser';
import Enemy from '../objects/Enemy';
import Player from '../objects/Player';
import DeckManager from '../managers/DeckManager';
import BattleManager, { BattleCallbacks, CardData, EnemyData } from '../managers/BattleManager';
import BattleUIManager from '../managers/BattleUIManager';
import CardHandManager from '../managers/CardHandManager';
import CardViewManager from '../managers/CardViewManager';
import BattleEventManager from '../managers/BattleEventManager';

// Interfaces
interface StageData {
  id: string;
  data: {
    enemies: string[];
    type: string;
    nextStages?: string[];
  };
}

interface GameState {
  player: {
    health: number;
    maxHealth: number;
    energy: number;
    maxEnergy: number;
    defense: number;
  };
  deck: CardData[];
  stagesCleared: string[];
  currentStage: string;
}

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

  private enemies: Enemy[] = [];
  private gameState!: GameState;
  private selectedStage!: StageData;
  private playerCharacter!: Player;
  private debugOverlay: Phaser.GameObjects.Container | null = null;
  private inspectButton!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'BattleScene' });
  }

  init(): void {
    this.deckManager = new DeckManager();
    this.enemies = [];
  }

  shutdown(): void {
    console.log('[BattleScene] shutdown called');

    // 이벤트 리스너 정리
    if (this.eventManager) {
      this.eventManager.unregisterEventListeners();
    }

    // 적 객체 정리
    this.enemies.forEach(enemy => {
      if (enemy && enemy.scene) {
        enemy.destroy();
      }
    });
    this.enemies = [];

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
  }

  create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 배경
    this.add.rectangle(0, 0, width, height, 0x0f0f1e).setOrigin(0);

    // 게임 상태 가져오기
    this.gameState = this.registry.get('gameState');
    this.selectedStage = this.registry.get('selectedStage');

    // 플레이어 캐릭터 생성
    this.createPlayerCharacter();

    // UI Manager와 Card Managers 먼저 초기화 (BattleManager는 적 생성 후)
    this.uiManager = new BattleUIManager(this);
    this.cardHandManager = new CardHandManager(this, this.deckManager, this.uiManager);
    this.cardHandManager.initializeHandContainer();
    this.cardViewManager = new CardViewManager(this);

    // UI 생성
    this.createUI();

    // Inspect 버튼 생성
    this.createInspectButton();

    // 적 생성 (BattleManager 초기화 전에 먼저 생성)
    this.createEnemies();

    // BattleManager 초기화 (적이 생성된 후)
    this.initializeBattleManager();

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

    // 초기 덱 설정
    this.setupDeck();

    // 적 의도 설정
    this.enemies.forEach(enemy => {
      const enemyData: EnemyData = (enemy as any).enemyData;
      this.battleManager.setEnemyIntent(enemy, enemyData, () => Phaser.Math.Between(0, 100) / 100);
    });

    // 첫 턴 시작
    this.startPlayerTurn();
  }

  // initializeManagers는 더 이상 사용하지 않음 (create에서 직접 처리)

  private initializeBattleManager(): void {
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
        // BattleManager와 BattleScene이 같은 enemies 배열을 공유하므로
        // BattleManager.onEnemyDefeated()에서 이미 배열 처리 완료
        // 여기서는 추가 UI 업데이트만 필요하면 처리
        console.log(`[BattleScene] onEnemyDefeated callback - Enemy removed, remaining: ${this.enemies.length}`);
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

    this.battleManager = new BattleManager(this.gameState.player, this.enemies, callbacks);
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

  private createEnemies(): void {
    const width = this.cameras.main.width;
    const enemiesData: Record<string, EnemyData> = this.registry.get('enemiesData');
    const stageEnemies: string[] = this.selectedStage.data.enemies;

    console.log(`[BattleScene] createEnemies - Stage: ${this.selectedStage.id}, Expected enemies:`, stageEnemies);

    const spacing = Math.min(300, width / (stageEnemies.length + 1));
    const startX = (width - (spacing * (stageEnemies.length - 1))) / 2;

    stageEnemies.forEach((enemyName: string, index: number) => {
      const enemyData = enemiesData[enemyName];
      if (enemyData) {
        const x = startX + (index * spacing);
        const y = 220; // 적들을 상단에 배치

        const enemy = new Enemy(this, x, y, enemyData, index);
        this.enemies.push(enemy);
      }
    });

    console.log(`[BattleScene] createEnemies - Created ${this.enemies.length} enemies`);
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
    // BattleManager에서 승리 처리
    this.battleManager.winBattle(this.selectedStage, this.gameState);

    // gameState 동기화
    const playerState = this.battleManager.getPlayerState();
    this.gameState.player = { ...playerState };

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

  private createInspectButton(): void {
    const width = this.cameras.main.width;

    const button = this.add.container(width - 200, 130);

    const bg = this.add.rectangle(0, 0, 150, 50, 0x4ecdc4);
    bg.setStrokeStyle(3, 0xffffff);

    const text = this.add.text(0, 0, '🔍 Inspect', {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff'
    });
    text.setOrigin(0.5);

    button.add([bg, text]);
    button.setSize(150, 50);
    button.setInteractive({ useHandCursor: true });

    button.on('pointerover', () => {
      this.tweens.add({
        targets: button,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 100
      });
      bg.setFillStyle(0x5ee4db);
    });

    button.on('pointerout', () => {
      this.tweens.add({
        targets: button,
        scaleX: 1,
        scaleY: 1,
        duration: 100
      });
      bg.setFillStyle(0x4ecdc4);
    });

    button.on('pointerdown', () => {
      this.toggleDebugOverlay();
    });

    this.inspectButton = button;
  }

  private toggleDebugOverlay(): void {
    if (this.debugOverlay) {
      // 오버레이가 이미 있으면 제거
      this.debugOverlay.destroy();
      this.debugOverlay = null;
    } else {
      // 오버레이 생성
      this.createDebugOverlay();
    }
  }

  private createDebugOverlay(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 반투명 배경이 있는 컨테이너
    const overlay = this.add.container(0, 0);
    overlay.setDepth(1000); // 최상위에 표시

    // 반투명 배경
    const darkBg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);
    darkBg.setInteractive();
    overlay.add(darkBg);

    // 메인 패널
    const panelWidth = 700;
    const panelHeight = 600;
    const panel = this.add.rectangle(width / 2, height / 2, panelWidth, panelHeight, 0x2c3e50);
    panel.setStrokeStyle(4, 0x4ecdc4);
    overlay.add(panel);

    // 타이틀
    const title = this.add.text(width / 2, height / 2 - panelHeight / 2 + 30, '🔍 Debug Inspector', {
      fontSize: '28px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#4ecdc4'
    });
    title.setOrigin(0.5);
    overlay.add(title);

    // 닫기 버튼
    const closeBtn = this.add.text(width / 2 + panelWidth / 2 - 40, height / 2 - panelHeight / 2 + 30, '✕', {
      fontSize: '32px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ff6b6b'
    });
    closeBtn.setOrigin(0.5);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => {
      this.toggleDebugOverlay();
    });
    closeBtn.on('pointerover', () => {
      closeBtn.setScale(1.2);
    });
    closeBtn.on('pointerout', () => {
      closeBtn.setScale(1);
    });
    overlay.add(closeBtn);

    // 디버그 정보 수집
    const debugInfo = this.collectDebugInfo();

    // 스크롤 가능한 텍스트 영역
    const contentY = height / 2 - panelHeight / 2 + 80;
    const content = this.add.text(width / 2 - panelWidth / 2 + 30, contentY, debugInfo, {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ffffff',
      lineSpacing: 4,
      wordWrap: { width: panelWidth - 60 }
    });
    overlay.add(content);

    this.debugOverlay = overlay;

    // 배경 클릭시 닫기
    darkBg.on('pointerdown', () => {
      this.toggleDebugOverlay();
    });
  }

  private collectDebugInfo(): string {
    let info = '';

    // BattleScene 정보
    info += '═══════════════════════════════════════\n';
    info += '📋 BATTLE SCENE\n';
    info += '═══════════════════════════════════════\n';
    info += `Current Stage: ${this.selectedStage?.id || 'N/A'}\n`;
    info += `Scene Active: ${this.scene.isActive()}\n`;
    info += `Scene Visible: ${this.scene.isVisible()}\n`;
    info += '\n';

    // BattleManager 정보
    info += '═══════════════════════════════════════\n';
    info += '⚔️  BATTLE MANAGER\n';
    info += '═══════════════════════════════════════\n';
    if (this.battleManager) {
      const allEnemies = this.battleManager.getAllEnemies();
      const aliveEnemies = this.battleManager.getAliveEnemies();
      info += `Total Enemies in Array: ${allEnemies.length}\n`;
      info += `Alive Enemies: ${aliveEnemies.length}\n`;
      info += '\nEnemy Details:\n';
      allEnemies.forEach((enemy, index) => {
        const enemyData = (enemy as any).enemyData;
        const isDead = enemy.isDead();
        const hasScene = !!enemy.scene;
        info += `  [${index}] ${enemyData?.name || 'Unknown'}\n`;
        info += `      HP: ${enemy.health}/${enemy.maxHealth}\n`;
        info += `      Dead: ${isDead}\n`;
        info += `      Has Scene: ${hasScene}\n`;
        info += `      Active: ${enemy.active}\n`;
      });

      const playerState = this.battleManager.getPlayerState();
      info += `\nPlayer State:\n`;
      info += `  HP: ${playerState.health}/${playerState.maxHealth}\n`;
      info += `  Energy: ${playerState.energy}/${playerState.maxEnergy}\n`;
      info += `  Defense: ${playerState.defense}\n`;
      info += `  Turn: ${this.battleManager.getTurn()}\n`;
    } else {
      info += 'BattleManager not initialized!\n';
    }
    info += '\n';

    // BattleScene.enemies 배열 정보
    info += '═══════════════════════════════════════\n';
    info += '👾 SCENE ENEMIES ARRAY\n';
    info += '═══════════════════════════════════════\n';
    info += `Scene.enemies.length: ${this.enemies.length}\n`;
    this.enemies.forEach((enemy, index) => {
      const enemyData = (enemy as any).enemyData;
      info += `  [${index}] ${enemyData?.name || 'Unknown'} (HP: ${enemy.health})\n`;
    });
    info += '\n';

    // BattleEventManager 정보
    info += '═══════════════════════════════════════\n';
    info += '🎯 BATTLE EVENT MANAGER\n';
    info += '═══════════════════════════════════════\n';
    if (this.eventManager) {
      info += `EventManager initialized: Yes\n`;
      info += `(EventManager no longer maintains enemies array)\n`;
    } else {
      info += 'EventManager not initialized!\n';
    }
    info += '\n';

    // Scene Events 정보
    info += '═══════════════════════════════════════\n';
    info += '📡 SCENE EVENTS\n';
    info += '═══════════════════════════════════════\n';
    const sceneEvents = this.events as any;
    const eventNames = ['cardClicked', 'enemyClicked', 'enemyDefeated'];
    eventNames.forEach(eventName => {
      const listeners = sceneEvents._events?.[eventName] || [];
      const count = Array.isArray(listeners) ? listeners.length : (listeners ? 1 : 0);
      info += `${eventName}: ${count} listener(s)\n`;
    });
    info += '\n';

    // 카드 핸드 정보
    info += '═══════════════════════════════════════\n';
    info += '🎴 CARD HAND\n';
    info += '═══════════════════════════════════════\n';
    if (this.cardHandManager) {
      const handSize = this.cardHandManager.getHandSize();
      const hand = this.cardHandManager.getHand();
      info += `Hand Size: ${handSize}\n`;
      hand.forEach((card, index) => {
        const cardData = (card as any).cardData;
        info += `  [${index}] ${cardData?.name || 'Unknown'}\n`;
      });
    } else {
      info += 'CardHandManager not initialized!\n';
    }
    info += '\n';

    // 덱 정보
    info += '═══════════════════════════════════════\n';
    info += '📚 DECK MANAGER\n';
    info += '═══════════════════════════════════════\n';
    if (this.deckManager) {
      info += `Deck Size: ${this.deckManager.getDeckSize()}\n`;
      info += `Discard Size: ${this.deckManager.getDiscardPileSize()}\n`;
      const totalCards = this.deckManager.getDeckSize() +
                        this.deckManager.getDiscardPileSize() +
                        (this.cardHandManager?.getHandSize() || 0);
      info += `Total Cards: ${totalCards}\n`;
    } else {
      info += 'DeckManager not initialized!\n';
    }

    return info;
  }
}
