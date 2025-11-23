import Phaser from 'phaser';
import SoundManager from '../game/phaser/managers/SoundManager';
import EventBus from '../game/EventBus';

/**
 * BattleScene에서 사용하는 확장 프로퍼티들을 정의하는 인터페이스
 */
export interface BattleSceneExtended extends Phaser.Scene {
  soundManager: SoundManager;
  eventBus: typeof EventBus;
}

/**
 * Scene이 BattleSceneExtended 타입인지 확인하는 타입 가드
 */
export function isBattleScene(scene: Phaser.Scene): scene is BattleSceneExtended {
  return 'soundManager' in scene && 'eventBus' in scene;
}
