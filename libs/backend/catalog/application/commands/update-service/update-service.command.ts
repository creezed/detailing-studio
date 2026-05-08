import type { ServiceId } from '@det/backend/catalog/domain';

export class UpdateServiceCommand {
  constructor(
    public readonly serviceId: ServiceId,
    public readonly name?: string,
    public readonly description?: string,
    public readonly durationMinutes?: number,
  ) {}
}
