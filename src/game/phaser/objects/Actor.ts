import Phaser from 'phaser';
import type BattleScene from '../scenes/BattleScene';
import { textStyle } from '../managers/TextStyleManager';
import { tweenConfig } from '../managers/TweenConfigManager';
import { Logger } from '../../utils/Logger';

/**
 * Actor - Player와 Enemy의 공통 베이스 클래스
 * 체력, 방어력, 데미지 처리 등 공통 기능을 제공
 */
export default abstract class Actor extends Phaser.GameObjects.Container {
  declare scene: BattleScene;
  health       : number;
  maxHealth    : number;
  defense      : number;
  healthText!  : Phaser.GameObjects.Text;
  defenseText! : Phaser.GameObjects.Text;

  constructor(scene: BattleScene, x: number, y: number) {
    super(scene, x, y);
    this.health    = 0;
    this.maxHealth = 0;
    this.defense   = 0;
  }

  /**
   * 데미지를 받는 공통 로직
   * 1. 방어력으로 먼저 데미지 차단
   * 2. 남은 데미지를 체력에서 차감
   * 3. UI 업데이트 및 애니메이션 실행
   */
  takeDamage(amount: number): void {
    Logger.debug(`${this.constructor.name} takeDamage called - amount: ${amount}, defense: ${this.defense}, health: ${this.health}`);

    let damageToHealth = amount;
    let fullBlock = false;

    // 방어력이 있으면 먼저 방어력에서 차감
    if (this.defense > 0) {
      const blockedDamage = Math.min(this.defense, amount);
      this.defense -= blockedDamage;
      damageToHealth = amount - blockedDamage;

      Logger.debug(`  -> Blocked: ${blockedDamage}, Remaining damage: ${damageToHealth}, New defense: ${this.defense}`);
      // 막힌 데미지 표시
      if (blockedDamage > 0) {
        this.showBlockedDamage(blockedDamage);
      }

      // 모든 데미지를 방어로 막았는지 확인
      fullBlock = damageToHealth === 0;
      if (fullBlock) {
        // 방어막 이펙트 표시
        this.scene.sound.play('block', { volume: 0.5 });
        if (this.playDefendAnimation) {
          this.playDefendAnimation();
        }
      }
    }

    // 방어력으로 막지 못한 나머지 데미지만 체력에서 차감
    if (damageToHealth > 0) {
      this.health = Math.max(0, this.health - damageToHealth);
      Logger.debug(`  -> Health damage: ${damageToHealth}, New health: ${this.health}`);
      this.showDamageNumber(damageToHealth);
      this.playDamageSound(damageToHealth);
      this.playHitAnimation();
    }
    this.updateDefenseDisplay();
    this.updateHealthDisplay();
  }

  applyDefense(amount: number): void {
    this.scene.sound.play('defend', { volume: 0.25 });

    this.defense += amount;
    this.updateDefenseDisplay();
  }

  protected showBlockedDamage(amount: number): void {
    const blockText = this.scene.add.text(this.x-40, this.y-50, `🛡️-${amount}`,
      textStyle.getStyle('damage.defenseBlock')
    );
    blockText.setOrigin(0.5);

    tweenConfig.apply(this.scene, 'ui.defensePopup', blockText, {
      y: blockText.y,
      onComplete: () => blockText.destroy()
    });
  }

  protected showDamageNumber(amount: number): void {
    const damageText = this.scene.add.text(this.x+40, this.y-50, `-${amount} HP`,
      textStyle.getStyle('damage.hp')
    );
    damageText.setOrigin(0.5);

    tweenConfig.apply(this.scene, 'ui.damageText', damageText, {
      y: damageText.y,
      onComplete: () => damageText.destroy()
    });
  }

  isDead(): boolean {
    return this.health <= 0;
  }

  playDamageSound(damage : number): void {
    if (damage >= 15) {
      this.scene.sound.play('damage-big', { volume: 0.25 });
    } else {
      this.scene.sound.play('damage-small', { volume: 0.25 });
    }
  }

  protected updateHealthDisplay(): void {
    if (this.healthText) {
      this.healthText.setText(this.health.toString());
    }
  }

  protected updateDefenseDisplay(): void {
    if (this.defenseText) {
      this.defenseText.setText(this.defense.toString());
    }
  }

  protected abstract playHitAnimation(): void;
  protected playDefendAnimation?(): void;
}
