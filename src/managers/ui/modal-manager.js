// 모달 관리 클래스
class ModalManager {
    constructor(elements) {
        this.elements = elements;
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

    // 카드 리스트 모달 표시
    showCardListModal(title, renderCallback) {
        const modal = this.elements.cardListModal;
        const titleEl = document.getElementById('cardListTitle');
        const grid = document.getElementById('cardGrid');

        if (titleEl) titleEl.textContent = title;
        if (grid) renderCallback(grid);
        if (modal) modal.style.display = 'flex';
    }

    // 카드 리스트 모달 닫기
    closeCardListModal() {
        if (this.elements.cardListModal) {
            this.elements.cardListModal.style.display = 'none';
        }
    }
}

export default ModalManager;
