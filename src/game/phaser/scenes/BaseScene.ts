import Phaser from 'phaser';
import EventBus from '../../EventBus';
import LanguageManager from '../../../i18n/LanguageManager';
import GameDataManager from '../managers/GameDataManager';
import CardViewManager from '../managers/CardViewManager';
import { GameState } from '../../../types';
import { UIFactory } from '../utils/UIFactory';
import { textStyle } from '../managers/TextStyleManager';
import { tweenConfig } from '../managers/TweenConfigManager';

/**
 * BaseScene - 모든 게임 Scene의 기본 클래스
 * 
 * 공통 기능:
 * - EventBus 자동 emit
 * - LanguageManager, GameDataManager 인스턴스 관리
 * - CardViewManager 생성 헬퍼
 * - 카메라 크기 캐싱
 * - GameState 접근 헬퍼
 */
export default abstract class BaseScene extends Phaser.Scene {
  // 공통 매니저 인스턴스
  protected langManager: LanguageManager;
  protected gameDataManager: GameDataManager;
  protected cardViewManager: CardViewManager | null = null;

  // 카메라 크기 캐싱
  protected width: number = 0;
  protected height: number = 0;

  constructor(config: string | Phaser.Types.Scenes.SettingsConfig) {
    super(config);
    
    // 싱글톤 매니저 초기화
    this.langManager = LanguageManager.getInstance();
    this.gameDataManager = GameDataManager.getInstance();
  }

  /**
   * create() 메서드 - 하위 클래스에서 반드시 구현해야 함
   * BaseScene의 initializeBase()를 호출하여 공통 초기화를 수행해야 함
   */
  abstract create(): void;

  /**
   * 공통 초기화 로직
   * 하위 클래스의 create() 메서드 시작 부분에서 호출
   */
  protected initializeBase(): void {
    // React에 현재 Scene이 준비되었음을 알림
    EventBus.emit('current-scene-ready', this);

    // 카메라 크기 캐싱
    this.width = this.cameras.main.width;
    this.height = this.cameras.main.height;
  }

  /**
   * GameState를 가져오는 헬퍼 메서드
   */
  protected getGameState(): GameState {
    return this.registry.get('gameState') as GameState;
  }

  /**
   * 카메라 크기를 가져오는 헬퍼 메서드
   */
  protected getCameraDimensions(): { width: number; height: number } {
    return {
      width: this.width,
      height: this.height
    };
  }

  /**
   * CardViewManager를 초기화하는 헬퍼 메서드
   */
  protected initializeCardViewManager(): CardViewManager {
    if (!this.cardViewManager) {
      this.cardViewManager = new CardViewManager(this);
    }
    return this.cardViewManager;
  }

  /**
   * My Deck 버튼 생성 (선택적 오버라이드)
   * 필요한 Scene에서만 오버라이드하여 사용
   * 
   * @param getCards - 표시할 카드 목록을 반환하는 함수
   * @param options - UIFactory 추가 옵션
   */
  /**
   * 화면에 메시지를 표시합니다 (애니메이션 포함)
   * 
   * @param text 표시할 텍스트
   * @param options 메시지 옵션
   * @param options.color 텍스트 색상 (hex number, 예: 0x22c55e)
   * @param options.position 메시지 표시 위치 ('top' | 'center')
   * @param options.duration 메시지 표시 지속 시간 (ms)
   */
  protected showMessage(
    text: string,
    options?: {
      color?: number;
      position?: 'top' | 'center';
      duration?: number;
    }
  ): void {
    const { width, height } = this.getCameraDimensions();
    const color = options?.color ?? 0xffffff;
    const position = options?.position ?? 'top';
    const duration = options?.duration ?? 1500;

    // 위치 계산
    const startY = position === 'top' ? height / 2 - 150 : height / 2;
    const targetY = position === 'top' ? height / 2 - 200 : height / 2 - 50;

    const message = this.add.text(
      width / 2,
      startY,
      text,
      textStyle.getStyle('titles.section', {
        fontSize: '32px',
        color: `#${color.toString(16).padStart(6, '0')}`
      })
    ).setOrigin(0.5);

    message.setAlpha(0);

    tweenConfig.apply(this, 'shop.messageAppear', message, {
      y: targetY,
      onComplete: () => {
        this.time.delayedCall(duration, () => {
          tweenConfig.apply(this, 'shop.messageFade', message, {
            onComplete: () => {
              message.destroy();
            }
          });
        });
      }
    });
  }

  protected createMyDeckButton(
    getCards: () => any[],
    options?: any
  ): void {
    if (!this.cardViewManager) {
      this.initializeCardViewManager();
    }

    UIFactory.createMyDeckButton(
      this,
      this.cardViewManager,
      getCards,
      options
    );
  }
}
