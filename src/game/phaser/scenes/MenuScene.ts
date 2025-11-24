import Phaser from 'phaser';
import EventBus from '../../EventBus';
import LanguageManager from '../../../i18n/LanguageManager';
import { tweenConfig } from '../managers/TweenConfigManager';
import { textStyle } from '../managers/TextStyleManager';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    // React에 현재 Scene이 준비되었음을 알림
    EventBus.emit('current-scene-ready', this);
    const width: number = this.cameras.main.width;
    const height: number = this.cameras.main.height;
    const langManager = LanguageManager.getInstance();

    // 배경
    this.add.rectangle(0, 0, width, height, 0x1a1a2e).setOrigin(0);

    // 타이틀
    const title: Phaser.GameObjects.Text = this.add.text(
      width / 2,
      height / 3,
      langManager.t('menu.title'),
      textStyle.getStyle('titles.main')
    );
    title.setOrigin(0.5);

    // 타이틀 애니메이션
    tweenConfig.apply(this, 'transitions.titleBreathing', title);

    // 시작 버튼
    const startButton: Phaser.GameObjects.Container = this.createButton(
      width / 2,
      height / 2 + 50,
      langManager.t('menu.startGame'),
      () => {
        // 게임 상태 초기화 (새 게임 시작)
        const gameState = {
          player: {
            maxHealth: 100,
            health: 100,
            energy: 3,
            maxEnergy: 3,
            defense: 0,
            gold: 100
          },
          deck: [],
          currentStage: 0,
          stagesCleared: []
        };
        this.registry.set('gameState', gameState);
        
        this.scene.start('StageSelectScene');
      }
    );

    // 언어 선택 버튼
    const languageButton: Phaser.GameObjects.Container = this.createButton(
      width / 2,
      height / 2 + 130,
      langManager.t('menu.selectLanguage'),
      () => {
        // 언어 선택 화면으로 이동
        this.scene.start('LanguageSelectScene');
      }
    );
    languageButton.setScale(0.8);

    // 설명 텍스트
    const description: Phaser.GameObjects.Text = this.add.text(
      width / 2,
      height - 100,
      langManager.t('menu.description'),
      textStyle.getStyle('reward.instruction')
    );
    description.setOrigin(0.5);

    // 파티클 효과
    this.createBackgroundParticles();
  }

  createButton(
    x: number,
    y: number,
    text: string,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const button: Phaser.GameObjects.Container = this.add.container(x, y);

    // 버튼 배경
    const bg: Phaser.GameObjects.Rectangle = this.add.rectangle(0, 0, 300, 60, 0x4ecdc4);
    bg.setStrokeStyle(3, 0xffffff);

    // 버튼 텍스트
    const btnText: Phaser.GameObjects.Text = this.add.text(
      0,
      0,
      text,
      textStyle.getStyle('buttons.primary')
    );
    btnText.setOrigin(0.5);

    button.add([bg, btnText]);
    button.setSize(300, 60);
    button.setInteractive({ useHandCursor: true });

    // 호버 효과
    button.on('pointerover', () => {
      tweenConfig.apply(this, 'interactive.buttonHover', button);
      bg.setFillStyle(0x5fddd5);
    });

    button.on('pointerout', () => {
      tweenConfig.apply(this, 'interactive.buttonHoverOut', button);
      bg.setFillStyle(0x4ecdc4);
    });

    button.on('pointerdown', () => {
      this.tweens.add({
        targets: button,
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 50,
        yoyo: true,
        onComplete: onClick
      });
    });

    return button;
  }

  createBackgroundParticles(): void {
    const width: number = this.cameras.main.width;
    const height: number = this.cameras.main.height;

    // 간단한 파티클 효과 (원으로 대체)
    for (let i: number = 0; i < 30; i++) {
      const x: number = Phaser.Math.Between(0, width);
      const y: number = Phaser.Math.Between(0, height);
      const size: number = Phaser.Math.Between(2, 5);
      const particle: Phaser.GameObjects.Arc = this.add.circle(x, y, size, 0xffffff, 0.3);

      this.tweens.add({
        targets: particle,
        y: y - Phaser.Math.Between(100, 300),
        alpha: 0,
        duration: Phaser.Math.Between(3000, 6000),
        repeat: -1,
        delay: Phaser.Math.Between(0, 3000)
      });
    }
  }
}
