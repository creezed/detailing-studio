import { Money } from '@det/backend-shared-ddd';

export function centsToMoney(centsStr: string): Money {
  const cents = Number(centsStr);
  const rubles = Math.floor(cents / 100);
  const kopecks = cents % 100;

  return Money.rub(`${rubles.toString()}.${kopecks.toString().padStart(2, '0')}`);
}
