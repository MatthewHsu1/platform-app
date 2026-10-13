import { useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { Trans, useSelectedRecordIds, useTranslate } from 'twenty-sdk/front-component';
import { Button, Input } from 'twenty-ui/primitives/input';

import { ClosablePanel, closePopUp, ErrorText, finishWith, usePopUpCall, useRunOnce } from 'src/shared/front-components/pop-up';
import { checkSelection } from 'src/shared/front-components/selection-check';
import { localToday } from 'src/shared/utils/local-today.util';
import { readWorkspaceMembers } from 'src/shared/front-components/read-workspace-members';
import { readStockStyles } from 'src/stock/stock-theme';
import { type WorkspaceMemberChoice } from 'src/shared/front-components/types/workspace-member-choice.type';
import {
  REQUEST_COUNT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  REQUEST_COUNT_ROUTE_PATH,
} from 'src/stock/stock-universal-identifiers.constant';


// "Show expected quantity" is a company setting (an app variable), so this pop-up does not carry it.
const RequestCount = () => {
  const { t } = useTranslate();
  const styles = readStockStyles();
  const selectedIds = useSelectedRecordIds();
  const { busy, error, setError, call } = usePopUpCall(t('The count could not be requested.'));
  const [members, setMembers] = useState<WorkspaceMemberChoice[]>([]);
  const [inventoryDate, setInventoryDate] = useState(localToday);
  const [assignedUserId, setAssignedUserId] = useState('');

  useRunOnce(() => {
    readWorkspaceMembers()
      .then(setMembers)
      .catch(() => setError(t('The users could not be read.')));
  });

  const confirm = async () => {
    const result = await call(REQUEST_COUNT_ROUTE_PATH, {
      quantIds: selectedIds,
      inventoryDate,
      assignedUserId: assignedUserId === '' ? null : assignedUserId,
    });

    if (result !== null) {
      await finishWith(t('Count requested.'));
    }
  };

  const selectionMessage = checkSelection(selectedIds.length, 'many');
  if (selectionMessage !== null) {
    return (
      <ClosablePanel
        message={null}
        error={t(selectionMessage)}
        busy={false}
        closeLabel={t('Close')}
      />
    );
  }

  return (
    <div style={styles.panel}>
      <div style={styles.title}>
        <Trans>Request a count</Trans>
      </div>
      <Input type="date" value={inventoryDate} onValueChange={setInventoryDate} />
      <select
        style={styles.select}
        title={t('Assign to')}
        value={assignedUserId}
        onChange={(event) => setAssignedUserId(event.target.value)}
      >
        <option value="">{t('Nobody')}</option>
        {members.map((member) => (
          <option key={member.id} value={member.id}>
            {[member.name?.firstName, member.name?.lastName].filter(Boolean).join(' ')}
          </option>
        ))}
      </select>
      <ErrorText error={error} />
      <div style={styles.buttons}>
        <Button size="sm" variant="solid" color="accent" disabled={busy} onClick={() => void confirm()}>
          {t('Confirm')}
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={closePopUp}>
          {t('Discard')}
        </Button>
      </div>
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: REQUEST_COUNT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'stock-quant-request-count',
  description: 'Schedules a count of the selected stock rows.',
  component: RequestCount,
});
