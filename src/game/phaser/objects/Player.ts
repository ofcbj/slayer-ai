import Phaser from 'phaser';
import { PlayerState } from '../../../types';
import Character from './Character';
import { PlayerStateObservable } from '../state/PlayerStateObservable';
import { textStyle } from '../managers/TextStyleManager';
import { tweenConfig } from '../managers/TweenConfigManager';
import { UIFactory } from '../../utils/UIFactory';

/**
 * Player - 플레이어 캐릭터 클래스
 * Character를 상속하여 공통 로직 사용
 * PlayerStateObservable을 내부적으로 관리하여 자체 상태를 보유합니다.
 */
export default class Player extends Character {
  private healthText!: Phaser.GameObjects.Text;
  private defenseText!: Phaser.GameObjects.Text;
  private bg!: Phaser.GameObjects.Rectangle;
  private playerHead!: Phaser.GameObjects.Text;
  private hpContainer!: Phaser.GameObjects.Container;
  private defContainer!: Phaser.GameObjects.Container;
  private stateObservable: PlayerStateObservable;
  public maxEnergy: number = 3;
  public energy: number = 3;

  constructor(scene: Phaser.Scene, x: number, y: number, initialState: PlayerState) {
    super(scene, x, y);

    // PlayerStateObservable 초기화
    this.stateObservable = new PlayerStateObservable(initialState);

    // Character의 상태를 PlayerState와 동기화
    this.health = initialState.health;
    this.maxHealth = initialState.maxHealth;
    this.defense = initialState.defense;
    this.maxEnergy = initialState.maxEnergy;

    this.createPlayer();
    scene.add.existing(this);

    // 자신의 상태 변경을 구독하여 Character의 내부 상태와 동기화
    this.stateObservable.subscribe((state) => {
      this.health = state.health;
      this.maxHealth = state.maxHealth;
      this.defense = state.defense;
      this.maxEnergy = state.maxEnergy;
    });
  }

  private createPlayer(): void {
    const width: number = 240;
    const height: number = 240;

    // 플레이어 배경
    const bg: Phaser.GameObjects.Rectangle = this.scene.add.rectangle(0, 0, width, height, 0x2a2a4e);
    bg.setStrokeStyle(4, 0x4ecdc4);
    // 플레이어 이름
    const nameText: Phaser.GameObjects.Text = this.scene.add.text(0, -height/2+25,
      'Hero',
      textStyle.getStyle('character.emojiSmall')
    );
    nameText.setOrigin(0.5);
    // 플레이어 캐릭터 이미지 - 머리와 목
    const playerHead: Phaser.GameObjects.Text = this.scene.add.text(0, 0, '⚔️',
      textStyle.getStyle('character.emojiLarge')
    );
    playerHead.setOrigin(0.5);
    
    // UIFactory를 사용하여 HP 컨테이너 생성
    const hp = UIFactory.createHPContainer(this.scene, -width/2 + 50, height/2 - 40, this.health);
    this.hpContainer = hp.container;
    this.healthText = hp.healthText;

    // UIFactory를 사용하여 Defense 컨테이너 생성
    const def = UIFactory.createDefenseContainer(this.scene, width/2 - 70, height/2 - 40, this.defense);
    this.defContainer = def.container;
    this.defenseText = def.defenseText;

    this.add([bg, nameText, playerHead, this.hpContainer, this.defContainer]);

    this.bg = bg;
    this.playerHead = playerHead;
    this.setSize(width, height);
  }
  
  /**
   * 외부 구독자 등록 (BattleManager, UI 등)
   */
  public subscribeToState(observer: (state: PlayerState) => void): () => void {
    return this.stateObservable.subscribe(observer);
  }

  /**
   * 현재 상태 반환
   */
  public getState(): PlayerState {
    return this.stateObservable.getState();
  }

  /**
   * takeDamage 오버라이드 - Character의 메서드를 사용하되 상태 동기화
   */
  override takeDamage(amount: number): void {
    // Character의 takeDamage 호출 (방어력 계산, 애니메이션, 사운드 포함)
    super.takeDamage(amount);

    // 변경된 상태를 Observable에 반영
    this.stateObservable.setState(state => {
      state.health = this.health;
      state.defense = this.defense;
    });
  }

