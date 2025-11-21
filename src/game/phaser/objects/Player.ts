import Phaser from 'phaser';
import { PlayerState } from '../../../types';
import Character from './Character';
import { PlayerStateObservable } from '../state/PlayerStateObservable';

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
    const nameText: Phaser.GameObjects.Text = this.scene.add.text(0, -height/2 + 25, 'Hero', {
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#4ecdc4',
      stroke: '#000000',
      strokeThickness: 3
    });
    nameText.setOrigin(0.5);

    // 플레이어 캐릭터 이미지 - 머리와 목
    const playerHead: Phaser.GameObjects.Text = this.scene.add.text(0, 0, '🧙‍♂️', {
      fontSize: '120px',
      fontFamily: 'Arial, sans-serif'
    });
    playerHead.setOrigin(0.5);

    // HP 컨테이너 (왼쪽 하단)
    const hpContainer: Phaser.GameObjects.Container = this.scene.add.container(-width/2 + 70, height/2 - 40);

    const hpIcon: Phaser.GameObjects.Text = this.scene.add.text(0, 0, '❤️', {
      fontSize: '30px',
      fontFamily: 'Arial, sans-serif'
    });
    hpIcon.setOrigin(0.5);

    this.healthText = this.scene.add.text(25, 0, '100', {
      fontSize: '28px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ff6b6b',
      stroke: '#000000',
      strokeThickness: 3
    });
    this.healthText.setOrigin(0, 0.5);

    hpContainer.add([hpIcon, this.healthText]);

    // Defense 컨테이너 (오른쪽 하단)
    const defContainer: Phaser.GameObjects.Container = this.scene.add.container(width/2 - 70, height/2 - 40);

    const defIcon: Phaser.GameObjects.Text = this.scene.add.text(0, 0, '🛡️', {
      fontSize: '30px',
      fontFamily: 'Arial, sans-serif'
    });
    defIcon.setOrigin(0.5);

    this.defenseText = this.scene.add.text(25, 0, '0', {
      fontSize: '28px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#4ecdc4',
      stroke: '#000000',
      strokeThickness: 3
    });
    this.defenseText.setOrigin(0, 0.5);

    defContainer.add([defIcon, this.defenseText]);

    this.add([bg, nameText, playerHead, hpContainer, defContainer]);

    this.bg = bg;
    this.playerHead = playerHead;
    this.hpContainer = hpContainer;
    this.defContainer = defContainer;
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
   * 에너지 설정
   */
  public setEnergy(amount: number): void {
    this.energy = Math.max(0, Math.min(this.maxEnergy, amount));
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
      soundManager.playPlayerDamage();
    }
  }

  /**
   * 피격 애니메이션
   */
  public playHitAnimationPublic(callback?: () => void): void {
    // 피격 애니메이션
    this.scene.tweens.add({
      targets: this,
      x: this.x + 15,
      duration: 60,
      yoyo: true,
      repeat: 2,
      onComplete: (): void => {
        if (callback) callback();
      }
    });

    // 빨간색 플래시
    this.scene.tweens.add({
      targets: this.bg,
      fillAlpha: 0.3,
      duration: 60,
      yoyo: true,
      repeat: 2
    });

    // 이미지 흔들림
    this.scene.tweens.add({
      targets: [this.playerHead],
      angle: -10,
      duration: 60,
      yoyo: true,
      repeat: 2,
      onComplete: (): void => {
        this.playerHead.setAngle(0);
      }
    });
  }

  override playDefendAnimation(): void {
    // 방어 애니메이션 - 푸른 빛
    const shield: Phaser.GameObjects.Circle = this.scene.add.circle(0, 0, 120, 0x4ecdc4, 0.3);
    this.add(shield);

    this.scene.tweens.add({
      targets: shield,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: 0,
      duration: 600,
      ease: 'Power2',
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

      this.scene.tweens.add({
        targets: particle,
        x: this.x,
        y: this.y,
        alpha: 0,
        scale: 0,
        duration: 800,
        ease: 'Power2',
        onComplete: (): void => particle.destroy()
      });
    }
  }

  idle(): void {
    // 아이들 애니메이션 - 부드러운 상하 움직임 (머리)
    this.scene.tweens.add({
      targets: this.playerHead,
      y: -15,
      duration: 2000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
  }
}
