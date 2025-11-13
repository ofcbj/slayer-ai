import { clamp, delay } from '../../utils/helpers.js';

// 전투 관리 클래스
class CombatManager {
    constructor(stateManager, cardManager, uiManager) {
        this.stateManager = stateManager;
        this.cardManager = cardManager;
        this.uiManager = uiManager;
    }

    // 카드 선택
    selectCard(index) {
        const state = this.stateManager.getState();

        if (!state.hand[index] || state.gameOver) return;

        const card = state.hand[index];

        // 에너지 부족 체크
        if (card.cost > state.player.energy) return;

        // 선택 상태 초기화
        this.uiManager.clearSelections();

        // 카드 선택
        this.stateManager.setState({ selectedCard: index });
        this.uiManager.selectCard(index);

        // 공격 카드면 적 선택 대기, 아니면 즉시 사용
        if (card.damage || card.hits) {
            this.uiManager.highlightEnemies();
        } else {
            this.playCard();
        }
    }

    // 적 선택
    selectEnemy(index) {
        const state = this.stateManager.getState();

        if (state.selectedCard === null) return;

        this.stateManager.setState({ selectedEnemy: index });
        this.uiManager.selectEnemy(index);

        this.playCard();
    }

    // 카드 플레이
    playCard() {
        const state = this.stateManager.getState();

        if (state.selectedCard === null || !state.hand[state.selectedCard]) return;

        const card = state.hand[state.selectedCard];

        // 에너지 소모
        const player = { ...state.player };
        player.energy -= card.cost;

        // 카드 효과 실행
        const gameState = {
            player,
            enemies: [...state.enemies],
            selectedEnemy: state.selectedEnemy
        };

        this.cardManager.executeCardEffect(card, gameState);

        // 핸드에서 카드 제거 및 버림 더미에 추가
        const hand = [...state.hand];
        const discardPile = [...state.discardPile];
        discardPile.push(hand[state.selectedCard]);
        hand.splice(state.selectedCard, 1);

        // 상태 업데이트
        this.stateManager.setState({
            player,
            enemies: gameState.enemies,
            hand,
            discardPile,
            selectedCard: null,
            selectedEnemy: null
        });

        return true;
    }

    // 죽은 적 제거
    checkEnemyDeaths() {
        const enemies = this.stateManager.getState('enemies');
        const aliveEnemies = enemies.filter(enemy => enemy.hp > 0);
        this.stateManager.setState({ enemies: aliveEnemies });
    }

    // 턴 종료
    async endTurn() {
        const state = this.stateManager.getState();

        if (state.gameOver) return;

        this.uiManager.setEndTurnButtonDisabled(true);

        // 손패를 버림 더미로
        const discardPile = [...state.discardPile, ...state.hand];
        this.stateManager.setState({ hand: [], discardPile });

        // 적 턴
        await this.enemyTurn();

        // 게임 오버 체크
        const player = this.stateManager.getState('player');
        if (player.hp <= 0) {
            return false; // 패배
        }

        // 새 턴 시작
        this.startNewTurn();
        this.uiManager.setEndTurnButtonDisabled(false);

        return true;
    }

    // 적 턴
    async enemyTurn() {
        const enemies = this.stateManager.getState('enemies');

        for (let index = 0; index < enemies.length; index++) {
            const enemy = enemies[index];
            if (enemy.hp <= 0) continue;

            // 보스 패턴 업데이트
            if (enemy.isBoss && enemy.specialPattern) {
                enemy.turnCount++;
                const patternIndex = (enemy.turnCount - 1) % enemy.specialPattern.length;
                const pattern = enemy.specialPattern[patternIndex];

                enemy.intent = pattern.intent;
                enemy.attack = pattern.damage;
                enemy.defense = pattern.defense;
            }

            // 적 공격 애니메이션
            await this.animateEnemyAttack(index, enemy);
        }
    }

    // 적 공격 애니메이션 및 처리
    async animateEnemyAttack(enemyIndex, enemy) {
        await this.uiManager.animateEnemyAttack(enemyIndex);

        const player = { ...this.stateManager.getState('player') };

        // 보스 특수 행동 처리
        if (enemy.isBoss && enemy.specialPattern) {
            const patternIndex = (enemy.turnCount - 1) % enemy.specialPattern.length;
            const pattern = enemy.specialPattern[patternIndex];

            this.handleBossAction(enemy, pattern, player);
        } else {
            // 일반 적 공격
            const damage = Math.max(0, enemy.attack - player.block);
            player.hp -= damage;
            player.block = Math.max(0, player.block - enemy.attack);

            if (damage > 0) {
                await this.uiManager.showPlayerDamage(damage);
            }
        }

        this.stateManager.setState({ player });
    }

    // 보스 행동 처리
    handleBossAction(enemy, pattern, player) {
        const enemies = this.stateManager.getState('enemies');

        switch (pattern.action) {
            case "attack":
            case "devastate":
            case "meteor":
            case "inferno":
            case "dark_power":
            case "apocalypse":
            case "shadow_blast":
                const damage = Math.max(0, pattern.damage - player.block);
                player.hp -= damage;
                player.block = Math.max(0, player.block - pattern.damage);
                if (damage > 0) {
                    this.uiManager.showPlayerDamage(damage);
                }
                break;

            case "charge":
            case "fire_shield":
            case "dark_ritual":
                // 방어만 하는 행동
                break;

            case "summon":
                // 그림자 소환
                enemies.push({
                    name: "그림자",
                    hp: 15,
                    maxHp: 15,
                    attack: 8,
                    defense: 0,
                    image: "👻",
                    intent: "그림자 공격 (8 피해)",
                    isBoss: false,
                    turnCount: 0
                });
                this.stateManager.setState({ enemies });
                break;

            case "curse":
                // 저주
                player.maxEnergy = Math.max(1, player.maxEnergy - 1);
                player.energy = Math.min(player.energy, player.maxEnergy);
                break;

            case "regenerate":
                // 재생
                enemy.hp = Math.min(enemy.maxHp, enemy.hp + 20);
                break;
        }
    }

    // 새 턴 시작
    startNewTurn() {
        const state = this.stateManager.getState();

        const player = { ...state.player };
        player.energy = player.maxEnergy;
        player.block = 0;

        const hand = [...state.hand];
        const deck = [...state.deck];
        const discardPile = [...state.discardPile];

        this.cardManager.drawCards(deck, hand, discardPile, 5);

        this.stateManager.setState({
            player,
            hand,
            deck,
            discardPile
        });
    }
}

export default CombatManager;
