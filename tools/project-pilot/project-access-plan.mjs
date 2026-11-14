// Read-only preparation. Never writes grants or creates accounts.
// authAccounts must come from a trusted server-side Auth export, not a client form.
const requireThat = (ok, message) => { if (!ok) throw new Error(message); };
const emailKey = email => {
  requireThat(typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()), 'Invalid email');
  return email.trim().toLowerCase();
};
export function prepareProjectAccessPlan({ academicYear, roster, authAccounts, projectIds }) {
  requireThat(Number.isInteger(academicYear) && academicYear >= 2500 && academicYear <= 2999, 'Invalid academic year');
  requireThat(Array.isArray(roster) && roster.length > 0 && Array.isArray(authAccounts) && Array.isArray(projectIds), 'Missing roster, Auth accounts or project IDs');
  requireThat(projectIds.every(id => typeof id === 'string' && id.trim() === id && id.length > 0) && new Set(projectIds).size === projectIds.length, 'Invalid or duplicate project ID');
  const accounts = new Map(), uids = new Set();
  for (const account of authAccounts) {
    // Provider-only accounts without email cannot be selected by this email roster.
    if (!account.email) continue;
    const key = emailKey(account.email);
    requireThat(typeof account.uid === 'string' && account.uid.trim().length > 0 && !account.uid.includes('/'), 'Invalid Auth UID');
    requireThat(!accounts.has(key) && !uids.has(account.uid), 'Ambiguous Auth accounts');
    accounts.set(key, account); uids.add(account.uid);
  }
  const projects = new Set(projectIds), selected = new Set(), assigned = new Set(), grants = [], assignments = [];
  for (const row of roster) {
    requireThat(row && Object.keys(row).every(key => ['email', 'role', 'projectIds'].includes(key)), 'Unexpected roster field');
    requireThat(['head', 'secretary', 'assistant'].includes(row.role), 'Invalid project role');
    const key = emailKey(row.email), account = accounts.get(key);
    requireThat(account && account.emailVerified === true && account.disabled === false, 'Account missing, unverified or disabled');
    requireThat(!selected.has(account.uid), 'Duplicate roster account'); selected.add(account.uid);
    const ids = row.projectIds ?? [];
    requireThat(Array.isArray(ids) && (row.role === 'assistant' || ids.length === 0), 'Project assignments require assistant role');
    grants.push({ uid: account.uid, academicYear, active: true, projectRole: row.role });
    for (const id of ids) {
      requireThat(projects.has(id) && !assigned.has(id), 'Unknown or multiply assigned project'); assigned.add(id);
      assignments.push({ projectId: id, assistantUid: account.uid, academicYear });
    }
  }
  requireThat(grants.filter(grant => grant.projectRole === 'head').length === 1, 'Exactly one treasurer required');
  return { mode: 'review-only', academicYear, grants, assignments,
    unassignedProjectIds: projectIds.filter(id => !assigned.has(id)),
    writesPerformed: false, existingAccessReconciled: false };
}
