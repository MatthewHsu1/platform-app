import { derivedId } from 'src/shared/utils/derived-id.util';
import { writeProcurementRows } from 'src/stock/procurement/apply-procurement-plan';
import { graphqlPushStore } from 'src/stock/procurement/push-store';
import { quantKey } from 'src/stock/quant/quant-key';
import { MOVE_STATE } from 'src/stock/stock-options.constant';
import { linksToCut, planPush, pushedMove } from 'src/stock/utils/procurement/plan-push.util';
import { type ClaimJournal } from 'src/shared/claims/types/claim-journal.type';
import { type PushLine } from 'src/stock/procurement/types/push-line.type';
import { type PushStore } from 'src/stock/procurement/types/push-store.type';
import { type PushMove } from 'src/stock/utils/procurement/types/push-move.type';
import { type PushPlan } from 'src/stock/utils/procurement/types/push-plan.type';
import { type ProcurementWritePlan } from 'src/stock/utils/procurement/types/procurement-write-plan.type';
import { type RoutingData } from 'src/stock/utils/procurement/types/routing-data.type';
import { chunks } from 'src/shared/utils/chunks.util';

// A rule with no step added may lead to another one; a loop of them stops here.
const MAX_PUSH_STEPS = 10;
// One journal save per chunk of done moves: the claim row rewrites its whole journal on every save.
const CHUNK_SIZE = 25;
const STEP_PREFIX = 'push';

// A push as the journal stores it: only what a rerun cannot read back. The
// rows a manual push creates get ids derived from the done move, which is
// pushed once in its life, so a rerun finds them instead of making more.
type StoredPush =
  | { kind: 'none'; breakLinks: string[] }
  | {
      kind: 'transparent';
      ruleId: string;
      productId: string;
      isStorable: boolean;
      date: string;
      locationDestId: string;
      // Where the done lines go: where stock arriving in the rule destination is stored.
      lineDestId: string;
      // Where the move went before this push; once the move points elsewhere, the push is complete.
      moveDestBefore: string;
      lines: { id: string; from: string }[];
      breakLinks: string[];
    }
  | { kind: 'manual'; ruleId: string; relinkToNewMove: string[]; breakLinks: string[] };

type ManualPush = Extract<StoredPush, { kind: 'manual' }>;

type RunStep = <TPlan>(name: string, plan: () => Promise<TPlan>, work: (plan: TPlan) => Promise<void>) => Promise<TPlan>;

const plainStep: RunStep = async (_name, plan, work) => {
  const planned = await plan();
  await work(planned);
  return planned;
};

export const pushedMoveId = (doneMoveId: string) => derivedId('stock-push', doneMoveId);

