import { readInChunks } from 'src/shared/utils/read-in-chunks.util';
import { findInOrder } from 'src/stock/printing/printables/read-package-print-data';
import { type ReceptionLabel } from 'src/stock/printing/types/reception-label.type';
import { type ReceptionPrintData } from 'src/stock/printing/types/reception-print-data.type';
import { type ReceptionPrintRequest } from 'src/stock/printing/types/reception-print-request.type';
import { readStockProducts } from 'src/stock/product/read-stock-products';
import { readReceptionData } from 'src/stock/reports/reception/read-reception-data';
import { PICKING_TYPE_CODE } from 'src/stock/stock-options.constant';
import { stockMoveMoveRels, stockMoves, stockPickings } from 'src/stock/stock-records';
import { readStockSettings } from 'src/stock/stock-settings';
import { receptionReportLines } from 'src/stock/utils/reception-report-lines.util';
import { type ReceptionSource } from 'src/stock/utils/types/reception-source.type';

type Address = {
  addressStreet1: string | null;
  addressStreet2: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressPostcode: string | null;
  addressCountry: string | null;
} | null;
type CompanyNode = { name: string | null; address: Address } | null;
type PersonNode = {
  name: { firstName: string | null; lastName: string | null } | null;
  phones: { primaryPhoneNumber: string | null; primaryPhoneCallingCode: string | null } | null;
  company: CompanyNode;
} | null;
type PickingRow = { id: string; name: string | null; state: string; person: PersonNode; company: CompanyNode };
type MoveRow = {
  id: string;
  createdAt: string;
  sequence: number | null;
  pickingId: string | null;
  productId: string;
  productUomQty: number | null;
};

// Twenty returns a nested to-one relation as null unless its deletedAt is selected.
const ADDRESS = 'address { addressStreet1 addressStreet2 addressCity addressState addressPostcode addressCountry }';
const PICKING_SELECTION = `id name state company { deletedAt name ${ADDRESS} }
  person { deletedAt name { firstName lastName } phones { primaryPhoneNumber primaryPhoneCallingCode } company { deletedAt name ${ADDRESS} } }`;

const text = (value: string | null | undefined) => value ?? '';
const compareText = (left: string, right: string) => (left < right ? -1 : left > right ? 1 : 0);

const addressLines = (address: Address) =>
  [
    address?.addressStreet1,
    address?.addressStreet2,
    [address?.addressPostcode, address?.addressCity, address?.addressState].filter(Boolean).join(' '),
    address?.addressCountry,
  ].filter((line): line is string => typeof line === 'string' && line !== '');

const partnerName = (picking: PickingRow | undefined) =>
  picking?.person
    ? [picking.person.name?.firstName, picking.person.name?.lastName].filter(Boolean).join(' ')
    : text(picking?.company?.name);

// The contact's name, address and phone, one per line. A person has no address of their own here:
// their company's stands in.
const partnerAddress = (picking: PickingRow | undefined) => {
  const phone = picking?.person?.phones?.primaryPhoneNumber ?? '';
  const callingCode = picking?.person?.phones?.primaryPhoneCallingCode ?? '';

  return [
    partnerName(picking),
    ...addressLines(picking?.person ? (picking.person.company?.address ?? null) : (picking?.company?.address ?? null)),
    phone === '' ? '' : `${callingCode} ${phone}`.trim(),
  ]
    .filter((line) => line !== '')
    .join('\n');
};

const readPickings = (ids: string[]) => findInOrder<PickingRow>(stockPickings, ids, PICKING_SELECTION);

// The report's lines, read as the app (the print page has no user), or why it cannot run.
const readLines = async (request: ReceptionPrintRequest) => {
  const data = await readReceptionData(request, 'application');

  return { data, result: receptionReportLines({ ...data, digits: readStockSettings().productUnitDigits }) };
};

