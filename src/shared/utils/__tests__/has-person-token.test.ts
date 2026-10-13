import { describe, expect, it } from 'vitest';

import { hasPersonToken } from 'src/shared/utils/has-person-token.util';

describe('hasPersonToken', () => {
  it('is true for a request a user made', () => {
    expect(hasPersonToken({ TWENTY_APP_ACCESS_TOKEN: 'user', TWENTY_APP_APPLICATION_ACCESS_TOKEN: 'app' })).toBe(true);
  });

  it('is false for a scheduled run, which gets the app token in the user token place', () => {
    expect(hasPersonToken({ TWENTY_APP_ACCESS_TOKEN: 'app', TWENTY_APP_APPLICATION_ACCESS_TOKEN: 'app' })).toBe(false);
  });

  it('is false with no user token at all', () => {
    expect(hasPersonToken({ TWENTY_APP_APPLICATION_ACCESS_TOKEN: 'app' })).toBe(false);
    expect(hasPersonToken({ TWENTY_APP_ACCESS_TOKEN: '', TWENTY_APP_APPLICATION_ACCESS_TOKEN: 'app' })).toBe(false);
  });
});
