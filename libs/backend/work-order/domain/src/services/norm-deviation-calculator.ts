import type { Quantity } from '@det/backend-shared-ddd';

export interface DeviationResult {
  readonly ratio: number;
  readonly exceedsThreshold: boolean;
}

export function calculateDeviation(
  actual: Quantity,
  norm: Quantity,
  threshold = 0.15,
): DeviationResult {
  if (norm.amount === 0) {
    const hasActual = actual.amount > 0;
    return { ratio: hasActual ? Infinity : 0, exceedsThreshold: hasActual };
  }

  const ratio = (actual.amount - norm.amount) / norm.amount;
  return { ratio, exceedsThreshold: Math.abs(ratio) > threshold };
}
