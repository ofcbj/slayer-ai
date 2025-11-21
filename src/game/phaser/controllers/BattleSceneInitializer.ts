import Phaser from 'phaser';
import Enemy from '../objects/Enemy';
import Player from '../objects/Player';
import DeckManager from '../managers/DeckManager';
import BattleUIManager from '../managers/BattleUIManager';
import { CardData, EnemyData, GameState, StageData } from '../managers/BattleManager';
import LanguageManager from '../../../i18n/LanguageManager';

/**
 * BattleScene 초기화를 담당하는 컨트롤러
 * 플레이어, 적, UI, 덱 등의 생성 및 설정을 처리합니다.
 */
export default class BattleSceneInitializer {
  constructor(
    private scene           : Phaser.Scene,
    private gameState       : GameState,
    private selectedStage   : StageData,
    private deckManager     : DeckManager,
    private uiManager       : BattleUIManager,
  ) {}

  /**
   * 플레이어 캐릭터 생성
   */
  createPlayerCharacter(): Player {
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;

    // 플레이어 캐릭터를 중앙 하단에 배치 (적과 카드 사이)
    const playerCharacter = new Player(
      this.scene,
      width / 2,
      height / 2 + 100,
      this.gameState.player // PlayerState 전달
    );
    playerCharacter.idle(); // 아이들 애니메이션 시작

    return playerCharacter;
  }

  /**
   * UI 생성
   */
  createUI(
    onEndTurn: () => void,
    onDeckPileClick: () => void,
    onDiscardPileClick: () => void
  ): void {
    // Energy UI
    this.uiManager.createEnergyUI(this.gameState.player);

    // 턴 종료 버튼
    this.uiManager.createEndTurnButton(onEndTurn);

    // 덱 더미 UI
    this.uiManager.createDeckPile(onDeckPileClick);

    // 버린 카드 더미 UI
    this.uiManager.createDiscardPile(onDiscardPileClick);

    // 덱 정보 텍스트
    this.uiManager.createDeckInfoText();
  }

  /**
   * 적 생성
   */
  createEnemies(): Enemy[] {
    const width = this.scene.cameras.main.width;
    const langManager = LanguageManager.getInstance();
    const stageEnemies: string[] = this.selectedStage.data.enemies;

    console.log(`[BattleSceneInitializer] createEnemies - Stage: ${this.selectedStage.id}, Expected enemies:`, stageEnemies);

    const spacing = Math.min(300, width / (stageEnemies.length + 1));
    const startX = (width - (spacing * (stageEnemies.length - 1))) / 2;

    const createdEnemies: Enemy[] = [];
    stageEnemies.forEach((enemyName: string, index: number) => {
      const enemyData = langManager.getEnemyData(enemyName);
      if (enemyData) {
        const x = startX + (index * spacing);
        const y = 220; // 적들을 상단에 배치

        const enemy = new Enemy(this.scene, x, y, enemyData, index);
        createdEnemies.push(enemy);
      }
    });

    console.log(`[BattleSceneInitializer] createEnemies - Created ${createdEnemies.length} enemies`);
    return createdEnemies;
  }

  /**
   * 덱 설정
   */
  setupDeck(): void {
    const langManager = LanguageManager.getInstance();
    const cardsData: { basic: CardData[] } = langManager.getCardData();

    console.log(`[BattleSceneInitializer] setupDeck - gameState.deck.length: ${this.gameState.deck.length}`);

    // 기본 덱 생성 (플레이어 덱이 비어있으면)
    if (this.gameState.deck.length === 0) {
      this.gameState.deck = [
        ...Array(5).fill(null).map(() => ({ ...cardsData.basic[0] })), // 강타 x5
        ...Array(4).fill(null).map(() => ({ ...cardsData.basic[1] })), // 방어 x4
        ...Array(1).fill(null).map(() => ({ ...cardsData.basic[4] }))  // 집중 x1
      ];
      console.log(`[BattleSceneInitializer] setupDeck - Created basic deck with ${this.gameState.deck.length} cards`);
    }

    // DeckManager를 사용하여 덱 초기화
    this.deckManager.initializeDeck(this.gameState.deck);
    console.log(`[BattleSceneInitializer] setupDeck - Initialized deck with ${this.deckManager.getDeckSize()} cards`);
  }
}