export const readReceptionPrintData = async (request: ReceptionPrintRequest): Promise<ReceptionPrintData> => {
  const { data, result } = await readLines(request);

  if (result.kind === 'refused') {
    return { reason: result.reason, docs: [], sources: [] };
  }
  const pickings = new Map(
    (await readPickings([...result.docIds, ...result.sources.map((source) => source.pickingId)])).map((picking) => [picking.id, picking]),
  );
  const products = await readStockProducts(result.sources.flatMap((source) => source.lines.map((line) => line.productId)));

  return {
    reason: null,
    docs: result.docIds.flatMap((id) => {
      const picking = pickings.get(id);

      return picking === undefined ? [] : [{ name: text(picking.name), state: picking.state }];
    }),
    sources: result.sources.map((source) => ({
      name: source.pickingName,
      partnerName: partnerName(pickings.get(source.pickingId)),
      scheduledDate: source.scheduledDate,
      lines: source.lines.map((line) => ({
        productName: products.get(line.productId)?.displayName ?? '',
        quantity: line.quantity,
        uomName: data.products[line.productId]?.uomName ?? '',
        isAssigned: line.isAssigned,
      })),
    })),
  };
};

const labelsFor = async (
  entries: { productId: string; pickingId: string | null; demand: number }[],
): Promise<ReceptionLabel[]> => {
  const products = await readStockProducts(entries.map((entry) => entry.productId));
  const pickings = new Map(
    (await readPickings(entries.flatMap((entry) => (entry.pickingId === null ? [] : [entry.pickingId])))).map((picking) => [picking.id, picking]),
  );

  return entries.map((entry) => {
    const picking = entry.pickingId === null ? undefined : pickings.get(entry.pickingId);

    return {
      productDisplayName: products.get(entry.productId)?.displayName ?? '',
      sourceName: text(picking?.name),
      partnerAddress: partnerAddress(picking),
      demand: entry.demand,
    };
  });
};

// The labels the report's Print Labels gives: one per unit of each allocated quantity, at least one.
export const readAllocatedLabels = async (request: ReceptionPrintRequest): Promise<ReceptionLabel[]> => {
  const { result } = await readLines(request);

  if (result.kind === 'refused') {
    return [];
  }
  const allocated = result.sources.flatMap((source: ReceptionSource) =>
    source.lines
      .filter((line) => line.isAssigned)
      .map((line) => ({ productId: line.productId, pickingId: source.pickingId, demand: Math.max(1, Math.ceil(line.quantity)) })),
  );

  return labelsFor(allocated);
};

// The moves the receipts feed, one label per unit of their demand. Deliveries print none.
export const readDestinationLabels = async (pickingIds: string[]): Promise<ReceptionLabel[]> => {
  const receipts = (
    await findInOrder<{ id: string; pickingTypeCode: string | null; pickingType: { code: string | null } | null }>(
      stockPickings,
      pickingIds,
      'id pickingTypeCode pickingType { deletedAt code }',
    )
  ).filter((picking) => (picking.pickingTypeCode || picking.pickingType?.code) !== PICKING_TYPE_CODE.OUTGOING);
  const moves = (
    await readInChunks(
      receipts.map((picking) => picking.id),
      (part) => stockMoves.find<MoveRow>({ pickingId: { in: part } }, 'id createdAt sequence pickingId productId productUomQty'),
    )
  ).sort((left, right) => (left.sequence ?? 0) - (right.sequence ?? 0) || compareText(left.createdAt, right.createdAt));
  const links = await readInChunks(
    moves.map((move) => move.id),
    (part) => stockMoveMoveRels.find<{ moveOrigId: string; moveDestId: string }>({ moveOrigId: { in: part } }, 'moveOrigId moveDestId'),
  );
  const destIds = [
    ...new Set(moves.flatMap((move) => links.filter((link) => link.moveOrigId === move.id).map((link) => link.moveDestId))),
  ];
  const destinations = await findInOrder<MoveRow>(stockMoves, destIds, 'id createdAt sequence pickingId productId productUomQty');

  return labelsFor(
    destinations.map((move) => ({ productId: move.productId, pickingId: move.pickingId, demand: Math.ceil(move.productUomQty ?? 0) })),
  );
};
