// Preparation for a server integration, not wired into the local role-switching demo.
// Dependencies MUST be server-owned: a token verifier and a protected grant reader.
// Never pass decoded client JSON, staff-page privileges, or request-body roles here.
export class ProjectIdentityError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function createProjectIdentityResolver({ verifyToken, readGrant }) {
  if (typeof verifyToken !== 'function' || typeof readGrant !== 'function') throw new TypeError('Trusted identity dependencies required');
  return async function resolve(authorization, academicYear) {
    if (!Number.isInteger(academicYear) || academicYear < 2500 || academicYear > 2999) {
      throw new ProjectIdentityError(400, 'ปีการศึกษาไม่ถูกต้อง');
    }
    if (typeof authorization !== 'string' || !/^Bearer [^\s]+$/.test(authorization)) {
      throw new ProjectIdentityError(401, 'กรุณาเข้าสู่ระบบ');
    }
    let identity;
    try { identity = await verifyToken(authorization.slice(7), { checkRevoked: true }); }
    catch { throw new ProjectIdentityError(401, 'บัญชีหรือการเข้าสู่ระบบใช้ไม่ได้แล้ว'); }
    if (!identity || typeof identity.uid !== 'string' || !identity.uid.trim()) {
      throw new ProjectIdentityError(401, 'ไม่พบตัวตนบัญชีที่ยืนยันแล้ว');
    }
    // Read every time: a previous request must not retain a revoked project role.
    // Backend failures propagate; they must never fall back to a more powerful role.
    const grant = await readGrant({ uid: identity.uid, academicYear });
    if (!grant || grant.active !== true || grant.uid !== identity.uid ||
        grant.academicYear !== academicYear || !['head', 'secretary', 'assistant'].includes(grant.projectRole)) {
      throw new ProjectIdentityError(403, 'บัญชีนี้ยังไม่มีสิทธิ์ส่วนโครงการในปีที่เลือก');
    }
    return Object.freeze({ id: identity.uid, role: grant.projectRole, academicYear });
  };
}
