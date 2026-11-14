export function validateYear68Snapshot(data) {
  if (data?.schemaVersion !== 1 || data.year !== 2568 || data.readOnly !== true || data.automationEnabled !== false || !Array.isArray(data.projects)) {
    throw new Error('Invalid read-only year-68 snapshot');
  }
  const columns = ['O', 'V', 'W', 'AE', 'AJ', 'BC', 'BE', 'BF'];
  const ids = new Set(); const codes = new Set();
  const totals = Object.fromEntries(columns.map(col => [col, 0]));
  for (const p of data.projects) {
    if (typeof p.id !== 'string' || !p.id.startsWith('YEAR68:') || !p.code || ids.has(p.id) || codes.has(p.code) || p.responsibleColumn !== 'AI' || p.accountId !== null) throw new Error('Invalid project identity or assignment');
    ids.add(p.id); codes.add(p.code);
    for (const col of columns) {
      const amount = p.money?.[col];
      if (amount !== null && !Number.isSafeInteger(amount)) throw new Error('Invalid satang value');
      totals[col] += amount ?? 0;
      if (!Number.isSafeInteger(totals[col])) throw new Error('Unsafe total');
    }
  }
  for (const col of columns) if (totals[col] !== data.totals?.[col]) throw new Error('Snapshot totals do not match');
  if (data.verification?.projectCount !== data.projects.length || data.verification?.moneyMismatchCount !== 0) throw new Error('Snapshot reconciliation incomplete');
  return structuredClone(data);
}

// Exact source text only: a name group is not an authenticated person or a permission grant.
export function summarizeReviewers(data) {
  const groups = new Map();
  for (const project of data.projects) {
    const name = String(project.responsibleName ?? '');
    const group = groups.get(name) || { name, projectCount: 0, accountMapped: false };
    group.projectCount++;
    groups.set(name, group);
  }
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name, 'th'));
}

export function queryYear68(data, searchParams) {
  const query = (searchParams.get('q') || '').trim().slice(0, 200).toLocaleLowerCase('th-TH');
  const requestedOffset = Number(searchParams.get('offset') || 0);
  const offset = Number.isSafeInteger(requestedOffset) && requestedOffset >= 0 ? requestedOffset : 0;
  const reviewer = searchParams.get('reviewer');
  const filtered = data.projects.filter(p => (reviewer === null || String(p.responsibleName ?? '') === reviewer) && [p.code, p.name, p.organization, p.responsibleName].some(value => String(value).toLocaleLowerCase('th-TH').includes(query)));
  const { projects, ...metadata } = data;
  return { ...metadata, reviewers: summarizeReviewers(data), totalCount: projects.length, matchedCount: filtered.length, offset, limit: 25,
    projects: filtered.slice(offset, offset + 25) };
}
