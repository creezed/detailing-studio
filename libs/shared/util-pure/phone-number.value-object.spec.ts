import { FromInvalidPhoneError } from './errors';
import { PhoneNumber } from './phone-number.value-object';

describe('PhoneNumber', () => {
  it('creates phone number from E.164 value', () => {
    const phone = PhoneNumber.from('+79991234567');

    expect(phone.value).toBe('+79991234567');
    expect(phone.toString()).toBe('+79991234567');
  });

  it('compares by normalized value', () => {
    expect(PhoneNumber.from('+79991234567').equals(PhoneNumber.from('+79991234567'))).toBe(true);
    expect(PhoneNumber.from('+79991234567').equals(PhoneNumber.from('+79991234568'))).toBe(false);
  });

  it('throws for non E.164 values', () => {
    expect(() => PhoneNumber.from('89991234567')).toThrow(FromInvalidPhoneError);
    expect(() => PhoneNumber.from('+09991234567')).toThrow(FromInvalidPhoneError);
  });
});
