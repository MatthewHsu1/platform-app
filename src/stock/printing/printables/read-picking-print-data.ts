import { type Records } from 'src/shared/triggers/records';
import { chunks } from 'src/shared/utils/chunks.util';
import { findIn } from 'src/stock/printing/print-rows';
import { stockPackageHistories, stockPackageHistoryPickingLinks, stockPackages } from 'src/stock/package/package-records';
import { type PickingPrintBackorderMove } from 'src/stock/printing/types/picking-print-backorder-move.type';
import { type PickingPrintData } from 'src/stock/printing/types/picking-print-data.type';
import { type PickingPrintMove } from 'src/stock/printing/types/picking-print-move.type';
import { type PickingPrintPackageHistory } from 'src/stock/printing/types/picking-print-package-history.type';
import {
  backorderChains,
  orderMoveLines,
  outermostOpenPackages,
  pickingContacts,
  pickingWarningText,
  plainNoteText,
} from 'src/stock/printing/utils/picking-print-data.util';
import { PICKING_STATE, PICKING_TYPE_CODE, PRODUCT_TRACKING } from 'src/stock/stock-options.constant';
import { stockMoveLines, stockMoves, stockPickings } from 'src/stock/stock-records';
import { readStockSettings } from 'src/stock/stock-settings';
import { type RowFinder } from 'src/stock/types/row-finder.type';

type Address = {
  addressStreet1: string | null;
  addressStreet2: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressPostcode: string | null;
  addressCountry: string | null;
};
type CompanyNode = { name: string | null; address: Address | null; pickingWarnMsg?: string | null };
type FullName = { firstName: string | null; lastName: string | null };
type PersonNode = { name: FullName | null; address?: Address | null; pickingWarnMsg?: string | null; company: CompanyNode | null };
type PickingNode = {
  id: string;
  name: string | null;
  origin: string | null;
  state: string;
  pickingTypeCode: PickingPrintData['pickingTypeCode'] | null;
  scheduledDate: string | null;
  dateDone: string | null;
  note: { markdown: string | null } | null;
  person: PersonNode | null;
  company: CompanyNode | null;
  responsibleUser: { name: FullName | null } | null;
  pickingType: { code: PickingPrintData['pickingTypeCode'] | null; warehouse: { name: string | null; partner: CompanyNode | null } | null } | null;
  location: { warehouse: { partner: CompanyNode | null } | null } | null;
  signature: { url: string | null }[] | null;
};
type BackorderNode = { id: string; backorderId: string; state: string };
type MoveNode = {
  id: string;
  pickingId: string;
  sequence: number | null;
  createdAt: string;
  state: string;
  productId: string | null;
  productUomQty: number | null;
  quantity: number | null;
  descriptionPicking: string | null;
  packagingUomQty: number | null;
  product: { name: string | null; barcode: string | null; productTmpl: { tracking: string | null } | null } | null;
  productUom: { name: string | null; factor: number | null } | null;
  packagingUom: { name: string | null; factor: number | null } | null;
  person: PersonNode | null;
  company: CompanyNode | null;
};
type LineNode = {
  moveId: string;
  createdAt: string;
  quantity: number | null;
  isEntirePack: boolean | null;
  lotName: string | null;
  lot: { name: string | null; expirationDate: string | null } | null;
  product: { name: string | null } | null;
  productUom: { name: string | null } | null;
  location: { completeName: string | null } | null;
  locationDest: { completeName: string | null } | null;
  packageId: string | null;
  package: { name: string | null } | null;
  resultPackageId: string | null;
  resultPackage: { name: string | null } | null;
  packageHistoryId: string | null;
};
type HistoryNode = {
  id: string;
  packageId: string;
  packageName: string | null;
  package: { name: string | null } | null;
  location: { completeName: string | null } | null;
  locationDest: { completeName: string | null } | null;
  parentOrigName: string | null;
  parentDestId: string | null;
  parentDestName: string | null;
  outermostDestId: string | null;
};
type PackageNode = {
  id: string;
  name: string | null;
  packageDestId: string | null;
  location: { completeName: string | null } | null;
  parentPackage: { name: string | null } | null;
  packageDest: { name: string | null } | null;
};

const ID_CHUNK = 200;

// Twenty returns a nested to-one relation as null unless its deletedAt is selected.
const ADDRESS = 'address { addressStreet1 addressStreet2 addressCity addressState addressPostcode addressCountry }';
const COMPANY = `id deletedAt name ${ADDRESS}`;
const PERSON = `id deletedAt name { firstName lastName } ${ADDRESS} company { ${COMPANY} }`;
const PICKING_SELECTION = `id name origin state pickingTypeCode scheduledDate dateDone note { markdown }
  person { id deletedAt name { firstName lastName } ${ADDRESS} pickingWarnMsg company { ${COMPANY} pickingWarnMsg } }
  company { ${COMPANY} pickingWarnMsg }
  responsibleUser { deletedAt name { firstName lastName } }
  pickingType { deletedAt code warehouse { deletedAt name partner { ${COMPANY} } } }
  location { deletedAt warehouse { deletedAt partner { ${COMPANY} } } }
  signature { fileId label url }`;
