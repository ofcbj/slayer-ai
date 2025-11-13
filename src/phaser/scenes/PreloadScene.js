import Phaser from 'phaser';

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload() {
    // 게임 데이터 로드
    this.load.json('cards', '/data/cards.json');
    this.load.json('enemies', '/data/enemies.json');
    this.load.json('stages', '/data/stages.json');
    this.load.json('bossPatterns', '/data/boss-patterns.json');

    // 에셋 로드 (나중에 추가)
    // this.load.image('card-bg', '/assets/card-bg.png');
    // this.load.image('enemy-bg', '/assets/enemy-bg.png');
    // this.load.audio('attack', '/assets/sounds/attack.mp3');
  }

  create() {
    // 로드된 데이터를 전역 레지스트리에 저장
    this.registry.set('cardsData', this.cache.json.get('cards'));
    this.registry.set('enemiesData', this.cache.json.get('enemies'));
    this.registry.set('stagesData', this.cache.json.get('stages'));
    this.registry.set('bossPatternsData', this.cache.json.get('bossPatterns'));

    // 게임 상태 초기화
    this.registry.set('gameState', {
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
    });

    // 메뉴 씬으로 이동
    this.scene.start('MenuScene');
  }
}
