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
- `npm run preview:work-requests`: ตัวอย่างหน้า “งานและคำขอ” ที่ http://127.0.0.1:4189 ใช้โครงหน้า เมนู ฟอนต์ และ CSS จากเว็บจริงที่ build แล้ว พร้อมข้อมูลจำลอง ไม่เชื่อม Firebase; สลับทั่วไป/สตาฟ กรองรายการ เปิดรายละเอียด และลองบทบาทสตาฟเฉพาะห้องประชุมได้ ทดสอบด้วย `npm run test:work-requests`
- `npm run preview:documents`: พรีวิวเอกสารที่ http://127.0.0.1:4174
- `npm run preview:staff-positions`: ทดลองหน้าจัดการตำแหน่งสตาฟที่ http://127.0.0.1:4177 (ชุดตำแหน่งและสิทธิ์ที่อ่านจากระบบจริง แก้ไขเฉพาะในเบราว์เซอร์); รหัสและสิทธิ์ที่จำลองอาจต่างจากระบบจริง
- `npm run preview:staff-positions:refresh`: อ่าน `staffPositionCatalog` แบบ read-only ผ่านบัญชี Firebase CLI ที่ลงชื่อเข้าใช้ เก็บ snapshot ใน `.local/staff-position-preview/catalog.json` ไม่เขียนฐานข้อมูลจริง; หน้าทดลองใช้รายการหน้าจาก `STAFF_PAGE_OPTIONS` ในโค้ดโดยตรง แต่ละ snapshot มี draft ในเบราว์เซอร์แยกกัน
- `npm run preview:projects`: พรีวิวโครงการด้วยข้อมูลจำลองที่ http://127.0.0.1:4175
- หากพอร์ตพรีวิวโครงการไม่ว่าง ใช้ `PORT=4185 npm run preview:projects`
- `npm run meeting:emulators`: เปิด Auth และ Firestore Emulator (ต้องติดตั้ง Firebase CLI)
- `npm run meeting:seed`: เพิ่มบัญชีทดสอบใน Emulator ที่เปิดอยู่
- `npm run test:push`: ทดสอบระบบแจ้งเตือนฝั่ง Functions

ดูรายละเอียดใน [คู่มือส่งต่องาน](docs/handover.md) และ [คู่มือระบบโครงการ](docs/project-live-web.md)

## ทัวร์แนะนำการใช้งาน

- `npm run preview:tour`: ทดลองทัวร์ที่ http://127.0.0.1:4187 เลือกบัญชีจำลอง 7 ประเภท กดเข้าสู่ระบบ/ออกจากระบบ สลับโหมดสตาฟ และเริ่มทัวร์ใหม่เฉพาะบัญชีที่เลือก ใช้ข้อมูลจำลองทั้งหมด ไม่เชื่อม Firebase
- `npm run test:tour`: build และทดสอบทัวร์ด้วย Chromium ของ Playwright บนหน้าจอคอมพิวเตอร์และมือถือ
- เปิดดูซ้ำจากหน้าบัญชีผู้ใช้ด้วยปุ่ม “แนะนำการใช้งาน” จะรวมทุกส่วนที่บัญชีมีสิทธิ์ เริ่มจากบริการทั่วไป ตามด้วยตัวแทนองค์กรและสตาฟ พร้อมสลับโหมดเมื่อข้ามส่วน กดย้อนกลับได้ โดยประวัติการดูซ้ำแยกใน `replay_v1`
- บัญชีที่สร้างก่อน `onboarding.rolloutAt` จะไม่ถูกเสนอทัวร์เดิมอัตโนมัติ แต่เปิดดูซ้ำได้ สิทธิ์ที่อนุมัติหลังวันดังกล่าวจะแนะนำเฉพาะส่วนเพิ่ม บันทึกฐานสิทธิ์เดิมใน `rollout_v1` และไม่ควรเลื่อนวันเริ่มนี้ในการ deploy ครั้งต่อไป หากไม่มีวันที่สร้างบัญชีหรือวันที่อนุมัติ จะถือว่าเป็นข้อมูลเดิม
- ทดลองบัญชีเดิมด้วย `http://127.0.0.1:4187/?legacy=1&autologin=1`
- ปิดทัวร์ได้ด้วย `onboarding.enabled: false` ใน `web/js/core/app.config.js`
- ทัวร์รอข้อมูลส่วนตัว ความยินยอม และสิทธิ์พร้อมก่อนเริ่ม สถานะเก็บใน `userProfiles/{uid}.onboardingTours` แยก `general_v1`, `meeting_v1`, `representative_v1`, `staff_v1` ใช้กฎสิทธิ์เจ้าของบัญชีเดิม
- “ไว้ภายหลัง” รออย่างน้อย 24 ชั่วโมงและการเปิดเว็บครั้งถัดไป “ข้าม” บันทึกว่าข้ามขั้นที่มีสิทธิ์ในขณะนั้น สิทธิ์ใหม่จะมีคำแนะนำเฉพาะส่วนที่เพิ่ม
- เก็บความคืบหน้าในเครื่องหากเขียนบัญชีไม่สำเร็จ แล้วลองซิงก์ใหม่เมื่อเชื่อมต่อได้ หากอ่านบัญชีไม่สำเร็จและไม่มีข้อมูลในเครื่อง จะรอก่อนเพื่อไม่ตีความว่าเป็นผู้ใช้ใหม่
- หน้าพรีวิวตรวจ UI และสถานะจำลอง การตรวจข้ามอุปกรณ์กับ Firebase จริงควรทำด้วยบัญชีทดสอบก่อนเผยแพร่

