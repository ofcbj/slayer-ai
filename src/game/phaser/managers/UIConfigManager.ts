import Phaser from 'phaser';

/**
 * UI 설정 데이터 인터페이스
 */
interface UIConfig {
  battle: {
    player: {
      x: string | number;
      yOffset: number;
    };
    enemy: {
      y: number;
      minSpacing: number;
    };
    myDeckButton: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    handContainer: {
      x: string | number;
      yOffset: number;
    };
  };
  ui: {
    energyUI: {
      xOffset: number;
      y: number;
      orbSpacing: number;
      orbRadius: number;
      orbGlowRadius: number;
    };
    endTurnButton: {
      xOffset: number;
      y: number;
      width: number;
      height: number;
    };
    deckPile: {
      xOffset: number;
      yOffset: number;
      width: number;
      height: number;
      clickAreaWidth: number;
      clickAreaHeight: number;
    };
    discardPile: {
      x: number;
      yOffset: number;
      width: number;
      height: number;
      clickAreaWidth: number;
      clickAreaHeight: number;
    };
    deckInfoText: {
      x: number;
      yOffset: number;
    };
  };
  card: {
    hand: {
      width: number;
      height: number;
      spacing: number;
    };
    view: {
      width: number;
      height: number;
    };
    renderer: {
      defaultWidth: number;
      defaultHeight: number;
      headerHeight: number;
      headerYOffset: number;
      costCircle: {
        xOffset: number;
        yOffset: number;
        radius: number;
      };
      image: {
        yOffset: number;
      };
      value: {
        yOffset: number;
      };
      description: {
        yOffset: number;
      };
    };
    particle: {
      minSize: number;
      maxSize: number;
      count: number;
    };
    reshuffle: {
      tempCardWidth: number;
      tempCardHeight: number;
      maxCardsToShow: number;
    };
  };
  reward: {
    title: {
      x: string | number;
      y: number;
    };
    goldDisplay: {
      x: string | number;
      y: number;
      amount: number;
    };
    description: {
      x: string | number;
      y: number;
    };
    cards: {
      spacing: number;
      y: string | number;
    };
    continueButton: {
      x: string | number;
      yOffset: number;
      width: number;
      height: number;
    };
    messageOffset: number;
  };
  colors: {
    [key: string]: string;
  };
}

/**
 * UI 설정을 관리하는 싱글톤 매니저
 * ui.json 파일의 설정을 로드하고 제공합니다.
 */
export default class UIConfigManager {
  private static instance: UIConfigManager;
  private config: UIConfig | null = null;

  private constructor() {}

  public static getInstance(): UIConfigManager {
    if (!UIConfigManager.instance) {
      UIConfigManager.instance = new UIConfigManager();
    }
    return UIConfigManager.instance;
  }

  /**
   * UI 설정을 로드합니다.
   */
  public loadConfig(data: UIConfig): void {
    this.config = data;
  }

  /**
   * UI 설정을 가져옵니다.
   */
  public getConfig(): UIConfig {
    if (!this.config) {
      throw new Error('UI config not loaded. Call loadConfig() first.');
    }
    return this.config;
  }

  /**
   * "center" 문자열을 화면 중앙 좌표로 변환합니다.
   */
  private resolvePosition(
    value: string | number,
    screenSize: number
  ): number {
    if (value === 'center') {
      return screenSize / 2;
    }
    return value as number;
  }

  /**
   * 배틀 씬 플레이어 위치를 반환합니다.
   */
  public getPlayerPosition(camera: Phaser.Cameras.Scene2D.Camera): { x: number; y: number } {
    const cfg = this.getConfig().battle.player;
    return {
      x: this.resolvePosition(cfg.x, camera.width),
      y: camera.height / 2 + cfg.yOffset
    };
  }

  /**
   * 배틀 씬 적 위치를 반환합니다.
   */
  public getEnemyY(): number {
    return this.getConfig().battle.enemy.y;
  }

  /**
   * 적 배치 간격을 반환합니다.
   */
  public getEnemySpacing(screenWidth: number, enemyCount: number): number {
    const minSpacing = this.getConfig().battle.enemy.minSpacing;
    return Math.min(minSpacing, screenWidth / (enemyCount + 1));
  }

