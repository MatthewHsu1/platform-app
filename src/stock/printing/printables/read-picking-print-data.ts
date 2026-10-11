import { type Records } from 'src/shared/triggers/records';
import { chunks } from 'src/shared/utils/chunks.util';
import { type PickingPrintBackorderMove } from 'src/stock/printing/types/picking-print-backorder-move.type';
import { type PickingPrintData } from 'src/stock/printing/types/picking-print-data.type';
import { type PickingPrintMove } from 'src/stock/printing/types/picking-print-move.type';
import { PICKING_STATE, PICKING_TYPE_CODE, PRODUCT_TRACKING } from 'src/stock/stock-options.constant';
import { stockMoveLines, stockMoves, stockPickings } from 'src/stock/stock-records';

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
type PickingNode = {
  id: string;
  name: string | null;
  origin: string | null;
  state: string;
  pickingTypeCode: PickingPrintData['pickingTypeCode'] | null;
  scheduledDate: string | null;
  dateDone: string | null;
  note: { markdown: string | null } | null;
  person: { name: FullName | null; pickingWarnMsg: string | null; company: CompanyNode | null } | null;
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
  productUomQty: number | null;
  quantity: number | null;
  descriptionPicking: string | null;
  packagingUomQty: number | null;
  product: { name: string | null; barcode: string | null; productTmpl: { tracking: string | null } | null } | null;
  productUom: { name: string | null } | null;
  packagingUom: { name: string | null } | null;
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
  package: { name: string | null } | null;
  resultPackage: { name: string | null } | null;
};

const ID_CHUNK = 200;

// Twenty returns a nested to-one relation as null unless its deletedAt is selected.
const ADDRESS = 'address { addressStreet1 addressStreet2 addressCity addressState addressPostcode addressCountry }';
const COMPANY = `deletedAt name ${ADDRESS}`;
const PICKING_SELECTION = `id name origin state pickingTypeCode scheduledDate dateDone note { markdown }
  person { deletedAt name { firstName lastName } pickingWarnMsg company { ${COMPANY} pickingWarnMsg } }
  company { ${COMPANY} pickingWarnMsg }
  responsibleUser { deletedAt name { firstName lastName } }
  pickingType { deletedAt code warehouse { deletedAt name partner { ${COMPANY} } } }
  location { deletedAt warehouse { deletedAt partner { ${COMPANY} } } }
  signature { fileId label url }`;
const MOVE_SELECTION = `id pickingId sequence createdAt productUomQty quantity descriptionPicking packagingUomQty
  product { deletedAt name barcode productTmpl { deletedAt tracking } }
  productUom { deletedAt name } packagingUom { deletedAt name }`;
const LINE_SELECTION = `moveId createdAt quantity isEntirePack lotName lot { deletedAt name expirationDate }
  product { deletedAt name } productUom { deletedAt name }
  location { deletedAt completeName } locationDest { deletedAt completeName }
  package { deletedAt name } resultPackage { deletedAt name }`;

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

