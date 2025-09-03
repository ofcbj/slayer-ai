// 메인 게임 로직
class GameEngine {
    constructor() {
        this.player = {
            hp: 80,
            maxHp: 80,
            energy: 3,
            maxEnergy: 3,
            block: 0
        };
        
        this.enemies = [];
        this.deck = [];
        this.hand = [];
        this.discardPile = [];
        this.gameOver = false;
        this.currentStageId = 1;
        this.completedStages = new Set();
        this.availableStages = new Set([1]); // 처음에는 스테이지 1만 선택 가능
        
        // 매니저들 초기화
        this.cardManager = new CardManager();
        this.uiManager = new UIManager();
        
        this.initStageData();
        this.initCards();
        this.showStageSelect();
    }
    
    initStageData() {
        // 스테이지 데이터 정의 (슬레이더 스파이어 스타일)
        this.stageData = {
            1: { name: "고블린 소굴", type: "일반", enemies: ["고블린 전사", "오크 방패병", "마법사"], nextStages: [2, 3], description: "초보자용 던전" },
            2: { name: "오크 요새", type: "일반", enemies: ["강화 고블린", "엘리트 오크", "대마법사"], nextStages: [4, 5], description: "오크들의 거점" },
            3: { name: "마법사의 탑", type: "일반", enemies: ["마법사", "마법 골렘", "마법사"], nextStages: [4, 6], description: "신비로운 마법의 탑" },
            4: { name: "중보스: 드래곤 라이더", type: "중보스", enemies: ["드래곤 라이더"], nextStages: [7, 8], description: "강력한 드래곤 라이더" },
            5: { name: "어둠의 숲", type: "일반", enemies: ["어둠의 늑대", "그림자 마법사", "어둠의 늑대"], nextStages: [7], description: "어둠이 깃든 숲" },
            6: { name: "불의 동굴", type: "일반", enemies: ["화염 정령", "용암 골렘", "화염 정령"], nextStages: [8], description: "불꽃이 타오르는 동굴" },
            7: { name: "중보스: 그림자 군주", type: "중보스", enemies: ["그림자 군주"], nextStages: [9], description: "어둠의 힘을 다루는 군주" },
            8: { name: "중보스: 화염 대마법사", type: "중보스", enemies: ["화염 대마법사"], nextStages: [9], description: "불꽃의 마법을 구사하는 대마법사" },
            9: { name: "최종 던전", type: "일반", enemies: ["고대 수호자", "마법 기사", "고대 수호자"], nextStages: [10], description: "최종 보스로 가는 길" },
            10: { name: "최종 보스: 마왕", type: "보스", enemies: ["마왕"], nextStages: [], description: "모든 악의 근원, 마왕" }
        };
    }
    
    initCards() {
        // 덱을 기본 카드로 초기화
        this.deck = [...this.cardManager.basicCards];
        this.cardManager.shuffleDeck(this.deck);
    }
    
    showStageSelect() {
        this.uiManager.showStageSelectModal(this.stageData, this.availableStages, this.completedStages, (stageId) => {
            this.startStage(stageId);
        });
    }
    
    startStage(stageId) {
        this.currentStageId = stageId;
        this.initEnemiesForStage(stageId);
        this.startGame();
    }
    