  /**
   * 방어력 적용 오버라이드
   */
  override applyDefense(amount: number): void {
    super.applyDefense(amount);

    // 상태 동기화
    this.stateObservable.setState(state => {
      state.defense = this.defense;
    });
  }

  /**
   * 에너지 설정 (maxEnergy를 초과할 수 있음 - 보너스 에너지)
   */
  public setEnergy(amount: number): void {
    this.energy = Math.max(0, amount);
    this.stateObservable.setState(state => {
      state.energy = this.energy;
    });
  }

  /**
   * 에너지 소비
   */
  public consumeEnergy(amount: number): boolean {
    if (this.energy >= amount) {
      this.setEnergy(this.energy - amount);
      return true;
    }
    return false;
  }

  /**
   * 치유
   */
  public heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
    this.stateObservable.setState(state => {
      state.health = this.health;
    });
    this.updateHealthDisplay();
  }

  /**
   * 방어력 초기화 (턴 시작 시)
   */
  public resetDefense(): void {
    this.defense = 0;
    this.stateObservable.setState(state => {
      state.defense = 0;
    });
    this.updateDefenseDisplay();
  }

  /**
   * 방어력 직접 설정 (외부에서 호출)
   */
  public setDefense(amount: number): void {
    this.defense = Math.max(0, amount);
    this.stateObservable.setState(state => {
      state.defense = this.defense;
    });
    this.updateDefenseDisplay();
  }

  /**
   * 체력 표시 업데이트 (Character의 abstract 메서드 구현)
   */
  protected override updateHealthDisplay(): void {
    this.healthText.setText(this.health.toString());
  }

  /**
   * 방어력 표시 업데이트 (Character의 abstract 메서드 구현)
   */
  protected override updateDefenseDisplay(): void {
    this.defenseText.setText(this.defense.toString());
  }

  /**
   * 피격 애니메이션 (Character의 abstract 메서드 구현)
   */
  protected override playHitAnimation(): void {
    this.playHitAnimationPublic();
  }

  /**
   * 피격 사운드 재생 (Character의 abstract 메서드 구현)
   */
  protected override playDamageSound(): void {
    const soundManager = (this.scene as any).soundManager;
    if (soundManager) {
      soundManager.play('damage-player');
    }
  }

  /**
   * 피격 애니메이션
   */
  public playHitAnimationPublic(callback?: () => void): void {
    // 피격 애니메이션
    tweenConfig.apply(this.scene, 'combat.playerHit', this, {
      x: this.x,
      onComplete: (): void => {
        if (callback) callback();
      }
    });

    // 빨간색 플래시
    tweenConfig.apply(this.scene, 'combat.playerHitFlash', this.bg);

    // 이미지 흔들림
    tweenConfig.apply(this.scene, 'combat.playerHitShake', this.playerHead, {
      onComplete: (): void => {
        this.playerHead.setAngle(0);
      }
    });
  }

  override playDefendAnimation(): void {
    // 방어 애니메이션 - 푸른 빛
    const shield: Phaser.GameObjects.Circle = this.scene.add.circle(0, 0, 120, 0x4ecdc4, 0.3);
    this.add(shield);

    tweenConfig.apply(this.scene, 'combat.playerDefendShield', shield, {
      onComplete: (): void => shield.destroy()
    });
  }

  playHealAnimation(): void {
    // 치유 애니메이션 - 녹색 빛
    for (let i: number = 0; i < 10; i++) {
      const angle: number = (Math.PI * 2 * i) / 10;
      const particle: Phaser.GameObjects.Circle = this.scene.add.circle(
        this.x + Math.cos(angle) * 80,
        this.y + Math.sin(angle) * 80,
        6,
        0x2ecc71
      );

      tweenConfig.apply(this.scene, 'particles.healEffect', particle, {
        x: this.x,
        y: this.y,
        onComplete: (): void => particle.destroy()
      });
    }
  }

  idle(): void {
    // 아이들 애니메이션 - 부드러운 상하 움직임 (머리)
    tweenConfig.apply(this.scene, 'transitions.playerIdle', this.playerHead);
  }
}
