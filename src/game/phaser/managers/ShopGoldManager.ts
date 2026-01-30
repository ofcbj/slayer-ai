import Phaser from 'phaser';
import { textStyle } from './TextStyleManager';
import { GameState } from '../../../types';

/**
 * 상점에서 골드 표시 및 관리를 담당하는 매니저
 */
export default class ShopGoldManager {
  private scene: Phaser.Scene;
  private goldContainer!: Phaser.GameObjects.Container;
  private goldText!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * 골드 표시 UI 생성
   */
  createDisplay(gold: number): void {
    const width = this.scene.cameras.main.width;
    this.goldContainer = this.scene.add.container(width - 200, 60);
    
    const goldBg = this.scene.add.rectangle(0, 0, 180, 60, 0x1e293b, 0.95);
    goldBg.setStrokeStyle(3, 0xfbbf24);

    this.goldText = this.scene.add.text(
      0, 0,
      `💰 ${gold}G`,
      textStyle.getStyle('titles.section', { fontSize: '32px', color: '#fbbf24' })
    ).setOrigin(0.5);

    this.goldContainer.add([goldBg, this.goldText]);
  }

  /**
   * 골드 표시 업데이트
   */
  updateDisplay(gold: number): void {
    if (this.goldText) {
      this.goldText.setText(`💰 ${gold}G`);
    }
  }

  /**
   * 골드 소비 및 UI 업데이트
   */
  consumeGold(amount: number): number {
    const gameState: GameState = this.scene.registry.get('gameState');
    gameState.player.gold = (gameState.player.gold || 0) - amount;
    this.updateDisplay(gameState.player.gold);
    
    // 구매 사운드 재생
    this.scene.sound.play('buy', { volume: 0.5 });
    
    return gameState.player.gold;
  }

  /**
   * 현재 골드 반환
   */
  getCurrentGold(): number {
    const gameState: GameState = this.scene.registry.get('gameState');
    return gameState.player.gold || 0;
  }
}
