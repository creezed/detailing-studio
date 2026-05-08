export interface AuthenticatedUser {
  readonly id: string;
  readonly role: string;
  readonly branchIds: readonly string[];
}

export interface AbilityLike {
  can(action: string, subject: unknown): boolean;
}

export interface AbilityGuardContext {
  readonly body: unknown;
  readonly params: Readonly<Record<string, string>>;
  readonly query: Readonly<Record<string, unknown>>;
  readonly user: AuthenticatedUser;
}

export type AbilityChecker = (ability: AbilityLike, context: AbilityGuardContext) => boolean;
