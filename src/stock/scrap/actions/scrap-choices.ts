import { requireData, twentyGraphql } from 'src/shared/twenty-graphql';
import { readAllowedUnits } from 'src/stock/product/read-allowed-units';
import { readStockProducts } from 'src/stock/product/read-stock-products';
import { validateScrap } from 'src/stock/scrap/actions/validate-scrap';
import { readScrapDefaults } from 'src/stock/scrap/read-scrap-defaults';
import { type ScrapChoice } from 'src/stock/scrap/types/scrap-choice.type';
import { type ScrapChoices } from 'src/stock/scrap/types/scrap-choices.type';
import { type ScrapFromPickingInput } from 'src/stock/scrap/types/scrap-from-picking-input.type';
import { type ScrapValidateAnswer } from 'src/stock/scrap/types/scrap-validate-answer.type';
import { StockUserError } from 'src/stock/stock-errors';
import { LOCATION_USAGE, SCRAP_STATE } from 'src/stock/stock-options.constant';
import { stockLocations, stockMoves, stockPickings } from 'src/stock/stock-records';
import { PICKING_ROW } from 'src/stock/stock-rows';
import { readStockSettings } from 'src/stock/stock-settings';
import { readResolvedUoms } from 'src/stock/stock-uoms';
import { planScrapProductChoices, planScrapQuantityRefusal } from 'src/stock/utils/plan-scrap.util';
import { planScrapDefaults } from 'src/stock/utils/plan-scrap-defaults.util';
import { type MoveState } from 'src/stock/types/move-state.type';
import { type PickingRow } from 'src/stock/types/picking-row.type';

export const SCRAP_CHOICE_REFUSED_MESSAGE = 'Pick a product of this transfer, one of its units, and the offered locations.';

type NamedLocation = { id: string; name: string | null; completeName: string | null };

const locationChoice = (location: NamedLocation): ScrapChoice => ({
  id: location.id,
  name: location.completeName ?? location.name ?? '',
});

// Companies and tags are read with the clicking user's token, so the pop-up lists only what that user may see.
const readAsPerson = async (objectPlural: string, orderBy: string) => {
  const data = requireData(
    await twentyGraphql<Record<string, { edges: { node: { id: string; name: string | null } }[] }>>(
      'person',
      `{ ${objectPlural}(first: 200, orderBy: ${orderBy}) { edges { node { id name } } } }`,
    ),
    `Read ${objectPlural}`,
  );

  return data[objectPlural].edges.map(({ node }) => ({ id: node.id, name: node.name ?? '' }));
};

// The pop-up starts from the values a new scrap of this transfer gets on save.
const readDefaults = async (picking: PickingRow | undefined): Promise<ScrapChoices['defaults']> => {
  const plan = planScrapDefaults({
    operation: 'created',
    productChanged: false,
    pickingChanged: false,
    scrap: { productId: null, productUomId: null, locationId: null, scrapLocationId: null, state: SCRAP_STATE.DRAFT },
    productUomId: null,
    picking:
      picking === undefined
        ? null
        : { state: picking.state, locationId: picking.locationId, locationDestId: picking.locationDestId },
    ...(await readScrapDefaults()),
  });
  const data = plan.kind === 'write' ? plan.data : {};

  return {
    locationId: typeof data.locationId === 'string' ? data.locationId : null,
    scrapLocationId: typeof data.scrapLocationId === 'string' ? data.scrapLocationId : null,
  };
};

