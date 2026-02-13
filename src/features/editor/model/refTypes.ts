/**
 * 읽기 전용 ref 등 훅 간 공유 ref 타입 계약을 정의하는 모듈.
 */
export type ReadonlyRef<T> = Readonly<{ current: T }>;
