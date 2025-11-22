import Enemy from '../objects/Enemy';
import Player from '../objects/Player';
import { CardData, EnemyData, PlayerState, StageData, GameState } from '../../../types';

export interface EnemyIntent {
  type: 'attack' | 'defend';
  value: number;
}

// 공통 타입 재 export (하위 호환성)
export type { CardData, EnemyData, PlayerState, StageData, GameState };

// Callbacks for UI updates
export interface BattleCallbacks {
  onPlayerTurnStart?    : () => void;
  onEnemyTurnStart?     : () => void;
  onEnemyAction?        : (enemy: Enemy, intent: EnemyIntent) => void;
  onEnemyDefeated?      : (enemy: Enemy) => void;
  onBattleEnd?          : (victory: boolean) => void;
}

/**
 * 전투 로직을 관리하는 클래스
 * 턴 관리, 카드 사용, 적 행동 등을 처리합니다.
 *
 * Player 객체가 자체 상태를 관리하며,
 * BattleManager는 Player 참조를 통해 상태에 접근합니다.
 */
export default class BattleManager {
  private turn      : 'player' | 'enemy' = 'player';
  private player    : Player;
  private enemies   : Enemy[];
  private callbacks : BattleCallbacks;

  constructor(player: Player, enemies: Enemy[], callbacks: BattleCallbacks = {}) {
    this.player    = player;
    this.enemies   = enemies;
    this.callbacks = callbacks;
    console.log(`[BattleManager] Created with ${enemies.length} enemies:`, enemies.map((e: any) => e.enemyData?.name));
  }

  /**
   * 현재 턴을 반환합니다.
   */
  public getTurn(): 'player' | 'enemy' {
    return this.turn;
  }

  /**
   * 플레이어 턴을 시작합니다.
   */
  public startPlayerTurn(): void {
    this.turn = 'player';

    // 에너지 회복 및 방어도 초기화
    this.player.setEnergy(this.player.maxEnergy);
    this.player.resetDefense();

    if (this.callbacks.onPlayerTurnStart) {
      this.callbacks.onPlayerTurnStart();
    }
  }

  /**
   * 플레이어 턴을 종료합니다.
   */
  public endPlayerTurn(): void {
    this.turn = 'enemy';
  }

  /**
   * 적 턴을 시작합니다.
   */
  public startEnemyTurn(): void {
    this.turn = 'enemy';

    if (this.callbacks.onEnemyTurnStart) {
      this.callbacks.onEnemyTurnStart();
    }
  }

  /**
   * 적의 행동을 실행합니다.
   */
  public executeEnemyAction(enemy: Enemy): void {
    const intent: EnemyIntent = (enemy as any).intent;

    if (intent.type === 'attack') {
      if (this.callbacks.onEnemyAction) {
        this.callbacks.onEnemyAction(enemy, intent);
      }
      // 실제 피해는 콜백에서 처리 (애니메이션 후)
    } else if (intent.type === 'defend') {
      // 적 방어도 증가
      enemy.applyDefense(intent.value);
    }
  }

  /**
   * 적의 다음 의도를 설정합니다.
   */
  public setEnemyIntent(enemy: Enemy, enemyData: EnemyData, randomFn?: () => number): void {
    // 랜덤 함수가 제공되지 않으면 기본 Math.random 사용
    const random = randomFn || (() => Math.random());
    
    // 적 데이터에 따라 의도 설정
    if (enemyData.defense && random() * 100 < 30) {
      // 30% 확률로 방어
      enemy.setIntent({ type: 'defend', value: enemyData.defense });
    } else if (enemyData.attack) {
      // 기본은 공격
      enemy.setIntent({ type: 'attack', value: enemyData.attack });
    } else {
      // 공격력이 없으면 랜덤
      const damage = Math.floor(random() * 6) + 5; // 5-10
      enemy.setIntent({ type: 'attack', value: damage });
    }
  }

