import 'twenty-ui/style.css';

import { useCallback, useEffect, useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { enqueueSnackbar, msg, useColorScheme, useTranslate } from 'twenty-sdk/front-component';
import { Section } from 'twenty-ui/components';
import { Button } from 'twenty-ui/primitives/input';
import { Card } from 'twenty-ui/primitives/surfaces';
import { ThemeProvider, themeCssVariables } from 'twenty-ui/theme';

import { ROLES_PAGE_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER, ROLES_ROUTE_PATHS } from 'src/roles/roles-universal-identifiers.constant';
import { type MemberLevels } from 'src/roles/types/member-levels.type';
import { type RolesPage } from 'src/roles/types/roles-page.type';
import { type RolesPageRow } from 'src/roles/types/roles-page-row.type';
import { describeRouteError } from 'src/shared/describe-route-error';
import { ChoiceSelect } from 'src/shared/front-components/choice-select';
import { postAppRoute } from 'src/shared/front-components/post-app-route';

// The routes answer these texts in the user's language; the translation extractor reads only
// front-component files, so they are listed here and each must match its source text exactly.
export const ROLES_ROUTE_TEXTS = [
  msg('Only an admin can change roles.'),
  msg('You cannot change your own role. Another admin must do it.'),
  msg("This person is an Admin. Change an Admin's role in Settings → Members."),
  msg('This person is not a member of the workspace any more.'),
  msg('Choose a person and their levels.'),
  msg('Another role change is running. Try again in a moment.'),
  msg('Saved. {name} now holds {role}.'),
];

// Module and level names come from the route as source text.
const NAME_TEXTS = {
  Inventory: msg('Inventory'),
  Products: msg('Products'),
  Sales: msg('Sales'),
  None: msg('None'),
  User: msg('User'),
  Administrator: msg('Administrator'),
  Create: msg('Create'),
  'Own Documents': msg('Own Documents'),
  'All Documents': msg('All Documents'),
};

const TEXT = {
  title: msg('Roles'),
  description: msg(
    "Each person gets the access of the levels you choose, added together. Employee is always included: it opens every object Platform does not own (Twenty's own, objects you make, other apps') with Member's rights. Admins keep Twenty's Admin role.",
  ),
  loading: msg('Loading the members…'),
  loadFailed: msg('Could not load the members. You need the Roles permission.'),
  saveFailed: msg('Could not save the roles.'),
  save: msg('Save'),
  saving: msg('Saving…'),
  admin: msg('Admin: every right, set in Settings → Members.'),
  self: msg('Another admin must change your role.'),
  handMade: msg('Holds a role made by hand: saving replaces it.'),
};

type PageState = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready'; page: RolesPage };

const noneLevels = (page: RolesPage): MemberLevels => Object.fromEntries(page.modules.map((module) => [module.key, module.levels[0]?.key ?? 'none']));

const RolesPageContent = () => {
  const { t } = useTranslate();
  const [state, setState] = useState<PageState>({ kind: 'loading' });
  const [drafts, setDrafts] = useState<Record<string, MemberLevels>>({});
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);
  const theme = themeCssVariables;
  const nameText = (name: string) => {
    const entry = Object.entries(NAME_TEXTS).find(([source]) => source === name)?.[1];

    return entry === undefined ? name : t(entry);
  };

  const load = useCallback(async () => {
    try {
      const page = await postAppRoute<RolesPage>(ROLES_ROUTE_PATHS.page, {});

      setState({ kind: 'ready', page });
      setDrafts(Object.fromEntries(page.rows.map((row) => [row.workspaceMemberId, row.levels ?? noneLevels(page)])));
    } catch (error) {
      setState({ kind: 'error', message: describeRouteError(error, t(TEXT.loadFailed)) });
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (row: RolesPageRow) => {
    setSavingMemberId(row.workspaceMemberId);
    try {
      const answer = await postAppRoute<{ message: string; warnings?: string[] }>(ROLES_ROUTE_PATHS.save, {
        workspaceMemberId: row.workspaceMemberId,
        levels: drafts[row.workspaceMemberId],
      });

      await enqueueSnackbar({ message: answer.message, variant: 'success' });
      if ((answer.warnings ?? []).length > 0) {
        await enqueueSnackbar({ message: (answer.warnings ?? []).join(' '), variant: 'warning' });
      }
      await load();
    } catch (error) {
      await enqueueSnackbar({ message: describeRouteError(error, t(TEXT.saveFailed)), variant: 'error' });
    } finally {
      setSavingMemberId(null);
    }
  };

  const muted = { color: theme.font.color.tertiary, fontSize: theme.font.size.md, margin: 0 };

  if (state.kind === 'loading') {
    return <p style={muted}>{t(TEXT.loading)}</p>;
  }
  if (state.kind === 'error') {
    return <p style={muted}>{state.message}</p>;
  }

  const { page } = state;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[6], fontFamily: theme.font.family, width: '100%' }}>
      <Section.Root>
        <Section.Header title={t(TEXT.title)} description={t(TEXT.description)} />
        <Card.Root rounded>
          {page.rows.map((row, index) => (
            <Card.Content key={row.workspaceMemberId} divider={index < page.rows.length - 1}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing[3], padding: `${theme.spacing[2]} ${theme.spacing[3]}` }}>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 220, flex: '1 1 220px' }}>
                  <span style={{ color: theme.font.color.primary, fontSize: theme.font.size.md }}>{row.name || row.email}</span>
                  <span style={muted}>{row.email}</span>
                  <span style={muted}>{row.roleLabel}</span>
                </div>
                {row.isAdmin ? (
                  <span style={muted}>{t(TEXT.admin)}</span>
                ) : (
                  <>
                    {page.modules.map((module) => (
                      <label key={module.key} style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[1], ...muted }}>
                        {nameText(module.label)}
                        <ChoiceSelect
                          value={drafts[row.workspaceMemberId]?.[module.key] ?? module.levels[0]?.key ?? 'none'}
                          options={module.levels.map((level) => ({ value: level.key, label: nameText(level.label) }))}
                          disabled={row.isSelf || savingMemberId !== null}
                          onChange={(value) =>
                            setDrafts((current) => ({ ...current, [row.workspaceMemberId]: { ...current[row.workspaceMemberId], [module.key]: value } }))
                          }
                        />
                      </label>
                    ))}
                    {row.isSelf ? (
                      <span style={muted}>{t(TEXT.self)}</span>
                    ) : (
                      <Button type="button" variant="solid" color="accent" disabled={savingMemberId !== null} onClick={() => void save(row)}>
                        {savingMemberId === row.workspaceMemberId ? t(TEXT.saving) : t(TEXT.save)}
                      </Button>
                    )}
                    {row.levels === null && !row.isSelf && <span style={muted}>{t(TEXT.handMade)}</span>}
                  </>
                )}
              </div>
            </Card.Content>
          ))}
        </Card.Root>
      </Section.Root>
    </div>
  );
};

const RolesPageView = () => {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider colorScheme={colorScheme}>
      <RolesPageContent />
    </ThemeProvider>
  );
};

export default defineFrontComponent({
  universalIdentifier: ROLES_PAGE_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'platform-roles',
  description: "Sets each person's building blocks: Inventory, Products and Sales levels.",
  component: RolesPageView,
});
