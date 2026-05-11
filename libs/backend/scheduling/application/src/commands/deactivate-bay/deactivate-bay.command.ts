import type { BayId } from '@det/backend-scheduling-domain';

export class DeactivateBayCommand {
  constructor(public readonly bayId: BayId) {}
}
