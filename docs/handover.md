# Handover Guide

เอกสารนี้เป็นคู่มือส่งต่อระบบ Treasurer SGCU ให้รุ่นถัดไป โดยเน้นสิ่งที่ต้องรู้ก่อนแก้เว็บหรือดูแลข้อมูล

## Current Status

ระบบตอนนี้ยังเป็น static web app แต่ข้อมูลบางส่วนย้ายมา Firestore แล้ว และบางส่วนยังใช้ Google Sheets เป็น source หลัก

สถานะสำคัญ:

- ข่าวและประกาศอ่านจาก `newsItems` ก่อน แล้ว fallback ไป Google Sheets เดิม
- เอกสารดาวน์โหลดอ่านจาก `downloadDocuments` ก่อน แล้ว fallback ไป Google Sheets เดิม
- ทะเบียนองค์กรใช้ `organizationCatalog` ใน Firestore เป็น source หลักแล้ว ไม่ fallback ไป Google Sheets
- Project Status ยังใช้ Google Sheets CSV เป็น source หลัก
- รายการพัสดุยังใช้ Google Sheets CSV เป็น catalog หลักตาม flag `features.borrowAssets.useCsvAssetCatalog`
- คำขอจริง เช่น งบประมาณ ยืมพัสดุ booking ห้องประชุม และ staff approval อยู่ใน Firestore
- Activity Log อยู่ใน `auditLogs` และ staff เท่านั้นที่อ่านได้

## System Overview

เว็บนี้เป็น static web app ที่ใช้ JavaScript ฝั่ง browser เป็นหลัก และเชื่อมต่อ Firebase สำหรับ auth, Firestore, analytics และ workflow หลายส่วน

แหล่งข้อมูลหลัก:

- Google Sheets CSV: Project Status, org structure, borrow asset catalog
- Firestore: staff/user profiles, ข่าว, เอกสารดาวน์โหลด, ทะเบียนองค์กร, คำขออนุมัติงบ, คำขอยืมพัสดุ, booking ห้องประชุม, app settings, audit logs
- Firebase Auth: login ด้วยบัญชี Google/อีเมลที่ระบบรองรับ

ไฟล์สำคัญ:

- `js/core/app.config.js`: config หลักของ sheets, Firestore collections, feature flags
- `js/integrations/app.firebase-bootstrap.js`: Firebase initialization
- `js/integrations/app.runtime-config.js`: runtime config จาก `appSettings/global`
- `js/core/app.audit-log.js`: helper บันทึก activity log ลง `auditLogs`
- `firestore.rules`: สิทธิ์อ่าน/เขียน Firestore
- `tools/build-static.mjs`: build static output
- `docs/data-model.md`: รายละเอียด data source และ collection เป้าหมาย
- `docs/migration-plan.md`: แผนย้ายข้อมูลจาก Sheets ไป Firestore
- `docs/operations-monitoring.md`: คู่มือตั้ง budget alert, usage monitoring และ retention

## Common Tasks

### เพิ่มหรือแก้ลิงก์ Google Sheets

แก้ที่ `SGCU_APP_CONFIG.sheets` ใน `js/core/app.config.js`

ถ้าเป็นลิงก์สำหรับ staff เปิดไปแก้ข้อมูล ให้แก้ที่ `SGCU_APP_CONFIG.managementLinks` ด้วย

### แก้ข่าวหรือเอกสารดาวน์โหลด

ใช้หน้า Content Management ฝั่ง staff เป็นหลัก

Collection ที่เกี่ยวข้อง:

- `newsItems`: ข่าวและประกาศ
- `downloadDocuments`: เอกสารดาวน์โหลด

ถ้าข้อมูล Firestore ว่างหรืออ่านไม่ได้ ระบบจะ fallback ไป Google Sheets เดิม แต่ควรถือ Firestore เป็นทางหลักของสอง feature นี้

### แก้ทะเบียนองค์กร

ใช้หน้า Staff สำหรับทะเบียนองค์กร ซึ่งบันทึกลง `organizationCatalog`

ข้อควรจำ:

- หน้าผู้ใช้และ PDF auto-fill อ่าน `organizationCatalog` จาก Firestore เท่านั้น
- รายการที่ใช้งานควรมี `status: "active"`
- เก็บ `code`, `documentRunCode`, และ `accountNo` ให้ครบ เพราะถูกใช้กับเอกสารและเลขรัน
- ก่อน import CSV จำนวนมาก ควร export หรือ backup collection เดิมก่อน

### แก้ระบบอนุมัติงบประมาณ

ข้อมูลหลักอยู่ใน:

