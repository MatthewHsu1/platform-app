import { MetadataApiClient } from 'twenty-client-sdk/metadata';

import { records } from 'src/shared/triggers/records';
import { type PrintoutFile } from 'src/stock/printing/types/printout-file.type';
import { type SavedPrintout } from 'src/stock/printing/types/saved-printout.type';
import { planPrintoutFiles } from 'src/stock/printing/utils/plan-printout-files.util';

// The file goes up with the app's token into the app-owned printouts field (the app role holds the
// upload right, a member may not), then the record keeps its newest printouts.
export const savePrintout = async ({
  objectSingular,
  objectPlural,
  recordId,
  printoutsFieldUniversalIdentifier,
  fileName,
  bytes,
}: {
  objectSingular: string;
  objectPlural: string;
  recordId: string;
  printoutsFieldUniversalIdentifier: string;
  fileName: string;
  bytes: Uint8Array;
}): Promise<SavedPrintout> => {
  const uploaded = await new MetadataApiClient({ runAs: 'application' }).uploadFile({
    fileBuffer: Buffer.from(bytes),
    filename: fileName,
    fieldMetadataUniversalIdentifier: printoutsFieldUniversalIdentifier,
  });
  const table = records(objectSingular, objectPlural);
  const [row] = await table.find<{ printouts: PrintoutFile[] | null }>({ id: { eq: recordId } }, 'printouts { fileId label }');

  await table.update(recordId, {
    printouts: planPrintoutFiles(row?.printouts ?? [], [{ fileId: uploaded.id, label: fileName }]),
  });

  return { name: fileName, url: uploaded.url, fileId: uploaded.id };
};