const MOVE_SELECTION = `id pickingId sequence createdAt state productId productUomQty quantity descriptionPicking packagingUomQty
  product { deletedAt name barcode productTmpl { deletedAt tracking } }
  productUom { deletedAt name factor } packagingUom { deletedAt name factor }
  person { ${PERSON} } company { ${COMPANY} }`;
const LINE_SELECTION = `moveId createdAt quantity isEntirePack lotName lot { id deletedAt name expirationDate }
  product { deletedAt name } productUom { deletedAt name }
  location { deletedAt completeName } locationDest { deletedAt completeName }
  packageId package { id deletedAt name } resultPackageId resultPackage { id deletedAt name } packageHistoryId`;
const HISTORY_SELECTION = `id packageId packageName package { id deletedAt name }
  location { deletedAt completeName } locationDest { deletedAt completeName }
  parentOrigName parentDestId parentDestName outermostDestId`;
const PACKAGE_SELECTION = `id name packageDestId location { deletedAt completeName }
  parentPackage { id deletedAt name } packageDest { id deletedAt name }`;

const text = (value: string | null | undefined) => value ?? '';
const fullName = (name: FullName | null | undefined) => [name?.firstName, name?.lastName].filter(Boolean).join(' ');
const addressText = (address: Address | null | undefined) =>
  [
    address?.addressStreet1,
    address?.addressStreet2,
    [address?.addressPostcode, address?.addressCity, address?.addressState].filter(Boolean).join(' '),
    address?.addressCountry,
  ]
    .filter(Boolean)
    .join('\n');
const contactText = (company: CompanyNode | null | undefined) =>
  [text(company?.name), addressText(company?.address)].filter((part) => part !== '').join('\n');
const contactOf = (person: PersonNode | null, company: CompanyNode | null) =>
  person !== null
    ? {
        kind: 'person' as const,
        name: fullName(person.name),
        address: addressText(person.address),
        company: person.company === null ? null : { name: text(person.company.name), address: addressText(person.company.address) },
      }
    : company !== null
      ? { kind: 'company' as const, name: text(company.name), address: addressText(company.address) }
      : null;

const findInChunks = async <TRow>(find: RowFinder, of: Records, field: string, ids: string[], selection: string) => {
  const rows: TRow[] = [];

  for (const part of chunks([...new Set(ids)], ID_CHUNK)) {
    rows.push(...(await findIn<TRow>(find, of, { [field]: { in: part } }, selection)));
  }

  return rows;
};

const groupBy = <TRow>(rows: TRow[], keyOf: (row: TRow) => string) => {
  const groups = new Map<string, TRow[]>();

  for (const row of rows) {
    groups.set(keyOf(row), [...(groups.get(keyOf(row)) ?? []), row]);
  }

  return groups;
};

const readBackorders = async (find: RowFinder, pickingIds: string[]) => {
  const found: BackorderNode[] = [];
  const seen = new Set(pickingIds);
  let parents = pickingIds;

  while (parents.length > 0) {
    const children = (await findInChunks<BackorderNode>(find, stockPickings, 'backorderId', parents, 'id backorderId state')).filter(
      (child) => !found.some((known) => known.id === child.id),
    );

    found.push(...children);
    parents = children.map((child) => child.id).filter((id) => !seen.has(id));
    parents.forEach((id) => seen.add(id));
  }

  return found;
};

// Packages a line is headed into, and every container above them, read level by level.
const readOpenPackages = async (find: RowFinder, packageIds: string[]) => {
  const packages = new Map<string, PackageNode>();
  let wanted = [...new Set(packageIds)];

  while (wanted.length > 0) {
    const found = await findInChunks<PackageNode>(find, stockPackages, 'id', wanted, PACKAGE_SELECTION);

    found.forEach((node) => packages.set(node.id, node));
    wanted = [...new Set(found.flatMap((node) => (node.packageDestId === null ? [] : [node.packageDestId])))].filter(
      (id) => !packages.has(id),
    );
  }

  return new Map(
    [...packages.values()].map((node) => [
      node.id,
      {
        id: node.id,
        name: text(node.name),
        packageDestId: node.packageDestId,
        location: text(node.location?.completeName),
        parentPackageName: text(node.parentPackage?.name),
        packageDestName: text(node.packageDest?.name),
      },
    ]),
  );
};

