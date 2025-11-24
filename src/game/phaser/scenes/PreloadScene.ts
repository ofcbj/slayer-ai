import Phaser from 'phaser';
import EventBus from '../../EventBus';
import GameDataManager from '../managers/GameDataManager';
import { tweenConfig } from '../managers/TweenConfigManager';
import { textStyle } from '../managers/TextStyleManager';

interface GameState {
  player: {
    maxHealth : number;
    health    : number;
    energy    : number;
    maxEnergy : number;
    defense   : number;
  };
  deck: unknown[];
  currentStage  : number;
  stagesCleared : unknown[];
}

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    // 보스 패턴 데이터 로드 (기존 파일 유지)
    const basePath: string = import.meta.env.BASE_URL;
    this.load.json('bossPatterns', `${basePath}data/boss-patterns.json`);
  }

  async create(): Promise<void> {
    // React에 현재 Scene이 준비되었음을 알림
    EventBus.emit('current-scene-ready', this);

    // GameDataManager로 게임 데이터 로드
    const gameDataManager = GameDataManager.getInstance();
    
    try {
      await gameDataManager.loadGameData();
      // Tween 설정 로드
      await tweenConfig.load();
      // 텍스트 스타일 설정 로드
      await textStyle.load();
      console.log('게임 데이터 로드 완료');
    } catch (error) {
      console.error('Failed to load game data:', error);
      return;
    }

    // 보스 패턴 데이터는 레지스트리에 저장 (기존 방식 유지)
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

    // 언어가 이미 선택되었는지 확인
    const savedLanguage = localStorage.getItem('language');

    if (savedLanguage) {
      this.scene.start('MenuScene');
    } else {
      this.scene.start('LanguageSelectScene');
    }
  }
}