ทัวร์สิทธิ์พิเศษตรวจสถานะอนุมัติจริง: ตัวแทนองค์กรแนะนำเฉพาะยื่นงบประมาณ สตาฟแนะนำเมื่อเข้าโหมดสตาฟ และกรองเมนูที่เคยดูแล้วออก บัญชีจำลองสิทธิ์พิเศษเริ่มจากรออนุมัติและมีประวัติผ่านทัวร์พื้นฐานแล้ว กด “จำลองได้รับอนุมัติ” เพื่อทดลอง (สตาฟต้องสลับโหมดต่อ) ปุ่ม “เริ่มทัวร์ใหม่” จะคืนบัญชีจำลองที่เลือกเป็นสถานะรออนุมัติ

### Work requests: deployed account page

Run `npm run preview:work-requests:live`, then open `http://127.0.0.1:4190/#login`.
Sign in with the existing Google account, then select **งานและคำขอ** in the navigation.
The preview uses the built site's authentication and Firestore rules. Personal requests are queried by account email; staff queries are started only for the services in the authenticated staff page permissions. The added work page only reads records; the site's existing service pages retain their normal behavior.
Staff queries select only pending work statuses used by the existing service menus; expired meeting requests are excluded. The work-page staff badge counts its service queues, including temporary-access and organization-representative work only for authorized head staff, while the account-page staff badge may also include staff-application work. Each service/mode query reads up to 300 records and displays loading, errors, or the limit notice. Lists use 20-row pages with previous/next controls, matching meeting-room approval. The same page ships in the production build at `#account-work`, under the account menu for signed-in users. The mock preview remains at port 4189. No service-account credentials or rule changes are required.

Temporary access uses an owner document subscription for personal requests; administrative subscriptions require head-staff status and the corresponding allowed page. Its staff queue contains pending requests and active access expiring within seven days. Organization representative staff work includes pending representative applications only. These adapters read records without changing decisions or access.

The real-data work queue follows the agreed per-service/per-role visibility and next-step copy. Completed/rejected/cancelled work is excluded; representative applications appear only in the authorized staff queue. Approved budget requests use `documents.signersByAcademicYear[budgetRoundYear].approvalMeetingBody` to select council versus Student Affairs instructions (the same council default as advance-loan documents). Requests without an identifiable academic year show a neutral instruction to check the submission route. Staff notes remain separate from next-step instructions.

หน้า “งานและคำขอ” มีปุ่มเปิดรายการในบริการเดิม: ห้องประชุมและพัสดุเปิดรายละเอียด, งบประมาณของผู้ใช้เลื่อนไปและโฟกัสแถวคำขอ, สตาฟเปิดแบบฟอร์มหรือรายละเอียดสำหรับตรวจคำขอ, สิทธิ์ชั่วคราวของผู้ใช้เปิดส่วนข้อมูลสิทธิ์ในบัญชี ปุ่มไม่บันทึกหรืออนุมัติอัตโนมัติ และใช้เงื่อนไขการแก้ไขของบริการเดิม ตรวจสิทธิ์อีกครั้งเมื่อกดและระหว่างรอโหลด หากเปิดไม่ได้ภายใน 12 วินาทีจะแจ้งให้ลองใหม่ ทดสอบด้วย `node tools/tests/test-work-actions.mjs` (รวมใน `npm run check`)

### ประวัติคำขอรวม

