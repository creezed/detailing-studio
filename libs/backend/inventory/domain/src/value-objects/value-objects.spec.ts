import { UnitOfMeasure } from '@det/backend-shared-ddd';

import { ArticleNumber, InvalidArticleNumberError } from './article-number.value-object';
import { Barcode, InvalidBarcodeError } from './barcode.value-object';
import { ContactInfo } from './contact-info.value-object';
import { Inn, InvalidInnError } from './inn.value-object';
import { InvalidPackagingError, Packaging } from './packaging.value-object';
import { InvalidSignedQuantityError, SignedQuantity } from './signed-quantity.value-object';
import { InvalidSkuGroupError, SkuGroup } from './sku-group.value-object';
import { InvalidSkuNameError, SkuName } from './sku-name.value-object';
import { InvalidSupplierNameError, SupplierName } from './supplier-name.value-object';

describe('ArticleNumber', () => {
  it('should create from valid string', () => {
    const an = ArticleNumber.from('ART-001');
    expect(an.getValue()).toBe('ART-001');
    expect(an.toString()).toBe('ART-001');
  });

  it('should trim whitespace', () => {
    expect(ArticleNumber.from('  X  ').getValue()).toBe('X');
  });

  it('should throw on empty string', () => {
    expect(() => ArticleNumber.from('')).toThrow(InvalidArticleNumberError);
  });

  it('should throw on string > 32 chars', () => {
    expect(() => ArticleNumber.from('A'.repeat(33))).toThrow(InvalidArticleNumberError);
  });

  it('should compare equality', () => {
    const a = ArticleNumber.from('X');
    const b = ArticleNumber.from('X');
    expect(a.equals(b)).toBe(true);
  });
});

describe('SkuName', () => {
  it('should create from valid string', () => {
    const n = SkuName.from('Полироль 3М');
    expect(n.getValue()).toBe('Полироль 3М');
    expect(n.toString()).toBe('Полироль 3М');
  });

  it('should throw on empty', () => {
    expect(() => SkuName.from('  ')).toThrow(InvalidSkuNameError);
  });

  it('should throw on > 255 chars', () => {
    expect(() => SkuName.from('A'.repeat(256))).toThrow(InvalidSkuNameError);
  });

  it('should compare equality', () => {
    expect(SkuName.from('A').equals(SkuName.from('A'))).toBe(true);
  });
});

describe('SkuGroup', () => {
  it('should create from valid string', () => {
    const g = SkuGroup.from('Абразивы');
    expect(g.getValue()).toBe('Абразивы');
    expect(g.toString()).toBe('Абразивы');
  });

  it('should throw on empty', () => {
    expect(() => SkuGroup.from('')).toThrow(InvalidSkuGroupError);
  });

  it('should throw on > 100 chars', () => {
    expect(() => SkuGroup.from('A'.repeat(101))).toThrow(InvalidSkuGroupError);
  });

  it('should compare equality', () => {
    expect(SkuGroup.from('X').equals(SkuGroup.from('X'))).toBe(true);
  });
});

describe('SupplierName', () => {
  it('should create from valid string', () => {
    const n = SupplierName.from('ООО Полироль');
    expect(n.getValue()).toBe('ООО Полироль');
    expect(n.toString()).toBe('ООО Полироль');
  });

  it('should throw on empty', () => {
    expect(() => SupplierName.from('')).toThrow(InvalidSupplierNameError);
  });

  it('should throw on > 255 chars', () => {
    expect(() => SupplierName.from('A'.repeat(256))).toThrow(InvalidSupplierNameError);
  });

  it('should compare equality', () => {
    expect(SupplierName.from('X').equals(SupplierName.from('X'))).toBe(true);
  });
});

describe('Packaging', () => {
  it('should create with valid data', () => {
    const p = Packaging.create('p1', 'Канистра 5л', 5000);
    expect(p.id).toBe('p1');
    expect(p.name).toBe('Канистра 5л');
    expect(p.coefficient).toBe(5000);
  });

  it('should throw on empty id', () => {
    expect(() => Packaging.create('', 'X', 1)).toThrow(InvalidPackagingError);
  });

  it('should throw on empty name', () => {
    expect(() => Packaging.create('p1', '  ', 1)).toThrow(InvalidPackagingError);
  });

  it('should throw on coefficient <= 0', () => {
    expect(() => Packaging.create('p1', 'X', 0)).toThrow(InvalidPackagingError);
    expect(() => Packaging.create('p1', 'X', -1)).toThrow(InvalidPackagingError);
  });

  it('should throw on NaN coefficient', () => {
    expect(() => Packaging.create('p1', 'X', NaN)).toThrow(InvalidPackagingError);
  });

  it('should compare equality', () => {
    const a = Packaging.create('p1', 'X', 100);
    const b = Packaging.create('p1', 'X', 100);
    expect(a.equals(b)).toBe(true);
  });
});

