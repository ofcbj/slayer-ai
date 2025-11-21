import Phaser from 'phaser';
import { PlayerState } from '../../../types';
import LanguageManager from '../../../i18n/LanguageManager';
import { tweenConfig } from './TweenConfigManager';
import { textStyle } from './TextStyleManager';

interface EnergyOrbData {
  orb   : Phaser.GameObjects.Arc;
  glow  : Phaser.GameObjects.Arc;
  active: boolean;
}

/**
 * 전투 UI를 관리하는 클래스
 * 에너지 UI, 턴 종료 버튼, 덱/버린 카드 더미 UI 등을 관리합니다.
 */
export default class BattleUIManager {
  private scene: Phaser.Scene;
  private energyContainer!: Phaser.GameObjects.Container;
  private energyOrbs: EnergyOrbData[] = [];
  private deckPileContainer!: Phaser.GameObjects.Container;
  private discardPileContainer!: Phaser.GameObjects.Container;
  private deckText!: Phaser.GameObjects.Text;
  private deckCountText!: Phaser.GameObjects.Text;
  private discardCountText!: Phaser.GameObjects.Text;
  private endTurnButton!: Phaser.GameObjects.Container;
  private endTurnButtonBg!: Phaser.GameObjects.Rectangle;
  private endTurnButtonText!: Phaser.GameObjects.Text;
  private isEndTurnButtonEnabled: boolean = true;
  private onEndTurnClick?: () => void;
  private onDeckPileClick?: () => void;
  private onDiscardPileClick?: () => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * 에너지 UI를 생성합니다.
   */
  public createEnergyUI(playerState: PlayerState): void {
    const width = this.scene.cameras.main.width;
    const x = width - 300;
    const y = 580;

    // Energy 컨테이너
    const energyContainer = this.scene.add.container(x, y);

    // Energy 아이콘들 (구슬)
    this.energyOrbs = [];
    const orbSpacing = 50;

    for (let i = 0; i < playerState.maxEnergy; i++) {
      const orb = this.scene.add.circle(i * orbSpacing, 0, 20, 0xf39c12);
      orb.setStrokeStyle(3, 0xffffff);

      // 빛나는 효과
      const glow = this.scene.add.circle(i * orbSpacing, 0, 24, 0xffcc00, 0.3);

      this.energyOrbs.push({ orb, glow, active: true });
      energyContainer.add([glow, orb]);

      // 펄스 애니메이션
      tweenConfig.apply(this.scene, 'ui.energyPulse', glow, {
        delay: i * 100
      });
    }

    this.energyContainer = energyContainer;
  }

  /**
   * 턴 종료 버튼을 생성합니다.
   */
  public createEndTurnButton(onClick: () => void): void {
    const width = this.scene.cameras.main.width;
    this.onEndTurnClick = onClick;

    const button = this.scene.add.container(width - 200, 50);

    const bg = this.scene.add.rectangle(0, 0, 150, 60, 0xff6b6b);
    bg.setStrokeStyle(3, 0xffffff);

    const text = this.scene.add.text(
      0,
      0,
      'End Turn',
      textStyle.getStyle('buttons.secondary')
    );
    text.setOrigin(0.5);

    button.add([bg, text]);
    button.setSize(150, 60);
    button.setInteractive({ useHandCursor: true });

    button.on('pointerover', () => {
      if (!this.isEndTurnButtonEnabled) return;

      tweenConfig.apply(this.scene, 'interactive.buttonHover', button);
      bg.setFillStyle(0xff8888);
    });

    button.on('pointerout', () => {
      if (!this.isEndTurnButtonEnabled) return;

      tweenConfig.apply(this.scene, 'interactive.buttonHoverOut', button);
      bg.setFillStyle(0xff6b6b);
    });

    button.on('pointerdown', () => {
      if (!this.isEndTurnButtonEnabled) return;

      if (this.onEndTurnClick) {
        this.onEndTurnClick();
      }
    });

    // 참조 저장
    this.endTurnButton = button;
    this.endTurnButtonBg = bg;
    this.endTurnButtonText = text;
  }

