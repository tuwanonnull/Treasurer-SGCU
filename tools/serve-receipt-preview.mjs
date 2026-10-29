import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.ttf': 'font/ttf', '.png': 'image/png', '.jpg': 'image/jpeg' };
http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (['/voucher', '/certificate', '/club-voucher', '/club-certificate'].includes(pathname)) {
      const context = vm.createContext({ Intl, Date, URL });
      vm.runInContext(await fs.readFile(path.join(root, 'js/features/project/app.receipt-documents.js'), 'utf8'), context);
      const certificate = pathname.endsWith('certificate');
      const club = pathname.startsWith('/club-');
      const data = {
        date: '2026-10-29', place: 'สำนักงานองค์การบริหารสโมสรนิสิต',
        person: certificate ? 'นางสาวตัวอย่าง ใจดี' : 'นายตัวอย่าง พร้อมพิมพ์',
        house: '254', road: 'พญาไท', subdistrict: 'วังใหม่', district: 'ปทุมวัน',
        province: 'กรุงเทพมหานคร', phone: '080-000-0000', payer: 'นางสาวตัวอย่าง ใจดี',
        unit: 'องค์การบริหารสโมสรนิสิต / โครงการจิตอาสาพัฒนาชุมชน', position: 'ประธานโครงการ'
      };
      if (club) {
        data.advisor = 'ผู้ช่วยศาสตราจารย์ ดร.ตัวอย่าง ใจดี';
        data.unit = 'ชมรมอาสาพัฒนา / โครงการจิตอาสาพัฒนาชุมชน';
        data.place = 'ที่ทำการชมรมอาสาพัฒนา';
      }
      const items = certificate ? [
        { date: '2026-10-29', description: 'ค่าเดินทางโดยรถแท็กซี่จากจุฬาลงกรณ์มหาวิทยาลัยไปสถานที่จัดกิจกรรม', satang: 18500, note: 'เดินทางไปเตรียมพื้นที่จัดกิจกรรม' },
        { date: '2026-10-29', description: 'ค่าเดินทางโดยรถแท็กซี่จากสถานที่จัดกิจกรรมกลับจุฬาลงกรณ์มหาวิทยาลัย', satang: 17250, note: 'เดินทางกลับหลังเสร็จสิ้นกิจกรรม' }
      ] : [
        { description: 'ค่าจัดทำป้ายประชาสัมพันธ์โครงการ จำนวน 2 ป้าย ราคาป้ายละ 350 บาท', satang: 70000 },
        { description: 'ค่าจัดเตรียมวัสดุอุปกรณ์สำหรับกิจกรรม จำนวน 1 ชุด ราคา 450 บาท', satang: 45000 }
      ];
      const html = context.buildReceiptDocument(certificate ? 'certificate' : 'voucher', data, items,
        { code: 'ตัวอย่าง-001', name: 'โครงการจิตอาสาพัฒนาชุมชน (ข้อมูลสมมติ)', orgGroup: club ? 'ชมรมฝ่ายพัฒนาสังคมและบำเพ็ญประโยชน์' : 'องค์การบริหารสโมสรนิสิต' }, 'http://127.0.0.1:4174/');
      response.writeHead(200, { 'Content-Type': mime['.html'], 'Cache-Control': 'no-store' });
      response.end(html.replace('</body>', `<script src="/js/features/project/app.advance-loan-pdf.js"></script><script>applyThaiSegmentation(document.querySelector('.receipt-sheet'), 'p, .signature, td:not(.money), .fill');</script></body>`));
      return;
    }
    if (pathname === '/advance') {
      const page = await fs.readFile(path.join(root, 'tools/advance-preview.html'), 'utf8');
      const template = await fs.readFile(path.join(root, 'partials/pdf/advance-loan-document.html'), 'utf8');
      response.writeHead(200, { 'Content-Type': mime['.html'], 'Cache-Control': 'no-store' });
      response.end(page.replace('<!-- ADVANCE_TEMPLATE -->', template));
      return;
    }
    const relative = pathname === '/'  ? 'tools/receipt-preview.html' : pathname.slice(1);
    const file = path.resolve(root, relative);
    if (!file.startsWith(root) || (pathname !== '/' && !/^(css|js|THSarabunNew|img)\//.test(relative))) {
      response.writeHead(404); response.end(); return;
    }
    const content = await fs.readFile(file);
    response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(content);
  } catch {
    response.writeHead(404); response.end();
  }
}).listen(4174, '127.0.0.1', () => console.log('Document preview: http://127.0.0.1:4174/'));