- `budgetApprovalRequests`: คำขออนุมัติงบ
- `budgetApprovalSettings/global`: ตั้งค่า workflow และข้อความที่ระบบใช้

ผู้ใช้ที่ login แล้วสร้างคำขอได้ ส่วน staff จัดการสถานะและตั้งค่าได้ตาม `firestore.rules`

### ดู Activity Log

Activity Log อยู่ใน `auditLogs`

- client เขียน log ได้เมื่อ login แล้ว
- staff อ่าน log ได้
- ห้ามแก้หรือลบ log จากหน้าเว็บและ rules ปิด update/delete ไว้

### เพิ่ม Head Staff ชั่วคราว

แก้ `isBootstrapHeadStaff()` ใน `firestore.rules`

หลังแก้ rules ต้อง deploy Firestore rules ผ่าน Firebase CLI

### เพิ่ม Staff ถาวร

ให้ Head Staff อนุมัติผ่านระบบ staff approval เพื่อสร้าง/แก้เอกสารใน `staffProfiles`

ระบบตรวจ staff จาก:

- email ตรงกับ bootstrap head staff
- หรือมี document ใน `staffProfiles/{email}` ที่มี role/position code/division code/positions

ข้อมูลที่ Head Staff ควรดูแลเพิ่ม:

- `staffProfiles`
- `staffApplications`
- `staffPositionCatalog`
- `staffPositionCodeCounters`
- `orgStructureMembers`

### ตั้งค่า Runtime Config

ใช้ document:

```text
appSettings/global
```

ตัวอย่าง:

```json
{
  "enabled": true,
  "config": {
    "cache": {
      "ttlMs": 180000
    },
    "features": {
      "borrowAssets": {
        "allowedPickupDays": [1, 4]
      }
    }
  }
}
```

ตอนนี้ runtime config รองรับเฉพาะค่าที่ normalize ใน `js/integrations/app.runtime-config.js`

## Firestore Collections

| Collection | ใช้ทำอะไร | สิทธิ์หลัก |
| --- | --- | --- |
| `appSettings` | runtime config เช่น `appSettings/global` | Head Staff เขียน, public อ่าน |
| `auditLogs` | activity log ของ workflow สำคัญ | signed-in เขียน, staff อ่าน |
| `budgetApprovalRequests` | คำขออนุมัติงบประมาณ | signed-in สร้าง, staff จัดการ |
| `budgetApprovalSettings` | ตั้งค่าระบบอนุมัติงบ | signed-in อ่าน, staff เขียน |
| `borrowAssetRequests` | คำขอยืมพัสดุ | requester/staff อ่าน, staff จัดการ |
| `borrowAssetStockReservations` | reservation ของ stock พัสดุ | staff เท่านั้น |
| `downloadDocuments` | เอกสารดาวน์โหลด | public อ่าน published, staff เขียน |
| `meetingRoomBookings` | booking ห้องประชุม | public อ่าน, signed-in สร้าง, staff จัดการ |
| `meetingRooms` | master data ห้องประชุม | public อ่าน, staff เขียน |
| `meetingRoomHolidays` | วันปิดให้จองห้อง | public อ่าน, staff เขียน |
| `newsItems` | ข่าวและประกาศ | public อ่าน published, staff เขียน |
| `organizationCatalog` | ทะเบียนองค์กร เลขรัน บัญชี | public อ่าน active, staff เขียน |
| `orgStructureMembers` | สมาชิกในโครงสร้างฝ่าย | public อ่าน published, Head Staff เขียน |
| `staffApplications` | ใบสมัคร staff | owner/staff อ่านตาม rules, staff จัดการ |
| `staffProfiles` | สิทธิ์และ profile staff | Head Staff ดูแล |
| `userProfiles` | profile ผู้ใช้ทั่วไป | owner/staff อ่านตาม rules |

## Deployment Checklist

1. ตรวจ `git status` ว่ามีไฟล์ที่ไม่เกี่ยวข้องหรือไม่
2. รัน `npm run check`
3. ถ้าจะ deploy static output ให้รัน `npm run build`
4. ตรวจหน้าเว็บสำคัญหลัง build:
   - Home
   - Project Status
   - News
   - Financial Docs
   - Staff pages
   - Meeting room pages
5. ถ้าแก้ Firestore rules ให้ deploy rules และลอง login บัญชี staff จริง
6. ถ้าแก้ service worker หรือ asset สำคัญ ให้ตรวจ cache/version ว่าผู้ใช้จะได้ไฟล์ใหม่
7. บันทึกสิ่งที่เปลี่ยนใน PR หรือ release note

## Operations Checklist

