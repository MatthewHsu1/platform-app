// Writes the SVG renderer's wasm into a TypeScript constant: the app's bundler has no loader for
// .wasm files and only the bundled function is deployed, so the bytes travel inside the code.
// Run from the app folder after changing the pinned @resvg/resvg-wasm version.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const wasmPath = createRequire(import.meta.url).resolve('@resvg/resvg-wasm/index_bg.wasm');
const { version } = JSON.parse(readFileSync(join(dirname(wasmPath), 'package.json'), 'utf8'));

writeFileSync(
  'src/stock/picking/sign/resvg-wasm-base64.ts',
  `// Generated from @resvg/resvg-wasm ${version} index_bg.wasm by \`node scripts/generate-resvg-wasm.mjs\`; do not edit.\n` +
    `export const RESVG_WASM_BASE64 =\n  "${readFileSync(wasmPath).toString('base64')}";\n`,
);