    initEnemiesForStage(stageId) {
        const stageInfo = this.stageData[stageId];
        if (!stageInfo) return;
        
        this.enemies = [];
        const enemyTypes = stageInfo.enemies;
        
        // 적 데이터 정의
        const enemyData = {
            "고블린 전사": { hp: 25, attack: 7, image: "👹", intent: "공격 예정 (7 피해)" },
            "오크 방패병": { hp: 35, attack: 5, defense: 8, image: "🛡️", intent: "공격 + 방어 (5 피해, 8 방어)" },
            "마법사": { hp: 20, attack: 12, image: "🧙‍♂️", intent: "화염구 (12 피해)" },
            "강화 고블린": { hp: 35, attack: 10, image: "👺", intent: "강타 예정 (10 피해)" },
            "엘리트 오크": { hp: 50, attack: 8, defense: 12, image: "🛡️", intent: "공격 + 방어 (8 피해, 12 방어)" },
            "대마법사": { hp: 30, attack: 15, image: "🧙‍♂️", intent: "번개 (15 피해)" },
            "마법 골렘": { hp: 60, attack: 12, defense: 10, image: "🗿", intent: "강타 (12 피해, 10 방어)" },
            "드래곤 라이더": { hp: 80, attack: 18, defense: 15, image: "🐉", intent: "드래곤 브레스 (18 피해, 15 방어)", isBoss: true },
            "어둠의 늑대": { hp: 30, attack: 10, image: "🐺", intent: "어둠의 발톱 (10 피해)" },
            "그림자 마법사": { hp: 25, attack: 14, image: "🌑", intent: "그림자 화살 (14 피해)" },
            "화염 정령": { hp: 28, attack: 11, image: "🔥", intent: "화염 폭발 (11 피해)" },
            "용암 골렘": { hp: 70, attack: 16, defense: 12, image: "🌋", intent: "용암 타격 (16 피해, 12 방어)" },
            "그림자 군주": { hp: 100, attack: 20, defense: 20, image: "👑", intent: "그림자 폭풍 (20 피해, 20 방어)", isBoss: true },
            "화염 대마법사": { hp: 90, attack: 22, image: "🔥🧙‍♂️", intent: "메테오 (22 피해)", isBoss: true },
            "고대 수호자": { hp: 60, attack: 14, defense: 18, image: "🛡️", intent: "고대의 방어 (14 피해, 18 방어)" },
            "마법 기사": { hp: 55, attack: 16, defense: 14, image: "⚔️", intent: "마법 검술 (16 피해, 14 방어)" },
            "마왕": { hp: 150, attack: 25, defense: 25, image: "👹👑", intent: "마왕의 분노 (25 피해, 25 방어)", isBoss: true, isFinalBoss: true }
        };
        
        enemyTypes.forEach(enemyName => {
            const data = enemyData[enemyName];
            if (data) {
                const enemy = {
                    name: enemyName,
                    hp: data.hp,
                    maxHp: data.hp,
                    attack: data.attack,
                    defense: data.defense || 0,
                    image: data.image,
                    intent: data.intent,
                    isBoss: data.isBoss || false,
                    isFinalBoss: data.isFinalBoss || false,
                    turnCount: 0,
                    specialPattern: data.isBoss ? this.getBossPattern(enemyName) : null
                };
                this.enemies.push(enemy);
            }
        });
    }
    
    getBossPattern(bossName) {
        const patterns = {
            "드래곤 라이더": [
                { turn: 1, action: "attack", damage: 18, defense: 15, intent: "드래곤 브레스 (18 피해, 15 방어)" },
                { turn: 2, action: "charge", damage: 0, defense: 25, intent: "차지 중... (25 방어)" },
                { turn: 3, action: "devastate", damage: 35, defense: 0, intent: "파괴의 일격 (35 피해)" }
            ],
            "그림자 군주": [
                { turn: 1, action: "shadow_blast", damage: 20, defense: 20, intent: "그림자 폭풍 (20 피해, 20 방어)" },
                { turn: 2, action: "summon", damage: 0, defense: 0, intent: "그림자 소환" },
                { turn: 3, action: "dark_ritual", damage: 15, defense: 30, intent: "어둠의 의식 (15 피해, 30 방어)" }
            ],
            "화염 대마법사": [
                { turn: 1, action: "meteor", damage: 22, defense: 0, intent: "메테오 (22 피해)" },
                { turn: 2, action: "fire_shield", damage: 0, defense: 20, intent: "화염 방패 (20 방어)" },
                { turn: 3, action: "inferno", damage: 30, defense: 0, intent: "지옥불 (30 피해)" }
            ],
            "마왕": [
                { turn: 1, action: "dark_power", damage: 25, defense: 25, intent: "마왕의 분노 (25 피해, 25 방어)" },
                { turn: 2, action: "curse", damage: 0, defense: 0, intent: "저주 시전" },
                { turn: 3, action: "apocalypse", damage: 40, defense: 0, intent: "종말의 일격 (40 피해)" },
                { turn: 4, action: "regenerate", damage: 0, defense: 0, intent: "재생 중..." }
            ]
        };
        return patterns[bossName] || null;
    }
    