const readPackageHistories = async (find: RowFinder, pickingIds: string[]) => {
  const links = await findInChunks<{ stockPackageHistoryId: string; stockPickingId: string }>(
    find,
    stockPackageHistoryPickingLinks,
    'stockPickingId',
    pickingIds,
    'stockPackageHistoryId stockPickingId',
  );
  const histories = await findInChunks<HistoryNode>(
    find,
    stockPackageHistories,
    'id',
    links.map((link) => link.stockPackageHistoryId),
    HISTORY_SELECTION,
  );
  const historyById = new Map(
    histories.map((history): [string, PickingPrintPackageHistory] => [
      history.id,
      {
        id: history.id,
        packageId: history.packageId,
        packageName: text(history.package?.name),
        completeName: text(history.packageName),
        from: text(history.location?.completeName),
        parentOrigName: text(history.parentOrigName),
        to: text(history.locationDest?.completeName),
        parentDestId: history.parentDestId,
        parentDestName: text(history.parentDestName),
        outermostDestId: history.outermostDestId,
      },
    ]),
  );

  return groupBy(
    links.flatMap((link) => {
      const history = historyById.get(link.stockPackageHistoryId);

      return history === undefined ? [] : [{ pickingId: link.stockPickingId, history }];
    }),
    (row) => row.pickingId,
  );
};

// A slip whose signature cannot be fetched still prints, saying so, and the failure is logged:
// the print page has no other place to report it. The signed link names the server's public
// address; the file is fetched through the address this function reaches the server by.
const readSignature = async (pickingName: string, signature: PickingNode['signature']) => {
  const url = signature?.[0]?.url;

  if (url === null || url === undefined || url === '') {
    return { png: null, failed: false };
  }
  let failure: string;

  try {
    const signed = new URL(url);
    const response = await fetch(new URL(`${signed.pathname}${signed.search}`, process.env.TWENTY_API_URL));

    if (response.ok) {
      return { png: new Uint8Array(await response.arrayBuffer()), failed: false };
    }
    failure = `HTTP ${response.status}`;
  } catch (error) {
    failure = error instanceof Error ? error.message : String(error);
  }
  console.error(`Could not load the signature of transfer ${pickingName}: ${failure}`);

  return { png: null, failed: true };
};

const byPosition = (left: MoveNode, right: MoveNode) =>
  (left.sequence ?? 0) - (right.sequence ?? 0) || (left.createdAt < right.createdAt ? -1 : left.createdAt > right.createdAt ? 1 : 0);

// How many packaging units one unit of the move holds: both units count in the same reference unit.
const packagingFactorOf = (move: MoveNode) =>
  move.packagingUom === null || !move.packagingUom.factor || !move.productUom?.factor
    ? null
    : move.productUom.factor / move.packagingUom.factor;

const toPrintMove = (move: MoveNode, lines: LineNode[]): PickingPrintMove => ({
  productId: text(move.productId),
  productName: text(move.product?.name),
  productBarcode: text(move.product?.barcode),
  descriptionPicking: text(move.descriptionPicking),
  state: move.state,
  demand: move.productUomQty ?? 0,
  quantity: move.quantity ?? 0,
  uomName: text(move.productUom?.name),
  packagingUomName: move.packagingUom?.name ?? null,
  packagingQty: move.packagingUomQty ?? 0,
  packagingFactor: packagingFactorOf(move),
  isTracked: (move.product?.productTmpl?.tracking ?? PRODUCT_TRACKING.NONE) !== PRODUCT_TRACKING.NONE,
  lines: orderMoveLines(lines.map((line) => ({ ...line, resultPackageName: text(line.resultPackage?.name) }))).map((line) => ({
    productName: text(line.product?.name),
    lotName: text(line.lot?.name) || text(line.lotName),
    lotBarcode: text(line.lot?.name) || text(line.lotName),
    quantity: line.quantity ?? 0,
    uomName: text(line.productUom?.name),
    from: text(line.location?.completeName),
    to: text(line.locationDest?.completeName),
    packageName: text(line.package?.name),
    resultPackageId: line.resultPackageId,
    resultPackageName: line.resultPackageName,
    packageHistoryId: line.packageHistoryId,
    isEntirePack: line.isEntirePack === true,
    expirationDate: line.lot?.expirationDate ?? null,
  })),
});

const toBackorderMove = (
  move: MoveNode,
  backorder: { state: string; isDirect: boolean },
  hasLines: boolean,
): PickingPrintBackorderMove => ({
  pickingId: move.pickingId,
  pickingState: backorder.state,
  isDirectBackorder: backorder.isDirect,
  productId: text(move.productId),
  productName: text(move.product?.name),
  descriptionPicking: text(move.descriptionPicking),
  state: move.state,
  demand: move.productUomQty ?? 0,
  quantity: move.quantity ?? 0,
  uomName: text(move.productUom?.name),
  packagingUomName: move.packagingUom?.name ?? null,
  hasLines,
});

