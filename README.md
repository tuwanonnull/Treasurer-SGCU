# Treasurer SGCU

เว็บฝ่ายเหรัญญิก อบจ. ใช้ JavaScript และ Firebase

## โครงสร้างโปรเจกต์

| ตำแหน่ง | ใช้สำหรับ |
| --- | --- |
| `web/` | ซอร์สหน้าเว็บ: HTML, `partials/`, `js/`, `css/`, `img/` และฟอนต์ |
| `functions/` | Firebase Functions พร้อมชุดทดสอบ backend |
| `tools/build/` และ `tools/lib/` | สร้างเว็บและจัดการเวอร์ชัน assets |
| `tools/checks/` | ตรวจ audit log และธีม |
| `tools/tests/` | ชุดทดสอบหน้าเว็บและฟีเจอร์ |
| `tools/preview/` | พรีวิวเอกสารและหน้าจัดการโครงการ |
| `tools/emulator/` | seed และเครื่องมือทดสอบด้วย Emulator |
| `tools/project-pilot/` | เครื่องมือข้อมูลโครงการ ดู [คู่มือ](tools/project-pilot/README.md) |
| `docs/` | คู่มือระบบและการส่งต่องาน |
| `dist/` | เว็บที่ build แล้ว สร้างใหม่ได้ ไม่แก้โดยตรง |
| `.local/` | export และ log ในเครื่อง ไม่เข้า Git หรือเว็บที่เผยแพร่ |

ไฟล์ config ของ npm, Firebase และ Firestore อยู่ที่ root เพื่อให้ CLI ใช้งานได้ตามเดิม
ตัว build คัดลอกจาก `web/` เท่านั้น และประกอบ `partials/` เข้า HTML โดย URL ของหน้าเว็บและ assets ยังคงเดิม

## คำสั่งหลัก

```sh
npm ci
npm run check
npm run build
npm run serve:dist
```

เปิดเว็บที่ http://localhost:4173 หลัง build แล้ว

- `npm run preview:site`: build และเปิดเว็บทั้งชุดที่ http://127.0.0.1:4181 (เข้าสู่ระบบและใช้ข้อมูลจริง การบันทึกมีผลกับฐานข้อมูลจริง)
- `npm run preview:documents`: พรีวิวเอกสารที่ http://127.0.0.1:4174
- `npm run preview:staff-positions`: ทดลองหน้าจัดการตำแหน่งสตาฟที่ http://127.0.0.1:4177 (ชุดตำแหน่งและสิทธิ์ที่อ่านจากระบบจริง แก้ไขเฉพาะในเบราว์เซอร์); รหัสและสิทธิ์ที่จำลองอาจต่างจากระบบจริง
- `npm run preview:staff-positions:refresh`: อ่าน `staffPositionCatalog` แบบ read-only ผ่านบัญชี Firebase CLI ที่ลงชื่อเข้าใช้ เก็บ snapshot ใน `.local/staff-position-preview/catalog.json` ไม่เขียนฐานข้อมูลจริง; หน้าทดลองใช้รายการหน้าจาก `STAFF_PAGE_OPTIONS` ในโค้ดโดยตรง แต่ละ snapshot มี draft ในเบราว์เซอร์แยกกัน
- `npm run preview:projects`: พรีวิวโครงการด้วยข้อมูลจำลองที่ http://127.0.0.1:4175
- หากพอร์ตพรีวิวโครงการไม่ว่าง ใช้ `PORT=4185 npm run preview:projects`
- `npm run meeting:emulators`: เปิด Auth และ Firestore Emulator (ต้องติดตั้ง Firebase CLI)
- `npm run meeting:seed`: เพิ่มบัญชีทดสอบใน Emulator ที่เปิดอยู่
- `npm run test:push`: ทดสอบระบบแจ้งเตือนฝั่ง Functions

ดูรายละเอียดใน [คู่มือส่งต่องาน](docs/handover.md) และ [คู่มือระบบโครงการ](docs/project-live-web.md)