  /**
   * 턴 종료 버튼을 활성화/비활성화합니다.
   */
  public setEndTurnButtonEnabled(enabled: boolean): void {
    this.isEndTurnButtonEnabled = enabled;

    if (enabled) {
      // 활성화
      this.endTurnButtonBg.setFillStyle(0xff6b6b);
      this.endTurnButtonText.setAlpha(1);
      this.endTurnButton.setAlpha(1);
    } else {
      // 비활성화
      this.endTurnButtonBg.setFillStyle(0x666666);
      this.endTurnButtonText.setAlpha(0.5);
      this.endTurnButton.setAlpha(0.7);
    }
  }

  /**
   * 덱 더미 UI를 생성합니다.
   */
  public createDeckPile(onClick: () => void): void {
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;
    this.onDeckPileClick = onClick;

    // 덱의 위치 (핸드 오른쪽)
    const deckX = width - 200;
    const deckY = height - 250;

    this.deckPileContainer = this.scene.add.container(deckX, deckY);

    // 카드 더미 시각화 (여러 장 겹쳐진 효과)
    for (let i = 0; i < 5; i++) {
      const cardBg = this.scene.add.rectangle(-i * 2, -i * 2, 120, 160, 0x2c3e50);
      cardBg.setStrokeStyle(3, 0x34495e);
      this.deckPileContainer.add(cardBg);
    }

    // 덱 아이콘
    const deckIcon = this.scene.add.text(0, 0, '🎴', {
      fontSize: '48px'
    }).setOrigin(0.5);
    this.deckPileContainer.add(deckIcon);

    // 덱 카드 수 텍스트
    this.deckCountText = this.scene.add.text(
      0,
      100,
      '0',
      textStyle.getStyle('buttons.secondary', { stroke: '#000000', strokeThickness: 4 })
    ).setOrigin(0.5);
    this.deckPileContainer.add(this.deckCountText);

    // 라벨
    const langManager = LanguageManager.getInstance();
    const deckLabel = this.scene.add.text(
      0,
      130,
      langManager.t('battle.deck'),
      textStyle.getStyle('character.name', { color: '#95a5a6' })
    ).setOrigin(0.5);
    this.deckPileContainer.add(deckLabel);

    // 클릭 가능한 영역 추가
    const clickArea = this.scene.add.rectangle(0, 0, 150, 200, 0x000000, 0);
    clickArea.setInteractive({ useHandCursor: true });
    this.deckPileContainer.add(clickArea);

    clickArea.on('pointerover', () => {
      tweenConfig.apply(this.scene, 'ui.deckPileHover', this.deckPileContainer);
    });

    clickArea.on('pointerout', () => {
      tweenConfig.apply(this.scene, 'ui.deckPileHoverOut', this.deckPileContainer);
    });

    clickArea.on('pointerdown', () => {
      if (this.onDeckPileClick) {
        this.onDeckPileClick();
      }
    });
  }

