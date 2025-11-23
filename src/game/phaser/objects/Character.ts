import Phaser from 'phaser';
import { textStyle } from '../managers/TextStyleManager';
import { tweenConfig } from '../managers/TweenConfigManager';

/**
 * Character - Player와 Enemy의 공통 베이스 클래스
 * 체력, 방어력, 데미지 처리 등 공통 기능을 제공
 */
export default abstract class Character extends Phaser.GameObjects.Container {
  health: number;
  maxHealth: number;
  defense: number;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    this.health = 0;
    this.maxHealth = 0;
    this.defense = 0;
  }

  /**
   * 데미지를 받는 공통 로직
   * 1. 방어력으로 먼저 데미지 차단
   * 2. 남은 데미지를 체력에서 차감
   * 3. UI 업데이트 및 애니메이션 실행
   */
  takeDamage(amount: number): void {
    console.log(`[${this.constructor.name}] takeDamage called - amount: ${amount}, defense: ${this.defense}, health: ${this.health}`);

    let damageToHealth = amount;
    let fullBlock = false;

    // 방어력이 있으면 먼저 방어력에서 차감
    if (this.defense > 0) {
      const blockedDamage = Math.min(this.defense, amount);
      this.defense -= blockedDamage;
      damageToHealth = amount - blockedDamage;

      console.log(`  -> Blocked: ${blockedDamage}, Remaining damage: ${damageToHealth}, New defense: ${this.defense}`);

      // 막힌 데미지 표시
      if (blockedDamage > 0) {
        this.showBlockedDamage(blockedDamage);
        // 방어 성공 사운드
      }

      // 모든 데미지를 방어로 막았는지 확인
      fullBlock = damageToHealth === 0;
      if (fullBlock) {
        const soundManager = (this.scene as any).soundManager;
        if (soundManager) {
          soundManager.play('block', 0.8);
        }
      }
    }

    // 방어력으로 막지 못한 나머지 데미지만 체력에서 차감
    if (damageToHealth > 0) {
      this.health = Math.max(0, this.health - damageToHealth);
      console.log(`  -> Health damage: ${damageToHealth}, New health: ${this.health}`);
      this.showDamageNumber(damageToHealth);

      // 피격 사운드 재생 (각 클래스에서 구현)
      this.playDamageSound();

      // 피격 애니메이션 (체력 데미지를 받았을 때)
      this.playHitAnimation();
    } else if (fullBlock) {
      console.log(`  -> Full block!`);
      // 완전히 막았을 때는 방어 애니메이션 (있다면)
      if (this.playDefendAnimation) {
        this.playDefendAnimation();
      }
    }

    // 방어력 표시 먼저 업데이트 (방어력이 감소한 것을 먼저 보여줌)
    this.updateDefenseDisplay();
    // 체력바/체력 표시 업데이트
    this.updateHealthDisplay();
  }

  /**
   * 방어력을 추가하는 공통 메서드
   */
  applyDefense(amount: number): void {
    console.log(`[${this.constructor.name}] applyDefense called - adding: ${amount}, current defense: ${this.defense}`);
    this.defense += amount;
    console.log(`  -> New defense: ${this.defense}`);
    this.updateDefenseDisplay();
  }

  /**
   * 방어력으로 막힌 데미지 표시
   */
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

  /**
   * 체력 데미지 숫자 표시
   */
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

  /**
   * 죽었는지 확인
   */
  isDead(): boolean {
    return this.health <= 0;
  }

  /**
   * 체력 표시 업데이트 (각 클래스에서 구현)
   */
  protected abstract updateHealthDisplay(): void;

  /**
   * 방어력 표시 업데이트 (각 클래스에서 구현)
   */
  protected abstract updateDefenseDisplay(): void;

  /**
   * 피격 애니메이션 (각 클래스에서 구현)
   */
  protected abstract playHitAnimation(): void;

  /**
   * 피격 사운드 재생 (각 클래스에서 구현)
   */
  protected abstract playDamageSound(): void;

  /**
   * 방어 애니메이션 (각 클래스에서 구현, 선택적)
   */
  protected playDefendAnimation?(): void;
}
