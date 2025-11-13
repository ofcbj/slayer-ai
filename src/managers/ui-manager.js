import { createElement, delegate, delay } from '../utils/helpers.js';

// UI 관리 클래스 (리팩토링 버전 - 이벤트 위임 사용)
class UIManager {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.elements = this.cacheElements();
        this.eventHandlers = new Map();
        this.initEventDelegation();
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

    // 이벤트 위임 초기화
    initEventDelegation() {
        // 카드 클릭 이벤트 (이벤트 위임)
        if (this.elements.handArea) {
            delegate(this.elements.handArea, '.card', 'click', (event) => {
                const cardElement = event.target.closest('.card');
                const index = Array.from(this.elements.handArea.children).indexOf(cardElement);
                this.emit('card:select', index);
            });
        }

        // 적 클릭 이벤트 (이벤트 위임)
        if (this.elements.enemyArea) {
            delegate(this.elements.enemyArea, '.enemy', 'click', (event) => {
                const enemyElement = event.target.closest('.enemy');
                const index = Array.from(this.elements.enemyArea.children).indexOf(enemyElement);
                this.emit('enemy:select', index);
            });
        }
    }

    // 상태 변경 구독
    subscribeToState() {
        // 플레이어 상태 변경 감지
        this.stateManager.subscribe('player', (player) => {
            this.updatePlayerUI(player);
        });

        // 적 상태 변경 감지
        this.stateManager.subscribe('enemies', (enemies) => {
            this.renderEnemies(enemies);
        });

        // 손패 상태 변경 감지
        this.stateManager.subscribe('hand', (hand) => {
            const player = this.stateManager.getState('player');
            this.renderHand(hand, player.energy);
        });
    }

    // 이벤트 발행
    emit(eventName, data) {
        if (this.eventHandlers.has(eventName)) {
            this.eventHandlers.get(eventName).forEach(handler => handler(data));
        }
    }

    // 이벤트 리스너 등록
    on(eventName, handler) {
        if (!this.eventHandlers.has(eventName)) {
            this.eventHandlers.set(eventName, []);
        }
        this.eventHandlers.get(eventName).push(handler);

        // 구독 해제 함수 반환
        return () => {
            const handlers = this.eventHandlers.get(eventName);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        };
    }

    // 플레이어 UI 업데이트
    updatePlayerUI(player) {
        if (this.elements.playerHp) {
            this.elements.playerHp.textContent = player.hp;
        }
        if (this.elements.playerEnergy) {
            this.elements.playerEnergy.textContent = player.energy;
        }
        if (this.elements.playerBlock) {
            this.elements.playerBlock.textContent = player.block;
        }
    }

    // 전체 UI 업데이트
    updateUI(player, deck, discardPile, stage) {
        this.updatePlayerUI(player);

        if (this.elements.deckCount) {
            this.elements.deckCount.textContent = deck.length;
        }
        if (this.elements.discardCount) {
            this.elements.discardCount.textContent = discardPile.length;
        }
        if (this.elements.currentStage) {
            this.elements.currentStage.textContent = stage;
        }
    }

    // 적 렌더링
    renderEnemies(enemies) {
        if (!this.elements.enemyArea) return;

        this.elements.enemyArea.innerHTML = '';

        enemies.forEach((enemy, index) => {
            if (enemy.hp <= 0) return;

            const enemyEl = createElement('div', 'enemy');
            enemyEl.dataset.enemyIndex = index;

            enemyEl.innerHTML = `
                <div class="enemy-image">${enemy.image}</div>
                <div class="enemy-name">${enemy.name}</div>
                <div class="enemy-hp">${enemy.hp}/${enemy.maxHp}</div>
                <div class="enemy-intent">${enemy.intent}</div>
            `;

            this.elements.enemyArea.appendChild(enemyEl);
        });
    }

    // 손패 렌더링
    renderHand(hand, playerEnergy) {
        if (!this.elements.handArea) return;

        this.elements.handArea.innerHTML = '';

        hand.forEach((card, index) => {
            const cardEl = createElement('div', 'card');
            cardEl.dataset.cardIndex = index;

            if (card.cost > playerEnergy) {
                cardEl.classList.add('unusable');
            }

            cardEl.innerHTML = `
                <div class="card-cost">${card.cost}</div>
                <div class="card-image">${card.image}</div>
                <div class="card-name">${card.name}</div>
                <div class="card-type">${card.type}</div>
                <div class="card-description">${card.description}</div>
            `;

            this.elements.handArea.appendChild(cardEl);
        });
    }

    // 선택 상태 초기화
    clearSelections() {
        document.querySelectorAll('.card').forEach(el => el.classList.remove('selected'));
        document.querySelectorAll('.enemy').forEach(el => {
            el.classList.remove('targeted');
            el.style.border = '3px solid #8b5cf6';
        });
    }

    // 적 하이라이트
    highlightEnemies() {
        document.querySelectorAll('.enemy').forEach(el => {
            el.style.border = '3px solid #fbbf24';
        });
    }