  /**
   * 버린 카드 더미 UI를 생성합니다.
   */
  public createDiscardPile(onClick: () => void): void {
    const height = this.scene.cameras.main.height;
    this.onDiscardPileClick = onClick;

    // 버린 카드 더미의 위치 (핸드 왼쪽)
    const discardX = 200;
    const discardY = height - 250;

    this.discardPileContainer = this.scene.add.container(discardX, discardY);

    // 카드 더미 시각화 (여러 장 겹쳐진 효과)
    for (let i = 0; i < 5; i++) {
      const cardBg = this.scene.add.rectangle(i * 2, -i * 2, 120, 160, 0x34495e);
      cardBg.setStrokeStyle(3, 0x7f8c8d);
      this.discardPileContainer.add(cardBg);
    }

    // 버린 카드 더미 아이콘
    const discardIcon = this.scene.add.text(0, 0, '🗑️', {
      fontSize: '48px'
    }).setOrigin(0.5);
    this.discardPileContainer.add(discardIcon);

    // 버린 카드 수 텍스트
    this.discardCountText = this.scene.add.text(
      0,
      100,
      '0',
      textStyle.getStyle('buttons.secondary', { stroke: '#000000', strokeThickness: 4 })
    ).setOrigin(0.5);
    this.discardPileContainer.add(this.discardCountText);

    // 라벨
    const langManager = LanguageManager.getInstance();
    const discardLabel = this.scene.add.text(
      0,
      130,
      langManager.t('battle.discard'),
      textStyle.getStyle('character.name', { color: '#95a5a6' })
    ).setOrigin(0.5);
    this.discardPileContainer.add(discardLabel);

    // 클릭 가능한 영역 추가
    const clickArea = this.scene.add.rectangle(0, 0, 150, 200, 0x000000, 0);
    clickArea.setInteractive({ useHandCursor: true });
    this.discardPileContainer.add(clickArea);

    clickArea.on('pointerover', () => {
      tweenConfig.apply(this.scene, 'ui.deckPileHover', this.discardPileContainer);
    });

    clickArea.on('pointerout', () => {
      tweenConfig.apply(this.scene, 'ui.deckPileHoverOut', this.discardPileContainer);
    });

    clickArea.on('pointerdown', () => {
      if (this.onDiscardPileClick) {
        this.onDiscardPileClick();
      }
    });
  }

  /**
   * 덱 정보 텍스트를 생성합니다.
   */
  public createDeckInfoText(): void {
    const height = this.scene.cameras.main.height;

    this.deckText = this.scene.add.text(
      50,
      height - 50,
      '',
      textStyle.getStyle('ui.label', { fontFamily: 'monospace' })
    );
  }

  /**
   * 에너지 UI를 업데이트합니다.
   */
  public updateEnergyUI(playerState: PlayerState): void {
    const currentEnergy = playerState.energy;
    const maxEnergy = playerState.maxEnergy;
    const requiredOrbs = Math.max(currentEnergy, maxEnergy);
    const currentOrbCount = this.energyOrbs.length;

    // 필요하면 구슬 추가 (에너지가 maxEnergy를 초과한 경우)
    if (requiredOrbs > currentOrbCount) {
      const orbSpacing = 50;
      for (let i = currentOrbCount; i < requiredOrbs; i++) {
        const orb = this.scene.add.circle(i * orbSpacing, 0, 20, 0xf39c12);
        orb.setStrokeStyle(3, 0xffffff);

        // 빛나는 효과
        const glow = this.scene.add.circle(i * orbSpacing, 0, 24, 0xffcc00, 0.3);

        this.energyOrbs.push({ orb, glow, active: true });
        this.energyContainer.add([glow, orb]);

        // 펄스 애니메이션
        tweenConfig.apply(this.scene, 'ui.energyPulse', glow, {
          delay: i * 100
        });

        // 등장 애니메이션
        orb.setScale(0);
        glow.setScale(0);
        tweenConfig.apply(this.scene, 'ui.energyOrbAppear', [orb, glow]);
      }
    }

    // Energy 구슬 상태 업데이트
    this.energyOrbs.forEach((orbData, index) => {
      if (index < maxEnergy) {
        // maxEnergy 범위 내의 구슬만 표시
        orbData.orb.setVisible(true);
        orbData.glow.setVisible(true);

        if (index < currentEnergy) {
          // 활성 에너지
          const isBonus = index >= maxEnergy;
          orbData.orb.setFillStyle(isBonus ? 0xffcc00 : 0xf39c12); // 보너스 에너지는 더 밝은 색
          orbData.orb.setAlpha(1);
          orbData.glow.setAlpha(isBonus ? 0.5 : 0.3);
          orbData.active = true;
        } else {
          // 비활성 에너지
          orbData.orb.setFillStyle(0x666666);
          orbData.orb.setAlpha(0.5);
          orbData.glow.setAlpha(0);
          orbData.active = false;
        }
      } else if (index < currentEnergy) {
        // maxEnergy를 초과하는 보너스 에너지 (일시적으로 표시)
        orbData.orb.setVisible(true);
        orbData.glow.setVisible(true);
        orbData.orb.setFillStyle(0xffcc00);
        orbData.orb.setAlpha(1);
        orbData.glow.setAlpha(0.5);
        orbData.active = true;
      } else {
        // maxEnergy를 초과하고 currentEnergy도 넘는 구슬은 숨김
        orbData.orb.setVisible(false);
        orbData.glow.setVisible(false);
        orbData.active = false;
      }
    });
  }

