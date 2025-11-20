import Phaser from 'phaser';
import { NormalizedCardData } from '../managers/BattleManager';
import CardRenderer from '../utils/CardRenderer';

export default class Card extends Phaser.GameObjects.Container {
  private cardData: NormalizedCardData;
  private isSelected: boolean;
  private originalY: number;
  private bg!: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, x: number, y: number, cardData: NormalizedCardData) {
    super(scene, x, y);

    this.cardData = cardData;
    this.isSelected = false;
    this.originalY = y;

    this.createCard();
    this.setupInteraction();

    scene.add.existing(this);
  }

  private createCard(): void {
    // CardRenderer를 사용하여 카드 컨텐츠 생성
    const cardContainer = CardRenderer.createCardContainer(
      this.scene,
      0,
      0,
      this.cardData,
      { width: 140, height: 200, showInteraction: true }
    );

    // CardRenderer가 생성한 모든 자식 요소를 이 컨테이너에 추가
    const children = cardContainer.getAll();
    children.forEach(child => {
      cardContainer.remove(child, false);
      this.add(child);
    });

    // bg 참조 저장 (인터랙션용)
    this.bg = (cardContainer as any).bg;

    // 컨테이너 크기 설정
    this.setSize(140, 200);

    // cardContainer 제거 (자식들은 이미 this로 이동됨)
    cardContainer.destroy();
  }


  private setupInteraction(): void {
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
      // 카드 클릭 사운드 재생
      if ((this.scene as any).soundManager) {
        (this.scene as any).soundManager.playCardClick();
      }

      this.scene.events.emit('cardClicked', this);
      // EventBus에도 emit하여 EventLogger에서 캡처 가능하도록
      if ((this.scene as any).eventBus) {
        (this.scene as any).eventBus.emit('cardClicked', {
          type: 'Card',
          name: (this as any).cardData?.name || 'Unknown',
          id: (this as any).id || 'N/A',
        });
      }
    });
  }

  /**
   * 인터랙션을 비활성화합니다.
   */
  public disableInteraction(): void {
    this.bg.disableInteractive();
  }

  /**
   * 인터랙션을 활성화합니다.
   */
  public enableInteraction(): void {
    this.bg.setInteractive({ useHandCursor: true });
  }

  public select(): void {
    this.isSelected = true;
    this.bg.setStrokeStyle(4, 0xffff00);

    this.scene.tweens.add({
      targets: this,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 200
    });
  }

  public deselect(): void {
    this.isSelected = false;
    this.bg.setStrokeStyle(3, CardRenderer.getCardColor(this.cardData));

    this.scene.tweens.add({
      targets: this,
      y: this.originalY,
      scaleX: 1,
      scaleY: 1,
      duration: 200
    });
  }

  /**
   * 파티클 효과만 재생합니다 (카드는 destroy하지 않음)
   */
  public playParticleEffect(targetX: number, targetY: number): void {
    // 카드의 현재 월드 좌표를 가져옴
    const matrix = this.getWorldTransformMatrix();
    const worldX = matrix.tx;
    const worldY = matrix.ty;

    // 파티클 효과만 재생
    this.createParticleEffect(worldX, worldY, targetX, targetY);
  }

  /**
   * 카드가 목표로 날아가는 효과 (레거시 - 필요시 사용)
   */
  public playEffect(targetX: number, targetY: number, callback?: () => void): void {
    // 카드의 현재 월드 좌표를 가져옴
    const matrix = this.getWorldTransformMatrix();
    const worldX = matrix.tx;
    const worldY = matrix.ty;

    // 카드가 부모 컨테이너에 있다면 제거하고 월드 좌표로 이동
    if (this.parentContainer) {
      this.parentContainer.remove(this);
      this.setPosition(worldX, worldY);
    }

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

    // 파티클 효과 (월드 좌표 기준)
    this.createParticleEffect(worldX, worldY, targetX, targetY);
  }

  private createParticleEffect(worldX: number, worldY: number, targetX?: number, targetY?: number): void {
    const color: number = CardRenderer.getCardColor(this.cardData);
    const particleCount: number = 20;

    for (let i: number = 0; i < particleCount; i++) {
      const particle: Phaser.GameObjects.Arc = this.scene.add.circle(
        worldX,
        worldY,
        Phaser.Math.Between(3, 8),
        color
      );

      // 타겟이 지정되면 타겟을 향해 날아가고, 없으면 방사형으로 퍼짐
      if (targetX !== undefined && targetY !== undefined) {
        // 타겟을 향해 날아가는 파티클
        const angle: number = Math.atan2(targetY - worldY, targetX - worldX);
        const distance: number = Phaser.Math.Distance.Between(worldX, worldY, targetX, targetY);
        const randomOffset: number = Phaser.Math.Between(-30, 30);

        this.scene.tweens.add({
          targets: particle,
          x: targetX + Math.cos(angle + randomOffset * 0.01) * (distance * 0.3),
          y: targetY + Math.sin(angle + randomOffset * 0.01) * (distance * 0.3),
          alpha: 0,
          scale: 0,
          duration: 600,
          ease: 'Power2',
          onComplete: () => particle.destroy()
        });
      } else {
        // 방사형으로 퍼지는 파티클
        const angle: number = (Math.PI * 2 * i) / particleCount;
        const speed: number = Phaser.Math.Between(50, 150);

        this.scene.tweens.add({
          targets: particle,
          x: worldX + Math.cos(angle) * speed,
          y: worldY + Math.sin(angle) * speed,
          alpha: 0,
          scale: 0,
          duration: 800,
          ease: 'Power2',
          onComplete: () => particle.destroy()
        });
      }
    }
  }
}
