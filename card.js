// 카드 관련 로직
class CardManager {
    constructor() {
        this.basicCards = [];
        this.rewardCards = [];
        this.initCards();
    }

    initCards() {
        // 기본 카드 7장 (시작 덱)
        this.basicCards = [
            {name: "강타", type: "공격", cost: 1, damage: 6, image: "⚔️", description: "적에게 <span class='card-damage'>6</span> 피해를 줍니다."},
            {name: "방어", type: "스킬", cost: 1, block: 5, image: "🛡️", description: "<span class='card-block'>5</span> 방어도를 얻습니다."},
            {name: "분노", type: "공격", cost: 0, damage: 4, image: "😡", description: "적에게 <span class='card-damage'>4</span> 피해를 줍니다."},
            {name: "베기", type: "공격", cost: 1, damage: 7, image: "🗡️", description: "적에게 <span class='card-damage'>7</span> 피해를 줍니다."},
            {name: "집중", type: "스킬", cost: 0, energy: 2, image: "🧘", description: "<span class='card-energy'>2</span> 에너지를 얻습니다."},
            {name: "치유", type: "스킬", cost: 1, heal: 8, image: "💚", description: "체력을 <span class='card-energy'>8</span> 회복합니다."},
            {name: "철벽", type: "스킬", cost: 1, block: 8, image: "🏰", description: "<span class='card-block'>8</span> 방어도를 얻습니다."}
        ];
        
        // 보상 카드 풀 (고급 카드들)
        this.rewardCards = [
            {name: "검풍", type: "공격", cost: 1, damage: 4, allEnemies: true, image: "🌪️", description: "모든 적에게 <span class='card-damage'>4</span> 피해를 줍니다."},
            {name: "화염구", type: "공격", cost: 2, damage: 12, image: "🔥", description: "적에게 <span class='card-damage'>12</span> 피해를 줍니다."},
            {name: "얼음창", type: "공격", cost: 1, damage: 8, image: "🧊", description: "적에게 <span class='card-damage'>8</span> 피해를 줍니다."},
            {name: "번개", type: "공격", cost: 2, damage: 10, allEnemies: true, image: "⚡", description: "모든 적에게 <span class='card-damage'>10</span> 피해를 줍니다."},
            {name: "마법 방패", type: "스킬", cost: 2, block: 12, image: "🔮", description: "<span class='card-block'>12</span> 방어도를 얻습니다."},
            {name: "폭풍검", type: "공격", cost: 2, damage: 15, image: "🌩️", description: "적에게 <span class='card-damage'>15</span> 피해를 줍니다."},
            {name: "재생", type: "스킬", cost: 1, heal: 5, block: 5, image: "✨", description: "체력을 <span class='card-energy'>5</span> 회복하고 <span class='card-block'>5</span> 방어도를 얻습니다."},
            {name: "화살 난사", type: "공격", cost: 1, damage: 3, hits: 3, image: "🏹", description: "적에게 <span class='card-damage'>3</span> 피해를 3번 줍니다."},
            {name: "광분", type: "공격", cost: 0, damage: 8, selfDamage: 3, image: "💀", description: "적에게 <span class='card-damage'>8</span> 피해를 주고 자신이 3 피해를 받습니다."},
            {name: "암흑 구체", type: "공격", cost: 3, damage: 18, image: "🌑", description: "적에게 <span class='card-damage'>18</span> 피해를 줍니다."},
            {name: "치료술", type: "스킬", cost: 2, heal: 15, image: "💖", description: "체력을 <span class='card-energy'>15</span> 회복합니다."},
            {name: "연속 베기", type: "공격", cost: 1, damage: 5, hits: 2, image: "⚡", description: "적에게 <span class='card-damage'>5</span> 피해를 2번 줍니다."},
            {name: "완전 방어", type: "스킬", cost: 3, block: 20, image: "🏛️", description: "<span class='card-block'>20</span> 방어도를 얻습니다."}
        ];
    }

    shuffleDeck(deck) {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    }

    drawCards(deck, hand, discardPile, count) {
        for (let i = 0; i < count; i++) {
            if (deck.length === 0) {
                deck.push(...discardPile);
                discardPile.length = 0;
                this.shuffleDeck(deck);
            }
            
            if (deck.length > 0) {
                hand.push(deck.pop());
            }
        }
    }

    executeCardEffect(card, gameState) {
        const { player, enemies, selectedEnemy } = gameState;
        
        if (card.damage) {
            if (card.allEnemies) {
                enemies.forEach(enemy => {
                    if (enemy.hp > 0) {
                        this.dealDamageToEnemy(enemy, card.damage);
                    }
                });
            } else if (selectedEnemy !== null) {
                const hits = card.hits || 1;
                for (let i = 0; i < hits; i++) {
                    this.dealDamageToEnemy(enemies[selectedEnemy], card.damage);
                }
            }
        }
        
        if (card.block) {
            player.block += card.block;
        }
        
        if (card.heal) {
            player.hp = Math.min(player.maxHp, player.hp + card.heal);
        }
        
        if (card.energy) {
            player.energy += card.energy;
        }
        
        if (card.selfDamage) {
            player.hp -= Math.max(0, card.selfDamage - player.block);
            player.block = Math.max(0, player.block - card.selfDamage);
        }
    }

    dealDamageToEnemy(enemy, damage) {
        enemy.hp -= damage;
    }

    getRandomRewardCards(count = 3) {
        const shuffledRewards = [...this.rewardCards].sort(() => Math.random() - 0.5);
        return shuffledRewards.slice(0, count);
    }
}
