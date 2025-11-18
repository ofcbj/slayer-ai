import BattleUIManager from '../managers/BattleUIManager';
import DeckManager from '../managers/DeckManager';
import CardHandManager from '../managers/CardHandManager';

/**
 * 덱 정보 동기화를 담당하는 컨트롤러
 * 플레이어 상태는 BattleManager의 옵저버 패턴으로 자동 동기화되므로,
 * 이 클래스는 덱 관련 정보만 담당합니다.
 */
export default class BattleStateSynchronizer {
  constructor(
    private uiManager       : BattleUIManager,
    private deckManager     : DeckManager,
    private cardHandManager : CardHandManager
  ) {}

  /**
   * 덱 정보 업데이트
   */
  updateDeckInfo(): void {
    const deckSize    = this.deckManager.getDeckSize();
    const handSize    = this.cardHandManager.getHandSize();
    const discardSize = this.deckManager.getDiscardPileSize();

    this.uiManager.updateDeckInfo(deckSize, handSize, discardSize);
  }
}
