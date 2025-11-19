import Phaser from 'phaser';
import EventBus from '../../EventBus';
import BattleManager from '../managers/BattleManager';
import DeckManager from '../managers/DeckManager';
import CardHandManager from '../managers/CardHandManager';

/**
 * 콘솔 명령어 처리를 담당하는 컨트롤러
 * EventBus를 통한 콘솔 명령어 이벤트를 처리합니다.
 */
export default class BattleConsoleCommandHandler {
  constructor(
    private scene           : Phaser.Scene,
    private battleManager   : BattleManager,
    private deckManager     : DeckManager,
    private cardHandManager : CardHandManager,

    private updateDeckInfo  : () => void,
    private winBattle       : () => void,
    private checkGameOver   : () => void,
    private endPlayerTurn   : () => void,
    private startPlayerTurn : () => void
  ) {}

  /**
   * 콘솔 명령어 이벤트 리스너 등록
   */
  registerEventListeners(): void {
    // 플레이어 피해
    EventBus.on('console-damage-player',this.handleDamagePlayer);
    // 플레이어 치유
    EventBus.on('console-heal-player',  this.handleHealPlayer);
    // 에너지 설정
    EventBus.on('console-set-energy',   this.handleSetEnergy);
    // 방어도 설정
    EventBus.on('console-set-defense',  this.handleSetDefense);
    // 카드 추가
    EventBus.on('console-add-card',     this.handleAddCard);
    // 카드 뽑기
    EventBus.on('console-draw-cards',   this.handleDrawCards);
    // 적 피해
    EventBus.on('console-damage-enemy', this.handleDamageEnemy);
    // 적 치유
    EventBus.on('console-heal-enemy',   this.handleHealEnemy);
    // 다음 턴
    EventBus.on('console-next-turn',    this.handleNextTurn);
    // 전투 승리
    EventBus.on('console-win-battle',   this.handleWinBattle);
    // 전투 패배
    EventBus.on('console-lose-battle',  this.handleLoseBattle);
  }

  /**
   * 콘솔 명령어 이벤트 리스너 제거
   */
  unregisterEventListeners(): void {
    EventBus.off('console-damage-player', this.handleDamagePlayer);
    EventBus.off('console-heal-player',   this.handleHealPlayer);
    EventBus.off('console-set-energy',    this.handleSetEnergy);
    EventBus.off('console-set-defense',   this.handleSetDefense);
    EventBus.off('console-add-card',      this.handleAddCard);
    EventBus.off('console-draw-cards',    this.handleDrawCards);
    EventBus.off('console-damage-enemy',  this.handleDamageEnemy);
    EventBus.off('console-heal-enemy',    this.handleHealEnemy);
    EventBus.off('console-next-turn',     this.handleNextTurn);
    EventBus.off('console-win-battle',    this.handleWinBattle);
    EventBus.off('console-lose-battle',   this.handleLoseBattle);
  }

  private handleDamagePlayer = (amount: number) => {
    this.battleManager.playerTakeDamage(amount);
  };

  private handleHealPlayer = (amount: number) => {
    this.battleManager.healPlayer(amount);
  };

  private handleSetEnergy = (amount: number) => {
    this.battleManager.setEnergy(amount);
  };

  private handleSetDefense = (amount: number) => {
    this.battleManager.setDefense(amount);
  };

  private handleAddCard = (cardName: string) => {
    // 이미 로드된 카드 데이터 사용 (PreloadScene에서 로드됨)
    const cardsData = this.scene.cache.json.get('cards') as any[];
    if (!cardsData) {
      console.warn('[Console] Cards data not loaded');
      return;
    }

    const card = cardsData.find((c: any) => c.name === cardName || c.name.toLowerCase() === cardName.toLowerCase());

    if (card) {
      // 카드를 핸드에 추가 (drawCards 메서드 사용)
      // 덱에 카드를 추가한 후 드로우
      (this.deckManager as any).deck.push({ ...card });
      this.cardHandManager.drawCards(1, () => {
        this.updateDeckInfo();
      });
    } else {
      console.warn(`[Console] Card not found: ${cardName}`);
    }
  };

  private handleDrawCards = (count: number) => {
    this.cardHandManager.drawCards(count, () => {
      this.updateDeckInfo();
    });
  };

  private handleDamageEnemy = ({ index, amount }: { index: number; amount: number }) => {
    const enemies = this.battleManager.getAllEnemies();
    if (enemies[index]) {
      enemies[index].takeDamage(amount);
    }
  };

  private handleHealEnemy = ({ index, amount }: { index: number; amount: number }) => {
    const enemies = this.battleManager.getAllEnemies();
    if (enemies[index]) {
      const enemy = enemies[index] as any;
      enemy.health = Math.min(enemy.maxHealth || 100, (enemy.health || 0) + amount);
      enemy.updateHealthBar();
    }
  };

  private handleNextTurn = () => {
    if (this.battleManager.getTurn() === 'player') {
      this.endPlayerTurn();
    } else {
      this.startPlayerTurn();
    }
  };

  private handleWinBattle = () => {
    this.winBattle();
  };

  private handleLoseBattle = () => {
    this.checkGameOver();
  };
}
