import Phaser from 'phaser';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 배경
    this.add.rectangle(0, 0, width, height, 0x1a1a2e).setOrigin(0);

    // 타이틀
    const title = this.add.text(width / 2, height / 3, 'SLAYER AI', {
      fontSize: '72px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      fill: '#ffffff',
      stroke: '#ff6b6b',
      strokeThickness: 6
    });
    title.setOrigin(0.5);

    // 타이틀 애니메이션
    this.tweens.add({
      targets: title,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // 시작 버튼
    const startButton = this.createButton(
      width / 2,
      height / 2 + 50,
      'START GAME',
      () => {
        this.scene.start('StageSelectScene');
      }
    );

    // 설명 텍스트
    const description = this.add.text(
      width / 2,
      height - 100,
      'A deck-building roguelike card game',
      {
        fontSize: '20px',
        fontFamily: 'Arial, sans-serif',
        fill: '#aaaaaa'
      }
    );
    description.setOrigin(0.5);

    // 파티클 효과
    this.createBackgroundParticles();
  }

  createButton(x, y, text, onClick) {
    const button = this.add.container(x, y);

    // 버튼 배경
    const bg = this.add.rectangle(0, 0, 300, 60, 0x4ecdc4);
    bg.setStrokeStyle(3, 0xffffff);

    // 버튼 텍스트
    const btnText = this.add.text(0, 0, text, {
      fontSize: '28px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      fill: '#ffffff'
    });
    btnText.setOrigin(0.5);

    button.add([bg, btnText]);
    button.setSize(300, 60);
    button.setInteractive({ useHandCursor: true });

    // 호버 효과
    button.on('pointerover', () => {
      this.tweens.add({
        targets: button,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 100
      });
      bg.setFillStyle(0x5fddd5);
    });

    button.on('pointerout', () => {
      this.tweens.add({
        targets: button,
        scaleX: 1,
        scaleY: 1,
        duration: 100
      });
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

  createBackgroundParticles() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 간단한 파티클 효과 (원으로 대체)
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
}
