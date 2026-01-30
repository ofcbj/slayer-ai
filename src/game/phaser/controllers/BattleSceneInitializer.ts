import type BattleScene from '../scenes/BattleScene';

import Enemy            from '../objects/Enemy';
import Player           from '../objects/Player';
import DeckManager      from '../managers/DeckManager';
import BattleUIManager  from '../managers/BattleUIManager';
import UIConfigManager  from '../managers/UIConfigManager';
import { GameState, StageData } from '../managers/BattleManager';
import GameDataManager  from '../managers/GameDataManager';

/**
 * BattleScene 초기화를 담당하는 컨트롤러
 * 플레이어, 적, UI, 덱 등의 생성 및 설정을 처리합니다.
 */
export default class BattleSceneInitializer {
  constructor(
    private scene           : BattleScene,
    private gameState       : GameState,
    private selectedStage   : StageData,
    private deckManager     : DeckManager,
    private uiManager       : BattleUIManager,
  ) {}

  /**
   * 플레이어 캐릭터 생성
   */
  createPlayer(): Player {
    const uiConfig = UIConfigManager.getInstance();
    const pos = uiConfig.getPlayerPosition(this.scene.cameras.main);

    // 플레이어 캐릭터를 중앙 하단에 배치 (적과 카드 사이)
    const player = new Player(
      this.scene,
      pos.x, pos.y,
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
    const uiConfig = UIConfigManager.getInstance();

    console.log(`[BattleSceneInitializer] createEnemies - Stage: ${this.selectedStage.id}, Expected enemies:`, stageEnemies);

    // 난이도 배율 가져오기
    const difficultyMultipliers = {
      'very_easy': 0.5,
      'easy': 0.75,
      'normal': 1.0,
      'hard': 1.1,
      'very_hard': 1.2
    };
    const difficulty = this.gameState.difficulty || 'normal';
    const multiplier = difficultyMultipliers[difficulty];

    const spacing = uiConfig.getEnemySpacing(width, stageEnemies.length);
    const startX = (width - (spacing * (stageEnemies.length - 1))) / 2;

    const createdEnemies: Enemy[] = [];
    stageEnemies.forEach((enemyName: string, index: number) => {
      const enemyData = gameDataManager.getEnemyData()[enemyName];
      if (enemyData) {
        // 난이도에 따라 적 스탯 조정
        const scaledEnemyData = {
          ...enemyData,
          hp: Math.ceil(enemyData.hp * multiplier),
          attack: Math.ceil(enemyData.attack * multiplier)
        };

        const x = startX + (index * spacing);
        const y = uiConfig.getEnemyY(); // 적들을 상단에 배치

        const enemy = new Enemy(this.scene, x, y, scaledEnemyData, index);
        createdEnemies.push(enemy);
      }
    });

    // 모든 적 생성 후 단축키 설정
    const totalEnemies = createdEnemies.length;
    createdEnemies.forEach((enemy) => {
      enemy.setHotkeyByEnemyCount(totalEnemies);
    });

    console.log(`[BattleSceneInitializer] createEnemies - Created ${createdEnemies.length} enemies with difficulty ${difficulty} (${multiplier}x)`);
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
