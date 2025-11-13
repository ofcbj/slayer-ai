import { delegate } from '../../utils/helpers.js';

// 이벤트 관리 클래스
class EventManager {
    constructor() {
        this.eventHandlers = new Map();
    }

    // 이벤트 위임 초기화
    initEventDelegation(elements) {
        // 카드 클릭 이벤트 (이벤트 위임)
        if (elements.handArea) {
            delegate(elements.handArea, '.card', 'click', (event) => {
                const cardElement = event.target.closest('.card');
                const index = Array.from(elements.handArea.children).indexOf(cardElement);
                this.emit('card:select', index);
            });
        }

        // 적 클릭 이벤트 (이벤트 위임)
        if (elements.enemyArea) {
            delegate(elements.enemyArea, '.enemy', 'click', (event) => {
                const enemyElement = event.target.closest('.enemy');
                const index = Array.from(elements.enemyArea.children).indexOf(enemyElement);
                this.emit('enemy:select', index);
            });
        }
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

    // 모든 리스너 제거
    clear() {
        this.eventHandlers.clear();
    }
}

export default EventManager;
