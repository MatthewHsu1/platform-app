// The scheduled run skips teams that use neither leads nor a pipeline.
export const SCHEDULE_TEAM_FILTER = {
  and: [{ active: { eq: true } }, { or: [{ useLeads: { eq: true } }, { useOpportunities: { eq: true } }] }, { assignmentOptout: { eq: false } }],
};

export const SETTINGS_DOOR_TEAM_FILTER = { and: [{ active: { eq: true } }, { assignmentOptout: { eq: false } }] };
