/**
 * 로깅 유틸리티
 * 개발 환경에서만 로그를 출력하여 프로덕션 콘솔을 깔끔하게 유지합니다.
 */
export class Logger {
  /**
   * 디버그 로그 (개발 환경에서만 출력)
   */
  static debug(message: string, ...args: any[]): void {
    if (import.meta.env.DEV) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }

  /**
   * 정보 로그 (개발 환경에서만 출력)
   */
  static info(message: string, ...args: any[]): void {
    if (import.meta.env.DEV) {
      console.log(`[INFO] ${message}`, ...args);
    }
  }

  /**
   * 경고 로그 (항상 출력)
   */
  static warn(message: string, ...args: any[]): void {
    console.warn(`[WARN] ${message}`, ...args);
  }

  /**
   * 에러 로그 (항상 출력)
   */
  static error(message: string, ...args: any[]): void {
    console.error(`[ERROR] ${message}`, ...args);
  }
}