describe('Barcode', () => {
  it('should create valid EAN-13', () => {
    const bc = Barcode.from('4006381333931');
    expect(bc.getValue()).toBe('4006381333931');
    expect(bc.toString()).toBe('4006381333931');
  });

  it('should create valid UPC-A (12 digits)', () => {
    const bc = Barcode.from('012345678905');
    expect(bc.getValue()).toBe('012345678905');
  });

  it('should throw on non-digit string', () => {
    expect(() => Barcode.from('abc')).toThrow(InvalidBarcodeError);
  });

  it('should throw on wrong length', () => {
    expect(() => Barcode.from('123')).toThrow(InvalidBarcodeError);
    expect(() => Barcode.from('12345678901234')).toThrow(InvalidBarcodeError);
  });

  it('should throw on invalid checksum', () => {
    expect(() => Barcode.from('4006381333932')).toThrow(InvalidBarcodeError);
  });

  it('should compare equality', () => {
    expect(Barcode.from('4006381333931').equals(Barcode.from('4006381333931'))).toBe(true);
  });
});

describe('Inn', () => {
  it('should create valid 10-digit INN', () => {
    const inn = Inn.from('7707083893');
    expect(inn.getValue()).toBe('7707083893');
    expect(inn.toString()).toBe('7707083893');
  });

  it('should create valid 12-digit INN', () => {
    const inn = Inn.from('500100732259');
    expect(inn.getValue()).toBe('500100732259');
  });

  it('should throw on wrong length', () => {
    expect(() => Inn.from('12345')).toThrow(InvalidInnError);
    expect(() => Inn.from('123456789012345')).toThrow(InvalidInnError);
  });

  it('should throw on non-digit', () => {
    expect(() => Inn.from('77070838ab')).toThrow(InvalidInnError);
  });

  it('should throw on invalid 10-digit checksum', () => {
    expect(() => Inn.from('7707083890')).toThrow(InvalidInnError);
  });

  it('should throw on invalid 12-digit checksum (11th digit)', () => {
    expect(() => Inn.from('500100732250')).toThrow(InvalidInnError);
  });

  it('should compare equality', () => {
    expect(Inn.from('7707083893').equals(Inn.from('7707083893'))).toBe(true);
  });
});

describe('SignedQuantity', () => {
  it('should create positive value', () => {
    const sq = SignedQuantity.of(100, UnitOfMeasure.ML);
    expect(sq.amount).toBe(100);
    expect(sq.unit).toBe(UnitOfMeasure.ML);
    expect(sq.isPositive()).toBe(true);
    expect(sq.isNegative()).toBe(false);
    expect(sq.isZero()).toBe(false);
  });

  it('should create negative value', () => {
    const sq = SignedQuantity.of(-50, UnitOfMeasure.G);
    expect(sq.isNegative()).toBe(true);
    expect(sq.isPositive()).toBe(false);
  });

  it('should create zero value', () => {
    const sq = SignedQuantity.of(0, UnitOfMeasure.PCS);
    expect(sq.isZero()).toBe(true);
  });

  it('should negate', () => {
    const sq = SignedQuantity.of(10, UnitOfMeasure.KG);
    const neg = sq.negate();
    expect(neg.amount).toBe(-10);
    expect(neg.unit).toBe(UnitOfMeasure.KG);
  });

  it('should throw on NaN', () => {
    expect(() => SignedQuantity.of(NaN, UnitOfMeasure.ML)).toThrow(InvalidSignedQuantityError);
  });

  it('should throw on Infinity', () => {
    expect(() => SignedQuantity.of(Infinity, UnitOfMeasure.ML)).toThrow(InvalidSignedQuantityError);
  });

  it('should compare equality', () => {
    const a = SignedQuantity.of(10, UnitOfMeasure.ML);
    const b = SignedQuantity.of(10, UnitOfMeasure.ML);
    expect(a.equals(b)).toBe(true);
  });
});

describe('ContactInfo', () => {
  it('should create with all fields', () => {
    const ci = ContactInfo.create({ phone: '+7', email: 'a@b.ru', address: 'addr' });
    expect(ci.phone).toBe('+7');
    expect(ci.email).toBe('a@b.ru');
    expect(ci.address).toBe('addr');
  });

  it('should create empty', () => {
    const ci = ContactInfo.empty();
    expect(ci.phone).toBeNull();
    expect(ci.email).toBeNull();
    expect(ci.address).toBeNull();
  });

  it('should trim and nullify empty strings', () => {
    const ci = ContactInfo.create({ phone: '  ', email: '', address: null });
    expect(ci.phone).toBeNull();
    expect(ci.email).toBeNull();
    expect(ci.address).toBeNull();
  });

  it('should compare equality', () => {
    const a = ContactInfo.create({ phone: '+7', email: null, address: null });
    const b = ContactInfo.create({ phone: '+7', email: null, address: null });
    expect(a.equals(b)).toBe(true);
  });
});
