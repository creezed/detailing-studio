import { CLOCK, ID_GENERATOR } from '@det/backend-shared-ddd';

import { ANONYMIZATION_REQUEST_PORT } from '../ports/anonymization-request.port';
import { CLIENT_READ_PORT } from '../ports/client-read.port';
import { CRM_CONFIG_PORT } from '../ports/config.port';
import { FILE_STORAGE_PORT } from '../ports/file-storage.port';
import { PII_ACCESS_LOG_PORT } from '../ports/pii-access-log.port';

export const CLIENT_REPOSITORY = Symbol('CLIENT_REPOSITORY');

export {
  ANONYMIZATION_REQUEST_PORT,
  CLOCK,
  CLIENT_READ_PORT,
  CRM_CONFIG_PORT,
  FILE_STORAGE_PORT,
  ID_GENERATOR,
  PII_ACCESS_LOG_PORT,
};
