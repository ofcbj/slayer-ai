// UI 관련 로직
class UIManager {
    constructor() {
        this.selectedCard = null;
        this.selectedEnemy = null;
    }

    updateUI(player, deck, discardPile, stage) {
        document.getElementById('playerHp').textContent = player.hp;
        document.getElementById('playerEnergy').textContent = player.energy;
        document.getElementById('playerBlock').textContent = player.block;
        document.getElementById('deckCount').textContent = deck.length;
        document.getElementById('discardCount').textContent = discardPile.length;
        document.getElementById('currentStage').textContent = stage;
    }

    renderEnemies(enemies) {
        const enemyArea = document.getElementById('enemyArea');
        enemyArea.innerHTML = '';
        
        enemies.forEach((enemy, index) => {
            if (enemy.hp <= 0) return;
            
            const enemyEl = document.createElement('div');
            enemyEl.className = 'enemy';
            enemyEl.onclick = () => this.selectEnemy(index);
            
            enemyEl.innerHTML = `
                <div class="enemy-image">${enemy.image}</div>
                <div class="enemy-name">${enemy.name}</div>
                <div class="enemy-hp">${enemy.hp}/${enemy.maxHp}</div>
                <div class="enemy-intent">${enemy.intent}</div>
            `;
            
            enemyArea.appendChild(enemyEl);
        });
    }

    renderHand(hand, playerEnergy) {
        const handArea = document.getElementById('handArea');
        handArea.innerHTML = '';
        
        hand.forEach((card, index) => {
            const cardEl = document.createElement('div');
            cardEl.className = 'card';
            if (card.cost > playerEnergy) {
                cardEl.classList.add('unusable');
            }
            
            cardEl.onclick = () => this.selectCard(index);
            
            cardEl.innerHTML = `
                <div class="card-cost">${card.cost}</div>
                <div class="card-image">${card.image}</div>
                <div class="card-name">${card.name}</div>
                <div class="card-type">${card.type}</div>
                <div class="card-description">${card.description}</div>
            `;
            
            handArea.appendChild(cardEl);
        });
    }

    selectCard(index) {
        return index;
    }

    selectEnemy(index) {
        return index;
    }

    clearSelections() {
        document.querySelectorAll('.card').forEach(el => el.classList.remove('selected'));
        document.querySelectorAll('.enemy').forEach(el => {
            el.classList.remove('targeted');
            el.style.border = '3px solid #8b5cf6';
        });
        
        this.selectedCard = null;
        this.selectedEnemy = null;
    }

    highlightEnemies() {
        document.querySelectorAll('.enemy').forEach(el => {
            el.style.border = '3px solid #fbbf24';
        });
    }

    showDamageIndicator(damage, isAllEnemies = false) {
        const indicator = document.createElement('div');
        indicator.className = 'damage-indicator';
        indicator.textContent = `-${damage}`;
        
        if (isAllEnemies) {
            document.querySelectorAll('.enemy').forEach(enemyEl => {
                const clonedIndicator = indicator.cloneNode(true);
                enemyEl.appendChild(clonedIndicator);
                setTimeout(() => clonedIndicator.remove(), 1500);
            });
        } else {
            const targetedEnemy = document.querySelector('.enemy.targeted');
            if (targetedEnemy) {
                targetedEnemy.appendChild(indicator);
                setTimeout(() => indicator.remove(), 1500);
            }
        }
    }

    showPlayerDamage(damage) {
        const indicator = document.createElement('div');
        indicator.className = 'player-damage';
        indicator.textContent = `-${damage}`;
        
        const playerStats = document.querySelector('.player-stats');
        playerStats.style.position = 'relative';
        playerStats.appendChild(indicator);
        
        setTimeout(() => indicator.remove(), 2000);
    }

    animateEnemyAttack(enemyIndex, enemy) {
        const enemyElements = document.querySelectorAll('.enemy');
        const enemyEl = enemyElements[enemyIndex];
        
        if (!enemyEl) return;
        
        enemyEl.classList.add('attacking');
        
        setTimeout(() => {
            document.querySelector('.battlefield').classList.add('shake');
            document.querySelector('.top-ui').classList.add('hit');
        }, 400);
        
        setTimeout(() => {
            enemyEl.classList.remove('attacking');
            document.querySelector('.battlefield').classList.remove('shake');
            document.querySelector('.top-ui').classList.remove('hit');
        }, 1000);
    }

