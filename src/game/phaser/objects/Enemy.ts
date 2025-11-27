import Phaser from 'phaser';
import Actor from './Actor';
import { EnemyData, Buff } from '../../../types';
import { textStyle } from '../managers/TextStyleManager';
import { tweenConfig } from '../managers/TweenConfigManager';
import UIConfigManager from '../managers/UIConfigManager';
import { UIFactory } from '../../utils/UIFactory';
import { Logger } from '../../utils/Logger';
import LanguageManager from '../../../i18n/LanguageManager';

interface Intent {
  type: 'attack' | 'defend' | 'special' | string;
  value?: number;
}

export default class Enemy extends Actor {
  enemyData      : EnemyData;
  enemyIndex     : number;
  intent         : Intent | null;
  isTargeted     : boolean;
  bg             : Phaser.GameObjects.Rectangle;
  intentIcon!    : Phaser.GameObjects.Text;
  intentValue!   : Phaser.GameObjects.Text;
  private buffs  : Map<string, Buff> = new Map();
  private buffContainer?: Phaser.GameObjects.Container;
  private hotkeyText?    : Phaser.GameObjects.Text;
  private hotkeyBg?      : Phaser.GameObjects.Rectangle;

  constructor(
    scene: Phaser.Scene,
    x: number, 
    y: number,
    enemyData: EnemyData,
    index: number
  ) {
    super(scene, x, y);

    this.enemyData  = enemyData;
    this.enemyIndex = index;
    this.health     = enemyData.health || enemyData.hp || 0;
    this.maxHealth  = enemyData.health || enemyData.hp || 0;
    this.defense    = 0;
    this.intent     = null;
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
    const nameText = this.scene.add.text(0, -height/2+30, this.enemyData.name,
      textStyle.getStyle('character.name', { align: 'center', wordWrap: { width: width - 10 } })
    );
    nameText.setOrigin(0.5);

    // 적 이미지 (이모지) - 중앙에 크게 표시
    const enemyImage = this.scene.add.text(0, 30, this.getEnemyImage(),
      textStyle.getStyle('character.emoji')
    );
    enemyImage.setOrigin(0.5);   

    // UIFactory를 사용하여 HP 컨테이너 생성
    const hp = UIFactory.createHPContainer(this.scene, -width/2+35, height/2-30, this.health);
    this.healthText = hp.healthText;

    // UIFactory를 사용하여 Defense 컨테이너 생성
    const def = UIFactory.createDefenseContainer(this.scene, width/2-65, height/2-30, this.defense);
    this.defenseText = def.defenseText;

    // 의도 표시 - 아이콘과 숫자만 (배경 없이)
    const intentIcon = this.scene.add.text(-30, -40, '?',
      textStyle.getStyle('intent.emoji')
    );
    intentIcon.setOrigin(0.5);

    const intentValue = this.scene.add.text(30, -40, '',
      textStyle.getStyle('intent.emojiSmall', { stroke: '#000000', strokeThickness: 4 })
    );
    intentValue.setOrigin(0.5);

    this.add([bg, nameText, enemyImage, hp.container, def.container, intentIcon, intentValue]);

    this.bg = bg;
    this.intentIcon = intentIcon;
    this.intentValue = intentValue;

    this.setSize(width, height);

    // 단축키 텍스트 생성
    this.createHotkeyText(width, height);
  }

  /**
   * 단축키 텍스트를 생성합니다.
   */
  private createHotkeyText(width: number, height: number): void {
    const uiConfig = UIConfigManager.getInstance();
    const hotkeyConfig = uiConfig.getHotkeyTextConfig();
    
    // 배경
    this.hotkeyBg = this.scene.add.rectangle(
      0,
      height / 2 + 15,
      24,
      24,
      parseInt(hotkeyConfig.bgColor, 16),
      hotkeyConfig.bgAlpha
    );
    this.hotkeyBg.setStrokeStyle(2, 0xffffff);
    this.hotkeyBg.setVisible(false);

    // 텍스트
    this.hotkeyText = this.scene.add.text(
      0,
      height / 2 + 15,
      '',
      {
        fontSize: '20px', // 적 에서는 약간 크게
        fontFamily: hotkeyConfig.fontFamily,
        fontStyle: hotkeyConfig.fontStyle,
        color: hotkeyConfig.color,
        stroke: hotkeyConfig.strokeColor,
        strokeThickness: hotkeyConfig.strokeThickness
      }
    );
    this.hotkeyText.setOrigin(0.5);
    this.hotkeyText.setVisible(false);

    this.add([this.hotkeyBg, this.hotkeyText]);
  }

