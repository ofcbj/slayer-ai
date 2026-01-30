import Phaser from 'phaser';
import { CardData } from '../../../types';
import CardRenderer from '../utils/CardRenderer';
import UIConfigManager from '../managers/UIConfigManager';
import { tweenConfig } from '../managers/TweenConfigManager';
import type EventBus from '../../EventBus';

// Scene with optional eventBus (for BattleScene compatibility)
interface SceneWithEventBus extends Phaser.Scene {
  eventBus?: typeof EventBus;
}

export default class Card extends Phaser.GameObjects.Container {
  declare scene: SceneWithEventBus;
  private cardData              : CardData;
  private isSelected            : boolean;
  private originalY             : number;
  private originalDepth         : number;
  private selectedOriginalDepth : number = 0; // 선택 전의 depth를 저장 (선택 해제 시 복원용)
  public  bg!                   : Phaser.GameObjects.Rectangle;
  private handContainer         : Phaser.GameObjects.Container | null = null;
  private originalLocalX        : number = 0;
  private originalLocalY        : number = 0;
  private hotkeyText?           : Phaser.GameObjects.Text;
  private hotkeyBg?             : Phaser.GameObjects.Rectangle;
  private interactionEnabled    : boolean = true; // 인터랙션 활성화 상태

  constructor(scene: Phaser.Scene, x: number, y: number, cardData: CardData) {
    super(scene, x, y);

    this.cardData = cardData;
    this.isSelected = false;
    this.originalY = y;
    this.originalDepth = 0; // 초기화, 나중에 설정됨

    this.createCard();
    this.setupInteraction();

    scene.add.existing(this);
  }

