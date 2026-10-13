import { describe, expect, it } from 'vitest';

import { describePlugFailure } from 'src/shared/plug/utils/describe-plug-failure.util';

const GERMAN: Record<string, string> = {
  'The plug point answer is not valid: {reason}': 'Die Antwort ist ungültig: {reason}',
  'Lead {leadId} was not in the request.': 'Lead {leadId} war nicht in der Anfrage.',
};

describe('describePlugFailure', () => {
  it("puts the plug point's own reason, translated, into the failure text", () => {
    const failure = {
      message: 'The plug point answer is not valid: {reason}',
      values: {},
      cause: { message: 'Lead {leadId} was not in the request.', values: { leadId: 'l9' } },
    };
    const translateText = (message: string, values: Record<string, string | number> = {}) =>
      Object.entries(values).reduce((text, [key, value]) => text.replace(`{${key}}`, String(value)), GERMAN[message] ?? message);

    expect(describePlugFailure(failure, translateText)).toBe('Die Antwort ist ungültig: Lead l9 war nicht in der Anfrage.');
    expect(describePlugFailure(failure)).toBe('The plug point answer is not valid: Lead l9 was not in the request.');
  });
});
