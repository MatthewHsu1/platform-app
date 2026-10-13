import { describe, expect, it } from 'vitest';

import { type MergeTexts } from 'src/crm/lead/merge/types/merge-texts.type';
import { planAttachmentName, planMovedNoteTitle } from 'src/crm/lead/merge/utils/plan-moved-names.util';

const TEXTS: MergeTexts = {
  movedNoteTitle: (tailName, title) => `From ${tailName}: ${title}`,
  movedNoteTitleEmpty: (tailName) => `From ${tailName}`,
  movedAttachmentName: (name, tailNameStart) => `${name} (from ${tailNameStart})`,
};

describe('planMovedNoteTitle', () => {
  it('prefixes the title with the merged-away lead', () => {
    expect(planMovedNoteTitle({ tailName: 'Gym B', title: 'Call notes', texts: TEXTS })).toBe('From Gym B: Call notes');
  });

  it('names the merged-away lead alone when the note has no title', () => {
    expect(planMovedNoteTitle({ tailName: 'Gym B', title: null, texts: TEXTS })).toBe('From Gym B');
    expect(planMovedNoteTitle({ tailName: 'Gym B', title: '', texts: TEXTS })).toBe('From Gym B');
  });

  it('writes nothing when the title already carries the prefix, so a second run does not stack it', () => {
    expect(planMovedNoteTitle({ tailName: 'Gym B', title: 'From Gym B: Call notes', texts: TEXTS })).toBeNull();
    expect(planMovedNoteTitle({ tailName: 'Gym B', title: 'From Gym B', texts: TEXTS })).toBeNull();
  });
});

describe('planAttachmentName', () => {
  it('adds the first 20 characters of the merged-away lead', () => {
    expect(planAttachmentName({ name: 'quote.pdf', tailName: 'Treadmills for the new gym downtown', texts: TEXTS })).toBe(
      'quote.pdf (from Treadmills for the n)',
    );
  });

  it('counts characters, not code units', () => {
    expect(planAttachmentName({ name: 'a.pdf', tailName: '🏋🏋 Treadmills for the gym', texts: TEXTS })).toBe(
      'a.pdf (from 🏋🏋 Treadmills for th)',
    );
  });

  it('writes nothing for a file already renamed', () => {
    expect(planAttachmentName({ name: 'a.pdf (from Gym B)', tailName: 'Gym B', texts: TEXTS })).toBeNull();
  });
});
