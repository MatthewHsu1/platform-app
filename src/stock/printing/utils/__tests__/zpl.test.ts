import { describe, expect, it } from 'vitest';

import { productDisplayName } from 'src/stock/printing/utils/product-display-name.util';
import {
  zplLotLabels,
  zplPackageLabels,
  zplPackagingLabels,
  zplPickingTypeLabels,
  zplProductLabels,
} from 'src/stock/printing/utils/zpl.util';

// Spaces between ZPL commands do not change the label, so the layouts are compared without them.
const compact = (text: string) => text.replace(/ /g, '');
const MELLOHI = productDisplayName('Mellohi"', 'C4181234""154654654654');
const label = (barcode: string, quantity: number) => ({
  firstLine: MELLOHI,
  secondLine: '',
  barcode,
  quantity,
  price: null,
  pricePerUnit: null,
  referenceUnitName: null,
});

describe('productDisplayName', () => {
  it('puts the internal reference in brackets before the name', () => {
    expect(productDisplayName('Belt', 'BELT')).toBe('[BELT] Belt');
  });

  it('is the name alone when there is no internal reference', () => {
    expect(productDisplayName('Belt', null)).toBe('Belt');
    expect(productDisplayName('Belt', '')).toBe('Belt');
  });
});

describe('zplProductLabels (normal template)', () => {
  it('prints the name and the barcode once per copy, quotes kept as they are', () => {
    const one = '\n\n^XA^CI28\n\n^FT35,40^A0N,25^FD[C4181234""154654654654]Mellohi"^FS\n^FO35,77^BY2^BCN,100,Y,N,N^FDscan""me^FS\n^XZ\n';

    expect(compact(zplProductLabels([label('scan""me', 2)], 'normal'))).toBe(compact(one + one));
  });

  it('prints one label per copy of each extra barcode, in order', () => {
    const block = (barcode: string) =>
      `\n\n^XA^CI28\n\n^FT35,40^A0N,25^FD[C4181234""154654654654]Mellohi"^FS\n^FO35,77^BY2^BCN,100,Y,N,N^FD${barcode}^FS\n^XZ\n`;

    expect(compact(zplProductLabels([label('123"barcode', 2), label('barcode"456', 2)], 'normal'))).toBe(
      compact(block('123"barcode') + block('123"barcode') + block('barcode"456') + block('barcode"456')),
    );
  });

  it('leaves the barcode out when the product has none', () => {
    expect(compact(zplProductLabels([label('', 1)], 'normal'))).toBe(
      compact('\n\n^XA^CI28\n\n^FT35,40^A0N,25^FD[C4181234""154654654654]Mellohi"^FS\n^XZ\n'),
    );
  });

  it('adds the price, and the price per reference unit when the unit is not the reference', () => {
    expect(
      compact(
        zplProductLabels(
          [{ ...label('', 1), price: '$12.00', pricePerUnit: '$2.00', referenceUnitName: 'Units' }],
          'normal',
        ),
      ),
    ).toBe(
      compact(
        '\n\n^XA^CI28\n\n^FT35,40^A0N,25^FD[C4181234""154654654654]Mellohi"^FS\n^FO150,210^A0N,25^FH^FD($2.00/Units)^FS\n^FO300,200^A0N,40^FH^FD$12.00^FS\n^XZ\n',
      ),
    );
  });

  it('prints no label for a quantity of zero', () => {
    expect(zplProductLabels([label('scan""me', 0)], 'normal')).toBe('');
  });
});

describe('zplProductLabels (other templates)', () => {
  const priced = { ...label('1234', 1), secondLine: 'Red', price: '$12.00', pricePerUnit: '$2.00', referenceUnitName: 'Units' };

  it('alternative: smaller name, the variant line, barcode and both prices', () => {
    expect(compact(zplProductLabels([priced], 'alternative'))).toBe(
      compact(
        '\n\n^XA^CI28\n\n^FT35,30^A0N,20^FD[C4181234""154654654654]Mellohi"^FS\n^FT35,48^A0N,15^FDRed^FS\n^FO35,55^BY2^BCN,100,Y,N,N^FD1234^FS\n^FO160,185^A0N,18^FH^FD($2.00/Units)^FS\n^FO290,165^A0N,30^FH^FD$12.00^FS\n^XZ\n',
      ),
    );
  });

  it('small: name, a short barcode and the price, no price per unit', () => {
    expect(compact(zplProductLabels([priced], 'small'))).toBe(
      compact(
        '\n\n^XA^CI28\n\n^FT35,30^A0N,20^FD[C4181234""154654654654]Mellohi"^FS\n^FO35,50^BY1^BCN,80,Y,N,N^FD1234^FS\n^FO150,165^A0N,25^FH^FD$12.00^FS\n^XZ\n',
      ),
    );
  });

  it('jewelry: the name right of the barcode and the price under it', () => {
    expect(compact(zplProductLabels([priced], 'jewelry'))).toBe(
      compact(
        '\n\n^XA^CI28\n\n^FT210,30^A0N,25^FD[C4181234""154654654654]Mellohi"^FS\n^FO35,5^BY1^BCN,80,Y,N,N^FD1234^FS\n^FO290,50^A0N,30^FH^FD$12.00^FS\n^XZ\n',
      ),
    );
  });
});

