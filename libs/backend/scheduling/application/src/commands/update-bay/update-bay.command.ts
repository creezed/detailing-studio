import type { BayId } from '@det/backend-scheduling-domain';

export class UpdateBayCommand {
  constructor(
    public readonly bayId: BayId,
    public readonly name: string,
  ) {}
}
