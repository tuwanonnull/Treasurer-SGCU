import { PilotError } from './model.mjs';
export const HEAD_EMAIL = '6534324223@student.chula.ac.th';
export const ADMIN_EMAIL = 'tuwanon.kimchiang@gmail.com';
export function createProjectAuthenticator(auth) {
  return async header => {
    if (typeof header !== 'string' || !/^Bearer [^\s]+$/.test(header)) throw new PilotError(401,'กรุณาเข้าสู่ระบบด้วยบัญชีเดิม');
    let token,user;
    try { token = await auth.verifyIdToken(header.slice(7),true); user = await auth.getUser(token.uid); }
    catch { throw new PilotError(401,'บัญชีหรือการเข้าสู่ระบบใช้ไม่ได้แล้ว'); }
    const email = user.email?.toLowerCase();
    if (user.uid !== token.uid || user.disabled || !user.emailVerified || token.email_verified !== true || token.email?.toLowerCase() !== email || ![HEAD_EMAIL,ADMIN_EMAIL].includes(email)) throw new PilotError(403,'บัญชีนี้ยังไม่มีสิทธิ์ใช้งานโครงการปี 2568');
    return { id:user.uid, email, authenticated:true, role:email === ADMIN_EMAIL ? 'admin' : 'head' };
  };
}
export async function loadProjectRegistry(auth) {
  const [head,admin] = await Promise.all([auth.getUserByEmail(HEAD_EMAIL),auth.getUserByEmail(ADMIN_EMAIL)]);
  // Retain stable names/UIDs even if an account is later disabled: historical audit must remain readable.
  return { [head.uid]:{id:head.uid,role:'head',name:'เหรัญญิกปี 2568'},[admin.uid]:{id:admin.uid,role:'admin',name:'แอดมินระบบ'} };
}
