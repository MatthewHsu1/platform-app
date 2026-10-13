import 'twenty-ui/style.css';

import { useCallback, useEffect, useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { enqueueSnackbar, msg, useColorScheme, useTranslate } from 'twenty-sdk/front-component';
import { Section } from 'twenty-ui/components';
import { Button } from 'twenty-ui/primitives/input';
import { Card } from 'twenty-ui/primitives/surfaces';
import { ThemeProvider } from 'twenty-ui/theme';

import { Row, Toggle, readSettingsStyles } from 'src/crm/settings/front-components/components/settings-controls';
import {
  HELPDESK_SETTINGS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  READ_HELPDESK_SETTINGS_ROUTE_PATH,
  SAVE_HELPDESK_SETTINGS_ROUTE_PATH,
} from 'src/helpdesk/settings/helpdesk-settings-universal-identifiers.constant';
import { type HelpdeskSettingsPageData } from 'src/helpdesk/settings/types/helpdesk-settings-page-data.type';
import { describeRouteError } from 'src/shared/describe-route-error';
import { ChoiceSelect } from 'src/shared/front-components/choice-select';
import { postAppRoute } from 'src/shared/front-components/post-app-route';

// The work case settings routes answer these texts in the user's language
// (src/helpdesk/settings/helpdesk-settings-messages.constant.ts). The translation extractor reads only
// front-component files, so they are listed here; each must match its source text exactly.
export const HELPDESK_SETTINGS_TEXTS = [
  msg('Only a work case administrator can change the work case settings.'),
  msg('Choose an existing stage.'),
  msg('The work case settings are not in the expected form.'),
];

const KEEP_STAGE = '';

type State = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready'; data: HelpdeskSettingsPageData };

const SettingsForm = ({ data, onSaved }: { data: HelpdeskSettingsPageData; onSaved: () => void }) => {
  const { t } = useTranslate();
  const styles = readSettingsStyles();
  const [autoAssign, setAutoAssign] = useState(data.autoAssign);
  const [duplicateTracking, setDuplicateTracking] = useState(data.duplicateTracking);
  const [duplicateStageId, setDuplicateStageId] = useState(data.duplicateStageId ?? KEEP_STAGE);
  const [isBusy, setIsBusy] = useState(false);
  const isReadOnly = !data.canEdit || isBusy;

  const save = async () => {
    setIsBusy(true);
    try {
      await postAppRoute(SAVE_HELPDESK_SETTINGS_ROUTE_PATH, {
        autoAssign,
        duplicateTracking,
        duplicateStageId: duplicateStageId === KEEP_STAGE ? null : duplicateStageId,
      });
      await enqueueSnackbar({ message: t('Work case settings saved.'), variant: 'success' });
      onSaved();
    } catch (error) {
      await enqueueSnackbar({ message: describeRouteError(error, t('The request failed.')), variant: 'error' });
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="platform-helpdesk-settings-page" style={styles.page}>
      {data.canEdit ? null : <p style={styles.muted}>{t('Only a workspace administrator or a work case administrator can change these settings.')}</p>}
      <Section.Root>
        <Section.Header title={t('Work cases')} />
        <Card.Root rounded>
          <Card.Content divider>
            <Toggle
              label={t('Assign new cases to their creator')}
              help={t('A case a staff member creates without an assignee goes to that staff member, if they belong to the case team.')}
              checked={autoAssign}
              disabled={isReadOnly}
              onChange={setAutoAssign}
            />
          </Card.Content>
          <Card.Content divider>
            <Toggle
              label={t('Track duplicates')}
              help={t('Allows the Mark as duplicate button on work cases.')}
              checked={duplicateTracking}
              disabled={isReadOnly}
              onChange={setDuplicateTracking}
            />
          </Card.Content>
          <Card.Content>
            <Row label={t('Stage for duplicates')}>
              <ChoiceSelect
                value={duplicateStageId}
                disabled={isReadOnly}
                options={[{ value: KEEP_STAGE, label: t('Keep the stage') }, ...data.stages.map((stage) => ({ value: stage.id, label: stage.name }))]}
                onChange={setDuplicateStageId}
              />
            </Row>
          </Card.Content>
        </Card.Root>
      </Section.Root>
      {data.canEdit ? (
        <div>
          <Button variant="solid" color="accent" disabled={isBusy} onClick={() => void save()}>
            {t('Save')}
          </Button>
        </div>
      ) : null}
    </div>
  );
};

const HelpdeskSettingsContent = () => {
  const { t } = useTranslate();
  const styles = readSettingsStyles();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const fallbackError = t('Could not load the work case settings.');

  const load = useCallback(async () => {
    try {
      setState({ kind: 'ready', data: await postAppRoute<HelpdeskSettingsPageData>(READ_HELPDESK_SETTINGS_ROUTE_PATH, {}) });
    } catch (error) {
      setState({ kind: 'error', message: describeRouteError(error, fallbackError) });
    }
  }, [fallbackError]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state.kind === 'loading') {
    return <p style={styles.muted}>{t('Loading the work case settings…')}</p>;
  }
  if (state.kind === 'error') {
    return <p style={styles.muted}>{state.message}</p>;
  }

  return <SettingsForm key={JSON.stringify(state.data)} data={state.data} onSaved={() => void load()} />;
};

const HelpdeskSettingsPage = () => {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider colorScheme={colorScheme}>
      <HelpdeskSettingsContent />
    </ThemeProvider>
  );
};

export default defineFrontComponent({
  universalIdentifier: HELPDESK_SETTINGS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'helpdesk-settings',
  description: 'Assigning new cases to their creator, duplicate tracking and the stage a duplicate moves to.',
  component: HelpdeskSettingsPage,
});
