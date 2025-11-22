import Phaser from 'phaser';
import Enemy from '../objects/Enemy';
import BattleManager from '../managers/BattleManager';
import CardHandManager from '../managers/CardHandManager';
import { EnemyData } from '../managers/BattleManager';

/**
 * 전투 턴 흐름을 제어하는 컨트롤러
 * 플레이어 턴과 적 턴의 시작/종료를 관리합니다.
 */
export default class BattleTurnController {
  private canEndTurn: boolean = true;

  constructor(
    private scene           : Phaser.Scene,
    private battleManager   : BattleManager,
    private cardHandManager : CardHandManager,
    private updateDeckInfo  : () => void
  ) {}

  /**
   * 턴 종료 가능 여부를 반환합니다.
   */
  public isEndTurnAllowed(): boolean {
    return this.canEndTurn;
  }

  /**
   * 턴 종료 가능 여부를 설정합니다.
   */
  public setEndTurnAllowed(allowed: boolean): void {
    this.canEndTurn = allowed;
  }

  /**
   * 플레이어 턴 시작
   */
  startPlayerTurn(): void {
    this.canEndTurn = true;
    this.battleManager.startPlayerTurn();
  }

  /**
   * 플레이어 턴 종료
   */
  endPlayerTurn(): void {
    // 턴 종료가 허용되지 않으면 무시
    if (!this.canEndTurn) {
      return;
    }
    // 턴 종료 시작 - 더 이상 턴 종료 불가
    this.canEndTurn = false;
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

  /**
   * 적 턴 시작
   */
  startEnemyTurn(): void {
    // 적 턴 동안에는 턴 종료 불가
    this.canEndTurn = false;

    this.battleManager.startEnemyTurn();

    let delay = 0;
    const aliveEnemies = this.battleManager.getAliveEnemies();

    aliveEnemies.forEach(enemy => {
      this.scene.time.delayedCall(delay, () => {
        this.executeEnemyAction(enemy);
      });
      delay += 1000;
    });

    // 모든 적 행동 후 플레이어 턴
    this.scene.time.delayedCall(delay + 500, () => {
      this.startPlayerTurn();
    });
  }

  /**
   * 적 행동 실행
   */
  private executeEnemyAction(enemy: Enemy): void {
    // BattleManager에서 적 행동 실행 (콜백에서 애니메이션 처리)
    this.battleManager.executeEnemyAction(enemy);

    // 다음 의도 설정
    const enemyData: EnemyData = (enemy as any).enemyData;
    this.battleManager.setEnemyIntent(enemy, enemyData, () => Phaser.Math.Between(0, 100) / 100);
  }
}