export const readScrapChoices = async (pickingId: string): Promise<ScrapChoices> => {
  const [picking] = await stockPickings.find<PickingRow>({ id: { eq: pickingId } }, PICKING_ROW);
  const moves = await stockMoves.find<{ productId: string; state: MoveState }>(
    { pickingId: { eq: pickingId } },
    'productId state',
  );
  const products = await readStockProducts(moves.map((move) => move.productId));
  const offered = planScrapProductChoices({
    moves,
    productTypes: new Map([...products].map(([id, product]) => [id, product.productType])),
  }).flatMap((id) => {
    const product = products.get(id);

    return product === undefined ? [] : [product];
  });
  const uoms = await readResolvedUoms();
  const units = await readAllowedUnits(new Map(offered.map((product) => [product.templateId, product.uomId])));
  const internal = await stockLocations.find<NamedLocation>(
    { usage: { eq: LOCATION_USAGE.INTERNAL }, active: { eq: true } },
    'id name completeName',
  );
  const inventory = await stockLocations.find<NamedLocation>(
    { usage: { eq: LOCATION_USAGE.INVENTORY }, active: { eq: true } },
    'id name completeName',
  );
  const byName = (left: ScrapChoice, right: ScrapChoice) => left.name.localeCompare(right.name);

  return {
    products: offered.map((product) => ({
      id: product.productId,
      name: product.displayName,
      units: [...(units.get(product.templateId) ?? new Set([product.uomId]))].map((uomId) => ({
        id: uomId,
        name: uoms.get(uomId)?.name ?? '',
      })),
    })),
    locations: internal.map(locationChoice).sort(byName),
    scrapLocations: inventory.map(locationChoice).sort(byName),
    owners: await readAsPerson('companies', '[{ name: AscNullsLast }]'),
    reasonTags: await readAsPerson('stockScrapReasonTags', '[{ sequence: AscNullsLast }, { name: AscNullsLast }]'),
    defaults: await readDefaults(picking),
  };
};

// The scrap and its reason links are made as the clicking user (row access, owner and tag visibility, "created by"
// apply), then validated like any scrap. A quantity the scrap would refuse is refused before the scrap is made.
export const createScrapFromPicking = async (
  input: ScrapFromPickingInput,
): Promise<{ scrapId: string } & ScrapValidateAnswer> => {
  const choices = await readScrapChoices(input.pickingId);
  const product = choices.products.find((choice) => choice.id === input.productId);

  if (
    product === undefined ||
    !product.units.some((unit) => unit.id === input.productUomId) ||
    !choices.locations.some((location) => location.id === input.locationId) ||
    !choices.scrapLocations.some((location) => location.id === input.scrapLocationId)
  ) {
    throw new StockUserError(SCRAP_CHOICE_REFUSED_MESSAGE);
  }
  const quantityRefusal = planScrapQuantityRefusal(input.scrapQty, readStockSettings().productUnitDigits);

  if (quantityRefusal !== null) {
    throw new StockUserError(quantityRefusal);
  }

  const created = requireData(
    await twentyGraphql<{ createStockScrap: { id: string } }>(
      'person',
      `mutation ScrapFromPicking($data: StockScrapCreateInput!) { createStockScrap(data: $data) { id } }`,
      {
        data: {
          pickingId: input.pickingId,
          productId: input.productId,
          productUomId: input.productUomId,
          scrapQty: input.scrapQty,
          locationId: input.locationId,
          scrapLocationId: input.scrapLocationId,
          ownerId: input.ownerId,
          shouldReplenish: input.shouldReplenish,
        },
      },
    ),
    'Create the scrap',
  );
  const scrapId = created.createStockScrap.id;

  if (input.reasonTagIds.length > 0) {
    requireData(
      await twentyGraphql(
        'person',
        `mutation TagScrap($data: [StockScrapStockScrapReasonTagRelCreateInput!]!) {
          createStockScrapStockScrapReasonTagRels(data: $data) { id }
        }`,
        { data: input.reasonTagIds.map((stockScrapReasonTagId) => ({ stockScrapId: scrapId, stockScrapReasonTagId })) },
      ),
      'Tag the scrap',
    );
  }

  // The scrap stays a draft when its Validate is refused, as a saved form does: the refusal names it, so the pop-up
  // retries that scrap instead of making another.
  try {
    return { scrapId, ...(await validateScrap(scrapId, { confirmInsufficient: false })) };
  } catch (error) {
    if (error instanceof StockUserError) {
      throw new StockUserError(error.message, error.values, { ...error.details, scrapId });
    }
    throw error;
  }
};