  /**
   * 덱 정보를 업데이트합니다.
   */
  public updateDeckInfo(deckSize: number, handSize: number, discardSize: number): void {
    const totalCards = deckSize + handSize + discardSize;
    console.log(`[BattleUIManager] updateDeckInfo - Deck: ${deckSize}, Hand: ${handSize}, Discard: ${discardSize}, Total: ${totalCards}`);

    if (this.deckText) {
      this.deckText.setText(`Deck: ${deckSize} | Hand: ${handSize} | Discard: ${discardSize}`);
    }

    // 덱 카운트 업데이트
    if (this.deckCountText) {
      this.deckCountText.setText(deckSize.toString());
    }

    // 버린 카드 더미 카운트 업데이트
    if (this.discardCountText) {
      this.discardCountText.setText(discardSize.toString());
    }
  }

  /**
   * 메시지를 표시합니다.
   */
  public showMessage(text: string): void {
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;

    const message = this.scene.add.text(
      width / 2,
      height / 2,
      text,
      textStyle.getStyle('ui.message', { fontSize: '32px', strokeThickness: 6 })
    );
    message.setOrigin(0.5);

    tweenConfig.apply(this.scene, 'ui.damageText', message, {
      duration: 1500,
      y: height / 2 - 50,
      onComplete: () => message.destroy()
    });
  }

  /**
   * 덱 더미 애니메이션을 재생합니다.
   */
  public animateDeckPile(): void {
    if (this.deckPileContainer) {
      tweenConfig.apply(this.scene, 'ui.deckPileBounce', this.deckPileContainer);
    }
  }

  /**
   * 버린 카드 더미 애니메이션을 재생합니다.
   */
  public animateDiscardPile(): void {
    if (this.discardPileContainer) {
      tweenConfig.apply(this.scene, 'ui.discardPileBounce', this.discardPileContainer);
    }
  }

  /**
   * 리셔플 애니메이션을 재생합니다.
   */
  public playReshuffleAnimation(onComplete?: () => void): void {
    if (this.discardPileContainer && this.deckPileContainer) {
      this.scene.tweens.add({
        targets: this.discardPileContainer,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 200,
        yoyo: true,
        onComplete: () => {
          this.scene.tweens.add({
            targets: this.deckPileContainer,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 200,
            yoyo: true,
            onComplete: onComplete
          });
        }
      });
    }
  }

  /**
   * 리셔플 메시지를 표시합니다.
   */
  public showReshuffleMessage(): void {
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;

    const message = this.scene.add.text(
      width / 2,
      height - 400,
      '덱 리셔플!',
      {
        fontSize: '28px',
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold',
        color: '#4ecdc4',
        stroke: '#000000',
        strokeThickness: 4
      }
    ).setOrigin(0.5);

    tweenConfig.apply(this.scene, 'ui.damageText', message, {
      y: message.y - 50,
      onComplete: () => message.destroy()
    });
  }

  /**
   * 덱 더미 컨테이너를 반환합니다.
   */
  public getDeckPileContainer(): Phaser.GameObjects.Container {
    return this.deckPileContainer;
  }

  /**
   * 버린 카드 더미 컨테이너를 반환합니다.
   */
  public getDiscardPileContainer(): Phaser.GameObjects.Container {
    return this.discardPileContainer;
  }
}

