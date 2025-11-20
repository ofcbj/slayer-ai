import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import PreloadScene from './scenes/PreloadScene.js';
import LanguageSelectScene from './scenes/LanguageSelectScene.js';
import MenuScene from './scenes/MenuScene.js';
import StageSelectScene from './scenes/StageSelectScene.js';
import BattleScene from './scenes/BattleScene.js';
import RewardScene from './scenes/RewardScene.js';
import GameOverScene from './scenes/GameOverScene.js';

// Force inclusion of all scenes
const allScenes = [
  BootScene,
  PreloadScene,
  LanguageSelectScene,
  MenuScene,
  StageSelectScene,
  BattleScene,
  RewardScene,
  GameOverScene
];

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1920,
  height: 1080,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  render: {
    antialias: true,
    antialiasGL: true,
    pixelArt: false,
    roundPixels: false,
    transparent: false,
    clearBeforeRender: true,
    preserveDrawingBuffer: false
  },
  scene: allScenes,
  physics: {
    default: 'arcade',
    arcade: {
      debug: false
    }
  }
};

const game = new Phaser.Game(config);

// Debug: Log all registered scenes
console.log('Registered Scenes:', game.scene.keys);

export default game;
