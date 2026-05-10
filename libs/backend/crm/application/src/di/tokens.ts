import { CLOCK, ID_GENERATOR } from '@det/backend-shared-ddd';

import { CLIENT_READ_PORT } from '../ports/client-read.port';

export const CLIENT_REPOSITORY = Symbol('CLIENT_REPOSITORY');

export { CLOCK, CLIENT_READ_PORT, ID_GENERATOR };
