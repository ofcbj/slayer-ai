import DataLoader from './utils/data-loader.js';
import GameEngine from './core/game-engine-refactored.js';

// 메인 진입점 (리팩토링 버전)
class Application {
    constructor() {
        this.gameEngine = null;
        this.dataLoader = new DataLoader();
    }

    async init() {
        try {
            // 로딩 표시
            this.showLoading();

            // 게임 데이터 로드
            const gameData = await this.dataLoader.loadAllGameData();

            // 게임 엔진 초기화 (리팩토링된 버전)
            this.gameEngine = new GameEngine(gameData);

            // 전역 참조 (버튼 onclick에서 사용)
            window.gameEngine = this.gameEngine;

            // 로딩 숨김
            this.hideLoading();

            console.log('✅ 게임이 성공적으로 초기화되었습니다 (리팩토링 버전).');
            console.log('📦 모듈 구조:');
            console.log('  - UIManager: 5개 서브모듈로 분리');
            console.log('  - GameEngine: 4개 서브모듈로 분리');
        } catch (error) {
            console.error('게임 초기화 실패:', error);
            this.showError('게임을 로드하는데 실패했습니다. 페이지를 새로고침해주세요.');
        }
    }

    showLoading() {
        const loadingEl = document.createElement('div');
        loadingEl.id = 'loading-screen';
        loadingEl.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(15, 23, 42, 0.95);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            z-index: 9999;
            color: white;
            font-size: 24px;
        `;
        loadingEl.innerHTML = `
            <div>🎮</div>
            <div style="margin-top: 20px;">게임 로딩 중...</div>
            <div style="margin-top: 10px; font-size: 14px; color: #94a3b8;">리팩토링 버전</div>
        `;
        document.body.appendChild(loadingEl);
    }

    hideLoading() {
        const loadingEl = document.getElementById('loading-screen');
        if (loadingEl) {
            loadingEl.remove();
        }
    }

    showError(message) {
        this.hideLoading();
        const errorEl = document.createElement('div');
        errorEl.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #dc2626;
            color: white;
            padding: 20px 40px;
            border-radius: 8px;
            z-index: 10000;
        `;
        errorEl.textContent = message;
        document.body.appendChild(errorEl);
    }
}

// DOM이 로드되면 앱 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const app = new Application();
        app.init();
    });
} else {
    const app = new Application();
    app.init();
}

export default Application;
