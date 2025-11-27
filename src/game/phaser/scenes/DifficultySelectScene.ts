import Phaser from 'phaser';
import EventBus from '../../EventBus';
import LanguageManager from '../../../i18n/LanguageManager';
import GameDataManager from '../managers/GameDataManager';
import { tweenConfig } from '../managers/TweenConfigManager';
import { textStyle } from '../managers/TextStyleManager';
import { Difficulty } from '../../../types';

export default class DifficultySelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'DifficultySelectScene' });
  }

  create(): void {
    EventBus.emit('current-scene-ready', this);
    const width: number = this.cameras.main.width;
    const height: number = this.cameras.main.height;
    const langManager = LanguageManager.getInstance();

    // 배경
    this.add.rectangle(0, 0, width, height, 0x1a1a2e).setOrigin(0);

    // 타이틀
    const title: Phaser.GameObjects.Text = this.add.text(
      width/2, height/6,
      langManager.t('difficulty.title'),
      textStyle.getStyle('titles.main')
    );
    title.setOrigin(0.5);

    // 타이틀 애니메이션
    tweenConfig.apply(this, 'transitions.titleBreathing', title);

    // 난이도 설정 (어려운 순서대로)
    const difficulties: Array<{ key: Difficulty; nameKey: string; descKey: string; multiplier: number; color: number }> = [
      { key: 'very_hard', nameKey: 'veryHard', descKey: 'veryHardDesc', multiplier: 1.5, color: 0xF44336 },
      { key: 'hard', nameKey: 'hard', descKey: 'hardDesc', multiplier: 1.25, color: 0xFF9800 },
      { key: 'normal', nameKey: 'normal', descKey: 'normalDesc', multiplier: 1.0, color: 0x4ecdc4 },
      { key: 'easy', nameKey: 'easy', descKey: 'easyDesc', multiplier: 0.75, color: 0x8BC34A },
      { key: 'very_easy', nameKey: 'veryEasy', descKey: 'veryEasyDesc', multiplier: 0.5, color: 0x4CAF50 }
    ];

    // 난이도 버튼 생성
    const startY = height/3;
    const spacing = 85;

    difficulties.forEach((diff, index) => {
      const y = startY + index * spacing;
      const button = this.createDifficultyButton(
        width/2, y,
        langManager.t(`difficulty.${diff.nameKey}`),
        langManager.t(`difficulty.${diff.descKey}`),
        diff.color,
        () => this.startGameWithDifficulty(diff.key)
      );
    });

    // 파티클 효과
    this.createBackgroundParticles();
  }

  createDifficultyButton(
    x: number,
    y: number,
    text: string,
    description: string,
    color: number,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const button: Phaser.GameObjects.Container = this.add.container(x, y);

    // 버튼 배경
    const bg: Phaser.GameObjects.Rectangle = this.add.rectangle(0, 0, 400, 65, color);
    bg.setStrokeStyle(3, 0xffffff);

    // 버튼 텍스트 (왼쪽 정렬)
    const btnText: Phaser.GameObjects.Text = this.add.text(
      -180, -5,
      text,
      { ...textStyle.getStyle('buttons.primary'), fontSize: '24px', fontStyle: 'bold' }
    );
    btnText.setOrigin(0, 0.5);

    // 설명 텍스트 (오른쪽 정렬)
    const descText: Phaser.GameObjects.Text = this.add.text(
      180, -5,
      description,
      { ...textStyle.getStyle('buttons.primary'), fontSize: '16px' }
    );
    descText.setOrigin(1, 0.5);

    button.add([bg, btnText, descText]);
    button.setSize(400, 65);
    button.setInteractive({ useHandCursor: true });

    // 호버 효과
    button.on('pointerover', () => {
      tweenConfig.apply(this, 'interactive.buttonHover', button);
      const darkerColor = Phaser.Display.Color.IntegerToColor(color).darken(10).color;
      bg.setFillStyle(darkerColor);
    });

    button.on('pointerout', () => {
      tweenConfig.apply(this, 'interactive.buttonHoverOut', button);
      bg.setFillStyle(color);
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

  startGameWithDifficulty(difficulty: Difficulty): void {
    // 게임 데이터 매니저에서 시작 덱 가져오기
    const gameDataManager = GameDataManager.getInstance();
    const startDeckIds = gameDataManager.getStartDeck();
    const startDeck = gameDataManager.convertCardIdsToCardData(startDeckIds);

    // 게임 상태 초기화 (새 게임 시작)
    const gameState = {
      player: {
        maxHealth: 100,
        health: 100,
        energy: 3,
        maxEnergy: 3,
        defense: 0,
        gold: 100
      },
      deck: startDeck,
      currentStage: 0,
      stagesCleared: [],
      difficulty: difficulty  // 선택한 난이도 저장
    };
    this.registry.set('gameState', gameState);

    this.scene.start('StageSelectScene');
  }

  createBackgroundParticles(): void {
    const width: number = this.cameras.main.width;
    const height: number = this.cameras.main.height;

    // 간단한 파티클 효과 (원으로 대체)
    for (let i: number = 0; i < 30; i++) {
      const x: number = Phaser.Math.Between(0, width);
      const y: number = Phaser.Math.Between(0, height);
      const size: number = Phaser.Math.Between(2, 5);
      const particle: Phaser.GameObjects.Arc = this.add.circle(x, y, size, 0xffffff, 0.3);

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
