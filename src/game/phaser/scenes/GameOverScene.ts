import Phaser from 'phaser';
import EventBus from '../../EventBus';
import { tweenConfig } from '../managers/TweenConfigManager';
import { textStyle } from '../managers/TextStyleManager';

interface InitData {
  victory?: boolean;
}

interface GameState {
  player: {
    maxHealth : number;
    health    : number;
    energy    : number;
    maxEnergy : number;
    defense   : number;
  };
  deck          : any[];
  currentStage  : number;
  stagesCleared : any[];
}

export default class GameOverScene extends Phaser.Scene {
  private victory: boolean = false;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data: InitData): void {
    this.victory = data.victory || false;
  }

  create(): void {
    EventBus.emit('current-scene-ready', this);

    const width : number = this.cameras.main.width;
    const height: number = this.cameras.main.height;

    const bgColor: number = this.victory ? 0x1a3a1a : 0x3a1a1a;
    this.add.rectangle(0, 0, width, height, bgColor).setOrigin(0);

    if (this.victory) {
      this.createVictoryScreen();
    } else {
      this.createDefeatScreen();
    }

    this.createButtons();
  }

  private createVictoryScreen(): void {
    const width : number = this.cameras.main.width;
    const height: number = this.cameras.main.height;
    const title : Phaser.GameObjects.Text = this.add.text(
      width/2, height/3,
      'VICTORY!',
      textStyle.getStyle('titles.victory')
    );
    title.setOrigin(0.5);

    tweenConfig.apply(this, 'transitions.titleBreathing', title, {
      scaleX: 1.1,
      scaleY: 1.1
    });

    // 메시지
    this.add.text(
      width/2, height/2,
      'You have defeated the Demon Lord!',
      textStyle.getStyle('titles.section', { fontSize: '32px' })
    ).setOrigin(0.5);

    // 승리 파티클
    this.createCelebrationParticles();
  }

  private createDefeatScreen(): void {
    const width : number = this.cameras.main.width;
    const height: number = this.cameras.main.height;

    const title: Phaser.GameObjects.Text = this.add.text(
      width/2, height/3,
      'DEFEAT',
      textStyle.getStyle('titles.gameOver')
    );
    title.setOrigin(0.5);

    // 메시지
    this.add.text(
      width/2, height/2,
      'Your journey ends here...',
      textStyle.getStyle('reward.instruction', { fontSize: '32px' })
    ).setOrigin(0.5);

    // 게임 상태
    const gameState: GameState = this.registry.get('gameState');
    const statsText: string = `Stages Cleared: ${gameState.stagesCleared.length}\nDeck Size: ${gameState.deck.length} cards`;

    this.add.text(
      width/2, height/2 + 80,
      statsText,
      textStyle.getStyle('buttons.secondary', { fontFamily: 'monospace', color: '#aaaaaa' })
    ).setOrigin(0.5);
  }

  private createButtons(): void {
    const width  : number = this.cameras.main.width;
    const height : number = this.cameras.main.height;

    // 다시하기 버튼
    this.createButton(
      width/2-150, height-150,
      'Restart',
      (): void => {
        // 게임 상태 리셋
        const initialGameState: GameState = {
          player: {
            maxHealth : 100,
            health    : 100,
            energy    : 3,
            maxEnergy : 3,
            defense   : 0
          },
          deck: [],
          currentStage: 1,
          stagesCleared: []
        };
        this.registry.set('gameState', initialGameState);

        this.scene.start('MenuScene');
      }
    );

    // 메인 메뉴 버튼
    this.createButton(
      width/2+150, height-150,
      'Main Menu',
      (): void => {
        this.scene.start('MenuScene');
      }
    );
  }

  private createButton(
    x: number, y: number,
    text: string,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const button: Phaser.GameObjects.Container = this.add.container(x, y);

    const bg: Phaser.GameObjects.Rectangle = this.add.rectangle(0, 0, 200, 60, 0x4ecdc4);
    bg.setStrokeStyle(3, 0xffffff);

    const btnText: Phaser.GameObjects.Text = this.add.text(0,0,text,
      textStyle.getStyle('buttons.secondary')
    );
    btnText.setOrigin(0.5);

    button.add([bg, btnText]);
    button.setSize(200, 60);
    button.setInteractive({ useHandCursor: true });

    button.on('pointerover', (): void => {
      tweenConfig.apply(this, 'interactive.buttonHover', button);
      bg.setFillStyle(0x5fddd5);
    });

    button.on('pointerout', (): void => {
      tweenConfig.apply(this, 'interactive.buttonHoverOut', button);
      bg.setFillStyle(0x4ecdc4);
    });

    button.on('pointerdown', (): void => {
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

  private createCelebrationParticles(): void {
    const width: number = this.cameras.main.width;
    const height: number = this.cameras.main.height;

    for (let i: number = 0; i < 100; i++) {
      const x: number = Phaser.Math.Between(0, width);
      const y: number = Phaser.Math.Between(-200, height);
      const size: number = Phaser.Math.Between(4, 12);
      const colors: number[] = [0xffd700, 0xffff00, 0xffa500, 0xff69b4, 0x00ff00];
      const color: number = Phaser.Math.RND.pick(colors);

      const particle: Phaser.GameObjects.Arc = this.add.circle(x, y, size, color);

      this.tweens.add({
        targets: particle,
        y: y + Phaser.Math.Between(300, 600),
        x: x + Phaser.Math.Between(-100, 100),
        alpha: 0,
        rotation: Phaser.Math.Between(-Math.PI, Math.PI),
        duration: Phaser.Math.Between(2000, 4000),
        repeat: -1,
        delay: Phaser.Math.Between(0, 2000)
      });
    }
  }
}
