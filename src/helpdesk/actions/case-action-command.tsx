import { Command, enqueueSnackbar, t, useSelectedRecordIds } from 'twenty-sdk/front-component';

import { checkSelection } from 'src/shared/front-components/selection-check';
import { describeRouteError } from 'src/shared/describe-route-error';
import { postAppRoute } from 'src/shared/front-components/post-app-route';

type MessageDescriptor = Exclude<Parameters<typeof t>[0], string>;

// A headless button: posts the selected work cases to its route and shows the result. Command closes the
// component only when execute resolves, so errors are caught; a thrown one would leave the button dead until
// the page reloads.
export const makeCaseActionCommand = ({
  routePath,
  successMessage,
  fallbackError,
}: {
  routePath: string;
  successMessage: MessageDescriptor;
  fallbackError: MessageDescriptor;
}) => {
  const CaseActionCommand = () => {
    const caseIds = useSelectedRecordIds();

    const execute = async () => {
      const selectionMessage = checkSelection(caseIds.length, 'many');
      if (selectionMessage !== null) {
        await enqueueSnackbar({ message: t(selectionMessage), variant: 'error' });
        return;
      }

      try {
        await postAppRoute(routePath, { caseIds });
        await enqueueSnackbar({ message: t(successMessage), variant: 'success' });
      } catch (error) {
        await enqueueSnackbar({ message: describeRouteError(error, t(fallbackError)), variant: 'error' });
      }
    };

    return <Command execute={execute} />;
  };

  return CaseActionCommand;
};
