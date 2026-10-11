import { sweepFinishedClaims } from 'src/shared/claims/claim';
import { runLotExpiryStep } from 'src/product-expiry/daily/lot-expiry-step';
import { dailyOrderpointStep } from 'src/stock/orderpoint/daily-orderpoint-step';
import { clearPrintPasses } from 'src/stock/scheduler/steps/clear-print-passes';
import { repairLotLocations } from 'src/stock/scheduler/steps/repair-lot-locations';
import { reserveWaitingMoves } from 'src/stock/scheduler/steps/reserve-waiting-moves';
import { runQuantTasks } from 'src/stock/scheduler/steps/quant-tasks';
import { resumeStaleClaims } from 'src/stock/scheduler/steps/resume-stale-claims';
import { type DailyJobStep } from 'src/stock/scheduler/types/daily-job-step.type';

// Reordering rules come first, so the reservation step already sees the receipts they make.
export const DAILY_JOB_STEPS: DailyJobStep[] = [
  { order: 1, name: 'reordering rules', run: dailyOrderpointStep },
  { order: 2, name: 'reserve waiting moves', run: reserveWaitingMoves },
  { order: 3, name: 'lot expiry', run: () => runLotExpiryStep() },
  { order: 4, name: 'stock rows and ledger', run: runQuantTasks },
  { order: 5, name: 'resume stale claims', run: resumeStaleClaims },
  // After the resumes, so a lot a stopped run was moving is settled by that run first.
  { order: 6, name: 'lot locations', run: repairLotLocations },
  { order: 7, name: 'finished claims', run: sweepFinishedClaims },
  { order: 8, name: 'print links', run: () => clearPrintPasses(new Date()) },
];

// A failed step is reported and the later steps still run.
export const runDailyJob = async (steps: DailyJobStep[] = DAILY_JOB_STEPS) => {
  const ran: string[] = [];
  const failures: string[] = [];

  for (const step of [...steps].sort((left, right) => left.order - right.order)) {
    ran.push(step.name);
    try {
      await step.run();
    } catch (error) {
      failures.push(`${step.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return { ran, failures };
};
