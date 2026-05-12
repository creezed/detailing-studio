import { ValueObject } from '@det/backend-shared-ddd';
import type { DateTime } from '@det/backend-shared-ddd';
import type { Brand } from '@det/shared-types';

export type IanaTz = Brand<string, 'IanaTz'>;

export const IanaTz = {
  from(value: string): IanaTz {
    return value as IanaTz;
  },
};

export interface QuietHoursProps {
  readonly startMinuteOfDay: number;
  readonly endMinuteOfDay: number;
  readonly timezone: IanaTz;
}

export class QuietHours extends ValueObject {
  private readonly _startMinuteOfDay: number;
  private readonly _endMinuteOfDay: number;
  private readonly _timezone: IanaTz;

  private constructor(props: QuietHoursProps) {
    super();
    this._startMinuteOfDay = props.startMinuteOfDay;
    this._endMinuteOfDay = props.endMinuteOfDay;
    this._timezone = props.timezone;
  }

  static create(props: QuietHoursProps): QuietHours {
    return new QuietHours(props);
  }

  static restore(props: QuietHoursProps): QuietHours {
    return new QuietHours(props);
  }

  get startMinuteOfDay(): number {
    return this._startMinuteOfDay;
  }

  get endMinuteOfDay(): number {
    return this._endMinuteOfDay;
  }

  get timezone(): IanaTz {
    return this._timezone;
  }

  isWithin(now: DateTime): boolean {
    const minuteOfDay = QuietHours.getMinuteOfDay(now.toDate(), this._timezone);

    if (this._startMinuteOfDay <= this._endMinuteOfDay) {
      return minuteOfDay >= this._startMinuteOfDay && minuteOfDay < this._endMinuteOfDay;
    }

    return minuteOfDay >= this._startMinuteOfDay || minuteOfDay < this._endMinuteOfDay;
  }

  toSnapshot(): QuietHoursProps {
    return {
      endMinuteOfDay: this._endMinuteOfDay,
      startMinuteOfDay: this._startMinuteOfDay,
      timezone: this._timezone,
    };
  }

  override equals(other: this): boolean {
    return (
      this._startMinuteOfDay === other._startMinuteOfDay &&
      this._endMinuteOfDay === other._endMinuteOfDay &&
      this._timezone === other._timezone
    );
  }

  private static getMinuteOfDay(date: Date, tz: IanaTz): number {
    const formatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      minute: 'numeric',
      timeZone: tz,
    });

    const parts = formatter.formatToParts(date);
    const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
    const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);

    return hour * 60 + minute;
  }
}
