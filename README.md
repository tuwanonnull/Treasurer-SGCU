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

## ไฟล์ที่แบ่งตามหน้าที่

- `web/js/features/staff/app.staff-access.parts/`: การอนุมัติ, ทะเบียนเจ้าหน้าที่, ตำแหน่ง/สิทธิ์, บัญชีชั่วคราว, ตัวแทนองค์กร และทะเบียนองค์กร
- `web/js/features/borrow/app.borrow-assets.parts/`: โปรไฟล์, โครงการ, วันรับคืน, แจ้งเตือน, คลังพัสดุ, รายการคำขอ, dialog, Firestore และเมนูมือถือ
- `web/js/core/mobile/`: แถบเมนูมือถือของโครงการ, dashboard, ทะเบียนเจ้าหน้าที่ และห้องประชุม โหลดก่อน `app.init.js`
- `web/css/pages/operations/`: สไตล์ย่อยตามกลุ่มหน้าจอ โดย `operations.css` กำหนดลำดับ import

ไฟล์ `.js.inc` เป็นส่วนของฟังก์ชันเริ่มต้นเดิม ไม่ใช่ module ที่โหลดแยกในเบราว์เซอร์:
แก้โค้ดในไฟล์ย่อย แล้ว `npm run build` เพื่อประกอบกลับเป็นไฟล์ JavaScript ที่ URL เดิม
state และลำดับการตั้ง listener ยังใช้ร่วมกันตามเดิม จึงไม่ควรสลับลำดับ `@include` โดยไม่ตรวจ dependency
หากเขียน test หรือ preview ที่อ่านโค้ดชุดนี้ ให้ใช้ `readScriptSource()` จาก `tools/lib/source-includes.mjs`
แทนการอ่าน entrypoint อย่างเดียว เพื่อทดสอบโค้ดเดียวกับที่เผยแพร่จริง

Build ประกอบ CSS imports แบบซ้อนกันโดยคงลำดับกฎ และไม่เผยแพร่ `.js.inc` ไปที่ `dist/`
การแบ่งครั้งนี้ช่วยให้ค้นหาและแก้โค้ดสะดวกขึ้น ขนาด JavaScript ที่โหลดของสองฟีเจอร์ยังเท่าเดิม

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