export const makePushApply = (store: PushStore) => {
  const toStored = (
    move: PushMove,
    plan: PushPlan,
    isStorable: boolean,
    data: RoutingData,
    lines: PushLine[],
    lineDestIds: Map<string, string>,
  ): StoredPush | null => {
    switch (plan.kind) {
      case 'skip':
        return null;
      case 'none':
        return plan.breakLinks.length === 0 ? null : plan;
      case 'transparent': {
        const lineDestId = lineDestIds.get(move.id) ?? plan.locationDestId;

        return {
          kind: 'transparent',
          ruleId: plan.ruleId,
          productId: move.productId,
          isStorable,
          date: plan.date,
          locationDestId: plan.locationDestId,
          lineDestId,
          moveDestBefore: move.locationDestId,
          lines: lines
            .filter((line) => line.locationDestId !== lineDestId)
            .map((line) => ({ id: line.id, from: line.locationDestId })),
          // The move stays where it is: the moves it feeds from outside lose the link.
          breakLinks: plan.destinationChanged ? [] : linksToCut(move, data),
        };
      }
      case 'manual':
        return { kind: 'manual', ruleId: plan.ruleId, relinkToNewMove: plan.relinkToNewMove, breakLinks: plan.breakLinks };
    }
  };

  const readRouting = async (moves: PushMove[]) => {
    const { data, products } = await store.readRouting([...new Set(moves.map((move) => move.productId))]);
    const productOf = (move: PushMove) => {
      const product = products.get(move.productId);

      if (product === undefined) {
        throw new Error(`The product ${move.productId} of the done move ${move.id} could not be read for its push.`);
      }
      return product;
    };

    return { data, productOf };
  };

  // The push of each done move among these, keyed by move.
  const planMoves = async (moveIds: string[], chained: boolean): Promise<Record<string, StoredPush>> => {
    const moves = await store.readDoneMoves(moveIds);

    if (moves.length === 0) {
      return {};
    }
    const { data, productOf } = await readRouting(moves);
    const planned: { move: PushMove; plan: PushPlan; lines: PushLine[] }[] = [];

    for (const move of moves) {
      const plan = planPush(move, productOf(move), data, { chained });

      planned.push({ move, plan, lines: plan.kind === 'transparent' ? await store.readLines(move.id) : [] });
    }
    // All the done lines of a move go to one place, chosen without a quantity.
    // Their stock lands there before the next move is placed, so it counts for that one.
    const lineDestIds = await store.putawayDestinations(
      planned.flatMap(({ move, plan, lines }) =>
        plan.kind === 'transparent'
          ? [
              {
                key: move.id,
                locationDestId: plan.locationDestId,
                productId: move.productId,
                quantity: 0,
                packageId: null,
                packagingUomId: null,
                arrivingQuantity: lines.reduce((sum, line) => sum + line.quantityProductUom, 0),
              },
            ]
          : [],
      ),
    );
    const plans: Record<string, StoredPush> = {};

    for (const { move, plan, lines } of planned) {
      const stored = toStored(move, plan, productOf(move).isStorable, data, lines, lineDestIds);

      if (stored !== null) {
        plans[move.id] = stored;
      }
    }

    return plans;
  };

  // Downstream moves no longer fed by this move take from stock.
  const breakLinks = async (moveId: string, moveDestIds: string[]) => {
    if (moveDestIds.length === 0) {
      return;
    }
    await store.unlinkMoves(moveId, moveDestIds);
    await store.makeToStock(moveDestIds);
    await store.recomputeMove(moveDestIds);
  };

  // The done lines get the new destination first, each line followed by its
  // stock, and the move last. A rerun finds the lines already moved: all but the
  // last of them are complete, and that last one posts only what its stock lacks.
  const moveDoneStock = async (moveId: string, plan: Extract<StoredPush, { kind: 'transparent' }>) => {
    const current = new Map((await store.readLines(moveId)).map((line) => [line.id, line]));
    const moved = plan.lines.map((line) => current.get(line.id)?.locationDestId === plan.lineDestId);
    const lastMoved = moved.lastIndexOf(true);

    for (const [index, line] of plan.lines.entries()) {
      const stored = current.get(line.id);

      if (stored === undefined || (moved[index] && index < lastMoved)) {
        continue;
      }
      if (!moved[index]) {
        await store.setLineDestination(line.id, plan.lineDestId);
      }
      if (!plan.isStorable) {
        continue;
      }
      const parts = { productId: plan.productId, lotId: stored.lotId, packageId: stored.resultPackageId, ownerId: stored.ownerId };
      const post = moved[index] ? store.settleQuantDelta : store.applyQuantDelta;
      const from = moved[index] ? line.from : stored.locationDestId;

      await post({ key: quantKey({ ...parts, locationId: from }), delta: -stored.quantityProductUom, inDate: null });
      await post({ key: quantKey({ ...parts, locationId: plan.lineDestId }), delta: stored.quantityProductUom, inDate: null });
    }
    await store.setMoveDestination(moveId, { date: plan.date, locationDestId: plan.locationDestId });
  };

  // The keys of the lots and packages the push sent on.
  const pushedTrackedKeys = async (moveId: string, plan: Extract<StoredPush, { kind: 'transparent' }>) => {
    const lineIds = new Set(plan.lines.map((line) => line.id));

    return (await store.readLines(moveId))
      .filter((line) => lineIds.has(line.id) && (line.lotId !== null || line.resultPackageId !== null))
      .map((line) =>
        quantKey({
          productId: plan.productId,
          locationId: plan.lineDestId,
          lotId: line.lotId,
          packageId: line.resultPackageId,
          ownerId: line.ownerId,
        }),
      );
  };

  // A rerun that finds the move already sent on still cuts its links and
  // recounts the product, its lots and packages: a stop can come right after the move's write.
  const pushTransparently = async (moveId: string, plan: Extract<StoredPush, { kind: 'transparent' }>) => {
    const [move] = await store.readDoneMoves([moveId]);

    if (move === undefined) {
      return;
    }
    if (move.locationDestId === plan.moveDestBefore) {
      await moveDoneStock(moveId, plan);
    }
    await breakLinks(moveId, plan.breakLinks);
    await store.recomputeProductQuantities([plan.productId]);
    const trackedKeys = plan.isStorable ? await pushedTrackedKeys(moveId, plan) : [];

    if (trackedKeys.length > 0) {
      await store.recomputeTrackingForKeys(trackedKeys);
    }
  };

  // A push's own writes on the done move's links; the rows of a manual push come with the chunk's.
  const writePush = async (moveId: string, plan: StoredPush) => {
    if (plan.kind === 'transparent') {
      await pushTransparently(moveId, plan);
      return;
    }
    if (plan.kind === 'manual' && plan.relinkToNewMove.length > 0) {
      await store.unlinkMoves(moveId, plan.relinkToNewMove);
    }
    await breakLinks(moveId, plan.breakLinks);
  };

  // The rows of the chunk's manual pushes, built again from the done moves and their rules.
  const manualWrites = async (pushes: { moveId: string; plan: ManualPush }[], runId: string): Promise<ProcurementWritePlan> => {
    const writes: ProcurementWritePlan = { runId, moves: [], moveLinks: [], routeLinks: [], referenceLinks: [], partnerUpdates: [] };
    const moves = new Map((await store.readDoneMoves(pushes.map((push) => push.moveId))).map((move) => [move.id, move]));

    if (moves.size === 0) {
      return writes;
    }
    const { data, productOf } = await readRouting([...moves.values()]);

    for (const { moveId, plan } of pushes) {
      const move = moves.get(moveId);
      const rule = data.rules.find((candidate) => candidate.id === plan.ruleId);

      if (move === undefined) {
        continue;
      }
      if (rule === undefined) {
        throw new Error(`The push rule ${plan.ruleId} of the done move ${moveId} is no longer active.`);
      }
      const { newMove, linkFromDone } = pushedMove(move, rule, productOf(move), data);
      const { referenceIds, routeIds, ...values } = newMove;
      const newMoveId = pushedMoveId(moveId);
      const link = (moveOrigId: string, moveDestId: string) => ({
        id: derivedId('stock-push-link', moveOrigId, moveDestId),
        data: { moveOrigId, moveDestId },
      });

      writes.moves.push({ id: newMoveId, data: { ...values, state: MOVE_STATE.DRAFT } });
      writes.moveLinks.push(
        ...(linkFromDone ? [link(moveId, newMoveId)] : []),
        ...plan.relinkToNewMove.map((moveDestId) => link(newMoveId, moveDestId)),
      );
      writes.routeLinks.push(
        ...routeIds.map((stockRouteId) => ({ id: derivedId('stock-push-route', newMoveId, stockRouteId), data: { stockMoveId: newMoveId, stockRouteId } })),
      );
      writes.referenceLinks.push(
        ...referenceIds.map((referenceId) => ({ id: derivedId('stock-push-reference', newMoveId, referenceId), data: { moveId: newMoveId, referenceId } })),
      );
    }

    return writes;
  };

  const runChunk = async (chunkName: string, moveIds: string[], plans: Record<string, StoredPush>, runStep: RunStep, journal?: ClaimJournal) => {
    const manual: { moveId: string; plan: ManualPush }[] = [];
    let current = plans;
    let pending = moveIds;

    for (const moveId of pending) {
      const plan = current[moveId];

      if (plan !== undefined) {
        await writePush(moveId, plan);
      }
    }
    // A rule with no step added moved the stock on: the push goes on from the new destination.
    for (let step = 1; ; step += 1) {
      const level = current;

      for (const moveId of pending) {
        const plan = level[moveId];

        if (plan?.kind === 'manual') {
          manual.push({ moveId, plan });
        }
      }
      pending = pending.filter((moveId) => {
        const plan = level[moveId];

        return plan?.kind === 'transparent' && plan.locationDestId !== plan.moveDestBefore;
      });
      if (pending.length === 0 || step >= MAX_PUSH_STEPS) {
        break;
      }
      const chained = pending;

      current = await runStep(
        `${chunkName}:${step}`,
        () => planMoves(chained, true),
        async (stored) => {
          for (const moveId of chained) {
            const plan = stored[moveId];

            if (plan !== undefined) {
              await writePush(moveId, plan);
            }
          }
        },
      );
    }

    if (manual.length > 0) {
      await writeProcurementRows(
        manual.map(({ moveId }) => pushedMoveId(moveId)),
        () => manualWrites(manual, journal?.runId ?? STEP_PREFIX),
        store,
        { journal, stepPrefix: chunkName },
      );
    }
  };

  // After moves are done: the push rules of their destinations make the next
  // step (or move the done stock on), and the new moves are confirmed. Under a
  // journal each chunk of moves is planned once and stored, so a rerun after a
  // stop neither loses nor repeats a push.
  return async (moveIds: string[], { journal }: { journal?: ClaimJournal } = {}) => {
    const runStep: RunStep = journal === undefined ? plainStep : (name, plan, work) => journal.step(name, plan, work);

    for (const [index, chunk] of chunks([...new Set(moveIds)], CHUNK_SIZE).entries()) {
      const chunkName = `${STEP_PREFIX}:${index}`;

      await runStep(chunkName, () => planMoves(chunk, false), (plans) => runChunk(chunkName, chunk, plans, runStep, journal));
    }
  };
};

export const pushApply = makePushApply(graphqlPushStore);
