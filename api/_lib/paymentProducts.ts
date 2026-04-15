/**
 * 크레딧 패키지 상수. 서버 전용 — 가격은 서버에서만 결정한다.
 */
export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number; // 원 (KRW)
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: "credit-30", name: "AI 크레딧 30개", credits: 30, price: 5000 },
  { id: "credit-100", name: "AI 크레딧 100개", credits: 100, price: 15000 },
  { id: "credit-300", name: "AI 크레딧 300개", credits: 300, price: 39000 },
];

export const findPackage = (productId: string): CreditPackage | undefined =>
  CREDIT_PACKAGES.find((p) => p.id === productId);
