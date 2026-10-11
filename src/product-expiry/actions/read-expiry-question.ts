import { expiryConfirmationNeeded } from 'src/product-expiry/utils/expiry-confirmation.util';
import { EXPIRY_LINE_SELECTION, toExpiryLine } from 'src/product-expiry/utils/expiry-line.util';
import { queryAsUser } from 'src/stock/stock-front-graphql';
import { MOVE_STATE } from 'src/stock/stock-options.constant';
import { type ExpiryLineNode } from 'src/product-expiry/types/expiry-line-node.type';

type LinePage = {
  stockMoveLines: { edges: { node: ExpiryLineNode }[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } };
};

const PAGE_SIZE = 200;

// What the expired-lot question names, read as the clicking user: the product and lot for one expired lot, the list
// of lots when there are several.
export const readExpiryQuestion = async (pickingIds: string[]) => {
  if (pickingIds.length === 0) {
    return { question: null, lots: [] };
  }
  const nodes: ExpiryLineNode[] = [];
  let after: string | null = null;

  do {
    const page: LinePage = await queryAsUser<LinePage>(
      `query ExpiredLotLines($filter: StockMoveLineFilterInput, $after: String) {
        stockMoveLines(filter: $filter, first: ${PAGE_SIZE}, after: $after) {
          edges { node { ${EXPIRY_LINE_SELECTION} } }
          pageInfo { hasNextPage endCursor }
        }
      }`,
      { filter: { pickingId: { in: pickingIds }, not: { state: { in: [MOVE_STATE.DONE, MOVE_STATE.CANCEL] } } }, after },
    );
    nodes.push(...page.stockMoveLines.edges.map(({ node }) => node));
    after = page.stockMoveLines.pageInfo.hasNextPage ? page.stockMoveLines.pageInfo.endCursor : null;
  } while (after !== null);

  const lines = nodes.map(toExpiryLine);
  const question = expiryConfirmationNeeded(lines, new Date());
  const expiredLots = new Map<string, { id: string; productName: string; lotName: string }>();

  for (const line of lines) {
    if (line.lotId !== null && question?.lotIds.includes(line.lotId) === true && !expiredLots.has(line.lotId)) {
      expiredLots.set(line.lotId, { id: line.lotId, productName: line.productName, lotName: line.lotName ?? '' });
    }
  }

  return { question, lots: [...expiredLots.values()] };
};
