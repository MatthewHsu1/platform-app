import { CASE_PRIORITY } from 'src/helpdesk/helpdesk-options.constant';
import { type TodoCounts } from 'src/helpdesk/types/todo-counts.type';

type CountedCase = {
  teamId: string | null;
  assignedUserId: string | null;
  unattended: boolean | null;
  priority: string | null;
  stageClosed: boolean;
  active: boolean | null;
};

// Open cases of a team: not archived and not in a closed stage.
export const countTodo = (cases: CountedCase[], teamId: string): TodoCounts => {
  const open = cases.filter((row) => row.teamId === teamId && row.active !== false && !row.stageClosed);

  return {
    todoTicketCount: open.length,
    todoTicketCountUnassigned: open.filter((row) => row.assignedUserId === null).length,
    todoTicketCountUnattended: open.filter((row) => row.unattended === true).length,
    todoTicketCountHighPriority: open.filter((row) => row.priority === CASE_PRIORITY.VERY_HIGH).length,
  };
};