หน้า `#account-work` มีแท็บ **งานปัจจุบัน / ประวัติ** สำหรับผู้ใช้และสตาฟ เริ่มที่งานปัจจุบันเสมอเมื่อเปลี่ยนโหมด ประวัติอ่านข้อมูลครั้งเดียวเมื่อเปิดแท็บหรือกดค้นหา/รีเฟรช ไม่เพิ่ม realtime listener และไม่แก้ไขข้อมูลคำขอ

- แบ่งหน้าละ 20 รายการด้วยปุ่มก่อนหน้า/ถัดไปตามหน้าอนุมัติห้องประชุม ย้อนกลับหน้าที่โหลดแล้วไม่อ่านฐานข้อมูลซ้ำ ประวัติแสดงจำนวนหน้าทั้งหมดเมื่อโหลดถึงท้ายผลลัพธ์ ใช้ Firestore `startAfter` จาก document snapshot และเรียง `updatedAt DESC, __name__ ASC` ภายในแต่ละแหล่ง ก่อนรวมตามเวลา ไม่ติดเพดาน 300 รายการของงานปัจจุบัน
- การเลือกทุกบริการหรือค้นเลขจากหลายฟิลด์อาจอ่านหลายชุด ชุดละ 20 เอกสาร มีเพดาน 12 queries ต่อการโหลดเพื่อไม่สแกนข้อมูลไม่สิ้นสุดเมื่อมีรายการที่ยังไม่จบจำนวนมาก ถ้ายังไม่มีผลแต่มี cursor ถัดไปจะแสดงปุ่มให้ค้นต่อ ไม่สรุปว่าไม่มีข้อมูลทั้งหมด
- ปีการศึกษาในแท็บนี้หมายถึง **วันที่อัปเดต 1 มิ.ย.–31 พ.ค.** ไม่ใช่ปีที่ผูกกับโครงการ และวันที่แสดงคือวันที่อัปเดต ไม่ใช่วันปิดงานที่บางบริการไม่ได้บันทึก กรองช่วงวันเพิ่มได้ เลือกทุกปีเพื่อค้นย้อนหลังทั้งหมด
- ค้นเลขคำขอ/รหัสโครงการแบบตรงตัวผ่าน query ฐานข้อมูล (`requestNo`, `projectCodeGenerated`, `bookingNo` ตามบริการ) ผลจากหลายฟิลด์ตัดรายการซ้ำ ไม่มีการค้นบางคำเฉพาะหน้าที่โหลดแล้ว
- ประวัติใช้ข้อมูลสถานะล่าสุดของเอกสารเดิม ไม่ใช่ audit log: สิทธิ์ชั่วคราวของผู้ใช้มีได้เพียงเอกสารสิทธิ์ปัจจุบัน; เอกสารที่ถูกลบหรือถูกเขียนทับไม่สามารถกู้ประวัติเดิมได้ รายการ legacy ที่ไม่มี `updatedAt` ไม่เข้าคำค้นนี้และต้อง backfill แบบตรวจสอบก่อนหากต้องรวมด้วย
- งบประมาณที่อนุมัติแล้วเป็นประวัติฝั่งสตาฟ แต่ยังอยู่ในงานปัจจุบันของผู้ยื่นที่ต้องส่งเอกสารต่อ ประวัติการจองรวมรายการอนุมัติที่สิ้นสุดเวลาแล้ว ประวัติสิทธิ์ชั่วคราวรวมสิทธิ์หมดอายุ/ปิดสิทธิ์และรายการปฏิเสธ
- ใช้ขอบเขตเจ้าของบัญชี/สิทธิ์หน้าสตาฟเดิม ล้าง session และเพิกเฉยต่อผลอ่านเก่าเมื่อเปลี่ยนบัญชีหรือสิทธิ์ รายละเอียดประวัติเป็นการอ่านสรุป ไม่เปิดปุ่มอนุมัติรายการเก่าจากหน้านี้

ดัชนีอยู่ใน `firestore.indexes.json` เผยแพร่เฉพาะดัชนีด้วย `firebase deploy --only firestore:indexes --project departmentwebsite-5aec1` และรอให้พร้อมก่อนทดสอบข้อมูลจริง ไม่ต้องเปลี่ยน Firestore rules ทดสอบด้วย `npm run test:work-history` และ `npm run test:work-history:ui` (Chromium; ข้อมูลจำลองทั้งหมด ไม่มีการเชื่อม Firebase) ภาพตรวจหน้าจออยู่ใน `.local/work-history-qa/`
