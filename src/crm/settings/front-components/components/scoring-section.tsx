import { useState } from 'react';
import { useTranslate } from 'twenty-sdk/front-component';
import { Section } from 'twenty-ui/components';
import { Button, Input } from 'twenty-ui/primitives/input';
import { Card } from 'twenty-ui/primitives/surfaces';

import { UPDATE_PROBABILITIES_ROUTE_PATH } from 'src/crm/scoring/scoring-universal-identifiers.constant';
import { PLS_FIELD_KEYS } from 'src/crm/scoring/scoring-variables.constant';
import { type PlsFieldKey } from 'src/crm/scoring/types/pls-field-key.type';
import { readSettingsStyles, Row, Toggle } from 'src/crm/settings/front-components/components/settings-controls';
import { type CrmSettingsForm } from 'src/crm/settings/types/crm-settings-form.type';
import { type RunSettingsRoute } from 'src/crm/settings/types/run-settings-route.type';
import { type ScoringSectionText } from 'src/crm/settings/types/scoring-section-text.type';

// The page shows eight days ago for an empty start date; it is stored only
// when an administrator updates the probabilities.
const eightDaysAgo = () => new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

type ScoringSectionProps = {
  text: ScoringSectionText;
  form: CrmSettingsForm;
  plsStartDate: string | null;
  plsFields: PlsFieldKey[];
  canUpdateProbabilities: boolean;
  isReadOnly: boolean;
  isBusy: boolean;
  set: <TKey extends keyof CrmSettingsForm>(key: TKey, value: CrmSettingsForm[TKey]) => void;
  run: RunSettingsRoute;
};

// Update probabilities stores its own start date and fields; the summary
// follows them without reloading the page, so other unsaved edits stay.
export const ScoringSection = ({ text, form, plsStartDate, plsFields, canUpdateProbabilities, isReadOnly, isBusy, set, run }: ScoringSectionProps) => {
  const { t } = useTranslate();
  const styles = readSettingsStyles();
  const [startDate, setStartDate] = useState(plsStartDate ?? eightDaysAgo());
  const [fields, setFields] = useState<PlsFieldKey[]>(plsFields);
  const [counted, setCounted] = useState({ date: plsStartDate ?? eightDaysAgo(), fields: plsFields });
  const scoredOn = [t(text.stage), ...counted.fields.map((key) => t(text.fieldLabels[key]))].join(', ');

  return (
    <Section.Root>
      <Section.Header title={t(text.title)} />
      <Card.Root rounded>
        <Card.Content divider>
          <div style={styles.column}>
            <span style={styles.muted}>
              {t(text.summary, { fields: scoredOn, date: counted.date })}
            </span>
          </div>
          <Toggle
            label={t(text.rebuildNightly)}
            checked={form.plsRebuildCron}
            disabled={isReadOnly}
            onChange={(value) => set('plsRebuildCron', value)}
          />
        </Card.Content>
        {canUpdateProbabilities ? (
          <Card.Content>
            <Row label={t(text.countFrom)}>
              <Input value={startDate} type="date" disabled={isBusy} onValueChange={setStartDate} />
            </Row>
            <div style={styles.row}>
              {PLS_FIELD_KEYS.map((key) => (
                <label key={key} style={styles.label}>
                  <input
                    type="checkbox"
                    checked={fields.includes(key)}
                    disabled={isBusy}
                    onChange={(event) =>
                      setFields((current) =>
                        event.target.checked
                          ? PLS_FIELD_KEYS.filter((candidate) => candidate === key || current.includes(candidate))
                          : current.filter((candidate) => candidate !== key),
                      )
                    }
                  />
                  {t(text.fieldLabels[key])}
                </label>
              ))}
            </div>
            <div style={styles.row}>
              <Button
                size="sm"
                variant="outline"
                disabled={isBusy}
                onClick={() =>
                  void run(
                    UPDATE_PROBABILITIES_ROUTE_PATH,
                    { startDate, fields },
                    (result) => t(text.updated, { count: String(result.leadsWritten ?? 0) }),
                    () => setCounted({ date: startDate, fields }),
                  )
                }
              >
                {t(text.update)}
              </Button>
            </div>
          </Card.Content>
        ) : null}
      </Card.Root>
    </Section.Root>
  );
};
