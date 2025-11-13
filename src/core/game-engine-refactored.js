import StateManager from './state-manager.js';
import CardManager from '../managers/card-manager.js';
import UIManager from '../managers/ui-manager-refactored.js';
import CombatManager from './combat/combat-manager.js';
import StageManager from './stage/stage-manager.js';
import RewardManager from './reward/reward-manager.js';
import GameStateInitializer from './game/game-state-initializer.js';

// 게임 엔진 클래스 (리팩토링 버전 - 조합 패턴)
class GameEngine {
    constructor(gameData) {
        this.gameData = gameData;

        // 핵심 매니저 초기화
        this.stateManager = new StateManager(this.getInitialState());
        this.cardManager = new CardManager(gameData.cards);
        this.uiManager = new UIManager(this.stateManager);

        // 기능별 매니저 초기화
        this.combatManager = new CombatManager(
            this.stateManager,
            this.cardManager,
            this.uiManager
        );
        this.stageManager = new StageManager(gameData, this.stateManager);
        this.rewardManager = new RewardManager(
            this.stateManager,
            this.cardManager,
            this.stageManager
        );
        this.gameStateInitializer = new GameStateInitializer(this.cardManager);

        // UI 이벤트 리스너 등록
        this.setupUIEventListeners();

        // 게임 시작
        this.showStageSelect();
    }

    // 초기 상태 정의
    getInitialState() {
        return this.gameStateInitializer
            ? this.gameStateInitializer.getInitialState()
            : {
                player: { hp: 80, maxHp: 80, energy: 3, maxEnergy: 3, block: 0 },
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

    // === 스테이지 관련 메서드 ===
    showStageSelect() {
        const state = this.stateManager.getState();
        this.uiManager.showStageSelectModal(
            this.gameData.stages,
            state.availableStages,
            state.completedStages,
            (stageId) => this.startStage(stageId)
        );
    }

    startStage(stageId) {
        this.stageManager.startStage(stageId);
        this.startGame();
    }

    // === 게임 플레이 메서드 ===
    startGame() {
        this.gameStateInitializer.prepareGameStart(this.stateManager);

        // UI 업데이트
        const state = this.stateManager.getState();
        this.uiManager.updateUI(
            state.player,
            state.deck,
            state.discardPile,
            state.currentStageId
        );
    }

    selectCard(index) {
        this.combatManager.selectCard(index);
    }

    selectEnemy(index) {
        this.combatManager.selectEnemy(index);
    }

    async endTurn() {
        const success = await this.combatManager.endTurn();

        if (!success) {
            // 패배
            this.endGame(false);
            return;
        }

        // 승리 체크
        const enemies = this.stateManager.getState('enemies');
        if (enemies.every(e => e.hp <= 0)) {
            this.endGame(true);
        }
    }

    // === 게임 종료 관련 메서드 ===
    endGame(victory) {
        const state = this.stateManager.getState();

        this.stateManager.setState({ gameOver: true });

        if (victory) {
            this.stageManager.completeStage();
            this.uiManager.showGameOverModal(true, state.currentStageId, true);
            this.showRewardCards();
        } else {
            this.uiManager.showGameOverModal(false, state.currentStageId);
        }
    }

    showRewardCards() {
        const rewardCards = this.rewardManager.getRewardCards();
        this.uiManager.showRewardCards(rewardCards, (selectedCard) => {
            this.selectRewardCard(selectedCard);
        });
    }

    selectRewardCard(selectedCard) {
        this.rewardManager.selectRewardCard(selectedCard);
        this.uiManager.hideGameOverModal();
        this.showStageSelect();
    }

    restartGame() {
        this.gameStateInitializer.resetGame(this.stateManager);
        this.uiManager.hideGameOverModal();
        this.showStageSelect();
    }

    // === UI 관련 메서드 ===
    showDeckModal() {
        const deck = this.stateManager.getState('deck');
        this.uiManager.showCardListModal(`덱 카드 목록 (${deck.length}장)`, deck);
    }

    showDiscardModal() {
        const discardPile = this.stateManager.getState('discardPile');
        this.uiManager.showCardListModal(`버린 카드 목록 (${discardPile.length}장)`, discardPile);
    }

    closeCardListModal() {
        this.uiManager.closeCardListModal();
    }
}

export default GameEngine;
