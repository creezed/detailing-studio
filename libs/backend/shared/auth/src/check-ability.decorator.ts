import { SetMetadata } from '@nestjs/common';

import type { AbilityChecker } from './auth.types';

export const CHECK_ABILITY_KEY = Symbol('CHECK_ABILITY_KEY');

export const CheckAbility = (callback: AbilityChecker): MethodDecorator & ClassDecorator =>
  SetMetadata(CHECK_ABILITY_KEY, callback);