อย่างน้อยเดือนละครั้งให้ดู `docs/operations-monitoring.md` และตรวจ:

- Firebase/Google Cloud budget alert ยังส่งถึงอีเมลทีม
- Firestore reads/writes/storage ไม่พุ่งผิดปกติ
- collection ที่โตตามเวลา เช่น `meetingRoomBookings`, `borrowAssetRequests`, `auditLogs`
- console error เรื่อง permission หรือ missing index ในหน้าหลัก

## Backup Checklist

อย่างน้อยก่อนเปลี่ยนรุ่นควร export:

- `staffProfiles`
- `userProfiles`
- `staffApplications`
- `budgetApprovalRequests`
- `budgetApprovalSettings`
- `borrowAssetRequests`
- `borrowAssetStockReservations`
- `meetingRoomBookings`
- `meetingRooms`
- `meetingRoomHolidays`
- `newsItems`
- `downloadDocuments`
- `organizationCatalog`
- `orgStructureMembers`
- `appSettings`
- Google Sheets ทุกชีตที่ยังเป็น source หลัก

สำหรับข้อมูลที่จะย้ายจาก Google Sheets ไป Firestore ควรเก็บ CSV ต้นฉบับไว้ทุกครั้งก่อน import

## Troubleshooting

### ข้อมูล Google Sheets ไม่ขึ้น

เช็กตามลำดับ:

1. ลิงก์ใน `js/core/app.config.js` ยังเปิดแบบ published CSV ได้หรือไม่
2. ชีตถูก unpublish หรือเปลี่ยน permission หรือไม่
3. column order ในชีตเปลี่ยนจากที่โค้ดอ่านหรือไม่
4. localStorage cache ยังเป็นข้อมูลเก่าหรือไม่

### Firestore อ่าน/เขียนไม่ได้

เช็กตามลำดับ:

1. login แล้วหรือยัง
2. บัญชีมี document ใน `staffProfiles/{email}` หรือไม่
3. rules อนุญาต operation นั้นหรือไม่
4. query ต้องใช้ index เพิ่มหรือไม่
5. console มี error `permission-denied` หรือไม่

### หน้า Staff ไม่ขึ้น

เช็ก:

- Firebase Auth ทำงานหรือไม่
- email ตรงกับ `staffProfiles` หรือไม่
- `firestore.rules` deploy ล่าสุดหรือยัง
- feature loader โหลด partial/script ครบหรือไม่

### ข่าวหรือเอกสารดาวน์โหลดไม่ตรงกับหน้า Staff

เช็ก:

1. document มี `status` ถูกต้องหรือไม่ (`published` สำหรับ public)
2. วันที่เผยแพร่หรือวันหมดอายุทำให้รายการถูกซ่อนหรือไม่
3. cache ใน localStorage ยังเป็นข้อมูลเก่าหรือไม่
4. ถ้า Firestore อ่านไม่ได้ ระบบอาจ fallback ไป Google Sheets เดิม

### Dropdown องค์กรหรือ PDF auto-fill ไม่เจอข้อมูล

เช็ก:

1. มี document ใน `organizationCatalog` หรือไม่
2. `status` เป็น `active` หรือไม่
3. field `group`, `name`, `code`, `documentRunCode`, `accountNo` ถูกกรอกตรงกับที่ระบบค้นหาหรือไม่
4. staff เพิ่ง import CSV แล้วมีข้อมูลซ้ำหรือชื่อสะกดต่างจากเดิมหรือไม่

### Activity Log ไม่ขึ้น

เช็ก:

1. login เป็น staff แล้วหรือยัง
2. `firestore.rules` อนุญาตอ่าน `auditLogs` สำหรับ staff หรือไม่
3. workflow นั้นเรียก `window.SGCUAuditLog` หรือ helper ใน `js/core/app.audit-log.js` แล้วหรือไม่
4. ถ้า action สำเร็จแต่ log ไม่ขึ้น ให้ดู console เพราะ logging ถูกออกแบบให้ไม่ block workflow หลัก

## Long-term Direction

เป้าหมายระยะยาวคือให้รุ่นต่อไปดูแลข้อมูลผ่าน Staff Admin UI แทนการแก้โค้ดหรือไล่ Google Sheets หลายไฟล์

ลำดับที่แนะนำ:

