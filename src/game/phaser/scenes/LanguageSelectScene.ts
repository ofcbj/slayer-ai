import Phaser from 'phaser';
import LanguageManager, { Language } from '../../../i18n/LanguageManager';
import { textStyle } from '../managers/TextStyleManager';

export default class LanguageSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LanguageSelectScene' });
  }

  create() {
    const { width, height } = this.scale;

    this.add
      .text(
        width / 2,
        height / 3,
        'SLAYER AI',
        textStyle.getStyle('language.title', { stroke: '#000000', strokeThickness: 8 })
      )
      .setOrigin(0.5)
      .setDepth(100);

    this.add
      .text(
        width / 2,
        height / 2 - 80,
        'Select Language / 言語選択 / 언어 선택',
        textStyle.getStyle('language.instruction')
      )
      .setOrigin(0.5);

    const koreanButton = this.add
      .text(
        width / 2,
        height / 2,
        '한국어 (Korean)',
        textStyle.getStyle('language.button', { stroke: '#000000', strokeThickness: 4 })
      )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const japaneseButton = this.add
      .text(
        width / 2,
        height / 2 + 80,
        '日本語 (Japanese)',
        textStyle.getStyle('language.button', { stroke: '#000000', strokeThickness: 4 })
      )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    koreanButton.on('pointerover', () => {
      koreanButton.setScale(1.1);
      koreanButton.setColor('#ffff00');
    });

    koreanButton.on('pointerout', () => {
      koreanButton.setScale(1);
      koreanButton.setColor('#ffffff');
    });

    koreanButton.on('pointerdown', () => {
      this.selectLanguage('ko');
    });

    japaneseButton.on('pointerover', () => {
      japaneseButton.setScale(1.1);
      japaneseButton.setColor('#ffff00');
    });

    japaneseButton.on('pointerout', () => {
      japaneseButton.setScale(1);
      japaneseButton.setColor('#ffffff');
    });

    japaneseButton.on('pointerdown', () => {
      this.selectLanguage('ja');
    });

    // 배경 파티클 효과 (간단한 원으로 생성)
    for (let i = 0; i < 30; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const size = Phaser.Math.Between(2, 5);
      const particle = this.add.circle(x, y, size, 0xffffff, 0.3);

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

  private selectLanguage(language: Language) {
    const langManager = LanguageManager.getInstance();
    langManager.setLanguage(language);

    this.cameras.main.fadeOut(500);
    this.time.delayedCall(500, () => {
      this.scene.start('MenuScene');
    });
  }
}
