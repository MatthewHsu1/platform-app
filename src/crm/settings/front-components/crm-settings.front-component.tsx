import 'twenty-ui/style.css';

import { useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { enqueueSnackbar, msg, useColorScheme, useTranslate } from 'twenty-sdk/front-component';
import { Button } from 'twenty-ui/primitives/input';
import { ThemeProvider } from 'twenty-ui/theme';

import { CRM_ASSIGNMENT_PLUG_POINT } from 'src/crm/assignment/plug/assignment-plug.constant';
import {
  CRM_SETTINGS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  SAVE_CRM_SETTINGS_ROUTE_PATH,
} from 'src/crm/settings/crm-settings-universal-identifiers.constant';
import { AssignmentSection } from 'src/crm/settings/front-components/components/assignment-section';
import { CrmSection } from 'src/crm/settings/front-components/components/crm-section';
import { PlugPointSection } from 'src/crm/settings/front-components/components/plug-point-section';
import { ScoringSection } from 'src/crm/settings/front-components/components/scoring-section';
import { readSettingsStyles } from 'src/crm/settings/front-components/components/settings-controls';
import { useCrmSettings } from 'src/crm/settings/front-components/use-crm-settings';
import { type CrmSettingsForm } from 'src/crm/settings/types/crm-settings-form.type';
import { type CrmSettingsPageData } from 'src/crm/settings/types/crm-settings-page-data.type';
import { type CrmSectionText } from 'src/crm/settings/types/crm-section-text.type';
import { type AssignmentSectionText } from 'src/crm/settings/types/assignment-section-text.type';
import { type ScoringSectionText } from 'src/crm/settings/types/scoring-section-text.type';
import { type PlugPointSectionText } from 'src/crm/settings/types/plug-point-section-text.type';
import { type RunSettingsRoute } from 'src/crm/settings/types/run-settings-route.type';
import { describeRouteError } from 'src/shared/describe-route-error';
import { postAppRoute } from 'src/shared/front-components/post-app-route';
import { type PlugPointConfig } from 'src/shared/plug/types/plug-point-config.type';

// The CRM settings and Update probabilities routes answer these texts in the
// user's language (src/crm/settings/crm-settings-messages.constant.ts,
// src/crm/scoring/scoring-messages.constant.ts). The translation extractor
// reads only front-component files, so they are listed here; each must match
// its source text exactly.
export const CRM_SETTINGS_TEXTS = [
  msg('Only a sales administrator can open the CRM settings.'),
  msg('Only a workspace administrator can change the CRM settings.'),
  msg('The CRM settings are not in the expected form.'),
  msg('The repeat interval must be a whole number above zero.'),
  msg('Use a larger unit instead of an interval of 100 or more.'),
  msg('The plug settings are not in the expected form.'),
  msg('Plug point {name} is not available.'),
  msg('Say whether {name} is on.'),
  msg('The target of {name} must be a route path starting with / or an https address.'),
  msg('The timeout of {name} must be 1 to 120 seconds.'),
  msg('Choose what {name} does on an error.'),
  msg('Choose a value for {key} of {name}.'),
  msg('Lead type default'),
  msg('Sales teams'),
  msg('Recurring revenue fields'),
];

export const SCORING_TEXTS = [
  msg('Only a workspace administrator can update the probabilities.'),
  msg('Choose the day from which leads are counted.'),
];

// What each section of the page shows.
const CRM_SECTION_TEXT: CrmSectionText = {
  title: msg('CRM'),
  leads: msg('Leads'),
  leadsHelp: msg('New records start as leads to qualify before they become opportunities.'),
  recurring: msg('Recurring revenues'),
  recurringHelp: msg('Opportunities get a recurring revenue and a recurring plan.'),
  multiTeams: msg('Multi teams'),
  multiTeamsHelp: msg('A salesperson may belong to several sales teams.'),
};

const ASSIGNMENT_SECTION_TEXT: AssignmentSectionText = {
  title: msg('Lead assignment'),
  ruleBased: msg('Rule-based assignment'),
  ruleBasedHelp: msg('Assign leads to sales teams and salespeople by their filters and capacity. Every sales team takes part unless it opts out.'),
  running: msg('Running'),
  manually: msg('Manually'),
  repeatedly: msg('Repeatedly'),
  assignmentDone: msg('Assignment done.'),
  assignNow: msg('Assign now'),
  repeatEvery: msg('Repeat every'),
  minutes: msg('Minutes'),
  hours: msg('Hours'),
  days: msg('Days'),
  weeks: msg('Weeks'),
  nextRun: msg('Next run (UTC)'),
};

const SCORING_SECTION_TEXT: ScoringSectionText = {
  title: msg('Lead scoring'),
  stage: msg('Stage'),
  summary: msg('The success rate is computed from {fields} of the leads created on or after {date}.'),
  rebuildNightly: msg('Rebuild the scoring counts every night'),
  countFrom: msg('Count leads created from'),
  updated: msg('Probabilities updated for {count} leads.'),
  update: msg('Update probabilities'),
  fieldLabels: {
    phoneState: msg('Phone quality'),
    emailState: msg('Email quality'),
    state: msg('State'),
    country: msg('Country'),
    source: msg('Source'),
    language: msg('Language'),
    tags: msg('Tags'),
  },
};

const PLUG_POINT_SECTION_TEXT: PlugPointSectionText = {
  title: msg('Plug point: lead assignment'),
  enabled: msg('Ask another app or service to assign leads'),
  target: msg('Target'),
  route: msg('Route of an app in this workspace'),
  url: msg('Outside https address'),
  timeout: msg('Timeout (seconds)'),
  onError: msg('On error'),
  useBuiltIn: msg('Use the built-in assignment'),
  skip: msg('Do nothing this run'),
  leftOut: msg('Leads the answer leaves out'),
  assignBuiltIn: msg('Assign them the built-in way'),
  leaveThem: msg('Leave them'),
  keySet: msg('Key (set; type to replace)'),
  keyNew: msg('Key for an outside address'),
};

const SettingsForm = ({ data, onSaved }: { data: CrmSettingsPageData; onSaved: () => void }) => {
  const { t } = useTranslate();
  const styles = readSettingsStyles();
  const [form, setForm] = useState<CrmSettingsForm>({ ...data, plugKey: null });
  const [isBusy, setIsBusy] = useState(false);
  const isReadOnly = !data.canSave || isBusy;
  const point = form.plugPoints.points[CRM_ASSIGNMENT_PLUG_POINT] as PlugPointConfig | undefined;
  const set = <TKey extends keyof CrmSettingsForm>(key: TKey, value: CrmSettingsForm[TKey]) => setForm((current) => ({ ...current, [key]: value }));
  const setPoint = (changes: Partial<PlugPointConfig>) =>
    setForm((current) => {
      const currentPoint = current.plugPoints.points[CRM_ASSIGNMENT_PLUG_POINT];

      return currentPoint === undefined
        ? current
        : { ...current, plugPoints: { ...current.plugPoints, points: { ...current.plugPoints.points, [CRM_ASSIGNMENT_PLUG_POINT]: { ...currentPoint, ...changes } } } };
    });

  const run: RunSettingsRoute = async (path, body, done, onSuccess) => {
    setIsBusy(true);
    try {
      const result = await postAppRoute<Record<string, unknown>>(path, body);
      const warnings = Array.isArray(result.warnings) ? result.warnings.map(String) : [];

      await enqueueSnackbar({ message: done(result), variant: 'success' });
      if (warnings.length > 0) {
        await enqueueSnackbar({ message: t('Saved, with problems: {problems}', { problems: warnings.join('; ') }), variant: 'warning' });
      }
      onSuccess?.();
    } catch (error) {
      await enqueueSnackbar({ message: describeRouteError(error, t('The request failed.')), variant: 'error' });
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div style={styles.page}>
      {data.canSave ? null : <p style={styles.muted}>{t('Only a workspace administrator can change these settings.')}</p>}
      <CrmSection text={CRM_SECTION_TEXT} form={form} isReadOnly={isReadOnly} set={set} />
      <AssignmentSection text={ASSIGNMENT_SECTION_TEXT} form={form} isReadOnly={isReadOnly} isBusy={isBusy} set={set} run={run} />
      <ScoringSection
        text={SCORING_SECTION_TEXT}
        form={form}
        plsStartDate={data.plsStartDate}
        plsFields={data.plsFields}
        canUpdateProbabilities={data.canUpdateProbabilities}
        isReadOnly={isReadOnly}
        isBusy={isBusy}
        set={set}
        run={run}
      />
      {point === undefined ? null : (
        <PlugPointSection
          text={PLUG_POINT_SECTION_TEXT}
          point={point}
          plugKey={form.plugKey}
          plugKeySet={data.plugKeySet}
          isReadOnly={isReadOnly}
          setPoint={setPoint}
          setPlugKey={(value) => set('plugKey', value)}
        />
      )}
      {data.canSave ? (
        <div>
          <Button variant="solid" color="accent" disabled={isBusy} onClick={() => void run(SAVE_CRM_SETTINGS_ROUTE_PATH, form, () => t('CRM settings saved.'), onSaved)}>
            {t('Save')}
          </Button>
        </div>
      ) : null}
    </div>
  );
};

const CrmSettingsContent = () => {
  const { t } = useTranslate();
  const { state, reload } = useCrmSettings(t('Could not load the CRM settings.'));
  const styles = readSettingsStyles();

  if (state.kind === 'loading') {
    return <p style={styles.muted}>{t('Loading the CRM settings…')}</p>;
  }
  if (state.kind === 'error') {
    return <p style={styles.muted}>{state.message}</p>;
  }

  return <SettingsForm key={JSON.stringify(state.data)} data={state.data} onSaved={() => void reload()} />;
};

const CrmSettingsPage = () => {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider colorScheme={colorScheme}>
      <CrmSettingsContent />
    </ThemeProvider>
  );
};

export default defineFrontComponent({
  universalIdentifier: CRM_SETTINGS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'crm-settings',
  description: 'Leads, recurring revenues, sales teams, lead assignment, lead scoring and plug points.',
  component: CrmSettingsPage,
});
