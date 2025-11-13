import Phaser from 'phaser';

export default class Card extends Phaser.GameObjects.Container {
  constructor(scene, x, y, cardData) {
    super(scene, x, y);

    this.cardData = cardData;
    this.isSelected = false;
    this.originalY = y;

    this.createCard();
    this.setupInteraction();

    scene.add.existing(this);
  }

  createCard() {
    const width = 140;
    const height = 200;

    // 카드 배경
    const bg = this.scene.add.rectangle(0, 0, width, height, 0x2a2a4e);
    bg.setStrokeStyle(3, this.getCardColor());

    // 카드 타입에 따른 상단 배경
    const headerBg = this.scene.add.rectangle(0, -height/2 + 18, width, 36, this.getCardColor());

    // 카드 이름
    const nameText = this.scene.add.text(0, -height/2 + 18, this.cardData.name, {
      fontSize: '15px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      fill: '#ffffff',
      align: 'center',
      wordWrap: { width: width - 10 }
    });
    nameText.setOrigin(0.5);

    // 코스트
    const costCircle = this.scene.add.circle(-width/2 + 20, -height/2 + 18, 15, 0x4ecdc4);
    costCircle.setStrokeStyle(2, 0xffffff);

    const costText = this.scene.add.text(-width/2 + 20, -height/2 + 18, this.cardData.cost.toString(), {
      fontSize: '17px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      fill: '#ffffff'
    });
    costText.setOrigin(0.5);

    // 카드 이미지 (이모지) - 중앙에 크게 표시
    const cardImage = this.scene.add.text(0, -20, this.getCardImage(), {
      fontSize: '44px',
      fontFamily: 'Arial, sans-serif'
    });
    cardImage.setOrigin(0.5);

    // 카드 값 (데미지, 방어도 등) - 이미지 아래
    const valueText = this.scene.add.text(0, 25, this.getValueDisplay(), {
      fontSize: '30px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      fill: this.getValueColor(),
      stroke: '#000000',
      strokeThickness: 4
    });
    valueText.setOrigin(0.5);

    // 카드 효과 설명 - 하단
    const descText = this.scene.add.text(0, 62, this.getEffectDescription(), {
      fontSize: '11px',
      fontFamily: 'Arial, sans-serif',
      fill: '#cccccc',
      align: 'center',
      wordWrap: { width: width - 20 }
    });
    descText.setOrigin(0.5);

    this.add([bg, headerBg, nameText, costCircle, costText, cardImage, valueText, descText]);

    this.bg = bg;
    this.setSize(width, height);
  }

  getCardImage() {
    // rawData에서 이미지(이모지) 가져오기
    if (this.cardData.rawData && this.cardData.rawData.image) {
      return this.cardData.rawData.image;
    }

    // 기본 이모지 (타입별)
    const type = this.cardData.type;
    if (type === '공격') return '⚔️';
    if (type === '방어') return '🛡️';
    if (type === '치유') return '💚';
    if (type === '에너지') return '🧘';
    return '✨';
  }

  getCardColor() {
    const type = this.cardData.type;
    if (type === '공격') return 0xff6b6b;
    if (type === '방어') return 0x4ecdc4;
    if (type === '치유') return 0x2ecc71;
    if (type === '에너지') return 0xf39c12;
    return 0x9b59b6;
  }

  getValueColor() {
    const type = this.cardData.type;
    if (type === '공격') return '#ff6b6b';
    if (type === '방어') return '#4ecdc4';
    if (type === '치유') return '#2ecc71';
    if (type === '에너지') return '#f39c12';
    return '#ffffff';
  }

  getEffectDescription() {
    const type = this.cardData.type;
    const value = this.cardData.value;

    if (type === '공격') return `Deal ${value} damage`;
    if (type === '방어') return `Gain ${value} defense`;
    if (type === '치유') return `Heal ${value} HP`;
    if (type === '에너지') return `Gain ${value} energy`;
    return this.cardData.description || '';
  }

  getValueDisplay() {
    const type = this.cardData.type;
    const value = this.cardData.value;

    if (type === '공격') return value.toString();
    if (type === '방어') return value.toString();
    if (type === '치유') return `+${value}`;
    if (type === '에너지') return `+${value}`;
    return '';
  }

  setupInteraction() {
    this.bg.setInteractive({ useHandCursor: true });

    this.bg.on('pointerover', () => {
      if (!this.isSelected) {
        this.scene.tweens.add({
          targets: this,
          y: this.originalY - 20,
          scaleX: 1.05,
          scaleY: 1.05,
          duration: 200
        });
      }
    });

    this.bg.on('pointerout', () => {
      if (!this.isSelected) {
        this.scene.tweens.add({
          targets: this,
          y: this.originalY,
          scaleX: 1,
          scaleY: 1,
          duration: 200
        });
      }
    });

    this.bg.on('pointerdown', () => {
      this.scene.events.emit('cardClicked', this);
    });
  }

  select() {
    this.isSelected = true;
    this.bg.setStrokeStyle(4, 0xffff00);

    this.scene.tweens.add({
      targets: this,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 200
    });
  }

  deselect() {
    this.isSelected = false;
    this.bg.setStrokeStyle(3, this.getCardColor());

    this.scene.tweens.add({
      targets: this,
      y: this.originalY,
      scaleX: 1,
      scaleY: 1,
      duration: 200
    });
  }

  playEffect(targetX, targetY, callback) {
    // 카드가 목표로 날아가는 애니메이션
    this.scene.tweens.add({
      targets: this,
      x: targetX,
      y: targetY,
      scaleX: 0.5,
      scaleY: 0.5,
      alpha: 0,
      duration: 500,
      ease: 'Power2',
      onComplete: () => {
        if (callback) callback();
        this.destroy();
      }
    });

    // 파티클 효과
    this.createParticleEffect();
  }

  createParticleEffect() {
    const color = this.getCardColor();
    const particleCount = 20;

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = Phaser.Math.Between(50, 150);
      const particle = this.scene.add.circle(
        this.x,
        this.y,
        Phaser.Math.Between(3, 8),
        color
      );

      this.scene.tweens.add({
        targets: particle,
        x: this.x + Math.cos(angle) * speed,
        y: this.y + Math.sin(angle) * speed,
        alpha: 0,
        scale: 0,
        duration: 800,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }
  }
}
