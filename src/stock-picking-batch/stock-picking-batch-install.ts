import { IR_SEQUENCE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/base/base-universal-identifiers.constant';
import { type ModuleInstallSpec } from 'src/shared/install/install-spec.type';
import { BATCH_SEQUENCE_CODE, WAVE_SEQUENCE_CODE } from 'src/stock-picking-batch/stock-picking-batch-options.constant';
import { STOCK_SEED_KEYS } from 'src/stock/stock-options.constant';
import { STOCK_PICKING_TYPE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

// The batch and wave number sequences, and the rule that automatic batches
// need something to group by.
export const STOCK_PICKING_BATCH_INSTALL: ModuleInstallSpec = {
  firstVersion: '2.3.0',
  staffLists: [],
  defaultRows: [],
  boards: [],
  seedRows: [
    {
      objectUniversalIdentifier: IR_SEQUENCE_OBJECT_UNIVERSAL_IDENTIFIER,
      rows: [
        {
          seedKey: STOCK_SEED_KEYS.batchSequence,
          values: {
            name: 'Batch Transfer',
            code: BATCH_SEQUENCE_CODE,
            prefix: 'BATCH/',
            padding: 5,
            numberNext: 1,
            numberIncrement: 1,
            active: true,
          },
        },
        {
          seedKey: STOCK_SEED_KEYS.waveSequence,
          values: {
            name: 'Wave Transfer',
            code: WAVE_SEQUENCE_CODE,
            prefix: 'WAVE/',
            padding: 5,
            numberNext: 1,
            numberIncrement: 1,
            active: true,
          },
        },
      ],
    },
  ],
  validationRules: [
    {
      objectUniversalIdentifier: STOCK_PICKING_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
      name: 'platform-stock-picking-type-auto-batch-group-by',
      expression:
        'not autoBatch or batchGroupByPartner or batchGroupByDestination or batchGroupBySrcLoc or batchGroupByDestLoc or waveGroupByProduct or waveGroupByCategory or waveGroupByLocation',
      message: "If the Automatic Batches feature is enabled, at least one 'Group by' option must be selected.",
    },
  ],
};
