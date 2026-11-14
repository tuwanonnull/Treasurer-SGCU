// Mirrors app.sorting-auth.js getAdvanceCheckMeta/getTransferCheckMeta and remainingDays < 0.
// Transfer source daysToDeadline is sheet AW = AK - TODAY(). Use the AK date here.
const DAY = 86400000;
export function calendarDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const ms = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === value ? ms / DAY : null;
}
export function bangkokDay(now = Date.now()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(now));
  const get = type => parts.find(p => p.type === type).value;
  return calendarDay(`${get('year')}-${get('month')}-${get('day')}`);
}
export function automaticStatusChanges(project, now) {
  const today = bangkokDay(now);
  const lastWork = calendarDay(project.lastWorkDate);
  const closeDue = calendarDay(project.closeDueDate);
  const changes = [];
  if (project.statusFields.transfer === '' && closeDue !== null && closeDue - today < 0) {
    changes.push({ field: 'transfer', value: 'ไม่เข้ากระบวนการโอนงบประมาณ', reason: 'Q1: สถานะโอนงบว่าง และเลยกำหนดส่งเอกสารสรุปโครงการ (AW < 0)' });
  }
  if (project.statusFields.advance === 'ยังไม่เริ่มดำเนินการ' && lastWork !== null && lastWork - today - 8 < 0) {
    changes.push({ field: 'advance', value: 'สำรองจ่ายก่อน', reason: 'Y8: ยังไม่เริ่มดำเนินการ และเลยวันปฏิบัติงานสุดท้ายลบ 8 วัน' });
  }
  return changes;
}
