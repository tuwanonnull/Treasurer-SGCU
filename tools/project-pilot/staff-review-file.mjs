import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { inspectStaffPositionYears } from './staff-position-years.mjs';

export async function loadStaffReviewFile(file, academicYear) {
  if ((await stat(file)).size > 2 * 1024 * 1024) throw new Error('Staff review too large');
  const value = JSON.parse(await readFile(file, 'utf8'));
  if (value.source !== 'production-snapshot' || value.sourceProjectId !== 'departmentwebsite-5aec1' ||
      value.academicYear !== academicYear || value.mode !== 'review-only' || value.writesPerformed !== false || value.readyToActivate !== false ||
      !Number.isFinite(Date.parse(value.checkedAt)) || !Array.isArray(value.candidates) || value.candidateCount !== value.candidates.length ||
      !Array.isArray(value.issues) || !Array.isArray(value.differences)) throw new Error('Invalid staff review snapshot');
  const candidates = value.candidates.map(row => {
    if (typeof row.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email) || !['head', 'secretary', 'assistant'].includes(row.role) || (row.uid !== null && typeof row.uid !== 'string')) throw new Error('Invalid staff candidate');
    let positionYears;
    if (row.positionYears !== undefined) {
      const evidence = row.positionYears?.evidence;
      if (!Array.isArray(evidence) || evidence.length > 100 || evidence.some(item => typeof item?.code !== 'string')) throw new Error('Invalid position-year evidence');
      const name = { head: 'เหรัญญิก', secretary: 'เลขานุการฝ่ายเหรัญญิก', assistant: 'ผู้ช่วยเหรัญญิก' }[row.role];
      positionYears = inspectStaffPositionYears({ positions: evidence.map(item => ({ name, code: item.code })) }, row.role);
    }
    return { email: row.email, role: row.role, uid: row.uid, ...(positionYears ? { positionYears } : {}) };
  });
  const safeItems = rows => rows.map(row => Object.fromEntries(['email', 'uid', 'reason', 'kind'].filter(key => typeof row?.[key] === 'string').map(key => [key, row[key]])));
  let confirmedAccountRoles = [];
  let initialAccess = null;
  try {
    const notesFile = path.join(path.dirname(file), 'account-identity-notes.json');
    if ((await stat(notesFile)).size > 100_000) throw new Error('Staff notes too large');
    const notes = JSON.parse(await readFile(notesFile, 'utf8'));
    if (notes.source !== 'user-confirmed' || notes.grantsChanged !== false || !Array.isArray(notes.accountRoles)) throw new Error('Invalid account notes');
    confirmedAccountRoles = notes.accountRoles.map(row => {
      if (!candidates.some(candidate => candidate.email === row.email)) throw new Error('Unknown account in notes');
      if (row.systemRole === 'admin') return { email: row.email, systemRole: 'admin' };
      if (row.projectRole !== 'head' || !Number.isInteger(row.academicYear) || row.academicYear < 2500 || row.academicYear > 2999) throw new Error('Invalid year role');
      return { email: row.email, projectRole: 'head', academicYear: row.academicYear };
    });
    if (notes.initialAccess) {
      const selected = notes.initialAccess;
      if (selected.academicYear !== academicYear || selected.scope !== 'head-only' ||
          !confirmedAccountRoles.some(row => row.email === selected.headEmail && row.projectRole === 'head' && row.academicYear === academicYear) ||
          !candidates.some(row => row.email === selected.headEmail && row.uid)) throw new Error('Invalid initial access selection');
      initialAccess = { academicYear, scope: 'head-only', headEmail: selected.headEmail, activated: false };
    }
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  // The UI receives review fields only, never an executable grant plan or extra data.
  return { mode: 'review-only', source: value.source, sourceProjectId: value.sourceProjectId, academicYear,
    checkedAt: value.checkedAt, writesPerformed: false, readyToActivate: false, academicYearMembershipVerified: false,
    candidateCount: candidates.length, candidates, confirmedAccountRoles, initialAccess, issues: safeItems(value.issues), differences: safeItems(value.differences) };
}
