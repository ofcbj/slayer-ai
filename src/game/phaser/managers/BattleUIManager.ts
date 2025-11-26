import Phaser from 'phaser';
import { PlayerState } from '../../../types';
import LanguageManager from '../../../i18n/LanguageManager';
import UIConfigManager from './UIConfigManager';
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
  private scene                 : Phaser.Scene;
  private energyContainer!      : Phaser.GameObjects.Container;
  private energyOrbs            : EnergyOrbData[] = [];
  private deckPileContainer!    : Phaser.GameObjects.Container;
  private discardPileContainer! : Phaser.GameObjects.Container;
  private deckText!             : Phaser.GameObjects.Text;
  private deckCountText!        : Phaser.GameObjects.Text;
  private discardCountText!     : Phaser.GameObjects.Text;
  private endTurnButton!        : Phaser.GameObjects.Container;
  private endTurnButtonBg!      : Phaser.GameObjects.Rectangle;
  private endTurnButtonText!    : Phaser.GameObjects.Text;
  private isEndTurnButtonEnabled: boolean = true;
  
  private onEndTurnClick?       : () => void;
  private onDeckPileClick?      : () => void;
  private onDiscardPileClick?   : () => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }
  /**
   * 에너지 UI를 생성합니다.
   */
  public createEnergyUI(playerState: PlayerState): void {
    const uiConfig = UIConfigManager.getInstance();
    const pos = uiConfig.getEnergyUIPosition(this.scene.cameras.main);
    const config = uiConfig.getEnergyUIConfig();
    
    // Energy 컨테이너
    const energyContainer = this.scene.add.container(pos.x, pos.y);
    // Energy 아이콘들 (구슬)
    this.energyOrbs = [];
    const orbSpacing = config.orbSpacing;

    for (let i = 0; i < playerState.maxEnergy; i++) {
      const orb = this.scene.add.circle(i * orbSpacing, 0, config.orbRadius, uiConfig.getColor('ENERGY_ORB'));
      orb.setStrokeStyle(3, uiConfig.getColor('STROKE_WHITE'));
      // 빛나는 효과
      const glow = this.scene.add.circle(i * orbSpacing, 0, config.orbGlowRadius, uiConfig.getColor('ENERGY_ORB_GLOW'), 0.3);

      this.energyOrbs.push({ orb, glow, active: true });
      energyContainer.add([glow, orb]);
      // 펄스 애니메이션
      tweenConfig.apply(this.scene, 'ui.energyPulse', glow, {
        delay: i * 100
      });
    }

    this.energyContainer = energyContainer;
  }

  public createEndTurnButton(onClick: () => void): void {
    const uiConfig = UIConfigManager.getInstance();
    const pos = uiConfig.getEndTurnButtonPosition(this.scene.cameras.main);
    const size = uiConfig.getEndTurnButtonSize();
    this.onEndTurnClick = onClick;

    const button = this.scene.add.container(pos.x, pos.y);

    const bg = this.scene.add.rectangle(0, 0, size.width, size.height, uiConfig.getColor('END_TURN_BUTTON'));
    bg.setStrokeStyle(3, uiConfig.getColor('STROKE_WHITE'));

    const text = this.scene.add.text(0, 0, 'End Turn',
      textStyle.getStyle('buttons.secondary')
    );
    text.setOrigin(0.5);

    // 단축키 텍스트 추가
    const hotkeyConfig = uiConfig.getHotkeyTextConfig();
    
    // 배경
    const hotkeyBg = this.scene.add.rectangle(
      0,
      size.height / 2 + 15,
      60,
      24,
      parseInt(hotkeyConfig.bgColor, 16),
      hotkeyConfig.bgAlpha
    );
    hotkeyBg.setStrokeStyle(2, 0xffffff);

    // 텍스트
    const hotkeyText = this.scene.add.text(
      0,
      size.height / 2 + 15,
      'SPACE',
      {
        fontSize: hotkeyConfig.fontSize,
        fontFamily: hotkeyConfig.fontFamily,
        fontStyle: hotkeyConfig.fontStyle,
        color: hotkeyConfig.color,
        stroke: hotkeyConfig.strokeColor,
        strokeThickness: hotkeyConfig.strokeThickness
      }
    );
    hotkeyText.setOrigin(0.5);

    button.add([bg, text, hotkeyBg, hotkeyText]);
    button.setSize(size.width, size.height);
    button.setInteractive({ useHandCursor: true });

    button.on('pointerover', () => {
      if (!this.isEndTurnButtonEnabled) return;

      tweenConfig.apply(this.scene, 'interactive.buttonHover', button);
      bg.setFillStyle(uiConfig.getColor('END_TURN_BUTTON_HOVER'));
    });

    button.on('pointerout', () => {
      if (!this.isEndTurnButtonEnabled) return;

      tweenConfig.apply(this.scene, 'interactive.buttonHoverOut', button);
      bg.setFillStyle(uiConfig.getColor('END_TURN_BUTTON'));
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

  public setEndTurnButtonEnabled(enabled: boolean): void {
    this.isEndTurnButtonEnabled = enabled;
    const uiConfig = UIConfigManager.getInstance();

    if (enabled) {
      // 활성화
      this.endTurnButtonBg.setFillStyle(uiConfig.getColor('END_TURN_BUTTON'));
      this.endTurnButtonText.setAlpha(1);
      this.endTurnButton.setAlpha(1);
    } else {
      // 비활성화
      this.endTurnButtonBg.setFillStyle(uiConfig.getColor('END_TURN_BUTTON_DISABLED'));
      this.endTurnButtonText.setAlpha(0.5);
      this.endTurnButton.setAlpha(0.7);
    }
  }
  /**
   * 카드 더미 UI를 생성하는 공통 헬퍼 메서드
   */
  private createCardPile(
    x: number, y: number,
    icon: string, label: string,
    cardColor: number, strokeColor: number,
    offsetDirection: number,
    onClick: () => void
  ): { container: Phaser.GameObjects.Container; countText: Phaser.GameObjects.Text } {
    const uiConfig = UIConfigManager.getInstance();
    const container = this.scene.add.container(x, y);

    // 카드 더미 시각화 (여러 장 겹쳐진 효과)
    for (let i = 0; i < 5; i++) {
      const cardBg = this.scene.add.rectangle(
        offsetDirection*i*2, -i*2,
        120, 160,
        cardColor
      );
      cardBg.setStrokeStyle(3, strokeColor);
      container.add(cardBg);
    }

    // 아이콘
    const iconText = this.scene.add.text(0, 0, icon, { fontSize: '48px' }).setOrigin(0.5);
    container.add(iconText);

    // 카드 수 텍스트
    const countText = this.scene.add.text(
      0, 100,
      '0',
      textStyle.getStyle('buttons.secondary', { stroke: '#000000', strokeThickness: 4 })
    ).setOrigin(0.5);
    container.add(countText);

    // 라벨
    const labelText = this.scene.add.text(
      0, 130,
      label,
      textStyle.getStyle('character.name', { color: '#95a5a6' })
    ).setOrigin(0.5);
    container.add(labelText);

    // 클릭 가능한 영역
    const clickArea = this.scene.add.rectangle(0, 0, 150, 200, uiConfig.getColor('BACKGROUND_OVERLAY'), 0);
    clickArea.setInteractive({ useHandCursor: true });
    container.add(clickArea);

    // 호버 이벤트
    clickArea.on('pointerover', () => {
      tweenConfig.apply(this.scene, 'ui.deckPileHover', container);
    });

    clickArea.on('pointerout', () => {
      tweenConfig.apply(this.scene, 'ui.deckPileHoverOut', container);
    });

    clickArea.on('pointerdown', () => {
      onClick();
    });

    return { container, countText };
  }

  public createDeckPile(onClick: () => void): void {
    const uiConfig = UIConfigManager.getInstance();
    const pos = uiConfig.getDeckPilePosition(this.scene.cameras.main);
    this.onDeckPileClick = onClick;

    const langManager = LanguageManager.getInstance();
    const result = this.createCardPile(
      pos.x, pos.y,
      '🎴',
      langManager.t('battle.deck'),
      uiConfig.getColor('DECK_PILE_BG'), uiConfig.getColor('DECK_PILE_STROKE'),
      -1, // 왼쪽으로 오프셋
      () => {
        if (this.onDeckPileClick) {
          this.onDeckPileClick();
        }
      }
    );

    this.deckPileContainer = result.container;
    this.deckCountText = result.countText;
  }

  public createDiscardPile(onClick: () => void): void {
    const uiConfig = UIConfigManager.getInstance();
    const pos = uiConfig.getDiscardPilePosition(this.scene.cameras.main);
    this.onDiscardPileClick = onClick;

    const langManager = LanguageManager.getInstance();
    const result = this.createCardPile(
      pos.x, pos.y,
      '🗑️',
      langManager.t('battle.discard'),
      uiConfig.getColor('DISCARD_PILE_BG'), uiConfig.getColor('DISCARD_PILE_STROKE'),
      1, // 오른쪽으로 오프셋
      () => {
        if (this.onDiscardPileClick) {
          this.onDiscardPileClick();
        }
      }
    );

    this.discardPileContainer = result.container;
    this.discardCountText = result.countText;
  }

  public createDeckInfoText(): void {
    const uiConfig = UIConfigManager.getInstance();
    const pos = uiConfig.getDeckInfoTextPosition(this.scene.cameras.main);

    this.deckText = this.scene.add.text(pos.x, pos.y, '',
      textStyle.getStyle('ui.label', { fontFamily: 'monospace' })
    );
  }

  public updateEnergyUI(playerState: PlayerState): void {
    const currentEnergy   = playerState.energy;
    const maxEnergy       = playerState.maxEnergy;
    const requiredOrbs    = Math.max(currentEnergy, maxEnergy);
    const currentOrbCount = this.energyOrbs.length;
    const uiConfig = UIConfigManager.getInstance();

    // 필요하면 구슬 추가 (에너지가 maxEnergy를 초과한 경우)
    if (requiredOrbs > currentOrbCount) {
      const uiConfig = UIConfigManager.getInstance();
      const config = uiConfig.getEnergyUIConfig();
      const orbSpacing = config.orbSpacing;
      
      for (let i = currentOrbCount; i < requiredOrbs; i++) {
        const orb = this.scene.add.circle(i * orbSpacing, 0, config.orbRadius, uiConfig.getColor('ENERGY_ORB'));
        orb.setStrokeStyle(3, uiConfig.getColor('STROKE_WHITE'));

        // 빛나는 효과
        const glow = this.scene.add.circle(i * orbSpacing, 0, config.orbGlowRadius, uiConfig.getColor('ENERGY_ORB_GLOW'), 0.3);

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
          orbData.orb.setFillStyle(isBonus ? uiConfig.getColor('ENERGY_ORB_BONUS') : uiConfig.getColor('ENERGY_ORB')); // 보너스 에너지는 더 밝은 색
          orbData.orb.setAlpha(1);
          orbData.glow.setAlpha(isBonus ? 0.5 : 0.3);
          orbData.active = true;
        } else {
          // 비활성 에너지
          orbData.orb.setFillStyle(uiConfig.getColor('ENERGY_ORB_INACTIVE'));
          orbData.orb.setAlpha(0.5);
          orbData.glow.setAlpha(0);
          orbData.active = false;
        }
      } else if (index < currentEnergy) {
        // maxEnergy를 초과하는 보너스 에너지 (일시적으로 표시)
        orbData.orb.setVisible(true);
        orbData.glow.setVisible(true);
        orbData.orb.setFillStyle(uiConfig.getColor('ENERGY_ORB_BONUS'));
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

  public showMessage(text: string): void {
    const width   = this.scene.cameras.main.width;
    const height  = this.scene.cameras.main.height;
    const message = this.scene.add.text(width/2, height/2, text,
      textStyle.getStyle('ui.message', { fontSize: '32px', strokeThickness: 6 })
    );
    message.setOrigin(0.5);

    tweenConfig.apply(this.scene, 'ui.damageText', message, {
      duration: 1500,
      y: height / 2 - 50,
      onComplete: () => message.destroy()
    });
  }

  public animateDeckPile(): void {
    if (this.deckPileContainer) {
      tweenConfig.apply(this.scene, 'ui.deckPileBounce', this.deckPileContainer);
    }
  }

  public animateDiscardPile(): void {
    if (this.discardPileContainer) {
      tweenConfig.apply(this.scene, 'ui.discardPileBounce', this.discardPileContainer);
    }
  }

  public playReshuffleAnimation(onComplete?: () => void): void {
    if (this.discardPileContainer && this.deckPileContainer) {
      tweenConfig.apply(this.scene, 'ui.reshuffleScale', this.discardPileContainer, {
        onComplete: () => {
          tweenConfig.apply(this.scene, 'ui.reshuffleScale', this.deckPileContainer, {
            onComplete: onComplete
          });
        }
      });
    }
  }

  public showReshuffleMessage(): void {
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;

    const message = this.scene.add.text(width/2, height-400, '덱 리셔플!',
      textStyle.getStyle('ui.message', { color: '#4ecdc4', fontSize: '28px' })
    ).setOrigin(0.5);

    tweenConfig.apply(this.scene, 'ui.damageText', message, {
      y: message.y - 50,
      onComplete: () => message.destroy()
    });
  }

  public getDeckPileContainer(): Phaser.GameObjects.Container {
    return this.deckPileContainer;
  }

  public getDiscardPileContainer(): Phaser.GameObjects.Container {
    return this.discardPileContainer;
  }
}

