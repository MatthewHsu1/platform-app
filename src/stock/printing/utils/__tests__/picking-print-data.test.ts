import { describe, expect, it } from 'vitest';

import {
  backorderChains,
  orderMoveLines,
  outermostOpenPackages,
  pickingContacts,
  pickingWarningText,
  plainNoteText,
} from 'src/stock/printing/utils/picking-print-data.util';

describe('backorderChains', () => {
  it('follows backorders of backorders, marking the direct ones', () => {
    const chains = backorderChains(
      ['out1'],
      [
        { id: 'out2', backorderId: 'out1', state: 'DONE' },
        { id: 'out3', backorderId: 'out2', state: 'CONFIRMED' },
        { id: 'other', backorderId: 'elsewhere', state: 'DONE' },
      ],
    );

    expect(chains.get('out1')).toEqual([
      { id: 'out2', state: 'DONE', isDirect: true },
      { id: 'out3', state: 'CONFIRMED', isDirect: false },
    ]);
  });

  it('gives each printed transfer its own chain when one is the backorder of the other', () => {
    const chains = backorderChains(['out1', 'out2'], [{ id: 'out2', backorderId: 'out1', state: 'ASSIGNED' }]);

    expect(chains.get('out1')).toEqual([{ id: 'out2', state: 'ASSIGNED', isDirect: true }]);
    expect(chains.get('out2')).toEqual([]);
  });
});

describe('pickingContacts', () => {
  const ann = { kind: 'person' as const, name: 'Ann Lee', company: { name: 'Gym A', address: '1 Main St' } };
  const depot = { kind: 'company' as const, name: 'Gym A Depot', address: '7 Dock Rd' };

  it('names the company behind a person and delivers to the first move\'s contact', () => {
    expect(pickingContacts(ann, depot)).toEqual({
      partnerName: 'Ann Lee',
      hasTransferPartner: true,
      partnerAddress: '1 Main St',
      commercialPartnerName: 'Gym A',
      commercialPartnerAddress: '1 Main St',
      deliveryPartnerName: 'Gym A Depot',
      deliveryPartnerAddress: '7 Dock Rd',
    });
  });

  it('falls back to the first move\'s contact when the transfer has none, a company being its own', () => {
    expect(pickingContacts(null, depot)).toMatchObject({
      partnerName: 'Gym A Depot',
      hasTransferPartner: false,
      commercialPartnerName: '',
      deliveryPartnerName: 'Gym A Depot',
    });
  });
});

describe('pickingWarningText', () => {
  it('puts the contact\'s instructions before its parent company\'s, one per line', () => {
    expect(pickingWarningText('Ring twice', 'Dock 3 only')).toBe('Ring twice\nDock 3 only\n');
    expect(pickingWarningText(null, '')).toBe('');
  });
});

describe('orderMoveLines', () => {
  it('puts lines without a destination package first, then packages from Z to A, then by creation', () => {
    const ordered = orderMoveLines([
      { id: 1, resultPackageName: 'PACK-A', createdAt: '2026-10-01T00:00:00Z' },
      { id: 2, resultPackageName: '', createdAt: '2026-10-03T00:00:00Z' },
      { id: 3, resultPackageName: 'PACK-B', createdAt: '2026-10-02T00:00:00Z' },
      { id: 4, resultPackageName: '', createdAt: '2026-10-02T00:00:00Z' },
    ]);

    expect(ordered.map((line) => line.id)).toEqual([4, 2, 3, 1]);
  });
});

describe('plainNoteText', () => {
  it('drops heading signs and emphasis marks', () => {
    expect(plainNoteText('## Handle with care\n**Fragile** _top_ side up\nUse `dock 3`')).toBe(
      'Handle with care\nFragile top side up\nUse dock 3',
    );
  });
});

describe('outermostOpenPackages', () => {
  it('lists the pallet a box goes into, once, going where its first line goes', () => {
    const packages = new Map([
      ['box1', { id: 'box1', name: 'BOX1', packageDestId: 'pal', location: 'WH/Stock', parentPackageName: '', packageDestName: 'PAL1' }],
      ['box2', { id: 'box2', name: 'BOX2', packageDestId: 'pal', location: 'WH/Stock', parentPackageName: '', packageDestName: 'PAL1' }],
      ['pal', { id: 'pal', name: 'PAL1', packageDestId: null, location: 'WH/Stock', parentPackageName: '', packageDestName: '' }],
    ]);

    expect(
      outermostOpenPackages(
        [
          { packageId: 'box1', to: 'WH/Output' },
          { packageId: 'box2', to: 'WH/Output' },
        ],
        packages,
      ),
    ).toEqual([{ id: 'pal', name: 'PAL1', from: 'WH/Stock', parentPackageName: '', to: 'WH/Output', packageDestName: '' }]);
  });
});
