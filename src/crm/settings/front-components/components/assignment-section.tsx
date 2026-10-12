import { useTranslate } from 'twenty-sdk/front-component';
import { Section } from 'twenty-ui/components';
import { Button, Input } from 'twenty-ui/primitives/input';
import { Card } from 'twenty-ui/primitives/surfaces';

import { ASSIGN_NOW_ROUTE_PATH } from 'src/crm/assignment/assignment-universal-identifiers.constant';
import { Row, Toggle } from 'src/crm/settings/front-components/components/settings-controls';
import { type CrmSettingsForm } from 'src/crm/settings/types/crm-settings-form.type';
import { type AssignmentSectionText } from 'src/crm/settings/types/assignment-section-text.type';
import { type RunSettingsRoute } from 'src/crm/settings/types/run-settings-route.type';
import { ChoiceSelect } from 'src/shared/front-components/choice-select';

type AssignmentSectionProps = {
  text: AssignmentSectionText;
  form: CrmSettingsForm;
  isReadOnly: boolean;
  isBusy: boolean;
  set: <TKey extends keyof CrmSettingsForm>(key: TKey, value: CrmSettingsForm[TKey]) => void;
  run: RunSettingsRoute;
};

// The repeat and next run show only while assignment runs repeatedly.
export const AssignmentSection = ({ text, form, isReadOnly, isBusy, set, run }: AssignmentSectionProps) => {
  const { t } = useTranslate();

  return (
    <Section.Root>
      <Section.Header title={t(text.title)} />
      <Card.Root rounded>
        <Card.Content divider={form.autoAssignment}>
          <Toggle
            label={t(text.ruleBased)}
            help={t(text.ruleBasedHelp)}
            checked={form.autoAssignment}
            disabled={isReadOnly}
            onChange={(value) => set('autoAssignment', value)}
          />
        </Card.Content>
        {form.autoAssignment ? (
          <Card.Content>
            <Row label={t(text.running)}>
              <ChoiceSelect
                value={form.autoAssignmentAction}
                options={[
                  { value: 'MANUAL', label: t(text.manually) },
                  { value: 'AUTO', label: t(text.repeatedly) },
                ]}
                disabled={isReadOnly}
                onChange={(value) => set('autoAssignmentAction', value)}
              />
              <Button
                size="sm"
                variant="outline"
                disabled={isBusy}
                onClick={() => void run(ASSIGN_NOW_ROUTE_PATH, {}, (result) => String(result.message ?? t(text.assignmentDone)))}
              >
                {t(text.assignNow)}
              </Button>
            </Row>
            {form.autoAssignmentAction === 'AUTO' ? (
              <>
                <Row label={t(text.repeatEvery)}>
                  <Input value={String(form.intervalNumber)} type="number" disabled={isReadOnly} onValueChange={(value) => set('intervalNumber', Number(value))} />
                  <ChoiceSelect
                    value={form.intervalType}
                    options={[
                      { value: 'MINUTES', label: t(text.minutes) },
                      { value: 'HOURS', label: t(text.hours) },
                      { value: 'DAYS', label: t(text.days) },
                      { value: 'WEEKS', label: t(text.weeks) },
                    ]}
                    disabled={isReadOnly}
                    onChange={(value) => set('intervalType', value)}
                  />
                </Row>
                <Row label={t(text.nextRun)}>
                  <Input
                    value={form.nextRun?.slice(0, 16) ?? ''}
                    type="datetime-local"
                    disabled={isReadOnly}
                    onValueChange={(value) => set('nextRun', value === '' ? null : new Date(`${value}:00.000Z`).toISOString())}
                  />
                </Row>
              </>
            ) : null}
          </Card.Content>
        ) : null}
      </Card.Root>
    </Section.Root>
  );
};
