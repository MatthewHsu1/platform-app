import { describe, expect, it } from 'vitest';

import { convertRequestCompanyId } from 'src/crm/lead/actions/utils/convert-request-company.util';

describe('convertRequestCompanyId', () => {
  it("sends no company while the Company field is hidden, even one taken from a found contact's company", () => {
    expect(convertRequestCompanyId({ showCompany: false, companyId: 'company-of-found-contact' })).toBeNull();
  });

  it('sends the company the Company field shows', () => {
    expect(convertRequestCompanyId({ showCompany: true, companyId: 'company-1' })).toBe('company-1');
    expect(convertRequestCompanyId({ showCompany: true, companyId: null })).toBeNull();
  });
});
