import { describe, expect, it } from 'vitest';

import { markdownToPlainText } from 'src/helpdesk-fieldservice/utils/markdown-to-plain-text.util';

describe('markdownToPlainText', () => {
  it('leaves plain text as it is', () => {
    expect(markdownToPlainText('Ticket test')).toBe('Ticket test');
  });

  it('removes emphasis and code marks', () => {
    expect(markdownToPlainText('**Printer** is _jammed_ and `E42` shows *twice*.')).toBe('Printer is jammed and E42 shows twice.');
  });

  it('keeps the text of headings, list items and quotes and keeps the paragraph breaks', () => {
    expect(markdownToPlainText('# Fault\n\n- belt slips\n- motor hums\n\n> reported twice')).toBe('Fault\n\nbelt slips\nmotor hums\n\nreported twice');
  });

  it('keeps the text of a link and drops its address', () => {
    expect(markdownToPlainText('See [the manual](https://example.test/manual).')).toBe('See the manual.');
  });

  it('keeps underscores inside words', () => {
    expect(markdownToPlainText('serial_number_1')).toBe('serial_number_1');
  });
});
