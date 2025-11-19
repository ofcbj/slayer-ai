import Enemy from '../objects/Enemy';
import { CardData, EnemyData, PlayerState, StageData, GameState } from '../../../types';
import { PlayerStateObservable } from '../state/PlayerStateObservable';

// BattleManager 전용 인터페이스
export interface NormalizedCardData {
  name        : string;
  type        : string;
  cost        : number;
  value       : number;
  allEnemies  : boolean;
  hits        : number;
  selfDamage  : number;
  description : string;
  rawData     : CardData;
}

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
  onPlayerTakeDamage?   : (actualDamage: number, blockedDamage: number) => void;
  onEnemyDefeated?      : (enemy: Enemy) => void;
  onBattleEnd?          : (victory: boolean) => void;
}

/**
 * 전투 로직을 관리하는 클래스
 * 턴 관리, 카드 사용, 적 행동 등을 처리합니다.
 *
 * PlayerState는 PlayerStateObservable을 통해 관리되며,
 * 모든 상태 변경은 자동으로 구독자들에게 통지됩니다.
 */
export default class BattleManager {
  private turn                  : 'player' | 'enemy' = 'player';
  private playerStateObservable : PlayerStateObservable;
  private enemies               : Enemy[];
  private callbacks             : BattleCallbacks;

  constructor(playerState: PlayerState, enemies: Enemy[], callbacks: BattleCallbacks = {}) {
    this.playerStateObservable = new PlayerStateObservable(playerState);
    this.enemies              = enemies;
    this.callbacks            = callbacks;
    console.log(`[BattleManager] Created with ${enemies.length} enemies:`, enemies.map((e: any) => e.enemyData?.name));
  }

  /**
   * 플레이어 상태 옵저버 구독
   * @returns 구독 해제 함수
   */
  public subscribeToPlayerState(observer: (state: PlayerState) => void): () => void {
    return this.playerStateObservable.subscribe(observer);
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

    // 에너지 회복 및 방어도 초기화 (옵저버가 자동으로 통지)
    this.playerStateObservable.setState(state => {
      state.energy = state.maxEnergy;
      state.defense = 0;
    });

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
  public useCard(cardData: NormalizedCardData, target: Enemy | null = null): boolean {
    console.log(`[BattleManager] useCard - ${cardData.name}, Current enemies in BattleManager:`, this.enemies.map((e: any) => e.enemyData?.name));

    const currentState = this.playerStateObservable.getState();

    // 에너지 확인
    if (currentState.energy < cardData.cost) {
      return false; // 에너지 부족
    }

    // 카드 효과 적용
    if (cardData.type === '공격') {
      // 에너지 소모만 먼저 처리
      this.playerStateObservable.setState(state => {
        state.energy -= cardData.cost;
      });

      if (cardData.allEnemies) {
        // 모든 적에게 공격 (내부 enemies 배열 사용)
        console.log(`[BattleManager] useCard - Attacking all enemies, count: ${this.enemies.length}`);
        this.enemies.forEach(enemy => {
          if (!enemy.isDead()) {
            for (let i = 0; i < cardData.hits; i++) {
              enemy.takeDamage(cardData.value);
            }
          }
        });
      } else if (target) {
        // 단일 적 공격
        console.log(`[BattleManager] useCard - Attacking single target: ${(target as any).enemyData?.name}`);
        for (let i = 0; i < cardData.hits; i++) {
          target.takeDamage(cardData.value);
        }
      }

      // 자신에게 피해
      if (cardData.selfDamage) {
        this.playerTakeDamage(cardData.selfDamage);
      }
    } else {
      // 비공격 카드는 한 번에 처리 (옵저버가 자동으로 통지)
      this.playerStateObservable.setState(state => {
        state.energy -= cardData.cost;

        if (cardData.type === '방어') {
          state.defense += cardData.value;
        } else if (cardData.type === '치유') {
          state.health = Math.min(state.maxHealth, state.health + cardData.value);
        } else if (cardData.type === '에너지') {
          state.energy += cardData.value;
        }
      });
    }

    return true; // 카드 사용 성공
  }

  /**
   * 플레이어가 피해를 받습니다.
   * Character.takeDamage()와 동일한 로직으로 방어도를 올바르게 처리합니다.
   */
  public playerTakeDamage(amount: number): void {
    let actualDamage = 0;
    let blockedDamage = 0;

    // 상태 업데이트 (옵저버가 자동으로 통지)
    this.playerStateObservable.setState(state => {
      // 방어도로 막을 수 있는 데미지 계산
      blockedDamage = Math.min(state.defense, amount);
      // 실제 체력에 들어가는 데미지
      actualDamage  = Math.max(0, amount - state.defense);
      // 방어도는 실제로 막은 데미지만큼만 감소
      state.defense = Math.max(0, state.defense - blockedDamage);
      // 체력 감소
      state.health  = Math.max(0, state.health - actualDamage);
    });

    if (this.callbacks.onPlayerTakeDamage) {
      this.callbacks.onPlayerTakeDamage(actualDamage, blockedDamage);
    }
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
    } else if (this.playerStateObservable.getState().health <= 0) {
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

    // 체력 회복 (옵저버가 자동으로 통지)
    const healPercent = selectedStage.data.type === '보스' ? 0.6 :
                        selectedStage.data.type === '중보스' ? 0.4 : 0.25;

    this.playerStateObservable.setState(state => {
      const healAmount = Math.floor(state.maxHealth * healPercent);
      state.health = Math.min(state.maxHealth, state.health + healAmount);
    });

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
    return this.playerStateObservable.getState();
  }

  /**
   * 플레이어를 치유합니다.
   */
  public healPlayer(amount: number): void {
    this.playerStateObservable.setState(state => {
      state.health = Math.min(state.maxHealth, state.health + amount);
    });
  }

  /**
   * 플레이어 에너지를 설정합니다.
   */
  public setEnergy(amount: number): void {
    this.playerStateObservable.setState(state => {
      state.energy = Math.max(0, Math.min(state.maxEnergy, amount));
    });
  }

  /**
   * 플레이어 방어도를 설정합니다.
   */
  public setDefense(amount: number): void {
    this.playerStateObservable.setState(state => {
      state.defense = Math.max(0, amount);
    });
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

