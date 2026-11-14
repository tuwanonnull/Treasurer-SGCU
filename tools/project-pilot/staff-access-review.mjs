import { prepareStaffProjectRoster } from './staff-project-roster.mjs';
import { prepareProjectAccessPlan } from './project-access-plan.mjs';
import { inspectStaffPositionYears } from './staff-position-years.mjs';

// Server-only dependencies. This function has no write dependency and does not
// treat staff membership as proof of membership in a particular academic year.
export async function reviewStaffProjectAccess({ academicYear, projectIds, readProfiles, findAuthAccount, readExistingGrants }) {
  if (!Number.isInteger(academicYear) || academicYear < 2500 || academicYear > 2999) throw new Error('Invalid academic year');
  const profiles = await readProfiles();
  const prepared = prepareStaffProjectRoster(profiles);
  const issues = prepared.unresolved.filter(row => row.reason !== 'no-project-position');
  const accounts = [];
  for (const row of prepared.roster) {
    let account;
    try { account = await findAuthAccount(row.email); }
    catch (error) {
      if (error.code !== 'auth/user-not-found') throw error; // An outage is not a missing account.
      issues.push({ email: row.email, reason: 'account-not-found' }); continue;
    }
    if (!account || account.email?.trim().toLowerCase() !== row.email) {
      issues.push({ email: row.email, reason: 'auth-email-mismatch' }); continue;
    }
    if (account.disabled !== false || account.emailVerified !== true) {
      issues.push({ email: row.email, reason: account.disabled === true ? 'account-disabled' : 'email-not-verified' }); continue;
    }
    // Do not copy tokens, password hashes, provider metadata or custom claims.
    accounts.push({ uid: account.uid, email: account.email, disabled: false, emailVerified: true });
  }
  let plan = null;
  if (!issues.length) {
    try { plan = prepareProjectAccessPlan({ academicYear, projectIds, roster: prepared.roster, authAccounts: accounts }); }
    catch (error) { issues.push({ reason: 'invalid-access-plan', detail: error.message }); }
  }
  const existing = await readExistingGrants(academicYear), byUid = new Map();
  for (const doc of existing) {
    const grant = doc.data;
    if (!grant || grant.uid !== doc.id || grant.academicYear !== academicYear || byUid.has(doc.id) ||
        !['head', 'secretary', 'assistant'].includes(grant.projectRole) || typeof grant.active !== 'boolean') {
      issues.push({ reason: 'invalid-existing-grant', uid: doc.id }); continue;
    }
    byUid.set(doc.id, grant);
  }
  const differences = [];
  if (plan) {
    for (const grant of plan.grants) {
      const previous = byUid.get(grant.uid);
      if (!previous) differences.push({ uid: grant.uid, kind: 'new-access', proposedRole: grant.projectRole });
      else if (!previous.active) differences.push({ uid: grant.uid, kind: 'previously-revoked', proposedRole: grant.projectRole });
      else if (previous.projectRole !== grant.projectRole) differences.push({ uid: grant.uid, kind: 'role-change', previousRole: previous.projectRole, proposedRole: grant.projectRole });
    }
    const selected = new Set(plan.grants.map(grant => grant.uid));
    for (const [uid, grant] of byUid) if (grant.active && !selected.has(uid)) differences.push({ uid, kind: 'existing-access-outside-roster' });
  }
  return { mode: 'review-only', academicYear, writesPerformed: false, readyToActivate: false,
    academicYearMembershipVerified: false, candidateCount: prepared.roster.length,
    candidates: prepared.roster.map(row => ({ email: row.email, role: row.role, uid: accounts.find(account => account.email.trim().toLowerCase() === row.email)?.uid ?? null,
      positionYears: inspectStaffPositionYears(profiles.find(doc => doc.id.trim().toLowerCase() === row.email).data, row.role) })),
    excludedUnrelatedCount: prepared.unresolved.filter(row => row.reason === 'no-project-position').length,
    issues, differences, plan: issues.length ? null : plan };
}

export function readStaffProjectAccess({ identity, academicYear, projectIds }) {
  return reviewStaffProjectAccess({ academicYear, projectIds,
    readProfiles: async () => (await identity.db.collection('staffProfiles').get()).docs.map(doc => ({ id: doc.id, data: doc.data() })),
    findAuthAccount: email => identity.auth.getUserByEmail(email),
    readExistingGrants: async year => (await identity.db.collection('projectAccess').doc(String(year)).collection('members').get()).docs.map(doc => ({ id: doc.id, data: doc.data() }))
  });
}
