import Phaser from 'phaser';
import EventBus from '../../EventBus';

interface InitData {
  victory?: boolean;
}

interface GameState {
  player: {
    maxHealth: number;
    health: number;
    energy: number;
    maxEnergy: number;
    defense: number;
  };
  deck: any[];
  currentStage: number;
  stagesCleared: any[];
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
    // React에 현재 Scene이 준비되었음을 알림
    EventBus.emit('current-scene-ready', this);

    const width: number = this.cameras.main.width;
    const height: number = this.cameras.main.height;

    // 배경
    const bgColor: number = this.victory ? 0x1a3a1a : 0x3a1a1a;
    this.add.rectangle(0, 0, width, height, bgColor).setOrigin(0);

    if (this.victory) {
      this.createVictoryScreen();
    } else {
      this.createDefeatScreen();
    }

    // 버튼들
    this.createButtons();
  }

  private createVictoryScreen(): void {
    const width: number = this.cameras.main.width;
    const height: number = this.cameras.main.height;

    // 타이틀
    const title: Phaser.GameObjects.Text = this.add.text(
      width / 2,
      height / 3,
      'VICTORY!',
      {
        fontSize: '96px',
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold',
        color: '#2ecc71',
        stroke: '#ffffff',
        strokeThickness: 8
      }
    );
    title.setOrigin(0.5);

    // 애니메이션
    this.tweens.add({
      targets: title,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // 메시지
    this.add.text(width / 2, height / 2, 'You have defeated the Demon Lord!', {
      fontSize: '32px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);

    // 승리 파티클
    this.createCelebrationParticles();
  }

  private createDefeatScreen(): void {
    const width: number = this.cameras.main.width;
    const height: number = this.cameras.main.height;

    // 타이틀
    const title: Phaser.GameObjects.Text = this.add.text(
      width / 2,
      height / 3,
      'DEFEAT',
      {
        fontSize: '96px',
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold',
        color: '#ff6b6b',
        stroke: '#000000',
        strokeThickness: 8
      }
    );
    title.setOrigin(0.5);

    // 메시지
    this.add.text(width / 2, height / 2, 'Your journey ends here...', {
      fontSize: '32px',
      fontFamily: 'Arial, sans-serif',
      color: '#cccccc',
      align: 'center'
    }).setOrigin(0.5);

    // 게임 상태
    const gameState: GameState = this.registry.get('gameState');
    const statsText: string = `Stages Cleared: ${gameState.stagesCleared.length}\nDeck Size: ${gameState.deck.length} cards`;

    this.add.text(width / 2, height / 2 + 80, statsText, {
      fontSize: '24px',
      fontFamily: 'monospace',
      color: '#aaaaaa',
      align: 'center'
    }).setOrigin(0.5);
  }

  private createButtons(): void {
    const width: number = this.cameras.main.width;
    const height: number = this.cameras.main.height;

    // 다시하기 버튼
    this.createButton(
      width / 2 - 150,
      height - 150,
      'Restart',
      (): void => {
        // 게임 상태 리셋
        const initialGameState: GameState = {
          player: {
            maxHealth: 100,
            health: 100,
            energy: 3,
            maxEnergy: 3,
            defense: 0
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
      width / 2 + 150,
      height - 150,
      'Main Menu',
      (): void => {
        this.scene.start('MenuScene');
      }
    );
  }

  private createButton(
    x: number,
    y: number,
    text: string,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const button: Phaser.GameObjects.Container = this.add.container(x, y);

    const bg: Phaser.GameObjects.Rectangle = this.add.rectangle(0, 0, 200, 60, 0x4ecdc4);
    bg.setStrokeStyle(3, 0xffffff);

    const btnText: Phaser.GameObjects.Text = this.add.text(0, 0, text, {
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff'
    });
    btnText.setOrigin(0.5);

    button.add([bg, btnText]);
    button.setSize(200, 60);
    button.setInteractive({ useHandCursor: true });

    button.on('pointerover', (): void => {
      this.tweens.add({
        targets: button,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 100
      });
      bg.setFillStyle(0x5fddd5);
    });

    button.on('pointerout', (): void => {
      this.tweens.add({
        targets: button,
        scaleX: 1,
        scaleY: 1,
        duration: 100
      });
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
