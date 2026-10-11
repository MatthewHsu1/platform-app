import { Command, enqueueSnackbar, t, useSelectedRecordIds } from 'twenty-sdk/front-component';

import { describeRouteError } from 'src/shared/describe-route-error';
import { postAppRoute } from 'src/shared/front-components/post-app-route';

type MessageDescriptor = Exclude<Parameters<typeof t>[0], string>;

// A headless button: posts the selected leads to its route and shows the
// result. Command closes the component only when execute resolves, so errors
// are caught; a thrown one would leave the button dead until the page reloads.
export const makeLeadActionCommand = ({
  routePath,
  successMessage,
  fallbackError,
}: {
  routePath: string;
  successMessage: MessageDescriptor;
  fallbackError: MessageDescriptor;
}) => {
  const LeadActionCommand = () => {
    const leadIds = useSelectedRecordIds();

    const execute = async () => {
      // "Select all" hands the command no ids.
      if (leadIds.length === 0) {
        await enqueueSnackbar({
          message: t('Select all is not supported here. Tick the records you want instead.'),
          variant: 'error',
        });
        return;
      }

      try {
        await postAppRoute(routePath, { leadIds });
        await enqueueSnackbar({ message: t(successMessage), variant: 'success' });
      } catch (error) {
        await enqueueSnackbar({ message: describeRouteError(error, t(fallbackError)), variant: 'error' });
      }
    };

    return <Command execute={execute} />;
  };

  return LeadActionCommand;
};
