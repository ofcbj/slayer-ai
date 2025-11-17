import Phaser from 'phaser';
import { CardData } from '../../../types';

/**
 * 카드 덱, 핸드, 버린 카드 더미를 관리하는 클래스
 * 객체 참조 문제를 방지하기 위해 항상 깊은 복사를 수행합니다.
 */
export default class DeckManager {
  private deck: CardData[] = [];
  private discardPile: CardData[] = [];

  /**
   * 덱을 초기화합니다.
   * @param initialDeck 초기 덱 데이터 (깊은 복사됨)
   */
  public initializeDeck(initialDeck: CardData[]): void {
    // 깊은 복사를 통해 객체 참조 문제 방지
    this.deck = initialDeck.map(card => this.deepCopyCard(card));
    this.discardPile = [];
    this.shuffleDeck();
  }

  /**
   * 덱에서 카드를 한 장 드로우합니다.
   * 덱이 비어있으면 버린 카드 더미를 섞어서 덱으로 만듭니다.
   * @returns 드로우한 카드 데이터, 덱이 비어있으면 null
   */
  public drawCard(): CardData | null {
    if (this.deck.length === 0) {
      if (this.discardPile.length > 0) {
        this.reshuffleDiscardIntoDeck();
      } else {
        return null; // 덱과 버린 카드 더미가 모두 비어있음
      }
    }

    const card = this.deck.pop();
    if (!card) {
      return null;
    }

    // 드로우한 카드는 깊은 복사하여 반환
    return this.deepCopyCard(card);
  }

  /**
   * 카드를 버린 카드 더미에 추가합니다.
   * @param cardData 버릴 카드 데이터 (깊은 복사됨)
   */
  public discardCard(cardData: CardData): void {
    // 깊은 복사를 통해 객체 참조 문제 방지
    this.discardPile.push(this.deepCopyCard(cardData));
  }

  /**
   * 여러 카드를 버린 카드 더미에 추가합니다.
   * @param cards 버릴 카드 데이터 배열 (깊은 복사됨)
   */
  public discardCards(cards: CardData[]): void {
    // 각 카드를 깊은 복사하여 추가
    cards.forEach(card => {
      this.discardPile.push(this.deepCopyCard(card));
    });
  }

  /**
   * 버린 카드 더미를 덱으로 리셔플합니다.
   */
  public reshuffleDiscardIntoDeck(): void {
    // 깊은 복사를 통해 객체 참조 문제 방지
    this.deck = this.discardPile.map(card => this.deepCopyCard(card));
    this.discardPile = [];
    this.shuffleDeck();
  }

  /**
   * 덱을 섞습니다.
   */
  public shuffleDeck(): void {
    Phaser.Utils.Array.Shuffle(this.deck);
  }

  /**
   * 덱의 카드 수를 반환합니다.
   */
  public getDeckSize(): number {
    return this.deck.length;
  }

  /**
   * 버린 카드 더미의 카드 수를 반환합니다.
   */
  public getDiscardPileSize(): number {
    return this.discardPile.length;
  }

  /**
   * 덱의 모든 카드를 반환합니다 (읽기 전용).
   */
  public getDeck(): readonly CardData[] {
    return this.deck;
  }

  /**
   * 버린 카드 더미의 모든 카드를 반환합니다 (읽기 전용).
   */
  public getDiscardPile(): readonly CardData[] {
    return this.discardPile;
  }

  /**
   * 카드 데이터를 깊은 복사합니다.
   * 객체 참조 문제를 방지하기 위해 사용됩니다.
   */
  private deepCopyCard(card: CardData): CardData {
    return {
      name: card.name,
      type: card.type,
      damage: card.damage,
      block: card.block,
      heal: card.heal,
      energy: card.energy,
      cost: card.cost,
      allEnemies: card.allEnemies,
      hits: card.hits,
      selfDamage: card.selfDamage,
      description: card.description,
      image: card.image
    };
  }
}

