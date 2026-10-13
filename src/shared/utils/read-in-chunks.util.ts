const ID_CHUNK = 200;

// A long id list is read a part at a time, so no filter carries thousands of ids.
export const readInChunks = async <TRow>(ids: string[], read: (part: string[]) => Promise<TRow[]>) => {
  const rows: TRow[] = [];

  for (let start = 0; start < ids.length; start += ID_CHUNK) {
    rows.push(...(await read(ids.slice(start, start + ID_CHUNK))));
  }
  return rows;
};
