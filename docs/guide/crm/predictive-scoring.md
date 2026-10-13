# Predictive scoring

Part of [CRM](../crm.md).

The automated probability comes from how often each value (stage, phone and email quality,
state, country, source, language, tags) was seen on won and on lost leads of the same team
(leads without a team use every team's counts). A lead whose probability equals the automated
one follows it; a probability typed by hand stays. Counts change live when a lead is won, lost or
reopened, and are rebuilt by "Update probabilities" (workspace administrators, Settings → Apps →
Platform → CRM) or, when switched on, every night at 03:00 UTC. Only leads created on or after the
start date count. The Probability tab of a lead explains the score.
