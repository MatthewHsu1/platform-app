// The convert dialog sends a company only while it shows the Company field:
// a company carried over from a found contact must not decide, unseen, where
// the new contact goes.
export const convertRequestCompanyId = ({ showCompany, companyId }: { showCompany: boolean; companyId: string | null }) =>
  showCompany ? companyId : null;
