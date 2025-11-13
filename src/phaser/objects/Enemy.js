import Phaser from 'phaser';

export default class Enemy extends Phaser.GameObjects.Container {
  constructor(scene, x, y, enemyData, index) {
    super(scene, x, y);

    this.enemyData = enemyData;
    this.enemyIndex = index;
    this.health = enemyData.health || enemyData.hp; // hp를 health로 변환
    this.maxHealth = enemyData.health || enemyData.hp;
    this.defense = 0; // 방어력 초기화
    this.intent = null;
    this.isTargeted = false;

    this.createEnemy();
    this.setupInteraction();

    scene.add.existing(this);
  }

  createEnemy() {
    const width = 180;
    const height = 240;

    // 적 배경
    const bg = this.scene.add.rectangle(0, 0, width, height, 0x3a1a1a);
    bg.setStrokeStyle(3, 0xff6b6b);

    // 적 이름
    const nameText = this.scene.add.text(0, -height/2 + 25, this.enemyData.name, {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      fill: '#ffffff',
      align: 'center',
      wordWrap: { width: width - 10 }
    });
    nameText.setOrigin(0.5);

    // 적 이미지 (이모지) - 중앙에 크게 표시
    const enemyImage = this.scene.add.text(0, 15, this.getEnemyImage(), {
      fontSize: '64px',
      fontFamily: 'Arial, sans-serif'
    });
    enemyImage.setOrigin(0.5);

    // 체력 바 배경
    const hpBarBg = this.scene.add.rectangle(0, height/2 - 40, width - 20, 20, 0x333333);

    // 체력 바
    const hpBar = this.scene.add.rectangle(
      -(width - 20) / 2,
      height/2 - 40,
      width - 20,
      20,
      0xff6b6b
    );
    hpBar.setOrigin(0, 0.5);

    // 체력 텍스트
    const hpText = this.scene.add.text(0, height/2 - 40, `${this.health}/${this.maxHealth}`, {
      fontSize: '16px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3
    });
    hpText.setOrigin(0.5);

    // 의도 표시 - 아이콘과 숫자만 (배경 없이)
    const intentIcon = this.scene.add.text(-30, -55, '?', {
      fontSize: '40px',
      fontFamily: 'Arial, sans-serif'
    });
    intentIcon.setOrigin(0.5);

    const intentValue = this.scene.add.text(30, -55, '', {
      fontSize: '36px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4
    });
    intentValue.setOrigin(0.5);

    this.add([bg, nameText, enemyImage, hpBarBg, hpBar, hpText, intentIcon, intentValue]);

    this.bg = bg;
    this.hpBar = hpBar;
    this.hpText = hpText;
    this.intentIcon = intentIcon;
    this.intentValue = intentValue;
    this.hpBarWidth = width - 20;

    this.setSize(width, height);
  }

  getEnemyImage() {
    // 적 이름에 따른 이모지 매핑
    const enemyImageMap = {
      '고블린 전사': '👺',
      '오크 방패병': '🛡️',
      '마법사': '🧙',
      '강화 고블린': '👹',
      '엘리트 오크': '💪',
      '대마법사': '🧙‍♂️',
      '마법 골렘': '🗿',
      '드래곤 라이더': '🐉',
      '어둠의 늑대': '🐺',
      '그림자 마법사': '👤',
      '화염 정령': '🔥',
      '용암 골렘': '🌋',
      '그림자 군주': '😈',
      '화염 대마법사': '🔥',
      '고대 수호자': '🗿',
      '마법 기사': '⚔️',
      '마왕': '👿'
    };

    return enemyImageMap[this.enemyData.name] || '👾';
  }

  setupInteraction() {
    this.bg.setInteractive({ useHandCursor: true });

    this.bg.on('pointerover', () => {
      if (!this.isDead()) {
        this.target();
      }
    });

    this.bg.on('pointerout', () => {
      this.untarget();
    });

    this.bg.on('pointerdown', () => {
      if (!this.isDead()) {
        this.scene.events.emit('enemyClicked', this);
      }
    });
  }

  target() {
    this.isTargeted = true;
    this.bg.setStrokeStyle(5, 0xffff00);

    this.scene.tweens.add({
      targets: this,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 200
    });
  }

  untarget() {
    this.isTargeted = false;
    this.bg.setStrokeStyle(3, 0xff6b6b);

    this.scene.tweens.add({
      targets: this,
      scaleX: 1,
      scaleY: 1,
      duration: 200
    });
  }

