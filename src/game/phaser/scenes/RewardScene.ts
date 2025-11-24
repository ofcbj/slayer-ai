import Phaser from 'phaser';
import EventBus from '../../EventBus';
import Card from '../objects/Card';
import { CardData, GameState } from '../../../types';
import LanguageManager from '../../../i18n/LanguageManager';
import { tweenConfig } from '../managers/TweenConfigManager';
import { textStyle } from '../managers/TextStyleManager';
import GameDataManager from '../managers/GameDataManager';

interface CardsDataRegistry {
  rewards: CardData[];
  [key: string]: unknown;
}

export default class RewardScene extends Phaser.Scene {
  private continueButton!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'RewardScene' });
  }

  create(): void {
    // React에 현재 Scene이 준비되었음을 알림
    EventBus.emit('current-scene-ready', this);

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 배경
    this.add.rectangle(0, 0, width, height, 0x1a1a2e).setOrigin(0);

    // 타이틀
    const langManager = LanguageManager.getInstance();
    this.add.text(
      width / 2,
      100,
      langManager.t('reward.victory'),
      textStyle.getStyle('titles.section', { fontSize: '64px', color: '#2ecc71', stroke: '#ffffff', strokeThickness: 4 })
    ).setOrigin(0.5);

    // 승리 파티클
    this.createVictoryParticles();

    // 골드 보상 추가
    const gameState = this.registry.get('gameState') as GameState;
    const goldReward = 100;
    if (gameState.player.gold === undefined) {
      gameState.player.gold = 0;
    }
    gameState.player.gold += goldReward;

    // 골드 보상 표시
    this.add.text(
      width / 2,
      160,
      `💰 +${goldReward}G`,
      textStyle.getStyle('titles.section', { fontSize: '36px', color: '#fbbf24' })
    ).setOrigin(0.5);

    // 설명
    this.add.text(
      width / 2,
      210,
      langManager.t('reward.chooseCard'),
      textStyle.getStyle('buttons.secondary')
    ).setOrigin(0.5);

    // 보상 카드 생성
    this.createRewardCards();

    // 계속하기 버튼
    this.createContinueButton();
  }

  private createRewardCards(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const gameDataManager = GameDataManager.getInstance();
    
    // 보상 카드 목록 가져오기
    const rewardCardsPool = gameDataManager.getRewardCards();
    
    // 랜덤 보상 카드 3장 선택
    const rewardCards: CardData[] = Phaser.Utils.Array.Shuffle([...rewardCardsPool]).slice(0, 3);

    const spacing = 200;
    const startX = width / 2 - spacing;

    rewardCards.forEach((cardData: CardData, index: number) => {
      const x = startX + (index * spacing);
      const y = height / 2;

      const card = new Card(this, x, y, cardData);

      // 카드 선택 이벤트
      card.bg.off('pointerdown'); // 기존 이벤트 제거
      card.bg.on('pointerdown', () => {
        this.selectRewardCard(cardData, card);
      });

      // 등장 애니메이션
      card.setAlpha(0);
      card.setScale(0.8);

      tweenConfig.apply(this, 'transitions.cardAppear', card, {
        delay: index * 200
      });
    });
  }

  private selectRewardCard(cardData: CardData, cardObj: Card): void {
    // 덱에 추가 (깊은 복사하여 객체 참조 문제 방지)
    const gameState = this.registry.get('gameState') as GameState;
    gameState.deck.push({ ...cardData });

    // 선택 효과
    this.tweens.add({
      targets: cardObj,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: 0,
      duration: 500,
      onComplete: () => {
        cardObj.destroy();
      }
    });

    // 다른 카드 페이드 아웃
    this.children.getAll().forEach((child: Phaser.GameObjects.GameObject) => {
      if (child instanceof Card && child !== cardObj) {
        this.tweens.add({
          targets: child,
          alpha: 0,
          duration: 300,
          onComplete: () => child.destroy()
        });
      }
    });

    // 메시지 표시
    const message = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 + 150,
      `${cardData.name} added to deck!`,
      textStyle.getStyle('buttons.primary', { color: '#2ecc71', stroke: '#000000', strokeThickness: 4 })
    );
    message.setOrigin(0.5);
    message.setAlpha(0);

    this.tweens.add({
      targets: message,
      alpha: 1,
      duration: 500
    });

    // 계속하기 버튼 활성화
    this.continueButton.setVisible(true);
  }

  private createContinueButton(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const button = this.add.container(width / 2, height - 100);

    const bg = this.add.rectangle(0, 0, 250, 70, 0x4ecdc4);
    bg.setStrokeStyle(3, 0xffffff);

    const text = this.add.text(
      0,
      0,
      'Continue',
      textStyle.getStyle('titles.section', { fontSize: '32px' })
    );
    text.setOrigin(0.5);

    button.add([bg, text]);
    button.setSize(250, 70);
    button.setInteractive({ useHandCursor: true });
    button.setVisible(false); // 처음에는 숨김

    button.on('pointerover', () => {
      this.tweens.add({
        targets: button,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 100
      });
      bg.setFillStyle(0x5fddd5);
    });

    button.on('pointerout', () => {
      this.tweens.add({
        targets: button,
        scaleX: 1,
        scaleY: 1,
        duration: 100
      });
      bg.setFillStyle(0x4ecdc4);
    });

    button.on('pointerdown', () => {
      const gameState = this.registry.get('gameState') as GameState;

      // 최종 보스를 클리어했는지 확인
      if (gameState.stagesCleared.includes(10)) {
        // 게임 클리어!
        this.scene.start('GameOverScene', { victory: true });
      } else {
        // 스테이지 선택으로
        this.scene.start('StageSelectScene');
      }
    });

    this.continueButton = button;
  }

  private createVictoryParticles(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 승리 파티클 효과
    for (let i = 0; i < 50; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(-100, height);
      const size = Phaser.Math.Between(3, 8);
      const color = Phaser.Math.RND.pick([0xffd700, 0xffff00, 0xffa500]);

      const particle = this.add.circle(x, y, size, color);

      this.tweens.add({
        targets: particle,
        y: y + Phaser.Math.Between(200, 400),
        alpha: 0,
        duration: Phaser.Math.Between(2000, 4000),
        repeat: -1,
        delay: Phaser.Math.Between(0, 2000)
      });
    }
  }
}
