import { shuffleArray, getRandomElements, clamp } from '../utils/helpers.js';

// 카드 관리 클래스 (리팩토링 버전)
class CardManager {
    constructor(cardsData) {
        this.cardsData = cardsData;
        this.basicCards = cardsData.basic || [];
        this.rewardCards = cardsData.rewards || [];
    }

    // 덱 섞기
    shuffleDeck(deck) {
        return shuffleArray(deck);
    }

    // 카드 뽑기
    drawCards(deck, hand, discardPile, count) {
        const drawnCards = [];

        for (let i = 0; i < count; i++) {
            // 덱이 비어있으면 버린 카드 더미를 섞어서 덱으로
            if (deck.length === 0 && discardPile.length > 0) {
                deck.push(...discardPile);
                discardPile.length = 0;
                this.shuffleDeck(deck);
            }

            if (deck.length > 0) {
                const card = deck.pop();
                hand.push(card);
                drawnCards.push(card);
            }
        }

        return drawnCards;
    }

    // 카드 효과 실행
    executeCardEffect(card, gameState) {
        const { player, enemies, selectedEnemy } = gameState;
        const results = {
            damageDealt: 0,
            blockGained: 0,
            healingDone: 0,
            enemiesHit: []
        };

        // 공격 효과
        if (card.damage) {
            if (card.allEnemies) {
                // 전체 공격
                enemies.forEach((enemy, index) => {
                    if (enemy.hp > 0) {
                        const damage = this.dealDamageToEnemy(enemy, card.damage);
                        results.damageDealt += damage;
                        results.enemiesHit.push(index);
                    }
                });
            } else if (selectedEnemy !== null && enemies[selectedEnemy]) {
                // 단일 타겟 공격
                const hits = card.hits || 1;
                for (let i = 0; i < hits; i++) {
                    const damage = this.dealDamageToEnemy(enemies[selectedEnemy], card.damage);
                    results.damageDealt += damage;
                }
                results.enemiesHit.push(selectedEnemy);
            }
        }

        // 방어 효과
        if (card.block) {
            player.block = clamp(player.block + card.block, 0, 999);
            results.blockGained = card.block;
        }

        // 치유 효과
        if (card.heal) {
            const beforeHp = player.hp;
            player.hp = clamp(player.hp + card.heal, 0, player.maxHp);
            results.healingDone = player.hp - beforeHp;
        }

        // 에너지 효과
        if (card.energy) {
            player.energy = clamp(player.energy + card.energy, 0, player.maxEnergy + 5);
        }

        // 자해 효과
        if (card.selfDamage) {
            const actualDamage = Math.max(0, card.selfDamage - player.block);
            player.hp -= actualDamage;
            player.block = Math.max(0, player.block - card.selfDamage);
        }

        return results;
    }

    // 적에게 피해 입히기
    dealDamageToEnemy(enemy, damage) {
        if (!enemy || enemy.hp <= 0) return 0;

        const actualDamage = Math.max(0, damage);
        enemy.hp -= actualDamage;

        return actualDamage;
    }

    // 랜덤 보상 카드 선택
    getRandomRewardCards(count = 3) {
        return getRandomElements(this.rewardCards, count);
    }

    // 기본 덱 생성
    createStartingDeck() {
        return [...this.basicCards];
    }

    // 카드 비용 계산 (특수 효과 고려 가능)
    getCardCost(card, modifiers = {}) {
        let cost = card.cost;

        // 비용 감소 효과 등을 여기서 처리
        if (modifiers.costReduction) {
            cost = Math.max(0, cost - modifiers.costReduction);
        }

        return cost;
    }

    // 카드가 플레이 가능한지 확인
    canPlayCard(card, playerEnergy, modifiers = {}) {
        const cost = this.getCardCost(card, modifiers);
        return playerEnergy >= cost;
    }

    // 카드 설명 생성 (동적 값 포함)
    getCardDescription(card, modifiers = {}) {
        let description = card.description;

        // 필요한 경우 여기서 동적으로 값을 업데이트
        if (modifiers.damageMultiplier) {
            const enhancedDamage = Math.floor(card.damage * modifiers.damageMultiplier);
            description = description.replace(/\d+/, enhancedDamage);
        }

        return description;
    }
}

export default CardManager;
