import { PilotError, parseMoney } from './model.mjs';

const transferActive = new Set(['อนุมัติการโอนงบประมาณโดยเหรัญญิก', 'ผ่านที่ประชุมสภาใหญ่', 'รอนายกและประธานสภาลงนาม', 'ส่งกิจการนิสิตแล้ว รออนุมัติ', 'กระบวนการโอนงบประมาณมีผลบังคับใช้']);
const advanceReceived = new Set(['โครงการรับเงินแล้ว', 'เหรัญญิกรับเงินจากกิจการนิสิต', 'ส่งกิจการนิสิตแล้ว รออนุมัติ']);
export const MONEY_COLUMNS = ['O', 'V', 'W', 'AE', 'AJ', 'BC', 'BE', 'BF'];
const fail = message => { throw new PilotError(400, message); };
const cents = value => {
  if (value === null) return null;
  if (!Number.isSafeInteger(value)) fail('ยอดเงินต้นทางไม่ถูกต้อง');
  return BigInt(value);
};
const safe = value => {
  if (value === null) return null;
  const n = Number(value);
  if (!Number.isSafeInteger(n)) fail('ผลคำนวณเกินขอบเขตที่รองรับ');
  return n;
};
function percentage(amount, rate) {
  if (rate === null) return 0n; // Formula arithmetic treats a blank rate as zero.
  if (typeof rate !== 'string' || !/^-?\d{1,12}(?:\.\d{1,18})?$/.test(rate)) fail('ร้อยละต้นทางไม่ถูกต้อง');
  const negative = rate.startsWith('-');
  const [whole, fraction = ''] = rate.replace(/^-/, '').split('.');
  const numerator = amount * BigInt(whole + fraction) * (negative ? -1n : 1n);
  const denominator = 100n * 10n ** BigInt(fraction.length);
  const absolute = numerator < 0n ? -numerator : numerator;
  // ROUND_HALF_UP (away from zero on ties), using integer arithmetic throughout.
  const rounded = (absolute + denominator / 2n) / denominator;
  return numerator < 0n ? -rounded : rounded;
}

export function calculateMoney(project, inputs = project.money, direction = project.formulaInputs?.transferDirection) {
  const f = project.formulaInputs;
  if (f?.version !== 1 || typeof f.hasLoanDocument !== 'boolean') fail('สำเนานี้ยังไม่มีข้อมูลสำหรับคำนวณสูตร');
  const O = cents(inputs.O), V = cents(inputs.V), AJ = cents(inputs.AJ);
  const eligible = project.statuses.H === 'อนุมัติโครงการ' || f.hasLoanDocument;
  const AE = eligible ? percentage(O ?? 0n, f.advanceRate) : null;
  let W = null;
  if (V !== null) {
    if (!['ลด', 'เพิ่ม'].includes(direction)) fail('เมื่อระบุยอดโอน ต้องเลือกเพิ่มหรือลด');
    W = (O ?? 0n) + (direction === 'ลด' ? -V : V);
  }
  const BE = AJ ?? 0n;
  const BC = !project.statuses.Y ? null : advanceReceived.has(project.statuses.Y) ? BE - (AE ?? 0n) : BE;
  const BF = AJ === null ? 0n : (transferActive.has(project.statuses.Q) ? W ?? 0n : O ?? 0n) - BE;
  return Object.fromEntries(Object.entries({ O, V, W, AE, AJ, BC, BE, BF }).map(([key, value]) => [key, safe(value)]));
}

export function previewMoney(project, changes) {
  if (!changes || typeof changes !== 'object' || Array.isArray(changes) || Object.keys(changes).some(key => !['O', 'V', 'AJ', 'U'].includes(key))) fail('แก้ได้เฉพาะยอดอนุมัติ ยอดโอน ทิศทางโอน และยอดใช้จริง');
  const inputs = { ...project.money };
  for (const col of ['O', 'V', 'AJ']) {
    if (!Object.hasOwn(changes, col)) continue;
    if (typeof changes[col] !== 'string') fail('กรอกยอดเงินเป็นข้อความทศนิยมไม่เกิน 2 ตำแหน่ง');
    inputs[col] = changes[col].trim() === '' ? null : parseMoney(changes[col]);
  }
  const direction = Object.hasOwn(changes, 'U') ? changes.U : project.formulaInputs?.transferDirection;
  if (Object.hasOwn(changes, 'U') && !['', 'ลด', 'เพิ่ม'].includes(direction)) fail('ทิศทางโอนไม่ถูกต้อง');
  const before = calculateMoney(project);
  if (MONEY_COLUMNS.some(col => before[col] !== project.money[col])) fail('สูตรตั้งต้นไม่ตรงกับสำเนา จึงยังทดลองแก้ไม่ได้');
  const after = calculateMoney(project, inputs, direction);
  return { projectId: project.id, previewOnly: true, saved: false, before, after,
    changedColumns: MONEY_COLUMNS.filter(col => before[col] !== after[col]) };
}
