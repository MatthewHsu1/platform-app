import { defineFrontComponent } from 'twenty-sdk/define';
import { msg } from 'twenty-sdk/front-component';

import { PUT_IN_PACK_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/stock/package/actions/package-actions-universal-identifiers.constant';
import { PutInPackFlow } from 'src/stock/package/actions/put-in-pack-flow';
import { type PutInPackText } from 'src/stock/package/types/put-in-pack-text.type';

export const PUT_IN_PACK_TEXT: PutInPackText = {
  failed: msg('Could not put in pack.'),
  packed: msg('Packed.'),
  choicesUnread: msg('The choices could not be read.'),
  close: msg('Close'),
  destinationTitle: msg('Package Destination'),
  destinationExplanation: msg('The products go to different locations. Choose where the package goes.'),
  destinationLabel: msg('Destination location'),
  confirm: msg('Confirm'),
  discard: msg('Discard'),
  packageTitle: msg('Put in Pack'),
  packageTypeLabel: msg('Package Type'),
  noPackageType: msg('No package type'),
  packageLabel: msg('Package'),
  newPackage: msg('New package'),
  packing: msg('Packing…'),
  printoutsTitle: msg('Printouts'),
  printNames: {
    packageBarcodeSmall: msg('Package Barcode (PDF)'),
    packageBarcodeZpl: msg('Package Barcode (ZPL)'),
  },
};

const PutInPack = () => <PutInPackFlow text={PUT_IN_PACK_TEXT} />;

export default defineFrontComponent({
  universalIdentifier: PUT_IN_PACK_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'stock-put-in-pack',
  description: 'Packs lines or packages, asking for a destination or a package when needed.',
  component: PutInPack,
});
