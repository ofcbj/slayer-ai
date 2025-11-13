import { createElement } from '../../utils/helpers.js';

// 기본 렌더링 클래스
class Renderer {
    constructor(elements) {
        this.elements = elements;
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
}

export default Renderer;