describe('zplLotLabels', () => {
  it('prints the product, the lot name and the lot name as a Code 128 barcode', () => {
    expect(compact(zplLotLabels([{ productDisplayName: MELLOHI, lotName: 'Volume-Beta"' }]))).toBe(
      compact(
        '\n\n^XA^CI28\n^FO100,50\n^A0N,44,33^FD[C4181234""154654654654]Mellohi"^FS\n^FO100,100\n^A0N,44,33^FDLN/SN:Volume-Beta"^FS\n\n^FO100,150^BY3\n^BCN,100,Y,N,N\n^FDVolume-Beta"^FS\n^XZ\n',
      ),
    );
  });
});

describe('template labels', () => {
  it('package: name and its barcode', () => {
    expect(compact(zplPackageLabels([{ name: 'PACK0000007', packDate: null, packageTypeName: '' }], 'UTC'))).toBe(
      compact('\n^XA\n^FO100,50\n^A0N,44,33^FDPACK0000007^FS\n^FO100,100^BY3\n^BCN,100,Y,N,N\n^FDPACK0000007^FS\n^XZ\n'),
    );
  });

  it('package named with a valid SSCC: the SSCC, pack date and type as text beside a DataMatrix of the GS1 code', () => {
    expect(compact(zplPackageLabels([{ name: '106141411234567897', packDate: '2026-10-08', packageTypeName: 'Pallet' }], 'UTC'))).toBe(
      compact(
        '\n^XA\n^FO310,50\n^A0N,44,33^FDSSCC: 106141411234567897^FS\n^FO310,100^BY3\n^A0N,44,33^FDPack Date: 2026-10-08^FS\n^FO310,150^BY3\n^A0N,44,33^FDPackage Type: Pallet^FS\n^FO100,50^BY3\n^BXN,10,200\n^FD0010614141123456789713261008^FS\n^XZ\n',
      ),
    );
  });

  it('package named with 18 digits but a wrong check digit: the plain label', () => {
    expect(compact(zplPackageLabels([{ name: '106141411234567890', packDate: null, packageTypeName: '' }], 'UTC'))).toBe(
      compact('\n^XA\n^FO100,50\n^A0N,44,33^FD106141411234567890^FS\n^FO100,100^BY3\n^BCN,100,Y,N,N\n^FD106141411234567890^FS\n^XZ\n'),
    );
  });

  it('operation type: name, and the barcode when set', () => {
    expect(compact(zplPickingTypeLabels([{ name: 'Receipts', barcode: 'WHIN' }, { name: 'Pick', barcode: '' }]))).toBe(
      compact('\n^XA\n^FO100,50\n^A0N,44,33^FDReceipts^FS\n\n^FO100,100\n^BCN,100,Y,N,N\n^FDWHIN^FS\n\n^XZ\n\n^XA\n^FO100,50\n^A0N,44,33^FDPick^FS\n\n^XZ\n'),
    );
  });

  it('packaging: unit, product, quantity in the unit and the barcode', () => {
    expect(
      compact(zplPackagingLabels([{ uomName: 'Pack of 6', productDisplayName: '[BELT] Belt', relativeFactor: 6, barcode: '1234' }])),
    ).toBe(
      compact(
        '\n^XA\n^FO100,50\n^A0N,44,33^FDPack of 6^FS\n^FO100,100\n^A0N,44,33^FD[BELT] Belt^FS\n^FO100,150\n^A0N,44,33^FDQty: 6.0 Pack of 6^FS\n\n^FO100,200^BY3\n^BCN,100,Y,N,N\n^FD1234^FS\n\n^XZ\n',
      ),
    );
  });

  it('packaging: a fractional quantity prints as it is, and no barcode block without a barcode', () => {
    expect(
      compact(zplPackagingLabels([{ uomName: 'Half', productDisplayName: 'Belt', relativeFactor: 0.5, barcode: '' }])),
    ).toBe(compact('\n^XA\n^FO100,50\n^A0N,44,33^FDHalf^FS\n^FO100,100\n^A0N,44,33^FDBelt^FS\n^FO100,150\n^A0N,44,33^FDQty: 0.5 Half^FS\n\n^XZ\n'));
  });
});
