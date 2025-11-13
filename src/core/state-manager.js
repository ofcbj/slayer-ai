// 상태 관리 클래스 (옵저버 패턴)
class StateManager {
    constructor(initialState = {}) {
        this.state = initialState;
        this.listeners = new Map();
        this.history = [];
        this.maxHistorySize = 50;
    }

    // 상태 가져오기
    getState(key) {
        if (key) {
            return this.state[key];
        }
        return { ...this.state };
    }

    // 상태 설정하기
    setState(updates, shouldNotify = true) {
        const oldState = { ...this.state };
        this.state = { ...this.state, ...updates };

        // 히스토리 저장
        this.history.push({ timestamp: Date.now(), state: oldState });
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }

        // 리스너들에게 알림
        if (shouldNotify) {
            this.notifyListeners(updates, oldState);
        }
    }

    // 리스너 등록
    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
        }
        this.listeners.get(key).push(callback);

        // 구독 해제 함수 반환
        return () => {
            const callbacks = this.listeners.get(key);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        };
    }

    // 모든 리스너에게 알림
    notifyListeners(updates, oldState) {
        // 전체 상태 변경 리스너
        if (this.listeners.has('*')) {
            this.listeners.get('*').forEach(callback => {
                callback(this.state, oldState);
            });
        }

        // 특정 키 변경 리스너
        Object.keys(updates).forEach(key => {
            if (this.listeners.has(key)) {
                this.listeners.get(key).forEach(callback => {
                    callback(this.state[key], oldState[key]);
                });
            }
        });
    }

    // 상태 초기화
    resetState(newState = {}) {
        this.state = newState;
        this.history = [];
        this.notifyListeners(newState, {});
    }

    // 이전 상태로 되돌리기
    undo() {
        if (this.history.length > 0) {
            const previousState = this.history.pop();
            this.state = previousState.state;
            this.notifyListeners(this.state, {});
            return true;
        }
        return false;
    }

    // 디버깅용
    getHistory() {
        return [...this.history];
    }
}

export default StateManager;
