import { createElement, delay } from '../../utils/helpers.js';

// 애니메이션 관리 클래스
class AnimationManager {
    constructor(elements) {
        this.elements = elements;
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

    // 카드 사용 애니메이션 (확장 가능)
    async animateCardPlay(cardIndex) {
        const cards = document.querySelectorAll('.card');
        const cardEl = cards[cardIndex];

        if (!cardEl) return;

        cardEl.style.transform = 'scale(1.1)';
        await delay(150);
        cardEl.style.transform = 'scale(1)';
    }

    // 적 피해 표시 (확장 가능)
    async showEnemyDamage(enemyIndex, damage) {
        const enemies = document.querySelectorAll('.enemy');
        const enemyEl = enemies[enemyIndex];

        if (!enemyEl) return;

        const indicator = createElement('div', 'damage-indicator');
        indicator.textContent = `-${damage}`;
        indicator.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #ff4444;
            font-size: 24px;
            font-weight: bold;
            animation: damageFloat 1s ease-out;
            pointer-events: none;
        `;

        enemyEl.style.position = 'relative';
        enemyEl.appendChild(indicator);

        await delay(1000);
        indicator.remove();
    }
}

export default AnimationManager;
