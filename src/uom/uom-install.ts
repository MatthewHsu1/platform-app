import { type ModuleInstallSpec, type SeedRow } from 'src/shared/install/install-spec.type';
import { UOM_UOM_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/uom/uom-universal-identifiers.constant';

const unit = (
  xmlId: string,
  name: string,
  parentXmlId: string | null,
  relativeFactor: number,
  active = true,
): SeedRow => ({
  seedKey: `uom.${xmlId}`,
  values: { name, relativeFactor, active },
  ...(parentXmlId === null
    ? {}
    : { parentSeedKey: `uom.${parentXmlId}`, parentFieldName: 'relativeUom' }),
});

// Default units, parents before children.
export const UOM_INSTALL: ModuleInstallSpec = {
  firstVersion: '2.2.0',
  staffLists: [],
  defaultRows: [],
  seedRows: [
    {
      objectUniversalIdentifier: UOM_UOM_OBJECT_UNIVERSAL_IDENTIFIER,
      rows: [
        unit('product_uom_unit', 'Units', null, 1),
        unit('product_uom_pack_6', 'Pack of 6', 'product_uom_unit', 6),
        unit('product_uom_dozen', 'Dozens', 'product_uom_unit', 12, false),
        unit('product_uom_hour', 'Hours', null, 1),
        unit('product_uom_day', 'Days', 'product_uom_hour', 8),
        unit('product_uom_minute', 'Minutes', 'product_uom_hour', 0.0166667),
        unit('product_uom_millimeter', 'mm', null, 1),
        unit('product_uom_cm', 'cm', 'product_uom_millimeter', 10, false),
        unit('product_uom_meter', 'm', 'product_uom_cm', 100),
        unit('product_uom_km', 'km', 'product_uom_meter', 1000, false),
        unit('product_uom_square_meter', 'm²', null, 1),
        unit('product_uom_milliliter', 'ml', null, 1),
        unit('product_uom_litre', 'L', 'product_uom_milliliter', 1000),
        unit('product_uom_cubic_meter', 'm³', 'product_uom_litre', 1000, false),
        unit('product_uom_gram', 'g', null, 1),
        unit('product_uom_kgm', 'kg', 'product_uom_gram', 1000),
        unit('product_uom_ton', 'Ton', 'product_uom_kgm', 1000),
        unit('product_uom_oz', 'oz', 'product_uom_gram', 28.3495, false),
        unit('product_uom_lb', 'lb', 'product_uom_oz', 16, false),
        unit('product_uom_inch', 'in', 'product_uom_cm', 2.54, false),
        unit('product_uom_foot', 'ft', 'product_uom_inch', 12, false),
        unit('product_uom_yard', 'yd', 'product_uom_foot', 3, false),
        unit('product_uom_mile', 'mi', 'product_uom_yard', 1760, false),
        unit('product_uom_square_foot', 'ft²', 'product_uom_square_meter', 0.092903, false),
        unit('product_uom_floz', 'fl oz (US)', 'product_uom_litre', 0.0295735, false),
        unit('product_uom_qt', 'qt (US)', 'product_uom_floz', 32, false),
        unit('product_uom_gal', 'gal (US)', 'product_uom_qt', 4, false),
        unit('product_uom_cubic_inch', 'in³', 'product_uom_litre', 0.0163871, false),
        unit('product_uom_cubic_foot', 'ft³', 'product_uom_cubic_inch', 1728, false),
        unit('product_uom_kwh', 'KWH', null, 1),
      ],
    },
  ],
  boards: [],
  validationRules: [
    {
      objectUniversalIdentifier: UOM_UOM_OBJECT_UNIVERSAL_IDENTIFIER,
      name: 'platform-uom-factor-not-zero',
      expression: 'relativeFactor != 0',
      message: 'A unit cannot contain 0 of its reference unit.',
    },
    {
      objectUniversalIdentifier: UOM_UOM_OBJECT_UNIVERSAL_IDENTIFIER,
      name: 'platform-uom-name-required',
      expression: 'isNonEmptyString(name)',
      message: 'Name is required.',
    },
  ],
};
