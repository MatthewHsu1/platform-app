import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

import { RESVG_WASM_BASE64 } from 'src/stock/picking/sign/resvg-wasm-base64';

describe('resvg wasm constant', () => {
  it('holds the wasm of the installed renderer package', () => {
    const installed = readFileSync(createRequire(import.meta.url).resolve('@resvg/resvg-wasm/index_bg.wasm'));

    expect(Buffer.from(RESVG_WASM_BASE64, 'base64').equals(installed)).toBe(true);
  });
});
