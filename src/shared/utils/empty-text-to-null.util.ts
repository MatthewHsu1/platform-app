// A selected field and, when it has a sub-selection (`partner { name }`), the shape of that sub-selection.
type SelectionShape = Map<string, SelectionShape | null>;

const TOKEN = /[A-Za-z_][A-Za-z0-9_]*|[{}():]/g;

const parseSelection = (selection: string): SelectionShape => {
  const tokens = selection.match(TOKEN) ?? [];
  let position = 0;

  const skipArguments = () => {
    let depth = 0;
    do {
      if (tokens[position] === '(') {
        depth += 1;
      } else if (tokens[position] === ')') {
        depth -= 1;
      }
      position += 1;
    } while (depth > 0 && position < tokens.length);
  };

  const parseBlock = (): SelectionShape => {
    const shape: SelectionShape = new Map();

    while (position < tokens.length && tokens[position] !== '}') {
      const token = tokens[position];
      position += 1;
      if (token === '{' || token === ')' || token === ':' || token === '(') {
        continue;
      }
      // `alias: field` answers under the alias.
      if (tokens[position] === ':') {
        position += 2;
      }
      if (tokens[position] === '(') {
        skipArguments();
      }
      if (tokens[position] === '{') {
        position += 1;
        shape.set(token, parseBlock());
        position += 1;
      } else {
        shape.set(token, null);
      }
    }
    return shape;
  };

  return parseBlock();
};

const normalizeValue = (value: unknown, shape: SelectionShape | null): unknown => {
  if (shape === null) {
    return value === '' ? null : value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item, shape));
  }
  if (typeof value === 'object' && value !== null) {
    return normalizeObject(value as Record<string, unknown>, shape);
  }
  return value;
};

const normalizeObject = (row: Record<string, unknown>, shape: SelectionShape) => {
  const result: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(row)) {
    const fieldShape = shape.get(field);
    result[field] = fieldShape === undefined ? value : normalizeValue(value, fieldShape);
  }
  return result;
};

// Twenty's API answers "" for a TEXT field whose column is NULL. Rows read
// here carry null instead, so `=== null` and `??` mean "no text". Only fields
// selected as plain values are mapped: a JSON field's content and a list
// field's items are kept as stored.
export const emptyTextToNull = <TRow>(rows: TRow[], selection: string): TRow[] => {
  const shape = parseSelection(selection);

  return rows.map((row) =>
    typeof row === 'object' && row !== null ? (normalizeObject(row as Record<string, unknown>, shape) as TRow) : row,
  );
};

// A whole record with no selection (a database event's before or after):
// top-level fields only, as a plain-valued selection of every field. Unlike
// emptyTextToNull, a composite field's sub-fields are left as sent.
export const recordEmptyTextToNull = <TRecord>(record: TRecord): TRecord =>
  typeof record === 'object' && record !== null
    ? (normalizeObject(record as Record<string, unknown>, new Map(Object.keys(record).map((field) => [field, null]))) as TRecord)
    : record;
