import { ValueObject } from '@det/backend-shared-ddd';

export interface ContactInfoProps {
  readonly phone: string | null;
  readonly email: string | null;
  readonly address: string | null;
}

export class ContactInfo extends ValueObject {
  private constructor(
    public readonly phone: string | null,
    public readonly email: string | null,
    public readonly address: string | null,
  ) {
    super();
  }

  static create(props: ContactInfoProps): ContactInfo {
    return new ContactInfo(
      props.phone?.trim() || null,
      props.email?.trim() || null,
      props.address?.trim() || null,
    );
  }

  static empty(): ContactInfo {
    return new ContactInfo(null, null, null);
  }

  override equals(other: this): boolean {
    return (
      this.phone === other.phone && this.email === other.email && this.address === other.address
    );
  }
}