    // 카드 선택 표시
    selectCard(index) {
        this.clearSelections();
        const cards = document.querySelectorAll('.card');
        if (cards[index]) {
            cards[index].classList.add('selected');
        }
    }

    // 적 선택 표시
    selectEnemy(index) {
        document.querySelectorAll('.enemy').forEach(el => el.classList.remove('targeted'));
        const enemies = document.querySelectorAll('.enemy');
        if (enemies[index]) {
            enemies[index].classList.add('targeted');
        }
    }

    // 플레이어 피해 표시
    async showPlayerDamage(damage) {
        const indicator = createElement('div', 'player-damage');
        indicator.textContent = `-${damage}`;

        if (this.elements.topUI) {
            this.elements.topUI.style.position = 'relative';
            this.elements.topUI.appendChild(indicator);
            await delay(2000);
            indicator.remove();
        }
    }

    // 적 공격 애니메이션
    async animateEnemyAttack(enemyIndex) {
        const enemyElements = document.querySelectorAll('.enemy');
        const enemyEl = enemyElements[enemyIndex];

        if (!enemyEl) return;

        enemyEl.classList.add('attacking');

        await delay(400);

        if (this.elements.battlefield) {
            this.elements.battlefield.classList.add('shake');
        }
        if (this.elements.topUI) {
            this.elements.topUI.classList.add('hit');
        }

        await delay(600);

        enemyEl.classList.remove('attacking');
        if (this.elements.battlefield) {
            this.elements.battlefield.classList.remove('shake');
        }
        if (this.elements.topUI) {
            this.elements.topUI.classList.remove('hit');
        }
    }