    showGameOverModal(victory, stage, showRewards = false) {
        const modal = document.getElementById('gameOverModal');
        const title = document.getElementById('gameOverTitle');
        const message = document.getElementById('gameOverMessage');
        const rewardSection = document.getElementById('rewardSection');
        const modalButton = document.getElementById('modalButton');
        
        if (victory) {
            title.textContent = `스테이지 ${stage} 클리어!`;
            title.className = 'modal-title victory';
            message.textContent = '모든 적을 물리쳤습니다!';
            
            if (showRewards) {
                rewardSection.style.display = 'block';
                modalButton.style.display = 'none';
            } else {
                rewardSection.style.display = 'none';
                modalButton.style.display = 'block';
            }
        } else {
            title.textContent = '패배...';
            title.className = 'modal-title defeat';
            message.textContent = '다시 도전해보세요!';
            rewardSection.style.display = 'none';
            modalButton.style.display = 'block';
        }
        
        modal.style.display = 'flex';
    }

    hideGameOverModal() {
        document.getElementById('gameOverModal').style.display = 'none';
    }

    showRewardCards(rewardCards, onCardSelect) {
        const rewardCardsContainer = document.getElementById('rewardCards');
        rewardCardsContainer.innerHTML = '';
        
        rewardCards.forEach((card) => {
            const cardEl = document.createElement('div');
            cardEl.className = 'reward-card';
            cardEl.onclick = () => onCardSelect(card);
            
            cardEl.innerHTML = `
                <div class="card-cost">${card.cost}</div>
                <div class="card-image">${card.image}</div>
                <div class="card-name">${card.name}</div>
                <div class="card-type">${card.type}</div>
                <div class="card-description">${card.description}</div>
            `;
            
            rewardCardsContainer.appendChild(cardEl);
        });
    }

    showDeckModal(deck) {
        const modal = document.getElementById('cardListModal');
        const title = document.getElementById('cardListTitle');
        const grid = document.getElementById('cardGrid');
        
        title.textContent = `덱 카드 목록 (${deck.length}장)`;
        this.renderCardList(grid, deck);
        modal.style.display = 'flex';
    }

    showDiscardModal(discardPile) {
        const modal = document.getElementById('cardListModal');
        const title = document.getElementById('cardListTitle');
        const grid = document.getElementById('cardGrid');
        
        title.textContent = `버린 카드 목록 (${discardPile.length}장)`;
        this.renderCardList(grid, discardPile);
        modal.style.display = 'flex';
    }

    renderCardList(container, cardArray) {
        container.innerHTML = '';
        
        if (cardArray.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #94a3b8; grid-column: 1/-1;">카드가 없습니다.</p>';
            return;
        }
        
        cardArray.forEach(card => {
            const cardEl = document.createElement('div');
            cardEl.className = 'card-preview';
            
            cardEl.innerHTML = `
                <div class="card-cost">${card.cost}</div>
                <div class="card-image">${card.image}</div>
                <div class="card-name">${card.name}</div>
                <div class="card-type">${card.type}</div>
                <div class="card-description">${card.description}</div>
            `;
            
            container.appendChild(cardEl);
        });
    }

    closeCardListModal() {
        document.getElementById('cardListModal').style.display = 'none';
    }

    setEndTurnButtonDisabled(disabled) {
        document.getElementById('endTurnBtn').disabled = disabled;
    }

