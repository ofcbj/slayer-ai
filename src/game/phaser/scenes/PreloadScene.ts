import Phaser from 'phaser';
import EventBus from '../../EventBus';
import SoundManager from '../managers/SoundManager';

interface GameState {
  player: {
    maxHealth: number;
    health: number;
    energy: number;
    maxEnergy: number;
    defense: number;
  };
  deck: unknown[];
  currentStage: number;
  stagesCleared: unknown[];
}

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    // 게임 데이터 로드
    const basePath: string = import.meta.env.BASE_URL;
    this.load.json('cards', `${basePath}data/cards.json`);
    this.load.json('enemies', `${basePath}data/enemies.json`);
    this.load.json('stages', `${basePath}data/stages.json`);
    this.load.json('bossPatterns', `${basePath}data/boss-patterns.json`);

    // 사운드 파일 로드
    SoundManager.preloadSounds(this);

    // 에셋 로드 (나중에 추가)
    // this.load.image('card-bg', '/assets/card-bg.png');
    // this.load.image('enemy-bg', '/assets/enemy-bg.png');
  }

  create(): void {
    // React에 현재 Scene이 준비되었음을 알림
    EventBus.emit('current-scene-ready', this);

    // 로드된 데이터를 전역 레지스트리에 저장
    this.registry.set('cardsData', this.cache.json.get('cards'));
    this.registry.set('enemiesData', this.cache.json.get('enemies'));
    this.registry.set('stagesData', this.cache.json.get('stages'));
    this.registry.set('bossPatternsData', this.cache.json.get('bossPatterns'));

    // 게임 상태 초기화
    const gameState: GameState = {
      player: {
        maxHealth: 100,
        health: 100,
        energy: 3,
        maxEnergy: 3,
        defense: 0
      },
      deck: [],
      currentStage: 0,
      stagesCleared: []
    };

    this.registry.set('gameState', gameState);

    // 메뉴 씬으로 이동
    this.scene.start('MenuScene');
  }
}
