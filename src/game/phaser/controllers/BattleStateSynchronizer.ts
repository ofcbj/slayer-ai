import Player from '../objects/Player';
import BattleManager from '../managers/BattleManager';
import BattleUIManager from '../managers/BattleUIManager';
import DeckManager from '../managers/DeckManager';
import CardHandManager from '../managers/CardHandManager';
import { GameState } from '../managers/BattleManager';

/**
 * 게임 상태 동기화를 담당하는 컨트롤러
 * BattleManager, Player, UI 간의 상태를 동기화합니다.
 */
export default class BattleStateSynchronizer {
  constructor(
    private gameState: GameState,
    private battleManager: BattleManager,
    private playerCharacter: Player,
    private uiManager: BattleUIManager,
    private deckManager: DeckManager,
    private cardHandManager: CardHandManager
  ) {}

  /**
   * UI 업데이트 (플레이어 상태 + 에너지)
   */
  updateUI(): void {
    // 플레이어 캐릭터 스탯 업데이트
    this.playerCharacter.updateStats(
      this.gameState.player.health,
      this.gameState.player.defense
    );

    // 에너지 UI 업데이트
    this.uiManager.updateEnergyUI(this.gameState.player);
  }

  /**
   * 덱 정보 업데이트
   */
  updateDeckInfo(): void {
    const deckSize = this.deckManager.getDeckSize();
    const handSize = this.cardHandManager.getHandSize();
    const discardSize = this.deckManager.getDiscardPileSize();

    this.uiManager.updateDeckInfo(deckSize, handSize, discardSize);
  }

  /**
   * 플레이어 상태 동기화
   * BattleManager의 상태를 gameState와 playerCharacter에 반영
   */
  syncPlayerState(): void {
    const playerState = this.battleManager.getPlayerState();

    this.gameState.player.health = playerState.health;
    this.gameState.player.defense = playerState.defense;
    this.gameState.player.energy = playerState.energy;

    this.playerCharacter.health = playerState.health;
    this.playerCharacter.defense = playerState.defense;
    this.playerCharacter.updateStats(playerState.health, playerState.defense);
  }
}
