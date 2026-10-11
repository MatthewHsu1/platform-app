import { useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { useSelectedRecordIds, useTranslate } from 'twenty-sdk/front-component';
import { Button, Input } from 'twenty-ui/primitives/input';

import { localToday } from 'src/shared/utils/local-today.util';
import { type SnoozePeriod } from 'src/stock/orderpoint/types/snooze-period.type';
import { snoozeUntil } from 'src/stock/orderpoint/utils/snooze-until.util';
import { ClosablePanel, closePopUp, ErrorText, finishWith, usePopUpCall } from 'src/shared/front-components/pop-up';
import { readStockStyles } from 'src/stock/stock-theme';
import { ORDERPOINT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS, ORDERPOINT_ROUTE_PATHS } from 'src/stock/stock-universal-identifiers.constant';
import { ChoiceSelect, FieldRow, PopupPanel } from 'src/stock/tracking-controls';

const Snooze = () => {
  const { t } = useTranslate();
  const styles = readStockStyles();
  const selectedIds = useSelectedRecordIds();
  const { busy, error, call } = usePopUpCall(t('Could not snooze.'));
  const [period, setPeriod] = useState<SnoozePeriod>('DAY');
  const [date, setDate] = useState(() => snoozeUntil('DAY', localToday()) ?? '');

  // A custom period keeps the date shown, for the person to change.
  const choosePeriod = (next: SnoozePeriod) => {
    setPeriod(next);
    setDate((current) => snoozeUntil(next, localToday()) ?? current);
  };

  const snooze = async () => {
    const result = await call<{ message: string }>(ORDERPOINT_ROUTE_PATHS.snooze, {
      orderpointIds: selectedIds,
      snoozedUntil: date,
    });

    if (result !== null) {
      await finishWith(result.message);
    }
  };

  if (selectedIds.length === 0) {
    return (
      <ClosablePanel
        message={null}
        error={t('Select all is not supported here. Tick the records you want instead.')}
        busy={false}
        closeLabel={t('Close')}
      />
    );
  }

  return (
    <PopupPanel title={t('Snooze')}>
      <FieldRow label={t('Snooze for')}>
        <ChoiceSelect
          value={period}
          onChange={choosePeriod}
          options={[
            { value: 'DAY', label: t('1 Day') },
            { value: 'WEEK', label: t('1 Week') },
            { value: 'MONTH', label: t('1 Month') },
            { value: 'CUSTOM', label: t('Custom') },
          ]}
        />
      </FieldRow>
      <FieldRow label={t('Snooze Date')}>
        <Input type="date" value={date} disabled={period !== 'CUSTOM'} onValueChange={setDate} />
      </FieldRow>
      <ErrorText error={error} />
      <div style={styles.buttons}>
        <Button size="sm" variant="solid" color="accent" disabled={busy || date === ''} onClick={() => void snooze()}>
          {t('Snooze')}
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={closePopUp}>
          {t('Discard')}
        </Button>
      </div>
    </PopupPanel>
  );
};

export default defineFrontComponent({
  universalIdentifier: ORDERPOINT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS.snooze,
  name: 'stock-orderpoint-snooze',
  description: 'Asks until when to hide the selected manual reordering rules.',
  component: Snooze,
});
