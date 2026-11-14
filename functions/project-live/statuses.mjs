// Source: docs/project-status-manual.md, sections 4.1–4.5.
// All 57 choices were checked against the attached year-68 workbook during the local audit.
export const STATUS_GROUPS = [
  { id: 'approval', label: 'สถานะการอนุมัติโครงการและงบประมาณ', column: 'H', values: [
    'ผ่านที่ประชุมนายกหรืออนุกรรมการ', 'ไม่รับรองจากที่ประชุมนายก', 'ผ่านสภารับหลักการ', 'สภาไม่รับหลักการ', 'ผ่านกมธ.วิสามัญ', 'ไม่ผ่านกมธ.วิสามัญ', 'ผ่านสภาอนุมัติงบ', 'สภาไม่อนุมัติงบ', 'ผ่านสภาใหญ่', 'ไม่ผ่านสภาใหญ่', 'ส่งขออนุมัติกิจการนิสิต', 'อนุมัติโครงการ', 'รอแก้ไข', 'ยกเลิกโครงการ'
  ] },
  { id: 'transfer', label: 'สถานะโอนงบประมาณ', column: 'Q', values: [
    'ไม่เข้ากระบวนการโอนงบประมาณ', 'องค์กรกำลังดำเนินการ', 'รอแก้ไข', 'ผู้ช่วยตรวจสอบ', 'เลขาตรวจสอบ', 'อนุมัติการโอนงบประมาณโดยเหรัญญิก', 'ไม่อนุมัติโดยเหรัญญิก', 'ผ่านที่ประชุมนายก', 'ไม่ผ่านที่ประชุมนายก', 'ผ่านที่ประชุมสภาใหญ่', 'ไม่ผ่านที่ประชุมสภาใหญ่', 'รอนายกและประธานสภาลงนาม', 'ส่งกิจการนิสิตแล้ว รออนุมัติ', 'กระบวนการโอนงบประมาณมีผลบังคับใช้'
  ] },
  { id: 'advance', label: 'สถานะยืมรองจ่าย', column: 'Y', values: [
    'ยังไม่เริ่มดำเนินการ', 'องค์กรกำลังดำเนินการ', 'ผู้ช่วยตรวจสอบ', 'เลขาตรวจสอบ', 'รอนายกลงนาม', 'ส่งกิจการนิสิตแล้ว รออนุมัติ', 'รอแก้ไข', 'สำรองจ่ายก่อน', 'เหรัญญิกรับเงินจากกิจการนิสิต', 'โครงการรับเงินแล้ว', 'ยกเลิก', 'ไม่อนุมัติ / อนุมัติไม่ทันวันจัดกิจกรรม'
  ] },
  { id: 'closure', label: 'สถานะปิดโครงการ', column: 'AZ', values: [
    'รอส่งเอกสารปิดโครง', 'รอผู้ช่วยตรวจสอบ', 'ผู้ช่วยเหรัญญิกตรวจสอบ', 'ผ่านผู้ช่วยเหรัญญิก', 'เหรัญญิกตรวจสอบ', 'ผ่านเหรัญญิก', 'ส่งให้ชมรมกลับเพื่อแก้ไข', 'ชมรมรับเอกสารแก้ไข', 'รอส่งกิจการนิสิต', 'ส่งกิจการนิสิตเรียบร้อย', 'ไม่ส่งปิดโครงการ', 'ยกเลิกโครงการ'
  ] },
  { id: 'voucher', label: 'สถานะปิดโครง (ฎีกา)', column: 'BA', values: [
    'เหรัญญิกรับเงินจากกิจการนิสิต', 'โครงการรับเงินแล้ว', 'โครงการคืนเงินแล้ว', 'รอเสนอเอกสารอนุมัติ', 'รอปิดโครงการ'
  ] }
];
// User-approved permission matrix. Indices below are 1-based, matching H/Q/Y/AZ/BA codes.
const SECRETARY_DIRECT = { transfer: [1, 2, 3, 4, 5], advance: [1, 2, 3, 4, 5, 6, 7, 8] };
const SECRETARY_REVIEW = { approval: Array.from({ length: 14 }, (_, i) => i + 1), transfer: [6, 7, 8, 9, 10, 11, 12, 13], advance: [11] };
const ASSISTANT_DIRECT = { transfer: [1, 2, 3, 4], advance: [1, 2, 3], closure: [1, 2, 3, 4, 7, 8] };
export const STATUS_DEFAULTS = { approval: '', transfer: '', advance: 'ยังไม่เริ่มดำเนินการ', closure: 'รอส่งเอกสารปิดโครง', voucher: 'เหรัญญิกรับเงินจากกิจการนิสิต' };
export function statusMode(user, group, value, editors = []) {
  const index = group.values.indexOf(value) + 1;
  if (!index) return 'denied';
  if (user.role === 'head') return 'direct';
  if (user.role === 'secretary') {
    if (SECRETARY_DIRECT[group.id]?.includes(index)) return 'direct';
    if (SECRETARY_REVIEW[group.id]?.includes(index)) return 'review';
  }
  if (user.role === 'assistant') {
    if (group.id === 'closure' && index === 12) return 'review';
    if (ASSISTANT_DIRECT[group.id]?.includes(index) && editors.every(id => id === user.id)) return 'direct';
  }
  return 'denied';
}
