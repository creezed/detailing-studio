export abstract class Entity<TId = string> {
  abstract get id(): TId;

  equals(other: Entity<TId> | null | undefined): boolean {
    return other !== null && other !== undefined && this.id === other.id;
  }
}