const findInChunks = async <TRow>(of: Records, field: string, ids: string[], selection: string) => {
  const rows: TRow[] = [];

  for (const part of chunks([...new Set(ids)], ID_CHUNK)) {
    rows.push(...(await of.find<TRow>({ [field]: { in: part } }, selection)));
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

// Every backorder down the chain of each printed transfer, keyed by the printed transfer.
const readBackorderChains = async (pickingIds: string[]) => {
  const childrenOf = new Map<string, BackorderNode[]>();
  const seen = new Set(pickingIds);
  let parents = pickingIds;

  while (parents.length > 0) {
    const children = await findInChunks<BackorderNode>(stockPickings, 'backorderId', parents, 'id backorderId state');

    for (const child of children) {
      childrenOf.set(child.backorderId, [...(childrenOf.get(child.backorderId) ?? []), child]);
    }
    parents = children.map((child) => child.id).filter((id) => !seen.has(id));
    parents.forEach((id) => seen.add(id));
  }
  const chainOf = (rootId: string) => {
    const chain: BackorderNode[] = [];
    const visited = new Set([rootId]);
    let level = [rootId];

    while (level.length > 0) {
      const next = level.flatMap((id) => childrenOf.get(id) ?? []).filter((child) => !visited.has(child.id));

      next.forEach((child) => visited.add(child.id));
      chain.push(...next);
      level = next.map((child) => child.id);
    }

    return chain;
  };

  return new Map(pickingIds.map((id) => [id, chainOf(id)]));
};

// A slip without its signature image still prints. The signed link names the server's public
// address; the file is fetched through the address this function reaches the server by.
const readSignature = async (signature: PickingNode['signature']) => {
  const url = signature?.[0]?.url;

  if (url === null || url === undefined || url === '') {
    return null;
  }
  try {
    const signed = new URL(url);
    const response = await fetch(new URL(`${signed.pathname}${signed.search}`, process.env.TWENTY_API_URL));

    return response.ok ? new Uint8Array(await response.arrayBuffer()) : null;
  } catch {
    return null;
  }
};

const byPosition = (left: MoveNode, right: MoveNode) =>
  (left.sequence ?? 0) - (right.sequence ?? 0) || left.createdAt.localeCompare(right.createdAt);

const toPrintMove = (move: MoveNode, lines: LineNode[]): PickingPrintMove => ({
  productName: text(move.product?.name),
  productBarcode: text(move.product?.barcode),
  descriptionPicking: text(move.descriptionPicking),
  demand: move.productUomQty ?? 0,
  quantity: move.quantity ?? 0,
  uomName: text(move.productUom?.name),
  packagingUomName: move.packagingUom?.name ?? null,
  packagingQty: move.packagingUomQty ?? 0,
  isTracked: (move.product?.productTmpl?.tracking ?? PRODUCT_TRACKING.NONE) !== PRODUCT_TRACKING.NONE,
  lines: [...lines]
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .map((line) => ({
      productName: text(line.product?.name),
      lotName: text(line.lot?.name) || text(line.lotName),
      lotBarcode: text(line.lot?.name) || text(line.lotName),
      quantity: line.quantity ?? 0,
      uomName: text(line.productUom?.name),
      from: text(line.location?.completeName),
      to: text(line.locationDest?.completeName),
      packageName: text(line.package?.name),
      resultPackageName: text(line.resultPackage?.name),
      isEntirePack: line.isEntirePack === true,
      expirationDate: line.lot?.expirationDate ?? null,
    })),
});

const toBackorderMove = (move: MoveNode): PickingPrintBackorderMove => ({
  productName: text(move.product?.name),
  descriptionPicking: text(move.descriptionPicking),
  demand: move.productUomQty ?? 0,
  uomName: text(move.productUom?.name),
});

// Runs on the public print page with no signed-in person: the ids were checked as the person
// who asked for the print, so everything here reads as the application. Ids with no row
// (deleted since) are left out.
export const readPickingPrintData = async (pickingIds: string[]): Promise<PickingPrintData[]> => {
  const pickings = await findInChunks<PickingNode>(stockPickings, 'id', pickingIds, PICKING_SELECTION);
  const chains = await readBackorderChains(pickings.map((picking) => picking.id));
  const chainPickings = [...chains.values()].flat();
  const moves = await findInChunks<MoveNode>(
    stockMoves,
    'pickingId',
    [...pickings.map((picking) => picking.id), ...chainPickings.map((backorder) => backorder.id)],
    MOVE_SELECTION,
  );
  const lines = await findInChunks<LineNode>(stockMoveLines, 'moveId', moves.map((move) => move.id), LINE_SELECTION);
  const movesByPicking = groupBy([...moves].sort(byPosition), (move) => move.pickingId);
  const linesByMove = groupBy(lines, (line) => line.moveId);
  const pickingById = new Map(pickings.map((picking) => [picking.id, picking]));

  return Promise.all(
    pickingIds.flatMap((id) => {
      const picking = pickingById.get(id);

      if (picking === undefined) {
        return [];
      }
      const chain = chains.get(id) ?? [];
      const openBackorderIds = new Set(
        chain
          .filter((backorder) => backorder.backorderId === id && backorder.state !== PICKING_STATE.DONE && backorder.state !== PICKING_STATE.CANCEL)
          .map((backorder) => backorder.id),
      );
      const chainMoves = chain.flatMap((backorder) => movesByPicking.get(backorder.id) ?? []);
      const partner = picking.person ?? picking.company;
      const parentWarning = picking.person === null ? null : picking.person.company?.pickingWarnMsg;
      const warehousePartner = picking.pickingType?.warehouse?.partner ?? null;

      return [
        (async (): Promise<PickingPrintData> => ({
          id: picking.id,
          name: text(picking.name),
          origin: text(picking.origin),
          state: picking.state,
          pickingTypeCode: picking.pickingTypeCode ?? picking.pickingType?.code ?? PICKING_TYPE_CODE.INTERNAL,
          scheduledDate: picking.scheduledDate,
          dateDone: picking.dateDone,
          partnerName: picking.person === null ? text(picking.company?.name) : fullName(picking.person.name),
          // People have no address in Twenty: a person's company address stands in.
          partnerAddress: addressText(picking.person === null ? picking.company?.address : picking.person.company?.address),
          responsibleName: fullName(picking.responsibleUser?.name),
          note: text(picking.note?.markdown).trim(),
          warningText: [partner?.pickingWarnMsg, parentWarning]
            .filter(Boolean)
            .map((warning) => `${warning}\n`)
            .join(''),
          warehouseName: text(warehousePartner?.name) || text(picking.pickingType?.warehouse?.name),
          warehouseAddress: warehousePartner === null ? '' : contactText(warehousePartner),
          sourceWarehouseAddress: contactText(picking.location?.warehouse?.partner),
          moves: (movesByPicking.get(id) ?? []).map((move) => toPrintMove(move, linesByMove.get(move.id) ?? [])),
          backorderMoves: chainMoves.filter((move) => openBackorderIds.has(move.pickingId)).map(toBackorderMove),
          backorderChainMoves: chainMoves.filter((move) => linesByMove.has(move.id)).map(toBackorderMove),
          signaturePng: await readSignature(picking.signature),
        }))(),
      ];
    }),
  );
};
