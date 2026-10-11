import { PRINTABLES, printableKey } from 'src/stock/printing/printables';
import { type PrintOutput } from 'src/stock/printing/types/print-output.type';
import { type PrintPass } from 'src/stock/printing/types/print-pass.type';

import 'src/stock/printing/printables/register-all';

export const buildPrintOutput = async (pass: PrintPass): Promise<{ output: PrintOutput; fileName: string }> => {
  const printable = PRINTABLES.get(printableKey(pass.report, pass.objectSingular));

  if (printable === undefined) {
    throw new Error(`No printable ${pass.report} for ${pass.objectSingular}`);
  }
  const data = await printable.read(pass.recordIds, pass.options);

  return {
    output: await printable.build(data, pass.options, { timeZone: pass.timeZone }),
    fileName: printable.fileName(data, pass.options),
  };
};
