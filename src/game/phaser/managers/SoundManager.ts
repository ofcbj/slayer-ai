import Phaser from 'phaser';

/**
 * 게임 사운드를 관리하는 매니저
 * public/assets/sounds/ 폴더의 모든 사운드 파일을 자동으로 감지하고 로드합니다.
 */
export default class SoundManager {
  private scene   : Phaser.Scene;
  private enabled : boolean = true;
  private volume  : number = 0.5;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  static preloadSounds(scene: Phaser.Scene): void {
    // Vite의 import.meta.glob을 사용하여 sounds 폴더의 모든 .mp3 파일을 자동으로 찾습니다
    // eager: true로 설정하면 빌드 타임에 모든 파일을 즉시 로드합니다
    const soundModules = import.meta.glob('/public/assets/sounds/*.mp3', { 
      eager: true,
      as: 'url' 
    });

    // 각 파일에 대해 Phaser에 로드
    Object.entries(soundModules).forEach(([path, url]) => {
      // 파일 경로에서 파일명 추출 (예: '/public/assets/sounds/attack.mp3' -> 'attack')
      const fileName = path.split('/').pop()?.replace('.mp3', '') || '';
      
      if (fileName) {
        // url은 이미 Vite가 처리한 경로이므로 바로 사용
        scene.load.audio(fileName, url as string);
      }
    });
  }

  play(key: string, volumeMod: number = 1.0): void {
    if (!this.enabled) return;

    if (this.scene.cache.audio.exists(key)) {
      this.scene.sound.play(key, { volume: this.volume * volumeMod });
    } else {
      console.warn(`[SoundManager] Sound not found: ${key}`);
    }
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.scene.sound.setVolume(this.volume);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.scene.sound.stopAll();
    }
  }

  stopAll(): void {
    this.scene.sound.stopAll();
  }
}