    // 게임 오버 모달 표시
    showGameOverModal(victory, stage, showRewards = false) {
        const modal = this.elements.gameOverModal;
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

    // 게임 오버 모달 숨기기
    hideGameOverModal() {
        if (this.elements.gameOverModal) {
            this.elements.gameOverModal.style.display = 'none';
        }
    }

    // 보상 카드 표시
    showRewardCards(rewardCards, onCardSelect) {
        const rewardCardsContainer = document.getElementById('rewardCards');
        if (!rewardCardsContainer) return;

        rewardCardsContainer.innerHTML = '';

        rewardCards.forEach((card) => {
            const cardEl = createElement('div', 'reward-card');
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

    // 턴 종료 버튼 활성화/비활성화
    setEndTurnButtonDisabled(disabled) {
        if (this.elements.endTurnBtn) {
            this.elements.endTurnBtn.disabled = disabled;
        }
    }

    // 덱/버린 카드 모달 표시
    showCardListModal(title, cards) {
        const modal = this.elements.cardListModal;
        const titleEl = document.getElementById('cardListTitle');
        const grid = document.getElementById('cardGrid');

        if (titleEl) titleEl.textContent = title;
        if (grid) this.renderCardList(grid, cards);
        if (modal) modal.style.display = 'flex';
    }

    // 카드 리스트 모달 닫기
    closeCardListModal() {
        if (this.elements.cardListModal) {
            this.elements.cardListModal.style.display = 'none';
        }
    }

    // 카드 리스트 렌더링
    renderCardList(container, cardArray) {
        container.innerHTML = '';

        if (cardArray.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #94a3b8; grid-column: 1/-1;">카드가 없습니다.</p>';
            return;
        }

        cardArray.forEach(card => {
            const cardEl = createElement('div', 'card-preview');

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

    // 스테이지 선택 모달 표시
    showStageSelectModal(stageData, availableStages, completedStages, onStageSelect) {
        // 게임 화면 숨기기
        if (this.elements.gameContainer) {
            this.elements.gameContainer.style.display = 'none';
        }

        // 기존 모달 제거
        const existingModal = document.querySelector('.stage-select-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // 스테이지 선택 모달 생성
        const modal = createElement('div', 'stage-select-modal');
        modal.innerHTML = `
            <div class="stage-select-content">
                <div class="stage-select-title">스테이지 선택</div>
                <div class="stage-map" id="stageMap"></div>
                <button class="close-stage-modal-btn">닫기</button>
            </div>
        `;

        document.body.appendChild(modal);

        // 닫기 버튼 이벤트
        const closeBtn = modal.querySelector('.close-stage-modal-btn');
        closeBtn.onclick = () => {
            modal.remove();
            if (this.elements.gameContainer) {
                this.elements.gameContainer.style.display = 'flex';
            }
        };

        // 스테이지 맵 렌더링
        this.renderStageMap(stageData, availableStages, completedStages, onStageSelect);
    }

    // 스테이지 맵 렌더링 (기존 로직 유지)
    renderStageMap(stageData, availableStages, completedStages, onStageSelect) {
        const stageMap = document.getElementById('stageMap');
        if (!stageMap) return;

        stageMap.innerHTML = '';

        const stageTree = this.buildStageTree(stageData);

        stageTree.forEach((level, levelIndex) => {
            const levelContainer = createElement('div', 'stage-level');
            levelContainer.style.gridRow = levelIndex + 1;

            level.forEach(stage => {
                const stageEl = createElement('div', 'stage-node');
                stageEl.dataset.stageId = stage.id;

                if (completedStages.has(stage.id)) {
                    stageEl.classList.add('completed');
                } else if (availableStages.has(stage.id)) {
                    stageEl.classList.add('available');
                } else {
                    stageEl.classList.add('locked');
                }

                stageEl.classList.add(stage.type);

                stageEl.innerHTML = `
                    <div class="stage-icon">${this.getStageIcon(stage.type)}</div>
                    <div class="stage-name">${stage.name}</div>
                    <div class="stage-description">${stage.description}</div>
                `;

                if (availableStages.has(stage.id)) {
                    stageEl.onclick = () => {
                        onStageSelect(stage.id);
                        document.querySelector('.stage-select-modal').remove();
                        if (this.elements.gameContainer) {
                            this.elements.gameContainer.style.display = 'flex';
                        }
                    };
                }

                levelContainer.appendChild(stageEl);
            });

            stageMap.appendChild(levelContainer);
        });

        this.drawStageConnections(stageData);
    }

    // 스테이지 트리 구축
    buildStageTree(stageData) {
        const stages = Object.keys(stageData).map(id => ({ id: parseInt(id), ...stageData[id] }));
        const stageDepths = new Map();
        const visited = new Set();

        const calculateDepth = (stageId, depth = 0) => {
            if (visited.has(stageId)) return;
            visited.add(stageId);

            const stage = stageData[stageId];
            if (!stage) return;

            stageDepths.set(stageId, depth);

            if (stage.nextStages) {
                stage.nextStages.forEach(nextStageId => {
                    calculateDepth(nextStageId, depth + 1);
                });
            }
        };

        calculateDepth(1);

        const maxDepth = Math.max(...stageDepths.values());
        const stageTree = [];

        for (let depth = maxDepth; depth >= 0; depth--) {
            const levelStages = stages.filter(stage => stageDepths.get(stage.id) === depth);
            if (levelStages.length > 0) {
                stageTree.push(levelStages);
            }
        }

        return stageTree;
    }

    // 스테이지 아이콘 가져오기
    getStageIcon(type) {
        const icons = {
            '일반': '⚔️',
            '중보스': '👹',
            '보스': '👑'
        };
        return icons[type] || '❓';
    }

    // 스테이지 연결선 그리기
    drawStageConnections(stageData) {
        const stageMap = document.getElementById('stageMap');
        if (!stageMap) return;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'stage-connections');
        svg.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1;';

        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', 'arrowhead');
        marker.setAttribute('markerWidth', '10');
        marker.setAttribute('markerHeight', '7');
        marker.setAttribute('refX', '9');
        marker.setAttribute('refY', '3.5');
        marker.setAttribute('orient', 'auto');

        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
        polygon.setAttribute('fill', '#8b5cf6');

        marker.appendChild(polygon);
        defs.appendChild(marker);
        svg.appendChild(defs);

        Object.keys(stageData).forEach(stageId => {
            const stage = stageData[stageId];
            if (stage.nextStages) {
                stage.nextStages.forEach(nextStageId => {
                    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    line.setAttribute('stroke', '#8b5cf6');
                    line.setAttribute('stroke-width', '4');
                    line.setAttribute('stroke-dasharray', '8,4');
                    line.setAttribute('marker-end', 'url(#arrowhead)');
                    line.setAttribute('class', 'connection-line');
                    line.setAttribute('data-from', stageId);
                    line.setAttribute('data-to', nextStageId);
                    svg.appendChild(line);
                });
            }
        });

        stageMap.appendChild(svg);

        setTimeout(() => this.updateConnectionPositions(), 100);
    }

    // 연결선 위치 업데이트
    updateConnectionPositions() {
        const connections = document.querySelectorAll('.connection-line');
        const stageMap = document.getElementById('stageMap');
        if (!stageMap) return;

        const mapRect = stageMap.getBoundingClientRect();

        connections.forEach(line => {
            const fromStage = document.querySelector(`[data-stage-id="${line.getAttribute('data-from')}"]`);
            const toStage = document.querySelector(`[data-stage-id="${line.getAttribute('data-to')}"]`);

            if (fromStage && toStage) {
                const fromRect = fromStage.getBoundingClientRect();
                const toRect = toStage.getBoundingClientRect();

                const fromX = (fromRect.left + fromRect.width / 2 - mapRect.left) / mapRect.width * 100;
                const fromY = (fromRect.top - mapRect.top) / mapRect.height * 100;
                const toX = (toRect.left + toRect.width / 2 - mapRect.left) / mapRect.width * 100;
                const toY = (toRect.bottom - mapRect.top) / mapRect.height * 100;

                line.setAttribute('x1', fromX + '%');
                line.setAttribute('y1', fromY + '%');
                line.setAttribute('x2', toX + '%');
                line.setAttribute('y2', toY + '%');
            }
        });
    }
}

export default UIManager;
