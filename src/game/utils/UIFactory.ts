import Phaser from 'phaser';
import { textStyle } from '../phaser/managers/TextStyleManager';

/**
 * UI 컴포넌트 생성을 위한 팩토리 클래스
 * Player와 Enemy의 중복된 UI 생성 로직을 통합합니다.
 */
export class UIFactory {
  /**
   * 스탯 컨테이너 생성 (아이콘 + 숫자)
   * @param scene Phaser Scene
   * @param x X 좌표
   * @param y Y 좌표
   * @param icon 이모지 아이콘
   * @param value 초기 값
   * @returns 컨테이너와 텍스트 객체
   */
  static createStatContainer(
    scene: Phaser.Scene,
    x: number,
    y: number,
    icon: string,
    value: string
  ): { container: Phaser.GameObjects.Container; valueText: Phaser.GameObjects.Text } {
    const container = scene.add.container(x, y);

    // 아이콘
    const iconText = scene.add.text(0, 0, icon, textStyle.getStyle('damage.healEffect'));
    iconText.setOrigin(0.5);

    // 값 텍스트
    const valueText = scene.add.text(20, 0, value, textStyle.getStyle('damage.defenseEffect'));
    valueText.setOrigin(0, 0.5);

    container.add([iconText, valueText]);

    return { container, valueText };
  }

  /**
   * HP 컨테이너 생성
   */
  static createHPContainer(
    scene: Phaser.Scene,
    x: number,
    y: number,
    health: number
  ): { container: Phaser.GameObjects.Container; healthText: Phaser.GameObjects.Text } {
    const result = this.createStatContainer(scene, x, y, '❤️', health.toString());
    return { container: result.container, healthText: result.valueText };
  }

  /**
   * 방어도 컨테이너 생성
   */
  static createDefenseContainer(
    scene: Phaser.Scene,
    x: number,
    y: number,
    defense: number = 0
  ): { container: Phaser.GameObjects.Container; defenseText: Phaser.GameObjects.Text } {
    const result = this.createStatContainer(scene, x, y, '🛡️', defense.toString());
    return { container: result.container, defenseText: result.valueText };
  }
}
