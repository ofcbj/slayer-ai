import Phaser from 'phaser';
import BattleManager from '../managers/BattleManager';
import { GameState, StageData } from '../managers/BattleManager';

/**
 * 전투 결과 처리를 담당하는 컨트롤러
 * 승리, 패배 조건 확인 및 씬 전환을 처리합니다.
 */
export default class BattleResultHandler {
  constructor(
    private scene         : Phaser.Scene,
    private battleManager : BattleManager,
    private gameState     : GameState,
    private selectedStage : StageData
  ) {}

  /**
   * 게임 오버 확인 및 처리
   */
  checkGameOver(): void {
    if (this.gameState.player.health <= 0) {
      this.scene.time.delayedCall(1000, () => {
        this.scene.scene.start('GameOverScene');
      });
    }
  }

  /**
   * 전투 승리 처리
   */
  winBattle(): void {
    console.log('[BattleResultHandler] winBattle called - Stage:', this.selectedStage?.id);

    // BattleManager에서 승리 처리
    this.battleManager.winBattle(this.selectedStage, this.gameState);

    // gameState 동기화
    const playerState = this.battleManager.getPlayerState();
    this.gameState.player = { ...playerState };

    console.log('[BattleResultHandler] winBattle - Starting RewardScene');
    // 보상 씬으로
    this.scene.scene.start('RewardScene');
  }
}
