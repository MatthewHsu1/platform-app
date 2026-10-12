import { writeCrmVariable } from 'src/crm/settings/write-crm-variable';

// Variables are stored as text; lists and objects as JSON.
const asStoredValue = (value: unknown) => (typeof value === 'string' ? value : JSON.stringify(value));

// Several variables in one go, through the one variable writer the
// assignment schedule already uses.
export const writeApplicationVariables = async (values: Record<string, unknown>) => {
  for (const [key, value] of Object.entries(values)) {
    await writeCrmVariable(key, asStoredValue(value));
  }
};
