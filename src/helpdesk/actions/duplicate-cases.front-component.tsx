import { defineFrontComponent } from 'twenty-sdk/define';
import { Command, enqueueSnackbar, msg, useSelectedRecordIds, useTranslate } from 'twenty-sdk/front-component';

import {
  DUPLICATE_CASES_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  DUPLICATE_CASES_ROUTE_PATH,
} from 'src/helpdesk/actions/helpdesk-actions-universal-identifiers.constant';
import { checkSelection } from 'src/shared/front-components/selection-check';
import { describeRouteError } from 'src/shared/describe-route-error';
import { postAppRoute } from 'src/shared/front-components/post-app-route';

// The messages of the Duplicate button, listed for the translation extractor.
export const DUPLICATE_CASES_TEXTS = [msg('{count} work cases copied.'), msg('Could not copy the work cases.')];

// A headless button: copies the ticked work cases and says how many. Command closes the component only when
// execute resolves, so errors are caught.
const DuplicateCases = () => {
  const { t } = useTranslate();
  const caseIds = useSelectedRecordIds();

  const execute = async () => {
    const selectionMessage = checkSelection(caseIds.length, 'many');
    if (selectionMessage !== null) {
      await enqueueSnackbar({ message: t(selectionMessage), variant: 'error' });
      return;
    }

    try {
      const result = await postAppRoute<{ copies: { from: string; to: string }[] }>(DUPLICATE_CASES_ROUTE_PATH, { caseIds });

      await enqueueSnackbar({ message: t('{count} work cases copied.', { count: result.copies.length }), variant: 'success' });
    } catch (error) {
      await enqueueSnackbar({ message: describeRouteError(error, t('Could not copy the work cases.')), variant: 'error' });
    }
  };

  return <Command execute={execute} />;
};

export default defineFrontComponent({
  universalIdentifier: DUPLICATE_CASES_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'duplicate-work-cases',
  description: 'Copies the ticked work cases.',
  isHeadless: true,
  component: DuplicateCases,
});