1. ปิด fallback ของ `newsItems` และ `downloadDocuments` เมื่อข้อมูล Firestore ใช้งานจริงนิ่งแล้ว
2. เพิ่ม import/export และ validation ให้ `organizationCatalog` แข็งแรงขึ้น
3. ย้าย `borrowAssets` ไป `borrowAssetCatalog` หรือเปลี่ยนชื่อ collection ให้ตรงกับ implementation จริงก่อนย้าย
4. ทำ staff UI สำหรับจัดการพัสดุจาก Firestore ถ้าจะเลิกใช้ Google Sheets
5. ตัดสินใจเรื่อง Project Status หลังจาก workflow ของทีมชัดเจน
6. เพิ่มคู่มือ deploy rules, export Firestore, และ restore ข้อมูลสำหรับ Head Staff

## การควบคุมรุ่นไฟล์อัตโนมัติ

ใช้ `npm run build` หรือ `npm run check` ก่อนเผยแพร่ และเผยแพร่เฉพาะ `dist/` เหมือนเดิม ไม่ต้องเพิ่ม/แก้วันที่ใน `?v=...` ของ HTML, CSS entrypoint, feature loader หรือ service worker ด้วยมือ

ระบบแยกเลขสองชนิด:

- **เลขเวอร์ชันที่ผู้ใช้เห็น** (`0.x.xx`): นับ revision จาก Git ตามรูปแบบเดิม
- **รหัสรุ่นไฟล์** (`assetVersion`): hash จากเนื้อหาและชื่อไฟล์เว็บ ใช้กับ URL ของ assets และ cache ของ service worker ไฟล์เหมือนเดิมได้รหัสเดิม แม้ build คนละเวลา แก้ไฟล์ที่เกี่ยวข้องแล้วรหัสเปลี่ยน แม้ build ภายในนาทีเดียวกัน

ไฟล์ที่ใช้คำนวณรหัสประกอบด้วย `js/`, `css/`, `img/`, `THSarabunNew/`, `partials/`, HTML ระดับราก, webmanifest, `sw.js` และตัว build ที่สร้าง output เอง การแก้เฉพาะเอกสารหรือโค้ด Cloud Functions ไม่เปลี่ยนรหัส assets

### จุดที่ดูแล

- `tools/build-static.mjs`: ประกอบ HTML/CSS, อ่านข้อมูล Git, ตรวจไฟล์ และสร้าง `dist/`
- `tools/lib/build-assets.mjs`: คำนวณ hash และใส่เวอร์ชันให้ลิงก์ รวม static/dynamic import ที่ใช้ path แบบ literal
- `js/core/app.feature-loader.js`: กำหนดว่าหน้าไหนใช้สคริปต์ใด ใส่ path ปกติโดยไม่ต้องเขียน `?v=`
- `sw.js`: กำหนดไฟล์ app shell; ค่า `dev` ใน source จะถูกแทนตอน build
- `dist/build-info.json`: ดู `version`, `commit`, `dirty`, `assetVersion` ของ output ชุดนั้น

HTML ระดับรากที่เพิ่มใหม่จะเข้ากระบวนการประกอบ include/ใส่เวอร์ชันและตรวจลิงก์โดยอัตโนมัติ ไม่ต้องเพิ่มชื่อหน้าในรายการ transform แยกอีก

### Import และการทดสอบ

- Local ESM import แบบ `import './file.js'`, `import { x } from './file.js'` และ `import('./file.js')` ได้รหัสรุ่นเดียวกับ HTML
- Dynamic import ที่ประกอบ path ด้วย template/ตัวแปรต้องส่งเวอร์ชันเอง เช่นใช้ `new URL(import.meta.url).search` ตามหน้าประชุมตัวอย่างเดิม
- ไม่เปลี่ยน URL ของ CDN/Firebase/API ภายนอก
- `npm run test:build` ทดสอบ build และการกำหนดรุ่นโดยเฉพาะ; `npm run check` รวมชุดนี้ด้วย
- ทดลองเว็บจาก `npm run serve:dist` แล้วเปิด `http://localhost:4173/` เพื่อให้ตรงกับไฟล์ที่จะเผยแพร่ การเปิด source โดยตรงไม่ได้ทดสอบระบบ versioning นี้

`BUILD_VERSION` ยังใช้กำหนดรหัสเองได้สำหรับกรณีจำเป็น โดยใช้ตัวอักษร/ตัวเลข/จุด/ขีดกลาง/ขีดล่างไม่เกิน 80 ตัว ห้ามใช้รหัสซ้ำกับเนื้อหาคนละชุด เพราะจะทำให้ cache แยกไม่ออก แนะนำปล่อยให้ hash อัตโนมัติตามปกติ

ข้อจำกัด: การใส่เวอร์ชันช่วยแยก URL ของ assets ไม่ได้บังคับรีโหลดแท็บที่เปิดอยู่ และไม่ได้รับประกันการสลับรุ่นแบบครบชุดขณะ offline; พฤติกรรม service worker เดิมยังคงอยู่
