import Phaser from 'phaser';

/**
 * 게임 사운드를 관리하는 매니저
 * 모든 게임 사운드 효과를 중앙에서 관리하고 재생합니다.
 */
export default class SoundManager {
  private scene: Phaser.Scene;
  private sounds: Map<string, Phaser.Sound.BaseSound> = new Map();
  private enabled: boolean = true;
  private volume: number = 0.5;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * 사운드 파일 로드
   */
  static preloadSounds(scene: Phaser.Scene): void {
    const basePath = import.meta.env.BASE_URL;

    // 게임 시작 사운드
    scene.load.audio('game-start',  `${basePath}assets/sounds/game-start.mp3`);

    // 카드 관련 사운드
    scene.load.audio('card-draw',   `${basePath}assets/sounds/card-draw.mp3`);
    scene.load.audio('card-click',  `${basePath}assets/sounds/card-click.mp3`);
    scene.load.audio('card-play',   `${basePath}assets/sounds/card-play.mp3`);

    // 공격 사운드
    scene.load.audio('attack',      `${basePath}assets/sounds/attack.mp3`);
    scene.load.audio('attack-heavy',`${basePath}assets/sounds/attack-heavy.mp3`);

    // 방어 사운드
    scene.load.audio('defend',      `${basePath}assets/sounds/defend.mp3`);
    scene.load.audio('block',       `${basePath}assets/sounds/block.mp3`);

    // 데미지 사운드
    scene.load.audio('hit',         `${basePath}assets/sounds/hit.mp3`);
    scene.load.audio('damage-player',`${basePath}assets/sounds/damage-player.mp3`);
    scene.load.audio('damage-enemy',`${basePath}assets/sounds/damage-enemy.mp3`);

    // 승리/패배 사운드
    scene.load.audio('victory',     `${basePath}assets/sounds/victory.mp3`);
    scene.load.audio('defeat',      `${basePath}assets/sounds/defeat.mp3`);

    // 적 사망
    scene.load.audio('enemy-death', `${basePath}assets/sounds/enemy-death.mp3`);
  }

  /**
   * 사운드 초기화 (create에서 호출)
   */
  initialize(): void {
    // 각 사운드를 생성하고 Map에 저장
    const soundKeys = [
      'game-start',
      'card-draw',
      'card-click',
      'card-play',
      'attack',
      'attack-heavy',
      'defend',
      'block',
      'hit',
      'damage-player',
      'damage-enemy',
      'victory',
      'defeat',
      'enemy-death'
    ];

    soundKeys.forEach(key => {
      if (this.scene.cache.audio.exists(key)) {
        const sound = this.scene.sound.add(key, { volume: this.volume });
        this.sounds.set(key, sound);
      }
    });
  }

  /**
   * 사운드 재생
   */
  play(key: string, config?: Phaser.Types.Sound.SoundConfig): void {
    if (!this.enabled) return;

    const sound = this.sounds.get(key);
    if (sound) {
      sound.play(config);
    } else {
      // Map에 없으면 직접 재생 시도 (fallback)
      if (this.scene.cache.audio.exists(key)) {
        this.scene.sound.play(key, { ...config, volume: this.volume });
      } else {
        console.warn(`[SoundManager] Sound not found: ${key}`);
      }
    }
  }

  /**
   * 게임 시작 사운드
   */
  playGameStart(): void {
    this.play('game-start');
  }

  /**
   * 카드 드로우 사운드
   */
  playCardDraw(): void {
    this.play('card-draw', { volume: this.volume * 0.7 });
  }

  /**
   * 카드 클릭 사운드
   */
  playCardClick(): void {
    this.play('card-click', { volume: this.volume * 0.5 });
  }

  /**
   * 카드 사용 사운드
   */
  playCardPlay(): void {
    this.play('card-play');
  }

  /**
   * 공격 사운드
   */
  playAttack(isHeavy: boolean = false): void {
    this.play(isHeavy ? 'attack-heavy' : 'attack', { volume: this.volume * 0.8 });
  }

  /**
   * 방어 사운드
   */
  playDefend(): void {
    this.play('defend', { volume: this.volume * 0.7 });
  }

  /**
   * 방어 성공 (블록) 사운드
   */
  playBlock(): void {
    this.play('block', { volume: this.volume * 0.8 });
  }

  /**
   * 적 피격 사운드
   */
  playHit(): void {
    this.play('hit', { volume: this.volume * 0.6 });
  }

  /**
   * 플레이어 데미지 사운드
   */
  playPlayerDamage(): void {
    this.play('damage-player');
  }

  /**
   * 적 데미지 사운드
   */
  playEnemyDamage(): void {
    this.play('damage-enemy', { volume: this.volume * 0.7 });
  }

  /**
   * 승리 사운드
   */
  playVictory(): void {
    this.play('victory');
  }

  /**
   * 패배 사운드
   */
  playDefeat(): void {
    this.play('defeat');
  }

  /**
   * 적 사망 사운드
   */
  playEnemyDeath(): void {
    this.play('enemy-death');
  }

  /**
   * 볼륨 설정
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.sounds.forEach(sound => {
      if ('setVolume' in sound) {
        (sound as any).setVolume(this.volume);
      }
    });
  }

  /**
   * 사운드 활성화/비활성화
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.stopAll();
    }
  }

  /**
   * 모든 사운드 정지
   */
  stopAll(): void {
    this.sounds.forEach(sound => {
      if (sound.isPlaying) {
        sound.stop();
      }
    });
  }

  /**
   * 정리
   */
  destroy(): void {
    this.stopAll();
    this.sounds.clear();
  }
}
