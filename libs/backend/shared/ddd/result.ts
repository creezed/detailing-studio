export type Result<TOk, TErr> = Ok<TOk> | Err<TErr>;

export interface Ok<TOk> {
  readonly ok: true;
  readonly value: TOk;
}

export interface Err<TErr> {
  readonly error: TErr;
  readonly ok: false;
}

export function ok<TOk>(value: TOk): Ok<TOk> {
  return { ok: true, value };
}

export function err<TErr>(error: TErr): Err<TErr> {
  return { error, ok: false };
}
