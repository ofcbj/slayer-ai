import { PlayerState } from '../../../types';

/**
 * PlayerState에 대한 옵저버 패턴 구현
 * BattleManager가 유일한 상태 소유자가 되도록 하고,
 * 다른 컴포넌트들은 구독자로서 상태 변경을 감지합니다.
 */
export class PlayerStateObservable {
  private state: PlayerState;
  private observers: Set<(state: PlayerState) => void> = new Set();

  constructor(initialState: PlayerState) {
    // 깊은 복사로 초기 상태 저장
    this.state = { ...initialState };
  }

  /**
   * 현재 상태 읽기 (복사본 반환)
   */
  getState(): PlayerState {
    return { ...this.state };
  }

  /**
   * 상태 업데이트 (내부 전용)
   * updater 함수를 통해 상태를 직접 수정하고, 모든 옵저버에게 통지
   */
  setState(updater: (state: PlayerState) => void): void {
    updater(this.state);
    this.notify();
  }

  /**
   * 옵저버 등록
   * @returns 구독 해제 함수
   */
  subscribe(observer: (state: PlayerState) => void): () => void {
    this.observers.add(observer);
    // 즉시 현재 상태 전달 (초기 동기화)
    observer(this.getState());

    // 구독 해제 함수 반환
    return () => this.observers.delete(observer);
  }

  /**
   * 모든 옵저버에게 상태 변경 통지
   */
  private notify(): void {
    const currentState = this.getState();
    this.observers.forEach(observer => observer(currentState));
  }
}