  setIntent(intent) {
    this.intent = intent;

    if (intent.type === 'attack') {
      this.intentIcon.setText('⚔️');
      this.intentValue.setText(intent.value.toString());
      this.intentValue.setStyle({ fill: '#ff6b6b' });
    } else if (intent.type === 'defend') {
      this.intentIcon.setText('🛡️');
      this.intentValue.setText(intent.value.toString());
      this.intentValue.setStyle({ fill: '#4ecdc4' });
    } else if (intent.type === 'special') {
      this.intentIcon.setText('⭐');
      this.intentValue.setText(intent.value ? intent.value.toString() : '?');
      this.intentValue.setStyle({ fill: '#f39c12' });
    } else {
      this.intentIcon.setText('?');
      this.intentValue.setText('');
      this.intentValue.setStyle({ fill: '#ffffff' });
    }
  }

  takeDamage(amount) {
    // 방어력으로 먼저 흡수
    let damageToHealth = amount;

    if (this.defense > 0) {
      const blockedDamage = Math.min(this.defense, amount);
      this.defense -= blockedDamage;
      damageToHealth = amount - blockedDamage;

      // 방어력이 데미지를 막은 경우 특수 표시
      if (blockedDamage > 0) {
        this.showBlockedDamage(blockedDamage);
      }
    }

    // 남은 데미지를 체력에 적용
    if (damageToHealth > 0) {
      this.health = Math.max(0, this.health - damageToHealth);
      this.showDamageNumber(damageToHealth);
    }

    this.updateHealthBar();

    // 피격 애니메이션
    this.scene.tweens.add({
      targets: this,
      x: this.x + 10,
      duration: 50,
      yoyo: true,
      repeat: 3
    });

    // 흔들림 효과
    this.scene.tweens.add({
      targets: this.bg,
      alpha: 0.5,
      duration: 100,
      yoyo: true
    });

    if (this.isDead()) {
      this.playDeathAnimation();
    }
  }

  applyDefense(amount) {
    // 방어력 증가
    this.defense += amount;

    // 방어력 증가 표시
    const defenseText = this.scene.add.text(this.x, this.y - 50, `+${amount} 🛡️`, {
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      fill: '#4ecdc4',
      stroke: '#000000',
      strokeThickness: 3
    });
    defenseText.setOrigin(0.5);

    this.scene.tweens.add({
      targets: defenseText,
      y: defenseText.y - 40,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => defenseText.destroy()
    });
  }

  showBlockedDamage(amount) {
    const blockText = this.scene.add.text(this.x + 30, this.y - 50, `-${amount} 🛡️`, {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      fill: '#4ecdc4',
      stroke: '#000000',
      strokeThickness: 3
    });
    blockText.setOrigin(0.5);

    this.scene.tweens.add({
      targets: blockText,
      y: blockText.y - 30,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => blockText.destroy()
    });
  }

  updateHealthBar() {
    const healthPercent = this.health / this.maxHealth;
    const newWidth = this.hpBarWidth * healthPercent;

    this.scene.tweens.add({
      targets: this.hpBar,
      width: newWidth,
      duration: 300
    });

    this.hpText.setText(`${this.health}/${this.maxHealth}`);
  }

  showDamageNumber(amount) {
    const damageText = this.scene.add.text(this.x, this.y - 50, `-${amount}`, {
      fontSize: '32px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      fill: '#ff6b6b',
      stroke: '#000000',
      strokeThickness: 4
    });
    damageText.setOrigin(0.5);

    this.scene.tweens.add({
      targets: damageText,
      y: damageText.y - 60,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => damageText.destroy()
    });
  }

  playAttackAnimation(callback) {
    // 공격 애니메이션
    this.scene.tweens.add({
      targets: this,
      x: this.x + 40,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 300,
      ease: 'Power2',
      yoyo: true,
      onComplete: () => {
        if (callback) callback();
      }
    });

    // 화면 흔들림
    this.scene.cameras.main.shake(300, 0.005);
  }

  playDeathAnimation() {
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 0.8,
      scaleY: 0.8,
      y: this.y + 50,
      duration: 800,
      ease: 'Power2',
      onComplete: () => {
        this.scene.events.emit('enemyDefeated', this);
      }
    });

    // 폭발 파티클
    this.createDeathParticles();
  }

  createDeathParticles() {
    const particleCount = 30;
    const color = 0xff6b6b;

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = Phaser.Math.Between(80, 150);
      const particle = this.scene.add.circle(
        this.x,
        this.y,
        Phaser.Math.Between(4, 10),
        color
      );

      this.scene.tweens.add({
        targets: particle,
        x: this.x + Math.cos(angle) * speed,
        y: this.y + Math.sin(angle) * speed,
        alpha: 0,
        scale: 0,
        duration: 1000,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }
  }

  isDead() {
    return this.health <= 0;
  }
}