  /**
   * 단축키를 설정합니다 (적의 수와 인덱스에 따라 화살표 표시).
   */
  public setHotkeyByEnemyCount(totalEnemies: number): void {
    if (!this.hotkeyText || !this.hotkeyBg) return;

    let arrow = '';
    if (totalEnemies === 1) {
      // 1마리: 아래 화살표
      arrow = '↓';
    } else if (totalEnemies === 2) {
      // 2마리: 왼쪽, 오른쪽
      arrow = this.enemyIndex === 0 ? '←' : '→';
    } else if (totalEnemies >= 3) {
      // 3마리 이상: 왼쪽, 아래, 오른쪽
      if (this.enemyIndex === 0) arrow = '←';
      else if (this.enemyIndex === 1) arrow = '↓';
      else if (this.enemyIndex === 2) arrow = '→';
    }

    if (arrow) {
      this.hotkeyText.setText(arrow);
      this.hotkeyText.setVisible(true);
      this.hotkeyBg.setVisible(true);
    }
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

  protected override playHitAnimation(): void {
    // 좌우 흔들림
    tweenConfig.apply(this.scene, 'combat.enemyHit', this, {
      x: this.x
    });
    // 배경 깜빡임
    tweenConfig.apply(this.scene, 'combat.enemyHitFlash', this.bg);
    // 죽었으면 죽음 애니메이션
    if (this.isDead()) {
      this.playDeathAnimation();
    }
  }

  /**
   * 데미지를 받을 때 vulnerable 효과 적용
   */
  override takeDamage(amount: number): void {
    let finalDamage = amount;

    // vulnerable 효과: 받는 피해 50% 증가
    if (this.hasBuff('vulnerable')) {
      finalDamage = Math.floor(finalDamage * 1.5);
    }

    super.takeDamage(finalDamage);
  }

  applyDefense(amount: number): void {
    super.applyDefense(amount);
    const defensePopup = this.scene.add.text(this.x, this.y-50, `+${amount} 🛡️`,
      textStyle.getStyle('damage.enemyDamage', { color: '#4ecdc4' })
    );
    defensePopup.setOrigin(0.5);

    tweenConfig.apply(this.scene, 'ui.defensePopup', defensePopup, {
      y: defensePopup.y,
      onComplete: () => defensePopup.destroy()
    });
  }
  
  playAttackAnimation(callback?: () => void): void {
    tweenConfig.apply(this.scene, 'combat.enemyAttack', this, {
      x: this.x,
      onComplete: () => {
        if (callback) callback();
      }
    });

    this.scene.cameras.main.shake(300, 0.005);
  }

  playDeathAnimation(): void {
    tweenConfig.apply(this.scene, 'combat.deathAnimation', this, {
      y: this.y,
      onComplete: () => {
        const sceneActive = this.scene && this.scene.scene && this.scene.scene.isActive('BattleScene');
        Logger.debug(`Enemy Death animation complete - ${this.enemyData?.name}, Scene active: ${sceneActive}, this.active: ${this.active}`);

        // Scene이 여전히 활성화되어 있고, 이 Enemy가 파괴되지 않았을 때만 이벤트 발생
        if (sceneActive && this.active) {
          // 적 사망 사운드 재생
          // this.scene.sound.play('enemy-death');

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
        this.x, this.y,
        Phaser.Math.Between(4, 10),
        color
      );

      tweenConfig.apply(this.scene, 'particles.burst', particle, {
        x: this.x + Math.cos(angle) * speed,
        y: this.y + Math.sin(angle) * speed,
        onComplete: () => particle.destroy()
      });
    }
  }

  /**
   * 버프 적용
   */
  public applyBuff(buffId: string, duration: number = 2): void {
    if (this.buffs.has(buffId)) {
      const buff = this.buffs.get(buffId)!;
      // 지속시간을 더하기
      buff.duration = buff.duration + duration;
    } else {
      this.buffs.set(buffId, { id: buffId, type: 'debuff', duration });
    }
    this.updateBuffDisplay();
  }

  /**
   * 턴 종료 시 버프 지속시간 감소
   */
  public decreaseBuffDurations(): void {
    for (const [id, buff] of this.buffs) {
      buff.duration--;
      if (buff.duration <= 0) {
        this.buffs.delete(id);
      }
    }
    this.updateBuffDisplay();
  }

  /**
   * 버프 확인
   */
  public hasBuff(buffId: string): boolean {
    return this.buffs.has(buffId);
  }

  public getBuff(buffId: string): Buff | undefined {
    return this.buffs.get(buffId);
  }

  /**
   * 버프 UI 표시
   */
  private updateBuffDisplay(): void {
    if (this.buffContainer) {
      this.buffContainer.destroy();
    }

    if (this.buffs.size === 0) return;

    // 버프 컨테이너를 적 카드 상단 경계선 위에 배치
    this.buffContainer = this.scene.add.container(-90, -147);
    this.add(this.buffContainer);

    let offsetX = 0; // 왼쪽에서 시작해서 오른쪽으로

    for (const buff of this.buffs.values()) {
      const iconBg = this.scene.add.rectangle(offsetX + 14, 14, 28, 28, 0x000000, 0.7);
      iconBg.setStrokeStyle(2, 0xffaa00);
      
      const icon = this.scene.add.text(offsetX + 14, 14, this.getBuffIcon(buff.id), {
        fontSize: '18px'
      });
      icon.setOrigin(0.5);

      // 툴팁을 위한 인터랙션 설정
      iconBg.setInteractive({ useHandCursor: true });
      
      // 툴팁 참조를 저장
      const tooltipRef = { current: null as Phaser.GameObjects.Container | null };

      iconBg.on('pointerover', () => {
        // 툴팁 생성 - scene에 직접 추가 (buffContainer가 아닌)
        const worldPos = iconBg.getWorldTransformMatrix();
        tooltipRef.current = this.createBuffTooltip(buff.id, worldPos.tx, worldPos.ty - 50);
        if (tooltipRef.current) {
          this.scene.add.existing(tooltipRef.current);
        }
      });

      iconBg.on('pointerout', () => {
        // 툴팁 제거
        if (tooltipRef.current) {
          tooltipRef.current.destroy();
          tooltipRef.current = null;
        }
      });

      this.buffContainer.add([iconBg, icon]);

      // 지속시간 표시 - 아이콘 오른쪽 위 꼭지점
      const durationText = this.scene.add.text(offsetX + 28, 0,
        buff.duration.toString(), {
          fontSize: '22px',
          color: '#ffff00',
          stroke: '#000000',
          strokeThickness: 3,
          fontStyle: 'bold'
        });
      durationText.setOrigin(0.5);
      this.buffContainer.add(durationText);

      offsetX += 32;
    }
  }

  /**
   * 버프 툴팁 생성
   */
  private createBuffTooltip(buffId: string, worldX: number, worldY: number): Phaser.GameObjects.Container | null {
    // LanguageManager 가져오기
    const langManager = LanguageManager.getInstance();
    const lang = langManager.getLanguage();
    const suffix = lang === 'ko' ? '_kr' : '_ja';
    
    // 버프 설명
    const buffDescriptions: Record<string, Record<string, string>> = {
      'vulnerable': {
        '_kr': '피해량이 50% 증가',
        '_ja': 'ダメージが50%上昇'
      },
      'weak': {
        '_kr': '공격력이 50% 감소',
        '_ja': '攻撃力が50%減少'
      }
    };

    const buffName = langManager.t(`buffs.${buffId}`);
    const description = buffDescriptions[buffId]?.[suffix] || '';

    const tooltipContainer = this.scene.add.container(worldX, worldY);

    // 툴팁 배경
    const padding = 8;
    const text = this.scene.add.text(0, 0, `${buffName}\n${description}`, {
      fontSize: '12px',
      color: '#ffffff',
      align: 'center',
      padding: { x: padding, y: padding }
    });
    text.setOrigin(0.5);

    const bg = this.scene.add.rectangle(0, 0, 
      text.width + padding * 2, 
      text.height + padding * 2, 
      0x222222, 0.95);
    bg.setStrokeStyle(2, 0xffaa00);

    tooltipContainer.add([bg, text]);
    tooltipContainer.setDepth(10000); // 최상위에 표시

    return tooltipContainer;
  }

  /**
   * 버프 아이콘 가져오기
   */
  private getBuffIcon(buffId: string): string {
    const icons: Record<string, string> = {
      'vulnerable': '💔',
      'weak': '🫥'
    };
    return icons[buffId] || '❓';
  }

  /**
   * Enemy를 파괴할 때 모든 tween을 정리합니다.
   */
  destroy(fromScene?: boolean): void {
    Logger.debug(`Enemy destroy called for ${this.enemyData?.name}, fromScene: ${fromScene}`);

    // 이 Enemy를 타겟으로 하는 모든 tween 제거
    if (this.scene && this.scene.tweens) {
      this.scene.tweens.killTweensOf(this);
    }

    // 부모 클래스의 destroy 호출
    super.destroy(fromScene);
  }
}
