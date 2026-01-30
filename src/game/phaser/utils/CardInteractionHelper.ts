import Phaser from 'phaser';
import { tweenConfig } from '../managers/TweenConfigManager';

export interface CardInteractionOptions {
  /** 호버 시 스케일 (기본: 1.1) */
  hoverScale?: number;
  /** 호버 애니메이션 duration (기본: 150) */
  hoverDuration?: number;
  /** TweenConfig 키 사용 (설정 시 hoverScale/hoverDuration 무시) */
  hoverTweenKey?: string;
  hoverOutTweenKey?: string;
  /** 추가 타겟 (카드와 함께 애니메이션) */
  additionalTargets?: Phaser.GameObjects.GameObject[];
}

/**
 * 카드 호버/클릭 인터랙션을 공통으로 처리하는 헬퍼
 */
export default class CardInteractionHelper {
  /**
   * 기본 호버 인터랙션 설정
   */
  static setupHoverInteraction(
    scene: Phaser.Scene,
    target: Phaser.GameObjects.GameObject,
    options: CardInteractionOptions = {}
  ): void {
    const {
      hoverScale = 1.1,
      hoverDuration = 150,
      hoverTweenKey,
      hoverOutTweenKey,
      additionalTargets = []
    } = options;

    const allTargets = [target, ...additionalTargets];

    target.on('pointerover', () => {
      if (hoverTweenKey) {
        tweenConfig.apply(scene, hoverTweenKey, allTargets);
      } else {
        scene.tweens.add({
          targets: allTargets,
          scaleX: hoverScale,
          scaleY: hoverScale,
          duration: hoverDuration
        });
      }
    });

    target.on('pointerout', () => {
      if (hoverOutTweenKey) {
        tweenConfig.apply(scene, hoverOutTweenKey, allTargets);
      } else {
        scene.tweens.add({
          targets: allTargets,
          scaleX: 1,
          scaleY: 1,
          duration: hoverDuration
        });
      }
    });
  }

  /**
   * 클릭 인터랙션 설정
   */
  static setupClickInteraction(
    target: Phaser.GameObjects.GameObject,
    onClick: () => void
  ): void {
    target.on('pointerdown', onClick);
  }

  /**
   * 전체 카드 인터랙션 설정 (호버 + 클릭)
   */
  static setupCardInteraction(
    scene: Phaser.Scene,
    target: Phaser.GameObjects.GameObject,
    onClick: () => void,
    options: CardInteractionOptions = {}
  ): void {
    target.setInteractive({ useHandCursor: true });
    this.setupHoverInteraction(scene, target, options);
    this.setupClickInteraction(target, onClick);
  }

  /**
   * 등장 애니메이션 적용
   */
  static applyAppearAnimation(
    scene: Phaser.Scene,
    targets: any[],
    tweenKey?: string
  ): void {
    targets.forEach(target => {
      if (target.setAlpha) target.setAlpha(0);
      if (target.setScale) target.setScale(0.8);
    });

    if (tweenKey) {
      tweenConfig.apply(scene, tweenKey, targets);
    } else {
      scene.tweens.add({
        targets,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 200,
        ease: 'Back.easeOut'
      });
    }
  }
}
