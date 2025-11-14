import Phaser from 'phaser';
import Character from './Character';

export default class Player extends Character {
  private healthText: Phaser.GameObjects.Text;
  private defenseText: Phaser.GameObjects.Text;
  private bg: Phaser.GameObjects.Rectangle;
  private playerHead: Phaser.GameObjects.Text;
  private hpContainer: Phaser.GameObjects.Container;
  private defContainer: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, x: number, y: number, maxHealth: number = 100) {
    super(scene, x, y);

    this.health = maxHealth;
    this.maxHealth = maxHealth;
    this.defense = 0;

    this.createPlayer();
    scene.add.existing(this);
  }

  private createPlayer(): void {
    const width: number = 240;
    const height: number = 240;

    // 플레이어 배경
    const bg: Phaser.GameObjects.Rectangle = this.scene.add.rectangle(0, 0, width, height, 0x2a2a4e);
    bg.setStrokeStyle(4, 0x4ecdc4);

    // 플레이어 이름
    const nameText: Phaser.GameObjects.Text = this.scene.add.text(0, -height/2 + 25, 'Hero', {
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#4ecdc4',
      stroke: '#000000',
      strokeThickness: 3
    });
    nameText.setOrigin(0.5);

    // 플레이어 캐릭터 이미지 - 머리와 목
    const playerHead: Phaser.GameObjects.Text = this.scene.add.text(0, 0, '🧙‍♂️', {
      fontSize: '120px',
      fontFamily: 'Arial, sans-serif'
    });
    playerHead.setOrigin(0.5);

    // HP 컨테이너 (왼쪽 하단)
    const hpContainer: Phaser.GameObjects.Container = this.scene.add.container(-width/2 + 70, height/2 - 40);

    const hpIcon: Phaser.GameObjects.Text = this.scene.add.text(0, 0, '❤️', {
      fontSize: '30px',
      fontFamily: 'Arial, sans-serif'
    });
    hpIcon.setOrigin(0.5);

    this.healthText = this.scene.add.text(25, 0, '100', {
      fontSize: '28px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ff6b6b',
      stroke: '#000000',
      strokeThickness: 3
    });
    this.healthText.setOrigin(0, 0.5);

    hpContainer.add([hpIcon, this.healthText]);

    // Defense 컨테이너 (오른쪽 하단)
    const defContainer: Phaser.GameObjects.Container = this.scene.add.container(width/2 - 70, height/2 - 40);

    const defIcon: Phaser.GameObjects.Text = this.scene.add.text(0, 0, '🛡️', {
      fontSize: '30px',
      fontFamily: 'Arial, sans-serif'
    });
    defIcon.setOrigin(0.5);

    this.defenseText = this.scene.add.text(25, 0, '0', {
      fontSize: '28px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#4ecdc4',
      stroke: '#000000',
      strokeThickness: 3
    });
    this.defenseText.setOrigin(0, 0.5);

    defContainer.add([defIcon, this.defenseText]);

    this.add([bg, nameText, playerHead, hpContainer, defContainer]);

    this.bg = bg;
    this.playerHead = playerHead;
    this.hpContainer = hpContainer;
    this.defContainer = defContainer;
    this.setSize(width, height);
  }

  /**
   * 체력과 방어력 업데이트 (외부에서 호출용)
   */
  updateStats(health: number, defense: number): void {
    this.health = health;
    this.defense = defense;
    this.updateHealthDisplay();
    this.updateDefenseDisplay();
  }

  /**
   * 체력 표시 업데이트 (Character 추상 메서드 구현)
   */
  protected updateHealthDisplay(): void {
    this.healthText.setText(this.health.toString());
  }

  /**
   * 방어력 표시 업데이트 (Character 추상 메서드 구현)
   */
  protected updateDefenseDisplay(): void {
    this.defenseText.setText(this.defense.toString());
  }

  /**
   * 피격 애니메이션 (Character 추상 메서드 구현)
   */
  protected playHitAnimation(callback?: () => void): void {
    // 피격 애니메이션
    this.scene.tweens.add({
      targets: this,
      x: this.x + 15,
      duration: 60,
      yoyo: true,
      repeat: 2,
      onComplete: (): void => {
        if (callback) callback();
      }
    });

    // 빨간색 플래시
    this.scene.tweens.add({
      targets: this.bg,
      fillAlpha: 0.3,
      duration: 60,
      yoyo: true,
      repeat: 2
    });

    // 이미지 흔들림
    this.scene.tweens.add({
      targets: [this.playerHead],
      angle: -10,
      duration: 60,
      yoyo: true,
      repeat: 2,
      onComplete: (): void => {
        this.playerHead.setAngle(0);
      }
    });
  }

  playDefendAnimation(): void {
    // 방어 애니메이션 - 푸른 빛
    const shield: Phaser.GameObjects.Circle = this.scene.add.circle(0, 0, 120, 0x4ecdc4, 0.3);
    this.add(shield);

    this.scene.tweens.add({
      targets: shield,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: 0,
      duration: 600,
      ease: 'Power2',
      onComplete: (): void => shield.destroy()
    });
  }

  playHealAnimation(): void {
    // 치유 애니메이션 - 녹색 빛
    for (let i: number = 0; i < 10; i++) {
      const angle: number = (Math.PI * 2 * i) / 10;
      const particle: Phaser.GameObjects.Circle = this.scene.add.circle(
        this.x + Math.cos(angle) * 80,
        this.y + Math.sin(angle) * 80,
        6,
        0x2ecc71
      );

      this.scene.tweens.add({
        targets: particle,
        x: this.x,
        y: this.y,
        alpha: 0,
        scale: 0,
        duration: 800,
        ease: 'Power2',
        onComplete: (): void => particle.destroy()
      });
    }
  }

  idle(): void {
    // 아이들 애니메이션 - 부드러운 상하 움직임 (머리)
    this.scene.tweens.add({
      targets: this.playerHead,
      y: -15,
      duration: 2000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
  }
}
