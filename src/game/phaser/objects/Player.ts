import Phaser from 'phaser';
import type BattleScene from '../scenes/BattleScene';
import { PlayerState } from '../../../types';
import Actor from './Actor';
import { PlayerStateObservable } from '../state/PlayerStateObservable';
import { textStyle } from '../managers/TextStyleManager';
import { tweenConfig } from '../managers/TweenConfigManager';
import { UIFactory } from '../../utils/UIFactory';

/**
 * Player - 플레이어 캐릭터 클래스
 * Actor를 상속하여 공통 로직 사용
 * PlayerStateObservable을 내부적으로 관리하여 자체 상태를 보유합니다.
 */
export default class Player extends Actor {
  private bg!             : Phaser.GameObjects.Rectangle;
  private playerHead!     : Phaser.GameObjects.Text;
  private hpContainer!    : Phaser.GameObjects.Container;
  private defContainer!   : Phaser.GameObjects.Container;
  private stateObservable : PlayerStateObservable;
  public maxEnergy        : number = 3;
  public energy           : number = 3;

  constructor(scene: BattleScene, x: number, y: number, initialState: PlayerState) {
    super(scene, x, y);

    // PlayerStateObservable 초기화
    this.stateObservable = new PlayerStateObservable(initialState);

    // Actor의 상태를 PlayerState와 동기화
    this.health    = initialState.health;
    this.maxHealth = initialState.maxHealth;
    this.defense   = initialState.defense;
    this.maxEnergy = initialState.maxEnergy;

    this.createPlayer();
    
    // 초기 값으로 UI 업데이트
    this.updateHealthDisplay();
    this.updateDefenseDisplay();
    
    scene.add.existing(this);

    // 자신의 상태 변경을 구독하여 Actor의 내부 상태와 동기화
    this.stateObservable.subscribe((state) => {
      this.health    = state.health;
      this.maxHealth = state.maxHealth;
      this.defense   = state.defense;
      this.maxEnergy = state.maxEnergy;
    });
  }

  private createPlayer(): void {
    const width  : number = 240;
    const height : number = 240;

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
    const playerImage: Phaser.GameObjects.Text = this.scene.add.text(0, 0, '⚔️',
      textStyle.getStyle('character.emojiLarge')
    );
    playerImage.setOrigin(0.5);
    
    // UIFactory를 사용하여 HP 컨테이너 생성
    const hp = UIFactory.createHPContainer(this.scene, -width/2 + 50, height/2 - 40, this.health);
    this.hpContainer  = hp.container;
    this.healthText   = hp.healthText;

    // UIFactory를 사용하여 Defense 컨테이너 생성
    const def = UIFactory.createDefenseContainer(this.scene, width/2 - 70, height/2 - 40, this.defense);
    this.defContainer = def.container;
    this.defenseText  = def.defenseText;

    this.add([bg, nameText, playerImage, this.hpContainer, this.defContainer]);

    this.bg = bg;
    this.playerHead = playerImage;
    this.setSize(width, height);
  }
  
  /**
   * 외부 구독자 등록 (BattleManager, UI 등)
   */
  public subscribeToState(observer: (state: PlayerState) => void): () => void {
    return this.stateObservable.subscribe(observer);
  }

  public getState(): PlayerState {
    return this.stateObservable.getState();
  }

  override takeDamage(amount: number): void {
    // Actor의 takeDamage 호출 (방어력 계산, 애니메이션, 사운드 포함)
    super.takeDamage(amount);

    this.stateObservable.setState(state => {
      state.health = this.health;
      state.defense = this.defense;
    });

    // 플레이어 사망 시 이벤트 발생
    if (this.isDead()) {
      this.scene.events.emit('playerDied');
    }
  }

  override applyDefense(amount: number): void {
    super.applyDefense(amount);

    this.stateObservable.setState(state => {
      state.defense = this.defense;
    });
  }

  public setEnergy(amount: number): void {
    this.energy = Math.max(0, amount);
    
    this.stateObservable.setState(state => {
      state.energy = this.energy;
    });
  }

  public consumeEnergy(amount: number): boolean {
    if (this.energy >= amount) {
      this.setEnergy(this.energy - amount);
      return true;
    }
    return false;
  }

  public heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
    this.stateObservable.setState(state => {
      state.health = this.health;
    });
    this.updateHealthDisplay();
    this.scene.sound.play('heal', { volume: 0.25 });
  }

  public resetDefense(): void {
    this.defense = 0;
    this.stateObservable.setState(state => {
      state.defense = 0;
    });
    this.updateDefenseDisplay();
  }

  public setDefense(amount: number): void {
    this.defense = Math.max(0, amount);
    this.stateObservable.setState(state => {
      state.defense = this.defense;
    });
    this.updateDefenseDisplay();
  }

  protected override playHitAnimation(): void {
    this.playHitAnimationPublic();
  }

  public playHitAnimationPublic(callback?: () => void): void {
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
    const shield: Phaser.GameObjects.Arc = this.scene.add.circle(0, 0, 120, 0x4ecdc4, 0.3);
    this.add(shield);

    tweenConfig.apply(this.scene, 'combat.playerDefendShield', shield, {
      onComplete: (): void => shield.destroy()
    });
  }

  playHealAnimation(): void {
    // 치유 애니메이션 - 녹색 빛
    for (let i: number = 0; i < 10; i++) {
      const angle: number = (Math.PI * 2 * i) / 10;
      const particle: Phaser.GameObjects.Arc = this.scene.add.circle(
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
