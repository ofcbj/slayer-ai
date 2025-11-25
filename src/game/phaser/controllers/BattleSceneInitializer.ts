import Phaser           from 'phaser';

import Enemy            from '../objects/Enemy';
import Player           from '../objects/Player';
import DeckManager      from '../managers/DeckManager';
import BattleUIManager  from '../managers/BattleUIManager';
import { GameState, StageData } from '../managers/BattleManager';
import GameDataManager  from '../managers/GameDataManager';

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
  createPlayer(): Player {
    const width   = this.scene.cameras.main.width;
    const height  = this.scene.cameras.main.height;

    // 플레이어 캐릭터를 중앙 하단에 배치 (적과 카드 사이)
    const player = new Player(
      this.scene,
      width/2, height/2+100,
      this.gameState.player
    );
    player.idle();

    return player;
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
    const gameDataManager = GameDataManager.getInstance();
    const stageEnemies: string[] = this.selectedStage.data.enemies;

    console.log(`[BattleSceneInitializer] createEnemies - Stage: ${this.selectedStage.id}, Expected enemies:`, stageEnemies);

    const spacing = Math.min(300, width / (stageEnemies.length + 1));
    const startX = (width - (spacing * (stageEnemies.length - 1))) / 2;

    const createdEnemies: Enemy[] = [];
    stageEnemies.forEach((enemyName: string, index: number) => {
      const enemyData = gameDataManager.getEnemyData()[enemyName];
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
    const gameDataManager = GameDataManager.getInstance();

    console.log(`[BattleSceneInitializer] setupDeck - gameState.deck.length: ${this.gameState.deck.length}`);

    // 기본 덱 생성 (플레이어 덱이 비어있으면)
    if (this.gameState.deck.length === 0) {
      // cards_cat.json의 start_deck 설정에서 시작 덱 가져오기 (카드 ID 배열)
      const cardIds = gameDataManager.getStartDeck();
      // 카드 ID 배열을 CardData 배열로 변환
      this.gameState.deck = gameDataManager.convertCardIdsToCardData(cardIds);
      console.log(`[BattleSceneInitializer] setupDeck - Created start deck with ${this.gameState.deck.length} cards from cards_cat.json`);
    } else {
      // gameState.deck이 이미 CardData 배열인지 확인
      // 만약 카드 ID 배열이라면 변환 필요
      if (this.gameState.deck.length > 0) {
        const firstItem = this.gameState.deck[0];
        // 카드 ID 문자열인지 확인 (CardData는 객체이므로 'id' 속성을 가짐)
        if (typeof firstItem === 'string') {
          // 카드 ID 배열인 경우 CardData로 변환
          this.gameState.deck = gameDataManager.convertCardIdsToCardData(this.gameState.deck as any);
          console.log(`[BattleSceneInitializer] setupDeck - Converted card IDs to CardData`);
        }
      }
    }

    // DeckManager를 사용하여 덱 초기화
    this.deckManager.initializeDeck(this.gameState.deck);
    console.log(`[BattleSceneInitializer] setupDeck - Initialized deck with ${this.deckManager.getDeckSize()} cards`);
  }
}
