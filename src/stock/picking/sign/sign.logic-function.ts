import { initWasm, Resvg } from '@resvg/resvg-wasm';
import { MetadataApiClient } from 'twenty-client-sdk/metadata';
import { defineLogicFunction } from 'twenty-sdk/define';

import { readUserLocale } from 'src/shared/i18n/read-user-locale';
import { addNote } from 'src/shared/triggers/put-back';
import { records } from 'src/shared/triggers/records';
import { derivedId } from 'src/shared/utils/derived-id.util';
import { PICKING_FIELDS } from 'src/stock/page-layouts/field-ids';
import { RESVG_WASM_BASE64 } from 'src/stock/picking/sign/resvg-wasm-base64';
import { SIGN_MESSAGES } from 'src/stock/picking/sign/sign-messages.constant';
import { SIGNATURE_PAD } from 'src/stock/picking/sign/signature-pad.constant';
import { barcodePng } from 'src/stock/printing/barcode-png';
import { readPickingPrintData } from 'src/stock/printing/printables/read-picking-print-data';
import { savePrintout } from 'src/stock/printing/save-printout';
import { buildDeliverySlip } from 'src/stock/printing/utils/picking-documents.util';
import { isTimeZone } from 'src/stock/printing/utils/print-dates.util';
import { renderPdf } from 'src/stock/printing/utils/render-pdf.util';
import { filterReadableIds } from 'src/stock/stock-access';
import { StockUserError } from 'src/stock/stock-errors';
import { findAs } from 'src/stock/stock-person-writes';
import { PICKING_TYPE_CODE } from 'src/stock/stock-options.constant';
import { SIGN_ROUTE_PATH, SIGNATURE_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-printing-universal-identifiers.constant';
import { stockRouteHandler } from 'src/stock/stock-route';
import { orderSignedNote, readSignatureStrokes, signatureSvg, signedSlipFileName } from 'src/stock/utils/signature.util';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SIGNATURE_FILE_NAME = 'signature.png';
const pickings = records('stockPicking', 'stockPickings');

let wasmReady: Promise<void> | null = null;

const signaturePng = async (svg: string) => {
  wasmReady ??= initWasm(Buffer.from(RESVG_WASM_BASE64, 'base64'));
  await wasmReady;
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: SIGNATURE_PAD.width } });
  const image = resvg.render();

  try {
    return image.asPng();
  } finally {
    image.free();
    resvg.free();
  }
};

// The pop-up sends the browser's zone, so the slip's dates read as the signer's calendar shows them.
const readTimeZone = (value: unknown) => {
  if (value === undefined || value === null) {
    return 'UTC';
  }
  if (typeof value !== 'string' || !isTimeZone(value)) {
    throw new StockUserError(SIGN_MESSAGES.timeZoneNotValid);
  }

  return value;
};

// The signature is written last: a run that stops before it leaves the transfer unsigned, and a new
// sign saves the slip again under the same name and finds the note already there.
const handler = stockRouteHandler(async (body) => {
  const strokes = readSignatureStrokes(body.strokes, SIGNATURE_PAD.width, SIGNATURE_PAD.height);

  if (strokes === null) {
    throw new StockUserError(SIGN_MESSAGES.drawFirst);
  }
  const timeZone = readTimeZone(body.timeZone);
  const pickingId = typeof body.pickingId === 'string' && UUID.test(body.pickingId) ? body.pickingId : null;
  // The clicking user's row rules decide: a transfer they cannot read is not found.
  const [readableId] = pickingId === null ? [] : await filterReadableIds('stockPicking', 'stockPickings', [pickingId]);
  const [data] = readableId === undefined ? [] : await readPickingPrintData(findAs('person'), [readableId]);

  if (readableId === undefined || data === undefined) {
    throw new StockUserError(SIGN_MESSAGES.notFound);
  }
  if (data.pickingTypeCode !== PICKING_TYPE_CODE.OUTGOING) {
    throw new StockUserError(SIGN_MESSAGES.onlyDeliveries);
  }
  const [current] = await pickings.find<{ signature: { fileId: string }[] | null }>({ id: { eq: readableId } }, 'signature { fileId }');

  if ((current?.signature ?? []).length > 0) {
    throw new StockUserError(SIGN_MESSAGES.alreadySigned);
  }

  const png = await signaturePng(signatureSvg(strokes, SIGNATURE_PAD.width, SIGNATURE_PAD.height));
  const slip = await savePrintout({
    objectSingular: 'stockPicking',
    objectPlural: 'stockPickings',
    recordId: readableId,
    printoutsFieldUniversalIdentifier: PICKING_FIELDS.printouts,
    fileName: signedSlipFileName(data.name),
    bytes: await renderPdf(buildDeliverySlip([{ ...data, signaturePng: png, signatureFailed: false }], {}, { timeZone }), barcodePng),
  });
  // Only the transfer's own contact signs for it, not a contact taken from its first move.
  const note = orderSignedNote(data.hasTransferPartner ? data.partnerName : '', await readUserLocale());

  // A link to the file would stop working after a day, so the note names the slip on the transfer.
  await addNote({
    objectSingular: 'stockPicking',
    recordId: readableId,
    title: note,
    body: `${note}\n\n${slip.name}`,
    id: derivedId('sign', readableId),
  });
  const uploaded = await new MetadataApiClient({ runAs: 'application' }).uploadFile({
    fileBuffer: Buffer.from(png),
    filename: SIGNATURE_FILE_NAME,
    fieldMetadataUniversalIdentifier: PICKING_FIELDS.signature,
  });

  await pickings.update(readableId, { signature: [{ fileId: uploaded.id, label: SIGNATURE_FILE_NAME }] });

  return { files: [{ name: slip.name, url: slip.url }] };
});

export default defineLogicFunction({
  universalIdentifier: SIGNATURE_UNIVERSAL_IDENTIFIERS.logicFunction,
  name: 'platform-stock-picking-sign',
  description: 'Saves a delivery signature, the signed delivery slip on the transfer, and a note.',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: { path: SIGN_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