// Runs on the public print page with no signed-in person: the ids were checked as the person
// who asked for the print, so everything here reads as the application. Ids with no row
// (deleted since) are left out.
export const readPickingPrintData = async (find: RowFinder, pickingIds: string[]): Promise<PickingPrintData[]> => {
  const pickings = await findInChunks<PickingNode>(find, stockPickings, 'id', pickingIds, PICKING_SELECTION);
  const printedIds = pickings.map((picking) => picking.id);
  const backorders = await readBackorders(find, printedIds);
  const chains = backorderChains(printedIds, backorders);
  const moves = await findInChunks<MoveNode>(
    find,
    stockMoves,
    'pickingId',
    [...printedIds, ...backorders.map((backorder) => backorder.id)],
    MOVE_SELECTION,
  );
  const lines = await findInChunks<LineNode>(find, stockMoveLines, 'moveId', moves.map((move) => move.id), LINE_SELECTION);
  const movesByPicking = groupBy([...moves].sort(byPosition), (move) => move.pickingId);
  const linesByMove = groupBy(lines, (line) => line.moveId);
  const pickingById = new Map(pickings.map((picking) => [picking.id, picking]));
  const historiesByPicking = await readPackageHistories(
    find,
    pickings.filter((picking) => picking.state === PICKING_STATE.DONE).map((picking) => picking.id),
  );
  const openPickingIds = new Set(pickings.filter((picking) => picking.state !== PICKING_STATE.DONE).map((picking) => picking.id));
  const entireLinesOf = (pickingId: string) =>
    (movesByPicking.get(pickingId) ?? [])
      .flatMap((move) => linesByMove.get(move.id) ?? [])
      .filter((line) => line.isEntirePack === true && line.packageId !== null);
  const openPackages = await readOpenPackages(
    find,
    [...openPickingIds].flatMap((id) => entireLinesOf(id).map((line) => line.packageId ?? '')),
  );
  const unitDigits = readStockSettings().productUnitDigits;

  return Promise.all(
    pickingIds.flatMap((id) => {
      const picking = pickingById.get(id);

      if (picking === undefined) {
        return [];
      }
      const ownMoves = movesByPicking.get(id) ?? [];
      const firstMove = ownMoves[0];
      const transferContact = contactOf(picking.person, picking.company);
      const warehousePartner = picking.pickingType?.warehouse?.partner ?? null;
      const chainMoves = (chains.get(id) ?? []).flatMap((backorder) =>
        (movesByPicking.get(backorder.id) ?? []).map((move) => toBackorderMove(move, backorder, linesByMove.has(move.id))),
      );

      return [
        (async (): Promise<PickingPrintData> => {
          const signature = await readSignature(text(picking.name), picking.signature);

          return {
            id: picking.id,
            name: text(picking.name),
            origin: text(picking.origin),
            state: picking.state,
            pickingTypeCode: picking.pickingTypeCode ?? picking.pickingType?.code ?? PICKING_TYPE_CODE.INTERNAL,
            scheduledDate: picking.scheduledDate,
            dateDone: picking.dateDone,
            ...pickingContacts(transferContact, firstMove === undefined ? null : contactOf(firstMove.person, firstMove.company)),
            responsibleName: fullName(picking.responsibleUser?.name),
            note: plainNoteText(text(picking.note?.markdown)),
            warningText: pickingWarningText(
              (picking.person ?? picking.company)?.pickingWarnMsg ?? null,
              picking.person?.company?.pickingWarnMsg ?? null,
            ),
            warehouseName: text(warehousePartner?.name) || text(picking.pickingType?.warehouse?.name),
            warehouseAddress: warehousePartner === null ? '' : contactText(warehousePartner),
            sourceWarehouseAddress: contactText(picking.location?.warehouse?.partner),
            unitDigits,
            moves: ownMoves.map((move) => toPrintMove(move, linesByMove.get(move.id) ?? [])),
            backorderMoves: chainMoves,
            packageHistories: (historiesByPicking.get(id) ?? []).map((row) => row.history),
            openPackages: openPickingIds.has(id)
              ? outermostOpenPackages(
                  entireLinesOf(id).map((line) => ({ packageId: line.packageId ?? '', to: text(line.locationDest?.completeName) })),
                  openPackages,
                )
              : [],
            signaturePng: signature.png,
            signatureFailed: signature.failed,
          };
        })(),
      ];
    }),
  );
};
