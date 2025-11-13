import EventManager from './ui/event-manager.js';
import Renderer from './ui/renderer.js';
import AnimationManager from './ui/animation-manager.js';
import ModalManager from './ui/modal-manager.js';
import StageMapRenderer from './ui/stage-map-renderer.js';

// UI 관리 통합 클래스 (조합 패턴)
class UIManager {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.elements = this.cacheElements();

        // 하위 매니저들 초기화
        this.eventManager = new EventManager();
        this.renderer = new Renderer(this.elements);
        this.animationManager = new AnimationManager(this.elements);
        this.modalManager = new ModalManager(this.elements);
        this.stageMapRenderer = new StageMapRenderer(this.elements);

        // 초기화
        this.eventManager.initEventDelegation(this.elements);
        this.subscribeToState();
    }

    // DOM 요소 캐싱
    cacheElements() {
        return {
            playerHp: document.getElementById('playerHp'),
            playerEnergy: document.getElementById('playerEnergy'),
            playerBlock: document.getElementById('playerBlock'),
            currentStage: document.getElementById('currentStage'),
            deckCount: document.getElementById('deckCount'),
            discardCount: document.getElementById('discardCount'),
            enemyArea: document.getElementById('enemyArea'),
            handArea: document.getElementById('handArea'),
            endTurnBtn: document.getElementById('endTurnBtn'),
            gameOverModal: document.getElementById('gameOverModal'),
            cardListModal: document.getElementById('cardListModal'),
            gameContainer: document.getElementById('gameContainer'),
            battlefield: document.querySelector('.battlefield'),
            topUI: document.querySelector('.top-ui')
        };
    }

    // 상태 변경 구독
    subscribeToState() {
        // 플레이어 상태 변경 감지
        this.stateManager.subscribe('player', (player) => {
            this.renderer.updatePlayerUI(player);
        });

        // 적 상태 변경 감지
        this.stateManager.subscribe('enemies', (enemies) => {
            this.renderer.renderEnemies(enemies);
        });

        // 손패 상태 변경 감지
        this.stateManager.subscribe('hand', (hand) => {
            const player = this.stateManager.getState('player');
            this.renderer.renderHand(hand, player.energy);
        });
    }

    // === 이벤트 관련 메서드 위임 ===
    emit(eventName, data) {
        return this.eventManager.emit(eventName, data);
    }

    on(eventName, handler) {
        return this.eventManager.on(eventName, handler);
    }

    // === 렌더링 관련 메서드 위임 ===
    updateUI(player, deck, discardPile, stage) {
        return this.renderer.updateUI(player, deck, discardPile, stage);
    }

    renderEnemies(enemies) {
        return this.renderer.renderEnemies(enemies);
    }

    renderHand(hand, playerEnergy) {
        return this.renderer.renderHand(hand, playerEnergy);
    }

    clearSelections() {
        return this.renderer.clearSelections();
    }

    highlightEnemies() {
        return this.renderer.highlightEnemies();
    }

    selectCard(index) {
        return this.renderer.selectCard(index);
    }

    selectEnemy(index) {
        return this.renderer.selectEnemy(index);
    }

    showRewardCards(rewardCards, onCardSelect) {
        return this.renderer.showRewardCards(rewardCards, onCardSelect);
    }

    setEndTurnButtonDisabled(disabled) {
        return this.renderer.setEndTurnButtonDisabled(disabled);
    }

    // === 애니메이션 관련 메서드 위임 ===
    showPlayerDamage(damage) {
        return this.animationManager.showPlayerDamage(damage);
    }

    animateEnemyAttack(enemyIndex) {
        return this.animationManager.animateEnemyAttack(enemyIndex);
    }

    // === 모달 관련 메서드 위임 ===
    showGameOverModal(victory, stage, showRewards = false) {
        return this.modalManager.showGameOverModal(victory, stage, showRewards);
    }

    hideGameOverModal() {
        return this.modalManager.hideGameOverModal();
    }

    showCardListModal(title, cards) {
        return this.modalManager.showCardListModal(title, (grid) => {
            this.renderer.renderCardList(grid, cards);
        });
    }

    closeCardListModal() {
        return this.modalManager.closeCardListModal();
    }

    // === 스테이지 맵 관련 메서드 위임 ===
    showStageSelectModal(stageData, availableStages, completedStages, onStageSelect) {
        return this.stageMapRenderer.showStageSelectModal(
            stageData,
            availableStages,
            completedStages,
            onStageSelect
        );
    }
}

export default UIManager;
