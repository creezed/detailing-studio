import { Money } from '@det/backend-shared-ddd';

export function moneyFromCents(cents: number): Money {
  const rubles = Math.floor(cents / 100);
  const kopecks = cents % 100;

  return Money.rub(`${rubles.toString()}.${kopecks.toString().padStart(2, '0')}`);
}

export function moneyFromCentsStr(centsStr: string): Money {
  return moneyFromCents(Number(centsStr));
}
