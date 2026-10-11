import { defineObject, FieldType, OnDeleteAction, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { appWritten, booleanField, manyToOneField, oneToManyField, printoutsField, selectField } from 'src/shared/fields';
import { BATCH_STATE } from 'src/stock-picking-batch/stock-picking-batch-options.constant';
import {
  STOCK_PICKING_BATCH_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  STOCK_PICKING_BATCH_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as INVERSE_IDS,
  STOCK_PICKING_BATCH_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock-picking-batch/stock-picking-batch-universal-identifiers.constant';
import {
  STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_PICKING_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

// A batch groups whole transfers; a wave (isWave) groups move lines, splitting
// transfers when only part of them goes in. Twenty reserves `user`, so the
// person in charge is `responsible`.
export default defineObject({
  universalIdentifier: STOCK_PICKING_BATCH_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'stockPickingBatch',
  namePlural: 'stockPickingBatches',
  labelSingular: 'Batch transfer',
  labelPlural: 'Batch transfers',
  description: 'Transfers, or parts of them, handled together',
  icon: 'IconStack2',
  labelIdentifierFieldMetadataUniversalIdentifier: FIELD_IDS.name,
  fields: [
    appWritten({
      universalIdentifier: FIELD_IDS.name,
      name: 'name',
      label: 'Batch Transfer',
      icon: 'IconAbc',
      type: FieldType.TEXT,
      defaultValue: "'New'",
    }),
    {
      universalIdentifier: FIELD_IDS.description,
      name: 'description',
      label: 'Description',
      icon: 'IconFileDescription',
      type: FieldType.TEXT,
    },
    manyToOneField({
      universalIdentifier: FIELD_IDS.responsible,
      name: 'responsible',
      label: 'Responsible',
      icon: 'IconUserCircle',
      onDelete: OnDeleteAction.SET_NULL,
      targetObjectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember.universalIdentifier,
      targetFieldUniversalIdentifier: INVERSE_IDS.workspaceMemberBatches,
    }),
    appWritten(
      selectField(FIELD_IDS.state, 'state', 'Status', 'IconProgressCheck', BATCH_STATE.DRAFT, [
        { value: BATCH_STATE.DRAFT, label: 'Draft', color: 'gray' },
        { value: BATCH_STATE.IN_PROGRESS, label: 'In progress', color: 'blue' },
        { value: BATCH_STATE.DONE, label: 'Done', color: 'green' },
        { value: BATCH_STATE.CANCEL, label: 'Cancelled', color: 'red' },
      ]),
    ),
    manyToOneField({
      universalIdentifier: FIELD_IDS.pickingType,
      name: 'pickingType',
      label: 'Operation Type',
      icon: 'IconTransfer',
      onDelete: OnDeleteAction.SET_NULL,
      targetObjectUniversalIdentifier: STOCK_PICKING_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: INVERSE_IDS.pickingTypeBatches,
    }),
    {
      universalIdentifier: FIELD_IDS.scheduledDate,
      name: 'scheduledDate',
      label: 'Scheduled Date',
      icon: 'IconCalendarEvent',
      type: FieldType.DATE_TIME,
    },
    booleanField(FIELD_IDS.isWave, 'isWave', 'This batch is a wave', 'IconWaveSine', false),
    oneToManyField({
      universalIdentifier: FIELD_IDS.pickings,
      name: 'pickings',
      label: 'Transfers',
      icon: 'IconTruck',
      targetObjectUniversalIdentifier: STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: INVERSE_IDS.pickingBatch,
    }),
    printoutsField(FIELD_IDS.printouts),
  ],
});
