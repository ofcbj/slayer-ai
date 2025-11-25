import Enemy from '../objects/Enemy';
import Player from '../objects/Player';
import { CardData, EnemyData, PlayerState, StageData, GameState } from '../../../types';
import { Logger } from '../../utils/Logger';
import GameDataManager from './GameDataManager';

export interface EnemyIntent {
  type: 'attack' | 'defend';
  value: number;
}

// 공통 타입 재 export (하위 호환성)
export type { CardData, EnemyData, PlayerState, StageData, GameState };

// Callbacks for UI updates
export interface BattleCallbacks {
  onEnemyDefeated?      : (enemy: Enemy) => void;
  onBattleEnd?          : (victory: boolean) => void;
  onDrawCards?          : (count: number) => void;
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
    Logger.debug(`BattleManager Created with ${enemies.length} enemies:`, enemies.map((e: any) => e.enemyData?.name));
  }

  public getTurn(): 'player' | 'enemy' {
    return this.turn;
  }

  public startPlayerTurn(): void {
    this.turn = 'player';

    // 적들의 버프 지속시간 감소 (턴 시작 시)
    this.enemies.forEach(enemy => {
      if (!enemy.isDead()) {
        enemy.decreaseBuffDurations();
      }
    });

    // 에너지 회복 및 방어도 초기화
    this.player.setEnergy(this.player.maxEnergy);
    this.player.resetDefense();
  }

  public endPlayerTurn(): void {
    this.turn = 'enemy';
  }

  public startEnemyTurn(): void {
    this.turn = 'enemy';
  }

  public executeEnemyAction(enemy: Enemy): void {
    const intent: EnemyIntent = (enemy as any).intent;

    if (intent.type === 'attack') {
      enemy.playAttackAnimation(() => {
        let damage = intent.value;
        // weak 효과: 공격력 50% 감소
        if (enemy.hasBuff('weak')) {
          damage = Math.floor(damage * 0.5);
        }
        // Player에게 직접 데미지 적용
        this.player.takeDamage(damage);
        // 플레이어 사망 시 처리
        if (this.player.isDead()) {
          this.checkBattleEnd();
        }
      });
    } else if (intent.type === 'defend') {
      // 적 방어도 증가
      enemy.applyDefense(intent.value);
    }
  }

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
   * 카드 효과를 적용합니다 (순수 게임 로직만 처리)
   * UI/애니메이션은 BattleEventManager에서 처리
   */
  public applyCardEffects(cardData: CardData, target: Enemy | null = null): boolean {
    Logger.debug(`BattleManager applyCardEffects - ${cardData.name}, Current enemies in BattleManager:`, this.enemies.map((e: any) => e.enemyData?.name));

    // 에너지 확인
    if (!this.player.consumeEnergy(cardData.cost)) {
      return false; // 에너지 부족
    }

    // 카드 효과 적용 (type으로 언어 독립적 체크)
    if (cardData.type === 'attack' && cardData.damage) {
      const hits = cardData.hits || 1;

      if (cardData.allEnemies) {
        // 모든 적에게 공격 (내부 enemies 배열 사용)
        Logger.debug(`BattleManager applyCardEffects - Attacking all enemies, count: ${this.enemies.length}`);
        this.enemies.forEach(enemy => {
          if (!enemy.isDead()) {
            for (let i = 0; i < hits; i++) {
              enemy.takeDamage(cardData.damage!);
            }
          }
        });
      } else if (target) {
        // 단일 적 공격
        Logger.debug(`BattleManager applyCardEffects - Attacking single target: ${(target as any).enemyData?.name}`);
        for (let i = 0; i < hits; i++) {
          target.takeDamage(cardData.damage);
        }
      }
    }

    if (cardData.selfDamage) {
      this.player.takeDamage(cardData.selfDamage);
    }
    if (cardData.block) {
      this.player.applyDefense(cardData.block);
    } 
    if (cardData.heal) {
      this.player.heal(cardData.heal);
    } 
    if (cardData.energy) {
      this.player.setEnergy(this.player.energy + cardData.energy);
    }
    if (cardData.draw) {
      // 카드 드로우 효과
      if (this.callbacks.onDrawCards) {
        this.callbacks.onDrawCards(cardData.draw);
      }
    }
    // 버프 적용
    if (cardData.buff) {
      const gameDataManager = GameDataManager.getInstance();
      const buffDuration = gameDataManager.getBuffDuration(cardData.buff);
      
      if (cardData.allEnemies) {
        // 모든 적에게 버프 적용
        this.enemies.forEach(enemy => {
          if (!enemy.isDead()) {
            enemy.applyBuff(cardData.buff!, buffDuration);
          }
        });
      } else if (target) {
        // 단일 적에게 버프 적용
        target.applyBuff(cardData.buff, buffDuration);
      }
    }
    
    return true; // 카드 사용 성공
  }

  public onEnemyDefeated(enemy: Enemy): void {
    // 좀비 Enemy 체크 - 이미 파괴된 적이면 무시
    if (!enemy.active) {
      return;
    }

    // 적을 배열에서 제거하지 않고 죽은 상태로 유지
    // 이렇게 하면 원래 인덱스(enemyIndex)가 유지되어 단축키 매핑이 일관성 있게 작동함
    // 이미 enemy.isDead()가 true이므로 다른 로직에서 자동으로 필터링됨

    if (this.callbacks.onEnemyDefeated) {
      this.callbacks.onEnemyDefeated(enemy);
    }

    this.checkBattleEnd();
  }

  public checkBattleEnd(): void {
    const aliveEnemies = this.enemies.filter(e => !e.isDead());

    if (aliveEnemies.length === 0) {
      // 승리
      Logger.debug('BattleManager Battle won!');
      if (this.callbacks.onBattleEnd) {
        this.callbacks.onBattleEnd(true);
      }
    } else if (this.player.isDead()) {
      // 패배
      Logger.debug('BattleManager Battle lost!');
      if (this.callbacks.onBattleEnd) {
        this.callbacks.onBattleEnd(false);
      }
    }
  }

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

  public getPlayerState(): PlayerState {
    return this.player.getState();
  }

  public getPlayer(): Player {
    return this.player;
  }

  public getAliveEnemies(): Enemy[] {
    return this.enemies.filter(e => !e.isDead());
  }

  public getAllEnemies(): Enemy[] {
    // 원래 인덱스(enemyIndex) 순서로 정렬하여 반환
    // 이렇게 하면 적이 죽어도 원래 위치 기준으로 단축키가 작동함
    return [...this.enemies].sort((a, b) => a.enemyIndex - b.enemyIndex);
  }
}