    startGame() {
        this.gameOver = false;
        this.hand = [];
        this.cardManager.drawCards(this.deck, this.hand, this.discardPile, 5);
        this.updateUI();
        this.uiManager.renderEnemies(this.enemies);
        this.uiManager.renderHand(this.hand, this.player.energy);
    }
    
    selectCard(index) {
        if (this.hand[index].cost > this.player.energy || this.gameOver) return;
        
        this.uiManager.clearSelections();
        
        this.uiManager.selectedCard = index;
        document.querySelectorAll('.card')[index].classList.add('selected');
        
        const card = this.hand[index];
        if (card.damage || card.hits) {
            this.uiManager.highlightEnemies();
        } else {
            this.playCard();
        }
    }
    
    selectEnemy(index) {
        if (this.uiManager.selectedCard === null) return;
        
        document.querySelectorAll('.enemy').forEach(el => el.classList.remove('targeted'));
        
        this.uiManager.selectedEnemy = index;
        document.querySelectorAll('.enemy')[index].classList.add('targeted');
        
        this.playCard();
    }
    
    playCard() {
        if (this.uiManager.selectedCard === null) return;
        
        const card = this.hand[this.uiManager.selectedCard];
        
        this.player.energy -= card.cost;
        
        const gameState = {
            player: this.player,
            enemies: this.enemies,
            selectedEnemy: this.uiManager.selectedEnemy
        };
        
        this.cardManager.executeCardEffect(card, gameState);
        
        this.discardPile.push(this.hand[this.uiManager.selectedCard]);
        this.hand.splice(this.uiManager.selectedCard, 1);
        
        this.uiManager.selectedCard = null;
        this.uiManager.selectedEnemy = null;
        
        this.updateUI();
        this.uiManager.renderHand(this.hand, this.player.energy);
        this.uiManager.renderEnemies(this.enemies);
        
        this.checkEnemyDeaths();
        
        if (this.enemies.every(e => e.hp <= 0)) {
            this.endGame(true);
        }
    }
    
    checkEnemyDeaths() {
        this.enemies = this.enemies.filter(enemy => enemy.hp > 0);
    }
    
    endTurn() {
        if (this.gameOver) return;
        
        this.uiManager.setEndTurnButtonDisabled(true);
        
        this.discardPile.push(...this.hand);
        this.hand = [];
        
        this.enemyTurn();
        
        const totalEnemyTurnTime = this.enemies.filter(e => e.hp > 0).length * 1200;
        setTimeout(() => {
            if (!this.gameOver) {
                this.startNewTurn();
                this.uiManager.setEndTurnButtonDisabled(false);
            }
        }, totalEnemyTurnTime + 500);
    }
    
    enemyTurn() {
        let totalDelay = 0;
        
        this.enemies.forEach((enemy, index) => {
            if (enemy.hp <= 0) return;
            
            // 보스 패턴 처리
            if (enemy.isBoss && enemy.specialPattern) {
                enemy.turnCount++;
                const patternIndex = (enemy.turnCount - 1) % enemy.specialPattern.length;
                const pattern = enemy.specialPattern[patternIndex];
                
                // 보스의 intent 업데이트
                enemy.intent = pattern.intent;
                enemy.attack = pattern.damage;
                enemy.defense = pattern.defense;
            }
            
            setTimeout(() => {
                this.animateEnemyAttack(index, enemy);
            }, totalDelay);
            
            totalDelay += 1200;
        });
    }
    
    animateEnemyAttack(enemyIndex, enemy) {
        this.uiManager.animateEnemyAttack(enemyIndex, enemy);
        
        setTimeout(() => {
            // 보스 특별 행동 처리
            if (enemy.isBoss && enemy.specialPattern) {
                const patternIndex = (enemy.turnCount - 1) % enemy.specialPattern.length;
                const pattern = enemy.specialPattern[patternIndex];
                
                this.handleBossAction(enemy, pattern);
            } else {
                // 일반 적 행동
                const damage = Math.max(0, enemy.attack - this.player.block);
                this.player.hp -= damage;
                this.player.block = Math.max(0, this.player.block - enemy.attack);
                
                if (damage > 0) {
                    this.uiManager.showPlayerDamage(damage);
                }
            }
            
            this.updateUI();
            
            if (this.player.hp <= 0) {
                setTimeout(() => {
                    this.endGame(false);
                }, 500);
                return;
            }
        }, 400);
    }
    
