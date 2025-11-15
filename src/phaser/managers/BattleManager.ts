import Enemy from '../objects/Enemy';

// Interfaces
export interface CardData {
  name: string;
  damage?: number;
  block?: number;
  heal?: number;
  energy?: number;
  cost: number;
  allEnemies?: boolean;
  hits?: number;
  selfDamage?: number;
  description: string;
}

export interface NormalizedCardData {
  name: string;
  type: string;
  cost: number;
  value: number;
  allEnemies: boolean;
  hits: number;
  selfDamage: number;
  description: string;
  rawData: CardData;
}

export interface EnemyIntent {
  type: 'attack' | 'defend';
  value: number;
}

export interface EnemyData {
  name: string;
  attack?: number;
  defense?: number;
}

export interface PlayerState {
  health: number;
  maxHealth: number;
  energy: number;
  maxEnergy: number;
  defense: number;
}

export interface StageData {
  id: string;
  data: {
    enemies: string[];
    type: string;
    nextStages?: string[];
  };
}

export interface GameState {
  player: PlayerState;
  deck: CardData[];
  stagesCleared: string[];
  currentStage: string;
}

// Callbacks for UI updates
export interface BattleCallbacks {
  onPlayerTurnStart?: () => void;
  onEnemyTurnStart?: () => void;
  onEnemyAction?: (enemy: Enemy, intent: EnemyIntent) => void;
  onPlayerTakeDamage?: (actualDamage: number, blockedDamage: number) => void;
  onEnemyDefeated?: (enemy: Enemy) => void;
  onBattleEnd?: (victory: boolean) => void;
  onPlayerEnergyChange?: (energy: number) => void;
  onPlayerDefenseChange?: (defense: number) => void;
  onPlayerHealthChange?: (health: number) => void;
}

/**
 * 전투 로직을 관리하는 클래스
 * 턴 관리, 카드 사용, 적 행동 등을 처리합니다.
 */
export default class BattleManager {
  private turn: 'player' | 'enemy' = 'player';
  private playerState: PlayerState;
  private enemies: Enemy[];
  private callbacks: BattleCallbacks;

  constructor(playerState: PlayerState, enemies: Enemy[], callbacks: BattleCallbacks = {}) {
    this.playerState = playerState;
    // 배열 참조를 복사 (배열 자체를 복사하지 않음)
    this.enemies = enemies;
    this.callbacks = callbacks;
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

    // 에너지 회복
    this.playerState.energy = this.playerState.maxEnergy;

    // 방어도 초기화
    this.playerState.defense = 0;

    if (this.callbacks.onPlayerTurnStart) {
      this.callbacks.onPlayerTurnStart();
    }

    if (this.callbacks.onPlayerEnergyChange) {
      this.callbacks.onPlayerEnergyChange(this.playerState.energy);
    }

    if (this.callbacks.onPlayerDefenseChange) {
      this.callbacks.onPlayerDefenseChange(this.playerState.defense);
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
  public useCard(cardData: NormalizedCardData, target: Enemy | null = null, allEnemies: Enemy[] = []): boolean {
    // 에너지 확인
    if (this.playerState.energy < cardData.cost) {
      return false; // 에너지 부족
    }

    // 에너지 소모
    this.playerState.energy -= cardData.cost;

    if (this.callbacks.onPlayerEnergyChange) {
      this.callbacks.onPlayerEnergyChange(this.playerState.energy);
    }

    // 카드 효과 적용
    if (cardData.type === '공격') {
      if (cardData.allEnemies) {
        // 모든 적에게 공격
        allEnemies.forEach(enemy => {
          if (!enemy.isDead()) {
            for (let i = 0; i < cardData.hits; i++) {
              enemy.takeDamage(cardData.value);
            }
          }
        });
      } else if (target) {
        // 단일 적 공격
        for (let i = 0; i < cardData.hits; i++) {
          target.takeDamage(cardData.value);
        }
      }

      // 자신에게 피해
      if (cardData.selfDamage) {
        this.playerTakeDamage(cardData.selfDamage);
      }
    } else if (cardData.type === '방어') {
      this.playerState.defense += cardData.value;

      if (this.callbacks.onPlayerDefenseChange) {
        this.callbacks.onPlayerDefenseChange(this.playerState.defense);
      }
    } else if (cardData.type === '치유') {
      this.playerState.health = Math.min(
        this.playerState.maxHealth,
        this.playerState.health + cardData.value
      );

      if (this.callbacks.onPlayerHealthChange) {
        this.callbacks.onPlayerHealthChange(this.playerState.health);
      }
    } else if (cardData.type === '에너지') {
      this.playerState.energy += cardData.value;

      if (this.callbacks.onPlayerEnergyChange) {
        this.callbacks.onPlayerEnergyChange(this.playerState.energy);
      }
    }

    return true; // 카드 사용 성공
  }

  /**
   * 플레이어가 피해를 받습니다.
   * Character.takeDamage()와 동일한 로직으로 방어도를 올바르게 처리합니다.
   */
  public playerTakeDamage(amount: number): void {
    // 방어도로 막을 수 있는 데미지 계산
    const blockedDamage = Math.min(this.playerState.defense, amount);
    // 실제 체력에 들어가는 데미지
    const actualDamage = Math.max(0, amount - this.playerState.defense);
    
    // 방어도는 실제로 막은 데미지만큼만 감소 (중요: 전체 데미지가 아닌 막은 데미지만큼)
    this.playerState.defense = Math.max(0, this.playerState.defense - blockedDamage);
    
    // 체력 감소
    this.playerState.health = Math.max(0, this.playerState.health - actualDamage);

    if (this.callbacks.onPlayerTakeDamage) {
      this.callbacks.onPlayerTakeDamage(actualDamage, blockedDamage);
    }

    if (this.callbacks.onPlayerHealthChange) {
      this.callbacks.onPlayerHealthChange(this.playerState.health);
    }

    if (this.callbacks.onPlayerDefenseChange) {
      this.callbacks.onPlayerDefenseChange(this.playerState.defense);
    }
  }

  /**
   * 적이 패배했을 때 호출됩니다.
   */
  public onEnemyDefeated(enemy: Enemy): void {
    const index = this.enemies.indexOf(enemy);
    if (index > -1) {
      this.enemies.splice(index, 1);
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
    const aliveEnemies = this.enemies.filter(e => !e.isDead());

    if (aliveEnemies.length === 0) {
      // 승리
      if (this.callbacks.onBattleEnd) {
        this.callbacks.onBattleEnd(true);
      }
    } else if (this.playerState.health <= 0) {
      // 패배
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
    const healAmount = Math.floor(this.playerState.maxHealth * healPercent);
    this.playerState.health = Math.min(
      this.playerState.maxHealth,
      this.playerState.health + healAmount
    );

    // 다음 스테이지 설정
    const nextStages = selectedStage.data.nextStages;
    if (nextStages && nextStages.length > 0) {
      gameState.currentStage = nextStages[0];
    }

    if (this.callbacks.onPlayerHealthChange) {
      this.callbacks.onPlayerHealthChange(this.playerState.health);
    }
  }

  /**
   * 플레이어 상태를 반환합니다.
   */
  public getPlayerState(): Readonly<PlayerState> {
    return { ...this.playerState };
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

