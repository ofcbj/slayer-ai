// 게임 상태 초기화 클래스
class GameStateInitializer {
    constructor(cardManager) {
        this.cardManager = cardManager;
    }

    // 초기 상태 정의
    getInitialState() {
        return {
            player: this.getInitialPlayer(),
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

    // 초기 플레이어 상태
    getInitialPlayer() {
        return {
            hp: 80,
            maxHp: 80,
            energy: 3,
            maxEnergy: 3,
            block: 0
        };
    }

    // 게임 시작 준비
    prepareGameStart(stateManager) {
        const state = stateManager.getState();

        // 덱 초기화 (처음 시작시에만)
        if (state.deck.length === 0) {
            const deck = this.cardManager.createStartingDeck();
            stateManager.setState({ deck });
        }

        // 핸드 초기화 및 카드 뽑기
        const hand = [];
        const deck = [...state.deck];
        const discardPile = [...state.discardPile];

        this.cardManager.drawCards(deck, hand, discardPile, 5);

        stateManager.setState({
            hand,
            deck,
            discardPile,
            gameOver: false
        });
    }

    // 게임 재시작
    resetGame(stateManager) {
        const initialState = this.getInitialState();

        // 덱 초기화
        initialState.deck = this.cardManager.createStartingDeck();

        stateManager.resetState(initialState);
    }
}

export default GameStateInitializer;
