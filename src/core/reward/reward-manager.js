import { clamp } from '../../utils/helpers.js';

// 보상 관리 클래스
class RewardManager {
    constructor(stateManager, cardManager, stageManager) {
        this.stateManager = stateManager;
        this.cardManager = cardManager;
        this.stageManager = stageManager;
    }

    // 보상 카드 개수 계산
    getRewardCardCount() {
        const stageInfo = this.stageManager.getCurrentStageInfo();

        let rewardCount = 3;
        if (stageInfo.type === "중보스") {
            rewardCount = 4;
        } else if (stageInfo.type === "보스") {
            rewardCount = 5;
        }

        return rewardCount;
    }

    // 보상 카드 가져오기
    getRewardCards() {
        const count = this.getRewardCardCount();
        return this.cardManager.getRandomRewardCards(count);
    }

    // 보상 카드 선택
    selectRewardCard(selectedCard) {
        const state = this.stateManager.getState();
        const stageInfo = this.stageManager.getCurrentStageInfo();

        // 덱에 카드 추가
        const deck = [...state.deck, ...state.hand, ...state.discardPile, selectedCard];

        // 체력 회복
        const healAmount = this.getHealAmount(stageInfo);
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

        return true;
    }

    // 치유량 계산
    getHealAmount(stageInfo) {
        let healAmount = 0.25; // 기본 25%

        if (stageInfo.type === "중보스") {
            healAmount = 0.4; // 40%
        } else if (stageInfo.type === "보스") {
            healAmount = 0.6; // 60%
        }

        return healAmount;
    }
}

export default RewardManager;
