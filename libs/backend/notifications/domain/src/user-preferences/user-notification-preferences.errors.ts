import { DomainError } from '@det/backend-shared-ddd';

import type { TemplateCode } from '../value-objects/template-code';

export class CriticalTemplateCannotBeFullyDisabledError extends DomainError {
  readonly code = 'CRITICAL_TEMPLATE_CANNOT_BE_FULLY_DISABLED';
  readonly httpStatus = 422;

  constructor(public readonly templateCode: TemplateCode) {
    super(`Critical template "${templateCode}" cannot have all channels disabled`);
  }
}
