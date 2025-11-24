import Phaser from 'phaser';
import BootScene from './phaser/scenes/BootScene';
import PreloadScene from './phaser/scenes/PreloadScene';
import LanguageSelectScene from './phaser/scenes/LanguageSelectScene';
import MenuScene from './phaser/scenes/MenuScene';
import StageSelectScene from './phaser/scenes/StageSelectScene';
import BattleScene from './phaser/scenes/BattleScene';
import RewardScene from './phaser/scenes/RewardScene';
import GameOverScene from './phaser/scenes/GameOverScene';
import ShopScene from './phaser/scenes/ShopScene';

/**
 * Phaser 게임 설정 함수
 * @param containerId - 게임을 렌더링할 DOM 요소의 ID
 * @returns Phaser.Game 인스턴스
 */
export const StartGame = (containerId: string): Phaser.Game => {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 1920,
    height: 1080,
    parent: containerId,
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
    scene: [
      BootScene,
      PreloadScene,
      LanguageSelectScene,
      MenuScene,
      StageSelectScene,
      BattleScene,
      RewardScene,
      GameOverScene,
      ShopScene
    ],
    physics: {
      default: 'arcade',
      arcade: {
        debug: false
      }
    }
  };

  return new Phaser.Game(config);
};
