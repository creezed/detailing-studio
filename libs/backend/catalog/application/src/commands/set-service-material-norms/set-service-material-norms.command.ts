import type { MaterialNorm, ServiceId } from '@det/backend-catalog-domain';

export class SetServiceMaterialNormsCommand {
  constructor(
    public readonly serviceId: ServiceId,
    public readonly norms: readonly MaterialNorm[],
  ) {}
}
