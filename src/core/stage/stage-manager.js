// 스테이지 관리 클래스
class StageManager {
    constructor(gameData, stateManager) {
        this.gameData = gameData;
        this.stateManager = stateManager;
    }

    // 스테이지 시작
    startStage(stageId) {
        this.stateManager.setState({ currentStageId: stageId });
        this.initEnemiesForStage(stageId);
        return true;
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

    // 스테이지 완료 처리
    completeStage() {
        const state = this.stateManager.getState();

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
    }

    // 스테이지 정보 가져오기
    getStageInfo(stageId) {
        return this.gameData.stages[stageId] || null;
    }

    // 현재 스테이지 정보
    getCurrentStageInfo() {
        const currentStageId = this.stateManager.getState('currentStageId');
        return this.getStageInfo(currentStageId);
    }
}

export default StageManager;