  /**
   * My Deck 버튼 설정을 반환합니다.
   */
  public getMyDeckButton() {
    return this.getConfig().battle.myDeckButton;
  }

  /**
   * 핸드 컨테이너 위치를 반환합니다.
   */
  public getHandContainerPosition(camera: Phaser.Cameras.Scene2D.Camera): { x: number; y: number } {
    const cfg = this.getConfig().battle.handContainer;
    return {
      x: this.resolvePosition(cfg.x, camera.width),
      y: camera.height + cfg.yOffset
    };
  }

  /**
   * 에너지 UI 위치를 반환합니다.
   */
  public getEnergyUIPosition(camera: Phaser.Cameras.Scene2D.Camera): { x: number; y: number } {
    const cfg = this.getConfig().ui.energyUI;
    return {
      x: camera.width + cfg.xOffset,
      y: cfg.y
    };
  }

  /**
   * 에너지 UI 설정을 반환합니다.
   */
  public getEnergyUIConfig() {
    return this.getConfig().ui.energyUI;
  }

  /**
   * 턴 종료 버튼 위치를 반환합니다.
   */
  public getEndTurnButtonPosition(camera: Phaser.Cameras.Scene2D.Camera): { x: number; y: number } {
    const cfg = this.getConfig().ui.endTurnButton;
    return {
      x: camera.width + cfg.xOffset,
      y: cfg.y
    };
  }

  /**
   * 턴 종료 버튼 크기를 반환합니다.
   */
  public getEndTurnButtonSize() {
    const cfg = this.getConfig().ui.endTurnButton;
    return {
      width: cfg.width,
      height: cfg.height
    };
  }

  /**
   * 덱 더미 위치를 반환합니다.
   */
  public getDeckPilePosition(camera: Phaser.Cameras.Scene2D.Camera): { x: number; y: number } {
    const cfg = this.getConfig().ui.deckPile;
    return {
      x: camera.width + cfg.xOffset,
      y: camera.height + cfg.yOffset
    };
  }

  /**
   * 덱 더미 설정을 반환합니다.
   */
  public getDeckPileConfig() {
    return this.getConfig().ui.deckPile;
  }

  /**
   * 버린 카드 더미 위치를 반환합니다.
   */
  public getDiscardPilePosition(camera: Phaser.Cameras.Scene2D.Camera): { x: number; y: number } {
    const cfg = this.getConfig().ui.discardPile;
    return {
      x: cfg.x,
      y: camera.height + cfg.yOffset
    };
  }

  /**
   * 버린 카드 더미 설정을 반환합니다.
   */
  public getDiscardPileConfig() {
    return this.getConfig().ui.discardPile;
  }

  /**
   * 덱 정보 텍스트 위치를 반환합니다.
   */
  public getDeckInfoTextPosition(camera: Phaser.Cameras.Scene2D.Camera): { x: number; y: number } {
    const cfg = this.getConfig().ui.deckInfoText;
    return {
      x: cfg.x,
      y: camera.height + cfg.yOffset
    };
  }

  /**
   * 핸드 카드 설정을 반환합니다.
   */
  public getHandCardConfig() {
    return this.getConfig().card.hand;
  }

  /**
   * 카드 뷰 설정을 반환합니다.
   */
  public getCardViewConfig() {
    return this.getConfig().card.view;
  }

  /**
   * 카드 렌더러 설정을 반환합니다.
   */
  public getCardRendererConfig() {
    return this.getConfig().card.renderer;
  }

  /**
   * 카드 파티클 설정을 반환합니다.
   */
  public getCardParticleConfig() {
    return this.getConfig().card.particle;
  }

  /**
   * 카드 리셔플 설정을 반환합니다.
   */
  public getCardReshuffleConfig() {
    return this.getConfig().card.reshuffle;
  }

  /**
   * 보상 씬 타이틀 위치를 반환합니다.
   */
  public getRewardTitlePosition(camera: Phaser.Cameras.Scene2D.Camera): { x: number; y: number } {
    const cfg = this.getConfig().reward.title;
    return {
      x: this.resolvePosition(cfg.x, camera.width),
      y: cfg.y
    };
  }

