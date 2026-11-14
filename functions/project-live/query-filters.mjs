// Exact organization filters are applied before pagination to the authorized dataset.
export function filterLiveProjects(projects, params = new URLSearchParams()) {
  const q = (params.get('q') || '').trim().slice(0, 200).toLocaleLowerCase('th-TH');
  const year = params.get('year') || '2568';
  const group = params.get('group') || 'all';
  const organization = params.get('organization') || 'all';
  const text = value => String(value ?? '').trim();
  const organizations = [...new Map(projects.map(p => {
    const item = {group: text(p.organizationGroup), name: text(p.organization)};
    return [JSON.stringify(item), item];
  })).values()].sort((a,b) => a.name.localeCompare(b.name, 'th'));
  const matched = projects.filter(p => (year === 'all' || String(p.year || 2568) === year)
    && (group === 'all' || text(p.organizationGroup) === group)
    && (organization === 'all' || text(p.organization) === organization)
    && [p.code,p.name,p.organization,p.organizationGroup].some(v => text(v).toLocaleLowerCase('th-TH').includes(q)));
  const requested = Number(params.get('offset') || 0);
  const offset = Number.isSafeInteger(requested) && requested >= 0 ? Math.min(requested, Math.max(0, Math.ceil(matched.length / 25) - 1) * 25) : 0;
  return {matched, offset, filterOptions: {years: ['2568'], organizations}};
}