  /**
   * 카드를 사용합니다.
   */
  public useCard(cardData: CardData, target: Enemy | null = null): boolean {
    console.log(`[BattleManager] useCard - ${cardData.name}, Current enemies in BattleManager:`, this.enemies.map((e: any) => e.enemyData?.name));

    // 에너지 확인
    if (!this.player.consumeEnergy(cardData.cost)) {
      return false; // 에너지 부족
    }

    // 카드 효과 적용 (type으로 언어 독립적 체크)
    if (cardData.type === 'attack' && cardData.damage) {
      const hits = cardData.hits || 1;

      if (cardData.allEnemies) {
        // 모든 적에게 공격 (내부 enemies 배열 사용)
        console.log(`[BattleManager] useCard - Attacking all enemies, count: ${this.enemies.length}`);
        this.enemies.forEach(enemy => {
          if (!enemy.isDead()) {
            for (let i = 0; i < hits; i++) {
              enemy.takeDamage(cardData.damage!);
            }
          }
        });
      } else if (target) {
        // 단일 적 공격
        console.log(`[BattleManager] useCard - Attacking single target: ${(target as any).enemyData?.name}`);
        for (let i = 0; i < hits; i++) {
          target.takeDamage(cardData.damage);
        }
      }

      // 자신에게 피해
      if (cardData.selfDamage) {
        this.player.takeDamage(cardData.selfDamage);
      }
    } else {
      // 비공격 카드 처리 (속성으로 체크)
      if (cardData.block) {
        this.player.applyDefense(cardData.block);
      } else if (cardData.heal) {
        this.player.heal(cardData.heal);
      } else if (cardData.energy) {
        this.player.setEnergy(this.player.energy + cardData.energy);
      }
    }

    return true; // 카드 사용 성공
  }
  /**
   * 적이 패배했을 때 호출됩니다.
   */
  public onEnemyDefeated(enemy: Enemy): void {
    console.log(`[BattleManager] onEnemyDefeated - Enemy: ${(enemy as any).enemyData?.name}, enemy.active: ${enemy.active}`);

    // 좀비 Enemy 체크 - 이미 파괴된 적이면 무시
    if (!enemy.active) {
      console.warn(`[BattleManager] onEnemyDefeated - Ignoring inactive/destroyed enemy: ${(enemy as any).enemyData?.name}`);
      return;
    }

    console.log(`[BattleManager] onEnemyDefeated - Current enemies array:`, this.enemies.map((e: any) => e.enemyData?.name));
    const index = this.enemies.indexOf(enemy);
    console.log(`[BattleManager] onEnemyDefeated - Enemy index in array: ${index}, Total enemies before: ${this.enemies.length}`);

    if (index > -1) {
      this.enemies.splice(index, 1);
      console.log(`[BattleManager] onEnemyDefeated - Removed enemy, Total enemies after: ${this.enemies.length}`);
      console.log(`[BattleManager] onEnemyDefeated - Remaining enemies:`, this.enemies.map((e: any) => e.enemyData?.name));
    } else {
      console.warn(`[BattleManager] onEnemyDefeated - Enemy not found in enemies array!`);
      console.warn(`[BattleManager] onEnemyDefeated - Looking for:`, (enemy as any).enemyData?.name);
      console.warn(`[BattleManager] onEnemyDefeated - Current array:`, this.enemies.map((e: any) => e.enemyData?.name));
      // Enemy가 배열에 없으면 이미 다른 BattleManager의 적일 가능성이 높음
      return;
    }

    if (this.callbacks.onEnemyDefeated) {
      this.callbacks.onEnemyDefeated(enemy);
    }

    this.checkBattleEnd();
  }
  /**
   * 전투 종료를 확인합니다.
   */
  public checkBattleEnd(): void {
    console.log(`[BattleManager] checkBattleEnd - Total enemies: ${this.enemies.length}`);
    const aliveEnemies = this.enemies.filter(e => !e.isDead());
    console.log(`[BattleManager] checkBattleEnd - Alive enemies: ${aliveEnemies.length}`, aliveEnemies.map((e: any) => ({ name: e.enemyData?.name, health: e.health })));

    if (aliveEnemies.length === 0) {
      // 승리
      console.log('[BattleManager] Battle won!');
      if (this.callbacks.onBattleEnd) {
        this.callbacks.onBattleEnd(true);
      }
    } else if (this.player.isDead()) {
      // 패배
      console.log('[BattleManager] Battle lost!');
      if (this.callbacks.onBattleEnd) {
        this.callbacks.onBattleEnd(false);
      }
    }
  }
  /**
   * 전투 승리 처리를 합니다.
   */
  public winBattle(selectedStage: StageData, gameState: GameState): void {
    // 스테이지 클리어 처리
    if (!gameState.stagesCleared.includes(selectedStage.id)) {
      gameState.stagesCleared.push(selectedStage.id);
    }

    // 체력 회복
    const healPercent = selectedStage.data.type === '보스' ? 0.6 :
                        selectedStage.data.type === '중보스' ? 0.4 : 0.25;

    const healAmount = Math.floor(this.player.maxHealth * healPercent);
    this.player.heal(healAmount);

    // 다음 스테이지 설정
    const nextStages = selectedStage.data.nextStages;
    if (nextStages && nextStages.length > 0) {
      gameState.currentStage = nextStages[0];
    }
  }
  /**
   * 플레이어 상태를 반환합니다.
   */
  public getPlayerState(): PlayerState {
    return this.player.getState();
  }
  /**
   * Player 객체를 반환합니다.
   */
  public getPlayer(): Player {
    return this.player;
  }
  /**
   * 살아있는 적 목록을 반환합니다.
   */
  public getAliveEnemies(): Enemy[] {
    return this.enemies.filter(e => !e.isDead());
  }
  /**
   * 모든 적 목록을 반환합니다.
   */
  public getAllEnemies(): Enemy[] {
    return [...this.enemies];
  }
}

