// Input is a trusted server-side read of staffProfiles/{email}.
// Produces review candidates only: no grants, account creation or assignments.
const roles = new Map([
  ['เหรัญญิก', 'head'], ['เลขานุการฝ่ายเหรัญญิก', 'secretary'], ['ผู้ช่วยเหรัญญิก', 'assistant']
]);
export function prepareStaffProjectRoster(profiles) {
  if (!Array.isArray(profiles)) throw new Error('Staff profiles required');
  const roster = [], unresolved = [], seen = new Set();
  for (const doc of profiles) {
    const email = typeof doc?.id === 'string' ? doc.id.trim().toLowerCase() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || seen.has(email)) throw new Error('Invalid or duplicate staff profile email');
    seen.add(email);
    const data = doc.data;
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid staff profile');
    if (data.email && (typeof data.email !== 'string' || data.email.trim().toLowerCase() !== email)) {
      unresolved.push({ email, reason: 'profile-email-conflict' }); continue;
    }
    if (data.positions !== undefined && !Array.isArray(data.positions)) {
      unresolved.push({ email, reason: 'invalid-positions' }); continue;
    }
    // Match the existing multiple-position model; legacy primary position is a fallback.
    const names = data.positions?.length ? data.positions.map(p => p?.name) : [data.position];
    const matched = [...new Set(names.filter(name => typeof name === 'string').map(name => roles.get(name.trim())).filter(Boolean))];
    if (matched.length === 1) roster.push({ email, role: matched[0], projectIds: [] });
    else unresolved.push({ email, reason: matched.length ? 'multiple-project-roles' : 'no-project-position' });
  }
  return { mode: 'review-only', roster, unresolved, writesPerformed: false,
    academicYearMembershipVerified: false, authAccountsVerified: false };
}