    handleBossAction(enemy, pattern) {
        switch(pattern.action) {
            case "attack":
            case "devastate":
            case "meteor":
            case "inferno":
            case "dark_power":
            case "apocalypse":
                const damage = Math.max(0, pattern.damage - this.player.block);
                this.player.hp -= damage;
                this.player.block = Math.max(0, this.player.block - pattern.damage);
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
                // 그림자 소환 (추가 적 생성)
                this.enemies.push({
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
                break;
                
            case "curse":
                // 저주 - 플레이어의 에너지 감소
                this.player.maxEnergy = Math.max(1, this.player.maxEnergy - 1);
                this.player.energy = Math.min(this.player.energy, this.player.maxEnergy);
                break;
                
            case "regenerate":
                // 재생 - 보스 체력 회복
                enemy.hp = Math.min(enemy.maxHp, enemy.hp + 20);
                break;
        }
    }
    
    startNewTurn() {
        this.player.energy = this.player.maxEnergy;
        this.player.block = 0;
        this.cardManager.drawCards(this.deck, this.hand, this.discardPile, 5);
        this.updateUI();
        this.uiManager.renderHand(this.hand, this.player.energy);
    }
    
    updateUI() {
        this.uiManager.updateUI(this.player, this.deck, this.discardPile, this.currentStageId);
    }
    
    endGame(victory) {
        this.gameOver = true;
        
        if (victory) {
            this.completedStages.add(this.currentStageId);
            // 다음 스테이지들을 사용 가능하게 만들기
            const stageInfo = this.stageData[this.currentStageId];
            if (stageInfo && stageInfo.nextStages) {
                stageInfo.nextStages.forEach(nextStageId => {
                    this.availableStages.add(nextStageId);
                });
            }
            
            this.uiManager.showGameOverModal(true, this.currentStageId, true);
            this.showRewardCards();
        } else {
            this.uiManager.showGameOverModal(false, this.currentStageId);
        }
    }
    
    showRewardCards() {
        const stageInfo = this.stageData[this.currentStageId];
        let rewardCount = 3;
        
        // 보스 스테이지는 더 많은 보상 카드 제공
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
    
    selectRewardCard(selectedCard) {
        this.deck.push(selectedCard);
        
        // 보스 스테이지 클리어 시 더 많은 체력 회복
        const stageInfo = this.stageData[this.currentStageId];
        let healAmount = 0.25; // 기본 25%
        
        if (stageInfo.type === "중보스") {
            healAmount = 0.4; // 40%
        } else if (stageInfo.type === "보스") {
            healAmount = 0.6; // 60%
        }
        
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + Math.floor(this.player.maxHp * healAmount));
        this.player.energy = this.player.maxEnergy;
        this.player.block = 0;
        
        this.deck = this.deck.concat(this.hand, this.discardPile);
        this.hand = [];
        this.discardPile = [];
        this.cardManager.shuffleDeck(this.deck);
        
        this.uiManager.selectedCard = null;
        this.uiManager.selectedEnemy = null;
        this.gameOver = false;
        
        this.uiManager.hideGameOverModal();
        this.showStageSelect();
    }
    
    restartGame() {
        this.player = {
            hp: 80,
            maxHp: 80,
            energy: 3,
            maxEnergy: 3,
            block: 0
        };
        
        this.currentStageId = 1;
        this.completedStages = new Set();
        this.availableStages = new Set([1]);
        this.hand = [];
        this.discardPile = [];
        this.uiManager.selectedCard = null;
        this.uiManager.selectedEnemy = null;
        this.gameOver = false;
        
        this.initCards();
        
        this.uiManager.hideGameOverModal();
        this.showStageSelect();
    }
    
    showDeckModal() {
        this.uiManager.showDeckModal(this.deck);
    }
    
    showDiscardModal() {
        this.uiManager.showDiscardModal(this.discardPile);
    }
    
    closeCardListModal() {
        this.uiManager.closeCardListModal();
    }
}