    showStageSelectModal(stageData, availableStages, completedStages, onStageSelect) {
        // 스테이지 선택 모달 생성
        const modal = document.createElement('div');
        modal.className = 'stage-select-modal';
        modal.innerHTML = `
            <div class="stage-select-content">
                <div class="stage-select-title">스테이지 선택</div>
                <div class="stage-map" id="stageMap"></div>
                <button class="close-stage-modal-btn" onclick="this.parentElement.parentElement.remove()">닫기</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 스테이지 맵 렌더링
        this.renderStageMap(stageData, availableStages, completedStages, onStageSelect);
    }

    renderStageMap(stageData, availableStages, completedStages, onStageSelect) {
        const stageMap = document.getElementById('stageMap');
        stageMap.innerHTML = '';
        
        // 스테이지들을 그리드로 배치
        const stages = Object.keys(stageData).map(id => ({ id: parseInt(id), ...stageData[id] }));
        stages.sort((a, b) => a.id - b.id);
        
        stages.forEach(stage => {
            const stageEl = document.createElement('div');
            stageEl.className = 'stage-node';
            stageEl.dataset.stageId = stage.id;
            
            // 스테이지 상태에 따른 클래스 추가
            if (completedStages.has(stage.id)) {
                stageEl.classList.add('completed');
            } else if (availableStages.has(stage.id)) {
                stageEl.classList.add('available');
            } else {
                stageEl.classList.add('locked');
            }
            
            // 스테이지 타입에 따른 클래스 추가
            stageEl.classList.add(stage.type);
            
            stageEl.innerHTML = `
                <div class="stage-icon">${this.getStageIcon(stage.type)}</div>
                <div class="stage-name">${stage.name}</div>
                <div class="stage-description">${stage.description}</div>
            `;
            
            // 클릭 이벤트 추가
            if (availableStages.has(stage.id)) {
                stageEl.onclick = () => {
                    onStageSelect(stage.id);
                    document.querySelector('.stage-select-modal').remove();
                };
            }
            
            stageMap.appendChild(stageEl);
        });
        
        // 연결선 그리기
        this.drawStageConnections(stageData);
    }

    getStageIcon(type) {
        switch(type) {
            case '일반': return '⚔️';
            case '중보스': return '👹';
            case '보스': return '👑';
            default: return '❓';
        }
    }

    drawStageConnections(stageData) {
        const stageMap = document.getElementById('stageMap');
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.className = 'stage-connections';
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '1';
        
        Object.keys(stageData).forEach(stageId => {
            const stage = stageData[stageId];
            if (stage.nextStages) {
                stage.nextStages.forEach(nextStageId => {
                    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    line.setAttribute('x1', '50%');
                    line.setAttribute('y1', '50%');
                    line.setAttribute('x2', '50%');
                    line.setAttribute('y2', '50%');
                    line.setAttribute('stroke', '#8b5cf6');
                    line.setAttribute('stroke-width', '3');
                    line.setAttribute('stroke-dasharray', '5,5');
                    line.classList.add('connection-line');
                    line.dataset.from = stageId;
                    line.dataset.to = nextStageId;
                    svg.appendChild(line);
                });
            }
        });
        
        stageMap.appendChild(svg);
        
        // 연결선 위치 업데이트
        setTimeout(() => this.updateConnectionPositions(), 100);
    }

    updateConnectionPositions() {
        const connections = document.querySelectorAll('.connection-line');
        connections.forEach(line => {
            const fromStage = document.querySelector(`[data-stage-id="${line.dataset.from}"]`);
            const toStage = document.querySelector(`[data-stage-id="${line.dataset.to}"]`);
            
            if (fromStage && toStage) {
                const fromRect = fromStage.getBoundingClientRect();
                const toRect = toStage.getBoundingClientRect();
                const mapRect = document.getElementById('stageMap').getBoundingClientRect();
                
                const fromX = (fromRect.left + fromRect.width / 2 - mapRect.left) / mapRect.width * 100;
                const fromY = (fromRect.top + fromRect.height / 2 - mapRect.top) / mapRect.height * 100;
                const toX = (toRect.left + toRect.width / 2 - mapRect.left) / mapRect.width * 100;
                const toY = (toRect.top + toRect.height / 2 - mapRect.top) / mapRect.height * 100;
                
                line.setAttribute('x1', fromX + '%');
                line.setAttribute('y1', fromY + '%');
                line.setAttribute('x2', toX + '%');
                line.setAttribute('y2', toY + '%');
            }
        });
    }
}