  /**
   * 보상 씬 골드 표시 위치를 반환합니다.
   */
  public getRewardGoldDisplayPosition(camera: Phaser.Cameras.Scene2D.Camera): { x: number; y: number } {
    const cfg = this.getConfig().reward.goldDisplay;
    return {
      x: this.resolvePosition(cfg.x, camera.width),
      y: cfg.y
    };
  }

  /**
   * 보상 씬 골드 양을 반환합니다.
   */
  public getRewardGoldAmount(): number {
    return this.getConfig().reward.goldDisplay.amount;
  }

  /**
   * 보상 씬 설명 위치를 반환합니다.
   */
  public getRewardDescriptionPosition(camera: Phaser.Cameras.Scene2D.Camera): { x: number; y: number } {
    const cfg = this.getConfig().reward.description;
    return {
      x: this.resolvePosition(cfg.x, camera.width),
      y: cfg.y
    };
  }

  /**
   * 보상 씬 카드 간격을 반환합니다.
   */
  public getRewardCardSpacing(): number {
    return this.getConfig().reward.cards.spacing;
  }

  /**
   * 보상 씬 카드 Y 위치를 반환합니다.
   */
  public getRewardCardY(camera: Phaser.Cameras.Scene2D.Camera): number {
    const cfg = this.getConfig().reward.cards.y;
    return this.resolvePosition(cfg, camera.height);
  }

  /**
   * 보상 씬 계속하기 버튼 위치를 반환합니다.
   */
  public getRewardContinueButtonPosition(camera: Phaser.Cameras.Scene2D.Camera): { x: number; y: number } {
    const cfg = this.getConfig().reward.continueButton;
    return {
      x: this.resolvePosition(cfg.x, camera.width),
      y: camera.height + cfg.yOffset
    };
  }

  /**
   * 보상 씬 계속하기 버튼 크기를 반환합니다.
   */
  public getRewardContinueButtonSize() {
    const cfg = this.getConfig().reward.continueButton;
    return {
      width: cfg.width,
      height: cfg.height
    };
  }

  /**
   * 보상 씬 메시지 오프셋을 반환합니다.
   */
  public getRewardMessageOffset(): number {
    return this.getConfig().reward.messageOffset;
  }

  /**
   * 색상 값을 가져옵니다 (hex number 형식).
   */
  public getColor(colorName: string): number {
    const colorStr = this.getConfig().colors[colorName];
    if (!colorStr) {
      console.warn(`Color '${colorName}' not found in config, using default 0xffffff`);
      return 0xffffff;
    }
    // "0x..." 형식을 number로 변환
    if (colorStr.startsWith('0x')) {
      return parseInt(colorStr, 16);
    }
    // "#..." 형식은 그대로 반환 (Phaser는 string도 지원)
    return colorStr as any;
  }

  /**
   * 색상 값을 가져옵니다 (hex string 형식, CSS 스타일용).
   */
  public getColorString(colorName: string): string {
    const colorStr = this.getConfig().colors[colorName];
    if (!colorStr) {
      console.warn(`Color '${colorName}' not found in config, using default #ffffff`);
      return '#ffffff';
    }
    // "0x..." 형식을 "#..." 형식으로 변환
    if (colorStr.startsWith('0x')) {
      return '#' + colorStr.slice(2);
    }
    return colorStr;
  }

  /**
   * 카드 타입별 색상을 반환합니다 (number 형식).
   */
  public getCardTypeColor(type: string): number {
    const colorMap: Record<string, string> = {
      'attack': 'CARD_TYPE_ATTACK',
      'defend': 'CARD_TYPE_DEFEND',
      'heal': 'CARD_TYPE_HEAL',
      'energy': 'CARD_TYPE_ENERGY',
      'skill': 'CARD_TYPE_SKILL'
    };
    return this.getColor(colorMap[type] || 'CARD_TYPE_SKILL');
  }

  /**
   * 카드 타입별 색상을 반환합니다 (string 형식).
   */
  public getCardTypeColorString(type: string): string {
    const colorMap: Record<string, string> = {
      'attack': 'TEXT_ATTACK',
      'defend': 'TEXT_DEFEND',
      'heal': 'TEXT_HEAL',
      'energy': 'TEXT_ENERGY',
      'skill': 'TEXT_WHITE'
    };
    return this.getColorString(colorMap[type] || 'TEXT_WHITE');
  }
}
