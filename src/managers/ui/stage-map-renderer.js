import { createElement } from '../../utils/helpers.js';

// 스테이지 맵 렌더링 클래스
class StageMapRenderer {
    constructor(elements) {
        this.elements = elements;
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

    // 스테이지 맵 렌더링
    renderStageMap(stageData, availableStages, completedStages, onStageSelect) {
        const stageMap = document.getElementById('stageMap');
        if (!stageMap) return;

        stageMap.innerHTML = '';

        const stageTree = this.buildStageTree(stageData);

        stageTree.forEach((level, levelIndex) => {
            const levelContainer = createElement('div', 'stage-level');
            levelContainer.style.gridRow = levelIndex + 1;

            level.forEach(stage => {
                const stageEl = this.createStageNode(
                    stage,
                    availableStages,
                    completedStages,
                    onStageSelect
                );
                levelContainer.appendChild(stageEl);
            });

            stageMap.appendChild(levelContainer);
        });

        this.drawStageConnections(stageData);
    }

    // 스테이지 노드 생성
    createStageNode(stage, availableStages, completedStages, onStageSelect) {
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

        return stageEl;
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

        // 화살표 마커 추가
        const defs = this.createArrowMarker();
        svg.appendChild(defs);

        // 연결선 추가
        Object.keys(stageData).forEach(stageId => {
            const stage = stageData[stageId];
            if (stage.nextStages) {
                stage.nextStages.forEach(nextStageId => {
                    const line = this.createConnectionLine(stageId, nextStageId);
                    svg.appendChild(line);
                });
            }
        });

        stageMap.appendChild(svg);

        setTimeout(() => this.updateConnectionPositions(), 100);
    }

    // 화살표 마커 생성
    createArrowMarker() {
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

        return defs;
    }

    // 연결선 생성
    createConnectionLine(fromStageId, toStageId) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('stroke', '#8b5cf6');
        line.setAttribute('stroke-width', '4');
        line.setAttribute('stroke-dasharray', '8,4');
        line.setAttribute('marker-end', 'url(#arrowhead)');
        line.setAttribute('class', 'connection-line');
        line.setAttribute('data-from', fromStageId);
        line.setAttribute('data-to', toStageId);
        return line;
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

export default StageMapRenderer;
