export const PlanCode = {
  STARTER: 'STARTER',
  STANDARD: 'STANDARD',
  PRO: 'PRO',
} as const;

export type PlanCode = (typeof PlanCode)[keyof typeof PlanCode];
