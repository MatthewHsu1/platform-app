import { CASE_SEQUENCE_CODE } from 'src/helpdesk/helpdesk-options.constant';
import { CASE_SELECTION, loadCaseContext, readCaseRow } from 'src/helpdesk/load-case-context';
import { type CaseApi } from 'src/helpdesk/ticket/types/case-api.type';
import { nextNumberByCode } from 'src/base/sequence/next-number';
import { records } from 'src/shared/triggers/records';

const cases = records('helpdeskTicket', 'helpdeskTickets');

// Everything is read and written with the app token: the save rules run for the case, not for the person who saved.
export const TWENTY_CASE_API: CaseApi = {
  readCases: async (ids) =>
    ids.length === 0 ? [] : (await cases.find<Record<string, unknown>>({ id: { in: ids } }, CASE_SELECTION)).map(readCaseRow),
  loadContext: loadCaseContext,
  takeNumber: () => nextNumberByCode(CASE_SEQUENCE_CODE),
  writeCase: (id, data) => cases.update(id, data),
};
