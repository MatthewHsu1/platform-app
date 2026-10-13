import { useTranslate } from 'twenty-sdk/front-component';
import { Section } from 'twenty-ui/components';
import { Card } from 'twenty-ui/primitives/surfaces';

import { Toggle } from 'src/crm/settings/front-components/components/settings-controls';
import { type CrmSettingsForm } from 'src/crm/settings/types/crm-settings-form.type';
import { type CrmSectionText } from 'src/crm/settings/types/crm-section-text.type';

type CrmSectionProps = {
  text: CrmSectionText;
  form: CrmSettingsForm;
  isReadOnly: boolean;
  set: <TKey extends keyof CrmSettingsForm>(key: TKey, value: CrmSettingsForm[TKey]) => void;
};

export const CrmSection = ({ text, form, isReadOnly, set }: CrmSectionProps) => {
  const { t } = useTranslate();

  return (
    <Section.Root>
      <Section.Header title={t(text.title)} />
      <Card.Root rounded>
        <Card.Content divider>
          <Toggle
            label={t(text.leads)}
            help={t(text.leadsHelp)}
            checked={form.useLeads}
            disabled={isReadOnly}
            onChange={(value) => set('useLeads', value)}
          />
        </Card.Content>
        <Card.Content divider>
          <Toggle
            label={t(text.recurring)}
            help={t(text.recurringHelp)}
            checked={form.useRecurringRevenues}
            disabled={isReadOnly}
            onChange={(value) => set('useRecurringRevenues', value)}
          />
        </Card.Content>
        <Card.Content>
          <Toggle
            label={t(text.multiTeams)}
            help={t(text.multiTeamsHelp)}
            checked={form.membershipMulti}
            disabled={isReadOnly}
            onChange={(value) => set('membershipMulti', value)}
          />
        </Card.Content>
      </Card.Root>
    </Section.Root>
  );
};