  private createCard(): void {
    // CardRenderer를 사용하여 카드 컨텐츠 생성
    const uiConfig = UIConfigManager.getInstance();
    const cardConfig = uiConfig.getHandCardConfig();
    const cardContainer = CardRenderer.createCardContainer(
      this.scene,
      0, 0,
      this.cardData,
      { width: cardConfig.width, height: cardConfig.height, showInteraction: true }
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
    this.setSize(cardConfig.width, cardConfig.height);
    // cardContainer 제거 (자식들은 이미 this로 이동됨)
    cardContainer.destroy();

    // 단축키 텍스트 생성 (초기에는 숨김)
    this.createHotkeyText(cardConfig);
  }

  /**
   * 단축키 텍스트를 생성합니다.
   */
  private createHotkeyText(cardConfig: { width: number; height: number }): void {
    const hotkeyConfig = UIConfigManager.getInstance().getHotkeyTextConfig();
    
    // 배경
    this.hotkeyBg = this.scene.add.rectangle(
      0,
      cardConfig.height / 2 + 15,
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
      cardConfig.height / 2 + 15,
      '',
      {
        fontSize: hotkeyConfig.fontSize,
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
   * 단축키 인덱스를 설정합니다 (0-4, 화면에는 1-5로 표시).
   */
  public setHotkeyIndex(index: number): void {
    if (this.hotkeyText && this.hotkeyBg) {
      if (index >= 0 && index < 5) {
        this.hotkeyText.setText((index + 1).toString());
        this.hotkeyText.setVisible(true);
        this.hotkeyBg.setVisible(true);
      } else {
        this.hotkeyText.setVisible(false);
        this.hotkeyBg.setVisible(false);
      }
    }
  }


  private setupInteraction(): void {
    this.bg.setInteractive({ useHandCursor: true });
    this.bg.on('pointerover', () => {
      if (!this.isSelected) {
        this.bringCardToTop();
        tweenConfig.apply(this.scene, 'interactive.cardHover', this);
      }
    });

    this.bg.on('pointerout', () => {
      if (!this.isSelected) {
        // 컨테이너에 다시 추가
        this.restoreToContainer();
        // 원래 depth로 복원
        this.setDepth(this.originalDepth);
        // 호버 해제 시 컨테이너 내부 순서 재정렬을 위해 이벤트 emit
        this.scene.events.emit('cardHoverOut', this);
        tweenConfig.apply(this.scene, 'interactive.cardHoverOut', this);
      }
      // 선택된 카드에서는 마우스가 벗어나도 선택 해제하지 않음
    });

    this.bg.on('pointerdown', () => {
      // 카드 클릭 이벤트만 발생 (소리는 CardHandManager에서 관리)
      this.scene.events.emit('cardClicked', this);
      // EventBus에도 emit하여 EventLogger에서 캡처 가능하도록
      if (this.scene.eventBus) {
        this.scene.eventBus.emit('cardClicked', {
          type: 'Card',
          name: this.cardData?.name || 'Unknown',
          id: this.cardData?.id || 'N/A',
        });
      }
    });
  }

  public disableInteraction(): void {
    this.bg.disableInteractive();
    this.interactionEnabled = false;
  }

  public enableInteraction(): void {
    this.bg.setInteractive({ useHandCursor: true });
    this.interactionEnabled = true;
  }

  public isInteractionEnabled(): boolean {
    return this.interactionEnabled;
  }

  public select(): void {
    this.isSelected = true;
    const uiConfig = UIConfigManager.getInstance();
    this.bg.setStrokeStyle(4, uiConfig.getColor('CARD_SELECTED_STROKE'));

    // 선택 전의 depth를 저장 (선택 해제 시 복원용)
    // bringToTop()이 호출되기 전에 저장해야 함
    this.selectedOriginalDepth = this.depth < 10000 ? this.depth : this.originalDepth;

    // 선택 시에도 맨 위로 올리기
    this.bringCardToTop();

    // 애니메이션 중 인터랙션 비활성화
    this.disableInteraction();

    tweenConfig.apply(this.scene, 'cards.select', this, {
      onComplete: () => {
        // 애니메이션 완료 후 인터랙션 다시 활성화
        this.enableInteraction();
      }
    });
  }

  public deselect(): void {
    this.isSelected = false;
    this.bg.setStrokeStyle(3, CardRenderer.getCardColor(this.cardData));

    // 선택 해제 시 컨테이너에 다시 추가하고 선택 전의 depth로 복원
    this.restoreToContainer();
    
    // selectedOriginalDepth로 복원 (선택 전의 depth)
    this.setDepth(this.selectedOriginalDepth);
    // originalDepth도 업데이트 (다음 선택을 위해)
    this.originalDepth = this.selectedOriginalDepth;

    // 애니메이션 중 인터랙션 비활성화
    this.disableInteraction();

    tweenConfig.apply(this.scene, 'cards.deselect', this, {
      y: this.originalY,
      scaleX: 1,
      scaleY: 1,
      onComplete: () => {
        // 애니메이션 완료 후 인터랙션 다시 활성화
        this.enableInteraction();
      }
    });
  }

  /**
   * 카드의 원래 depth를 설정합니다.
   * CardHandManager에서 카드의 depth를 설정할 때 함께 호출됩니다.
   */
  public setOriginalDepth(depth: number): void {
    // 호버 중이 아닐 때만 originalDepth 업데이트
    if (this.depth < 10000) {
      this.originalDepth = depth;
    }
  }

  /**
   * 핸드 컨테이너 참조를 설정합니다.
   * 호버 시 컨테이너에서 제거하고 씬에 직접 추가하기 위해 필요합니다.
   */
  public setHandContainer(container: Phaser.GameObjects.Container): void {
    this.handContainer = container;
  }

  /**
   * 카드를 맨 위로 올립니다.
   * 호버 시 컨테이너에서 제거하고 씬에 직접 추가하여 depth가 제대로 작동하도록 합니다.
   */
  private bringCardToTop(): void {
    if (!this.handContainer) {
      // 컨테이너가 없으면 일반 depth 설정만 사용
      this.originalDepth = this.depth;
      this.setDepth(10000);
      return;
    }

    // 컨테이너의 자식인지 확인
    if (this.handContainer.list.includes(this)) {
      // 컨테이너 내부에서의 현재 인덱스를 originalDepth로 저장
      // (컨테이너는 list 배열 순서로 렌더링되므로 인덱스가 중요)
      const currentIndex = this.handContainer.list.indexOf(this);
      this.originalDepth = currentIndex;
      
      // 로컬 좌표 저장 (복원 시 사용)
      this.originalLocalX = this.x;
      this.originalLocalY = this.y;

      // 현재 월드 변환 행렬 저장
      const worldMatrix = this.getWorldTransformMatrix();
      const worldX = worldMatrix.tx;
      const worldY = worldMatrix.ty;

      // 컨테이너에서 제거 (removeFromDisplayList: false로 월드 좌표 유지)
      this.handContainer.remove(this, false);
      
      // 씬에 직접 추가
      this.scene.add.existing(this);
      
      // 월드 좌표로 설정 (remove가 월드 좌표를 유지하므로 이미 설정되어 있지만 명시적으로 설정)
      this.setPosition(worldX, worldY);
    } else {
      // 이미 씬에 직접 추가된 상태면 depth만 저장
      this.originalDepth = this.depth;
    }

    // 최상위 depth로 설정
    this.setDepth(10000);
  }

  /**
   * 카드를 원래 위치로 복원합니다.
   * 호버 해제 시 컨테이너에 다시 추가합니다.
   */
  private restoreToContainer(): void {
    if (!this.handContainer) {
      return;
    }

    // 컨테이너의 자식이 아니면 (씬에 직접 추가된 상태)
    if (!this.handContainer.list.includes(this)) {
      // 씬에서 제거
      this.scene.children.remove(this);
      // 컨테이너에 다시 추가
      this.handContainer.add(this);
      // 저장된 로컬 좌표로 복원
      this.setPosition(this.originalLocalX, this.originalLocalY);
    }
  }
  
  /**
   * 컨테이너 내부에서의 올바른 위치로 카드를 이동시킵니다.
   * Phaser 컨테이너는 list 배열의 순서로 렌더링되므로, 올바른 인덱스로 이동해야 합니다.
   * 이 메서드는 CardHandManager에서 호출되어야 합니다.
   */
  public getTargetContainerIndex(): number {
    return this.selectedOriginalDepth;
  }


  public playParticleEffect(targetX: number, targetY: number): void {
    // 카드의 현재 월드 좌표를 가져옴
    const matrix = this.getWorldTransformMatrix();
    const worldX = matrix.tx;
    const worldY = matrix.ty;

    // 파티클 효과만 재생
    this.createParticleEffect(worldX, worldY, targetX, targetY);
  }

  private createParticleEffect(
    worldX: number, worldY: number, 
    targetX?: number, targetY?: number): void {
    const color: number = CardRenderer.getCardColor(this.cardData);
    const uiConfig = UIConfigManager.getInstance();
    const particleConfig = uiConfig.getCardParticleConfig();
    const particleCount: number = particleConfig.count;

    for (let i: number = 0; i < particleCount; i++) {
      const particle: Phaser.GameObjects.Arc = this.scene.add.circle(
        worldX, worldY,
        Phaser.Math.Between(particleConfig.minSize, particleConfig.maxSize),
        color
      );

      // 타겟이 지정되면 타겟을 향해 날아가고, 없으면 방사형으로 퍼짐
      if (targetX !== undefined && targetY !== undefined) {
        // 타겟을 향해 날아가는 파티클
        const angle       : number = Math.atan2(targetY - worldY, targetX - worldX);
        const distance    : number = Phaser.Math.Distance.Between(worldX, worldY, targetX, targetY);
        const randomOffset: number = Phaser.Math.Between(-30, 30);

        tweenConfig.apply(this.scene, 'cards.particleBurst', particle, {
          x: targetX + Math.cos(angle+randomOffset*0.01)*(distance*0.3),
          y: targetY + Math.sin(angle+randomOffset*0.01)*(distance*0.3),
          duration: 600,
          onComplete: () => particle.destroy()
        });
      } else {
        // 방사형으로 퍼지는 파티클
        const angle: number = (Math.PI * 2 * i) / particleCount;
        const speed: number = Phaser.Math.Between(50, 150);

        tweenConfig.apply(this.scene, 'cards.particleBurst', particle, {
          x: worldX + Math.cos(angle)*speed, 
          y: worldY + Math.sin(angle)*speed,
          onComplete: () => particle.destroy()
        });
      }
    }
  }
}
