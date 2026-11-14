export function isCancellationStatus(field, value) {
  return (['H', 'approval', 'AZ', 'closure'].includes(field) && value === 'ยกเลิกโครงการ') ||
    (['Y', 'advance'].includes(field) && value === 'ยกเลิก');
}

export function validateReason(value, required = true) {
  if (!required && value === undefined) return '';
  const validText = typeof value === 'string';
  const reason = validText ? value.trim() : '';
  if (!validText || reason.length > 1000 || (required && reason.length < 3)) {
    throw Object.assign(new Error(required ? 'ระบุเหตุผล 3–1,000 ตัวอักษร' : 'เหตุผลต้องเป็นข้อความไม่เกิน 1,000 ตัวอักษร'), { status: 400 });
  }
  return reason;
}
