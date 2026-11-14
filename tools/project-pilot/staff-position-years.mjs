const definitions = {
  head: { name: 'เหรัญญิก', division: '00', level: '01' },
  secretary: { name: 'เลขานุการฝ่ายเหรัญญิก', division: '00', level: '03' },
  assistant: { name: 'ผู้ช่วยเหรัญญิก', division: '01', level: '04' }
};
// Evidence only. Position codes record the year assigned by the staff system;
// they do not grant project access or prove that a person served only that year.
export function inspectStaffPositionYears(profile, role) {
  const definition = definitions[role];
  if (!definition) throw new Error('Invalid project role');
  const entries = Array.isArray(profile.positions) && profile.positions.length ? profile.positions : [{ name: profile.position, code: profile.positionCode }];
  const matching = entries.filter(entry => String(entry?.name || entry?.position || '').trim() === definition.name);
  const evidence = matching.map(entry => {
    const code = typeof (entry.code ?? entry.positionCode) === 'string' ? (entry.code ?? entry.positionCode).trim() : '';
    const parsed = /^SGCU(\d{2})\.10\.(\d{2})\.(\d{2})-(\d{3,})$/.exec(code);
    if (!parsed || parsed[2] !== definition.division || parsed[3] !== definition.level || !/[1-9]/.test(parsed[4])) return { code, academicYear: null, reason: code ? 'invalid-or-conflicting-code' : 'missing-code' };
    return { code, academicYear: 2500 + Number(parsed[1]), reason: null };
  });
  return { source: 'staff-position-code', years: [...new Set(evidence.map(item => item.academicYear).filter(year => year !== null))].sort(),
    incomplete: evidence.length === 0 || evidence.some(item => item.academicYear === null), evidence, membershipConfirmed: false };
}
