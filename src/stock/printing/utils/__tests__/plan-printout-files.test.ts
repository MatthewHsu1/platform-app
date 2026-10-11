import { describe, expect, it } from 'vitest';

import { planPrintoutFiles } from 'src/stock/printing/utils/plan-printout-files.util';

const files = (count: number, prefix: string) =>
  Array.from({ length: count }, (_, index) => ({ fileId: `${prefix}${index}`, label: `${prefix}${index}.pdf` }));

describe('planPrintoutFiles', () => {
  it('appends new files after the existing ones', () => {
    expect(planPrintoutFiles(files(2, 'old'), files(1, 'new'))).toEqual([...files(2, 'old'), ...files(1, 'new')]);
  });

  it('keeps the newest 60, dropping the oldest', () => {
    const kept = planPrintoutFiles(files(60, 'old'), files(2, 'new'));

    expect(kept).toHaveLength(60);
    expect(kept[0].fileId).toBe('old2');
    expect(kept.slice(-2).map((file) => file.fileId)).toEqual(['new0', 'new1']);
  });

  it('replaces a file saved again under the same name', () => {
    const slip = { fileId: 'first', label: 'WH/OUT/00007_signed_delivery_slip.pdf' };
    const again = { fileId: 'second', label: 'WH/OUT/00007_signed_delivery_slip.pdf' };

    expect(planPrintoutFiles([slip, ...files(1, 'old')], [again])).toEqual([...files(1, 'old'), again]);
  });
});
