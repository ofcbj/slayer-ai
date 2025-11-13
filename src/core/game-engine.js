import StateManager from './state-manager.js';
import CardManager from '../managers/card-manager.js';
import UIManager from '../managers/ui-manager.js';
import { deepClone, clamp, delay } from '../utils/helpers.js';

// 게임 엔진 클래스 (리팩토링 버전)
class GameEngine {
    constructor(gameData) {
        this.gameData = gameData;

        // 상태 관리자 초기화
        this.stateManager = new StateManager(this.getInitialState());

        // 매니저 초기화
        this.cardManager = new CardManager(gameData.cards);
        this.uiManager = new UIManager(this.stateManager);

        // UI 이벤트 리스너 등록
        this.setupUIEventListeners();

        // 게임 시작
        this.showStageSelect();
    }

    // 초기 상태 정의
    getInitialState() {
        return {
            player: {
                hp: 80,
                maxHp: 80,
                energy: 3,
                maxEnergy: 3,
                block: 0
            },
            enemies: [],
            deck: [],
            hand: [],
            discardPile: [],
            currentStageId: 1,
            completedStages: new Set(),
            availableStages: new Set([1]),
            gameOver: false,
            selectedCard: null,
            selectedEnemy: null
        };
    }

    // UI 이벤트 리스너 설정
    setupUIEventListeners() {
        // 카드 선택 이벤트
        this.uiManager.on('card:select', (index) => {
            this.selectCard(index);
        });

        // 적 선택 이벤트
        this.uiManager.on('enemy:select', (index) => {
            this.selectEnemy(index);
        });
    }

    // 스테이지 선택 화면 표시
    showStageSelect() {
        const state = this.stateManager.getState();
        this.uiManager.showStageSelectModal(
            this.gameData.stages,
            state.availableStages,
            state.completedStages,
            (stageId) => this.startStage(stageId)
        );
    }

    // 스테이지 시작
    startStage(stageId) {
        this.stateManager.setState({ currentStageId: stageId });
        this.initEnemiesForStage(stageId);
        this.startGame();
    }

    // 스테이지의 적 초기화
    initEnemiesForStage(stageId) {
        const stageInfo = this.gameData.stages[stageId];
        if (!stageInfo) return;

        const enemies = [];
        stageInfo.enemies.forEach(enemyName => {
            const enemyData = this.gameData.enemies[enemyName];
            if (enemyData) {
                const enemy = {
                    name: enemyName,
                    hp: enemyData.hp,
                    maxHp: enemyData.hp,
                    attack: enemyData.attack,
                    defense: enemyData.defense || 0,
                    image: enemyData.image,
                    intent: enemyData.intent,
                    isBoss: enemyData.isBoss || false,
                    isFinalBoss: enemyData.isFinalBoss || false,
                    turnCount: 0,
                    specialPattern: enemyData.isBoss ? this.getBossPattern(enemyName) : null
                };
                enemies.push(enemy);
            }
        });

        this.stateManager.setState({ enemies });
    }

    // 보스 패턴 가져오기
    getBossPattern(bossName) {
        return this.gameData.bossPatterns[bossName] || null;
    }

    // 게임 시작
    startGame() {
        const state = this.stateManager.getState();

        // 덱 초기화 (처음 시작시에만)
        if (state.deck.length === 0) {
            const deck = this.cardManager.createStartingDeck();
            this.stateManager.setState({ deck });
        }

        // 핸드 초기화 및 카드 뽑기
        const hand = [];
        const deck = [...state.deck];
        const discardPile = [...state.discardPile];

        this.cardManager.drawCards(deck, hand, discardPile, 5);

        this.stateManager.setState({
            hand,
            deck,
            discardPile,
            gameOver: false
        });

        // UI 업데이트
        const player = state.player;
        this.uiManager.updateUI(player, deck, discardPile, state.currentStageId);
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

        // 죽은 적 제거
        this.checkEnemyDeaths();

        // 승리 체크
        const currentEnemies = this.stateManager.getState('enemies');
        if (currentEnemies.every(e => e.hp <= 0)) {
            this.endGame(true);
        }
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
            await delay(500);
            this.endGame(false);
            return;
        }

        // 새 턴 시작
        this.startNewTurn();
        this.uiManager.setEndTurnButtonDisabled(false);
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

    // 게임 종료
    endGame(victory) {
        const state = this.stateManager.getState();

        this.stateManager.setState({ gameOver: true });

        if (victory) {
            // 완료한 스테이지 기록
            const completedStages = new Set(state.completedStages);
            completedStages.add(state.currentStageId);

            // 다음 스테이지 열기
            const stageInfo = this.gameData.stages[state.currentStageId];
            const availableStages = new Set(state.availableStages);

            if (stageInfo && stageInfo.nextStages) {
                stageInfo.nextStages.forEach(nextStageId => {
                    availableStages.add(nextStageId);
                });
            }

            this.stateManager.setState({ completedStages, availableStages });

            this.uiManager.showGameOverModal(true, state.currentStageId, true);
            this.showRewardCards();
        } else {
            this.uiManager.showGameOverModal(false, state.currentStageId);
        }
    }

    // 보상 카드 표시
    showRewardCards() {
        const state = this.stateManager.getState();
        const stageInfo = this.gameData.stages[state.currentStageId];

        let rewardCount = 3;
        if (stageInfo.type === "중보스") {
            rewardCount = 4;
        } else if (stageInfo.type === "보스") {
            rewardCount = 5;
        }

        const rewardCards = this.cardManager.getRandomRewardCards(rewardCount);
        this.uiManager.showRewardCards(rewardCards, (selectedCard) => {
            this.selectRewardCard(selectedCard);
        });
    }

    // 보상 카드 선택
    selectRewardCard(selectedCard) {
        const state = this.stateManager.getState();
        const stageInfo = this.gameData.stages[state.currentStageId];

        // 덱에 카드 추가
        const deck = [...state.deck, ...state.hand, ...state.discardPile, selectedCard];

        // 체력 회복
        let healAmount = 0.25;
        if (stageInfo.type === "중보스") {
            healAmount = 0.4;
        } else if (stageInfo.type === "보스") {
            healAmount = 0.6;
        }

        const player = { ...state.player };
        player.hp = clamp(
            player.hp + Math.floor(player.maxHp * healAmount),
            0,
            player.maxHp
        );
        player.energy = player.maxEnergy;
        player.block = 0;

        // 상태 초기화
        this.stateManager.setState({
            deck: this.cardManager.shuffleDeck(deck),
            hand: [],
            discardPile: [],
            player,
            selectedCard: null,
            selectedEnemy: null,
            gameOver: false
        });

        this.uiManager.hideGameOverModal();
        this.showStageSelect();
    }

    // 게임 재시작
    restartGame() {
        const initialState = this.getInitialState();

        // 덱 초기화
        initialState.deck = this.cardManager.createStartingDeck();

        this.stateManager.resetState(initialState);
        this.uiManager.hideGameOverModal();
        this.showStageSelect();
    }

    // 덱 보기
    showDeckModal() {
        const deck = this.stateManager.getState('deck');
        this.uiManager.showCardListModal(`덱 카드 목록 (${deck.length}장)`, deck);
    }

    // 버린 카드 보기
    showDiscardModal() {
        const discardPile = this.stateManager.getState('discardPile');
        this.uiManager.showCardListModal(`버린 카드 목록 (${discardPile.length}장)`, discardPile);
    }

    // 카드 리스트 모달 닫기
    closeCardListModal() {
        this.uiManager.closeCardListModal();
    }
}

export default GameEngine;
