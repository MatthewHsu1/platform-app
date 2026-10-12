import { useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { msg, useRecordId, useTranslate } from 'twenty-sdk/front-component';
import { Button } from 'twenty-ui/primitives/input';
import { themeCssVariables } from 'twenty-ui/theme';

import {
  SCORING_FACTORS_ROUTE_PATH,
  SCORING_TOOLTIP_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
} from 'src/crm/scoring/scoring-universal-identifiers.constant';
import { type TooltipEntry } from 'src/crm/scoring/types/tooltip-entry.type';
import { describeRouteError } from 'src/shared/describe-route-error';
import { ErrorText } from 'src/shared/front-components/pop-up';
import { readPopUpStyles } from 'src/shared/front-components/pop-up-styles';
import { postAppRoute } from 'src/shared/front-components/post-app-route';

// The scoring explanation route answers these texts in the user's language
// (src/crm/scoring/scoring-messages.constant.ts). The translation extractor
// reads only front-component files, so they are listed here; each must match
// its source text exactly.
export const SCORING_FACTORS_TEXTS = [
  msg('Only an open lead has a scoring explanation.'),
  msg('Correct'),
  msg('Incorrect'),
  msg('Not set'),
  msg('New'),
  msg('Exploration'),
  msg('Consulting'),
  msg('Belgium'),
];

type Explanation = { probability: number; teamName: string | null; usesSample: boolean; top: TooltipEntry[]; low: TooltipEntry[] };

const EntryList = ({ entries }: { entries: TooltipEntry[] }) => {
  const theme = themeCssVariables;
  const tagBackgrounds: Record<string, string> = theme.tag.background;
  const tagTexts: Record<string, string> = theme.tag.text;

  return (
    <ul style={{ margin: 0, paddingLeft: theme.spacing[4] }}>
      {entries.map((entry) => {
        const background = entry.color === null ? undefined : tagBackgrounds[entry.color];

        return (
          <li key={`${entry.variable}-${entry.label}`}>
            {background === undefined ? (
              entry.label
            ) : (
              <span
                style={{
                  padding: `0 ${theme.spacing[1]}`,
                  borderRadius: theme.border.radius.sm,
                  background,
                  color: entry.color === null ? undefined : tagTexts[entry.color],
                }}
              >
                {entry.label}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
};

const ScoringTooltip = () => {
  const { t } = useTranslate();
  const recordId = useRecordId();
  const styles = readPopUpStyles();
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const explain = async () => {
    if (recordId === null) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      setExplanation(await postAppRoute<Explanation>(SCORING_FACTORS_ROUTE_PATH, { leadId: recordId }));
    } catch (caught) {
      setError(describeRouteError(caught, t('Could not explain the probability.')));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.panel}>
      <div>
        <Button size="sm" variant="outline" disabled={isLoading} onClick={() => void explain()}>
          {t('Explain the automated probability')}
        </Button>
      </div>
      <ErrorText error={error} />
      {explanation === null ? null : (
        <>
          <div style={styles.title}>{t('Automated probability: {probability} %', { probability: explanation.probability })}</div>
          {explanation.teamName === null ? null : (
            <div style={styles.muted}>{t('Based on the leads of {team}', { team: explanation.teamName })}</div>
          )}
          {explanation.usesSample ? <div style={styles.muted}>{t('Not enough closed leads yet; these are example values.')}</div> : null}
          <div>{t('Raise the chance')}</div>
          {explanation.top.length === 0 ? <div style={styles.muted}>{t('Nothing stands out.')}</div> : <EntryList entries={explanation.top} />}
          <div>{t('Lower the chance')}</div>
          {explanation.low.length === 0 ? <div style={styles.muted}>{t('Nothing stands out.')}</div> : <EntryList entries={explanation.low} />}
        </>
      )}
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: SCORING_TOOLTIP_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'lead-scoring-tooltip',
  description: 'Shows which values of the lead raise or lower its automated probability.',
  component: ScoringTooltip,
});
