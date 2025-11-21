import Phaser from 'phaser';
import Character from './Character';
import { EnemyData } from '../../../types';
import { tweenConfig } from '../managers/TweenConfigManager';

interface Intent {
  type: 'attack' | 'defend' | 'special' | string;
  value?: number;
}

export default class Enemy extends Character {
  enemyData: EnemyData;
  enemyIndex: number;
  intent: Intent | null;
  isTargeted: boolean;
  bg!: Phaser.GameObjects.Rectangle;
  hpBar!: Phaser.GameObjects.Rectangle;
  hpText!: Phaser.GameObjects.Text;
  intentIcon!: Phaser.GameObjects.Text;
  intentValue!: Phaser.GameObjects.Text;
  hpBarWidth!: number;
  defenseText!: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    enemyData: EnemyData,
    index: number
  ) {
    super(scene, x, y);

    this.enemyData = enemyData;
    this.enemyIndex = index;
    this.health = enemyData.health || enemyData.hp || 0;
    this.maxHealth = enemyData.health || enemyData.hp || 0;
    this.defense = 0;
    this.intent = null;
    this.isTargeted = false;

    this.createEnemy();
    this.setupInteraction();

    scene.add.existing(this);
  }

  createEnemy(): void {
    const width = 180;
    const height = 240;

    // 적 배경
    const bg = this.scene.add.rectangle(0, 0, width, height, 0x3a1a1a);
    bg.setStrokeStyle(3, 0xff6b6b);

    // 적 이름
    const nameText = this.scene.add.text(0, -height / 2 + 25, this.enemyData.name, {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
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
    const hpBarBg = this.scene.add.rectangle(0, height / 2 - 40, width - 20, 20, 0x333333);

    // 체력 바
    const hpBar = this.scene.add.rectangle(
      -(width - 20) / 2,
      height / 2 - 40,
      width - 20,
      20,
      0xff6b6b
    );
    hpBar.setOrigin(0, 0.5);

    // 체력 텍스트
    const hpText = this.scene.add.text(0, height / 2 - 40, `${this.health}/${this.maxHealth}`, {
      fontSize: '16px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#ffffff',
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
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4
    });
    intentValue.setOrigin(0.5);

    // 방어도 표시
    const defenseText = this.scene.add.text(width / 2 - 25, -height / 2 + 25, '', {
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#4ecdc4',
      stroke: '#000000',
      strokeThickness: 3
    });
    defenseText.setOrigin(0.5);

    this.add([bg, nameText, enemyImage, hpBarBg, hpBar, hpText, intentIcon, intentValue, defenseText]);

    this.bg = bg;
    this.hpBar = hpBar;
    this.hpText = hpText;
    this.intentIcon = intentIcon;
    this.intentValue = intentValue;
    this.defenseText = defenseText;
    this.hpBarWidth = width - 20;

    this.setSize(width, height);
  }

  getEnemyImage(): string {
    // JSON 데이터에서 직접 이미지 가져오기
    if (this.enemyData.image) {
      return this.enemyData.image;
    }

    // 기본 이미지
    return '👾';
  }

  setupInteraction(): void {
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
        // EventBus에도 emit하여 EventLogger에서 캡처 가능하도록
        if ((this.scene as any).eventBus) {
          (this.scene as any).eventBus.emit('enemyClicked', {
            type: 'Enemy',
            name: (this as any).enemyData?.name || 'Unknown',
            id: (this as any).id || 'N/A',
          });
        }
      }
    });
  }

  target(): void {
    this.isTargeted = true;
    this.bg.setStrokeStyle(5, 0xffff00);

    tweenConfig.apply(this.scene, 'combat.targetHighlight', this);
  }

  untarget(): void {
    this.isTargeted = false;
    this.bg.setStrokeStyle(3, 0xff6b6b);

    tweenConfig.apply(this.scene, 'combat.untargetHighlight', this);
  }

  setIntent(intent: Intent): void {
    this.intent = intent;

    if (intent.type === 'attack') {
      this.intentIcon.setText('⚔️');
      this.intentValue.setText(intent.value?.toString() || '');
      this.intentValue.setStyle({ color: '#ff6b6b' });
    } else if (intent.type === 'defend') {
      this.intentIcon.setText('🛡️');
      this.intentValue.setText(intent.value?.toString() || '');
      this.intentValue.setStyle({ color: '#4ecdc4' });
    } else if (intent.type === 'special') {
      this.intentIcon.setText('⭐');
      this.intentValue.setText(intent.value ? intent.value.toString() : '?');
      this.intentValue.setStyle({ color: '#f39c12' });
    } else {
      this.intentIcon.setText('?');
      this.intentValue.setText('');
      this.intentValue.setStyle({ color: '#ffffff' });
    }
  }

  /**
   * 피격 애니메이션 (Character 추상 메서드 구현)
   */
  protected override playHitAnimation(): void {
    // 좌우 흔들림
    this.scene.tweens.add({
      targets: this,
      x: this.x + 10,
      duration: 50,
      yoyo: true,
      repeat: 3
    });

    // 배경 깜빡임
    this.scene.tweens.add({
      targets: this.bg,
      alpha: 0.5,
      duration: 100,
      yoyo: true
    });

    // 죽었으면 죽음 애니메이션
    if (this.isDead()) {
      this.playDeathAnimation();
    }
  }

  /**
   * 피격 사운드 재생 (Character 추상 메서드 구현)
   */
  protected override playDamageSound(): void {
    const soundManager = (this.scene as any).soundManager;
    if (soundManager) {
      soundManager.playEnemyDamage();
    }
  }

  /**
   * 방어력 적용 (베이스 클래스 오버라이드)
   */
  applyDefense(amount: number): void {
    super.applyDefense(amount);

    // 방어력 증가 시각 효과
    const defensePopup = this.scene.add.text(this.x, this.y - 50, `+${amount} 🛡️`, {
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#4ecdc4',
      stroke: '#000000',
      strokeThickness: 3
    });
    defensePopup.setOrigin(0.5);

    this.scene.tweens.add({
      targets: defensePopup,
      y: defensePopup.y - 40,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => defensePopup.destroy()
    });
  }

  /**
   * 방어력 표시 업데이트 (Character 추상 메서드 구현)
   */
  protected override updateDefenseDisplay(): void {
    if (this.defense > 0) {
      this.defenseText.setText(`🛡️${this.defense}`);
      this.defenseText.setVisible(true);
    } else {
      this.defenseText.setText('');
      this.defenseText.setVisible(false);
    }
  }

  /**
   * 체력바 업데이트 (Character 추상 메서드 구현)
   */
  protected override updateHealthDisplay(): void {
    const healthPercent = this.health / this.maxHealth;
    const newWidth = this.hpBarWidth * healthPercent;

    this.scene.tweens.add({
      targets: this.hpBar,
      width: newWidth,
      duration: 300
    });

    this.hpText.setText(`${this.health}/${this.maxHealth}`);
  }

  playAttackAnimation(callback?: () => void): void {
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

    this.scene.cameras.main.shake(300, 0.005);
  }

  playDeathAnimation(): void {
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 0.8,
      scaleY: 0.8,
      y: this.y + 50,
      duration: 800,
      ease: 'Power2',
      onComplete: () => {
        const sceneActive = this.scene && this.scene.scene && this.scene.scene.isActive('BattleScene');
        console.log(`[Enemy] Death animation complete - ${this.enemyData?.name}, Scene active: ${sceneActive}, this.active: ${this.active}`);

        // Scene이 여전히 활성화되어 있고, 이 Enemy가 파괴되지 않았을 때만 이벤트 발생
        if (sceneActive && this.active) {
          // 적 사망 사운드 재생
          const soundManager = (this.scene as any).soundManager;
          if (soundManager) {
            soundManager.playEnemyDeath();
          }

          this.scene.events.emit('enemyDefeated', this);
          // EventBus에도 emit하여 EventLogger에서 캡처 가능하도록
          if ((this.scene as any).eventBus) {
            (this.scene as any).eventBus.emit('enemyDefeated', {
              type: 'Enemy',
              name: (this as any).enemyData?.name || 'Unknown',
              id: (this as any).id || 'N/A',
            });
          }
        } else {
          console.warn(`[Enemy] Skipping enemyDefeated event - Scene or Enemy not active`);
        }
      }
    });

    this.createDeathParticles();
  }

  createDeathParticles(): void {
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

  /**
   * Enemy를 파괴할 때 모든 tween을 정리합니다.
   */
  destroy(fromScene?: boolean): void {
    console.log(`[Enemy] destroy called for ${this.enemyData?.name}, fromScene: ${fromScene}`);

    // 이 Enemy를 타겟으로 하는 모든 tween 제거
    if (this.scene && this.scene.tweens) {
      this.scene.tweens.killTweensOf(this);
    }

    // 부모 클래스의 destroy 호출
    super.destroy(fromScene);
  }
}
