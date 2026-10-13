import { translate } from 'src/shared/i18n/translate';
import { derivedId } from 'src/shared/utils/derived-id.util';
import { ORDERPOINT_MESSAGES } from 'src/stock/orderpoint/orderpoint-messages.constant';
import { type ProductTask } from 'src/stock/orderpoint/types/product-task.type';
import { type ReplenishmentIssue } from 'src/stock/orderpoint/types/replenishment-issue.type';

// Stored task text may come back with other line breaks than it was written with.
const normalized = (text: string) => text.replace(/\s+/g, ' ').trim();

// One task per product and error text, written in English, unless an open task
// of the product already holds that text. The id counts the product's tasks
// that ever held the text, so a rerun finds the task it made, while a repeat
// after that task was finished gets a new one. When an older task was removed
// for good the count can point at a task that still exists; the next free
// count is used then.
export const planReplenishmentIssueTasks = ({
  failures,
  tasksByTemplate,
}: {
  failures: ReplenishmentIssue[];
  tasksByTemplate: ReadonlyMap<string, readonly ProductTask[]>;
}) => {
  const planned = new Set<string>();
  const tasks: { id: string; productTemplateId: string; title: string; body: string; assigneeId: string | null }[] = [];

  for (const failure of failures) {
    const body = translate('en', failure.error.message, failure.error.values);
    const key = `${failure.productTemplateId}\n${body}`;
    const existing = tasksByTemplate.get(failure.productTemplateId) ?? [];
    const holding = existing.filter((task) =>
      normalized(task.body).includes(normalized(body)),
    );

    if (planned.has(key) || holding.some((task) => task.open)) {
      continue;
    }
    planned.add(key);
    const taken = new Set(existing.map((task) => task.id));
    const idAt = (count: number) => derivedId('replenishmentIssue', failure.productTemplateId, String(count), body);
    let count = holding.length;

    while (taken.has(idAt(count))) {
      count += 1;
    }
    tasks.push({
      id: idAt(count),
      productTemplateId: failure.productTemplateId,
      title: translate('en', ORDERPOINT_MESSAGES.replenishmentIssueTitle, { product: failure.productName }),
      body,
      assigneeId: failure.responsibleId,
    });
  }

  return tasks;
};
