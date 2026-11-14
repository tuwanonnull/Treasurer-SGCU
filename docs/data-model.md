# Data Model

เอกสารนี้อธิบายแหล่งข้อมูลหลักของเว็บ Treasurer SGCU เพื่อให้รุ่นถัดไปเข้าใจว่าแต่ละส่วนอ่านข้อมูลจากที่ไหน และถ้าจะย้ายไป Firestore ควรใช้ collection อะไร

## Current Sources

ค่าตั้งต้นของ Google Sheets อยู่ที่ `web/js/core/app.config.js` ใน `SGCU_APP_CONFIG.sheets`

| Key | ใช้ทำอะไร | Source ปัจจุบัน | โค้ดที่อ่าน |
| --- | --- | --- | --- |
| `projectSources` | รายชื่อชีต Project Status แยกตามปีการศึกษา และ contact sheet | Google Sheets CSV | `web/js/features/project/app.data.js` |
| `orgStructure` | แผนผังทีมเหรัญญิกหน้า Home | Google Sheets CSV + `staffProfiles` บางส่วนจาก Firestore | `web/js/features/org/app.org.js` |
| `downloads` | รายการเอกสารการเงินและลิงก์ดาวน์โหลด | Google Sheets CSV | `web/js/features/docs/app.downloads.js` |
| `news` | ข่าวและประกาศ | Google Sheets CSV | `web/js/features/news/app.news.js` |
| `orgFilters` | ประเภทองค์กร ชื่อฝ่าย/ชมรม รหัสองค์กร และข้อมูลเสริมสำหรับ PDF | Google Sheets CSV | `web/js/features/project/app.data.js`, `web/js/features/project/app.project-modal.js` |
| `borrowAssets` | รายการพัสดุให้ยืม | Google Sheets CSV | `web/js/features/borrow/app.borrow-assets.js` |

ข้อมูล workflow ที่เป็นคำขอ/การอนุมัติหลายส่วนอยู่ใน Firestore แล้ว เช่น booking, borrow requests, budget requests, staff profiles และ user profiles

## Recommended Firestore Collections

ใช้ชื่อ collection ตามรายการนี้เป็น canonical schema ของระบบ หลีกเลี่ยงการสร้าง collection ชื่อใกล้เคียงกันซ้ำ เช่น `borrowAssetsRequests` เพราะจะทำให้ rules, หน้า staff, และรายงานแยกข้อมูลกันคนละที่

| Area | Canonical collection/doc | Document id |
| --- | --- | --- |
| Runtime config | `appSettings/global` | fixed id `global` |
| Users | `userProfiles/{uid}` | Firebase Auth uid |
| Staff | `staffProfiles/{email}` | lowercase email |
| Staff applications | `staffApplications/{applicationId}` | auto id |
| Organization representatives | `organizationRepresentativeApplications/{applicationId}` | auto id |
| Organization catalog | `organizationCatalog/{orgId}` | stable org code or slug |
| Treasurer org chart | `orgStructureMembers/{memberId}` | stable slug |
| News | `newsItems/{newsId}` | auto id or stable imported id |
| Downloads | `downloadDocuments/{documentId}` | auto id or stable imported id |
| Borrow asset catalog | `borrowAssetCatalog/{assetCode}` | asset code |
| Borrow requests | `borrowAssetRequests/{requestId}` | auto id |
| Borrow stock reservations | `borrowAssetStockReservations/{assetCode}` | asset code |
| Budget requests | `budgetApprovalRequests/{requestId}` | auto id |
| Budget settings | `budgetApprovalSettings/global` | fixed id `global` |
| Meeting rooms | `meetingRooms/{roomId}` | stable room code or auto id |
| Meeting bookings | `meetingRoomBookings/{bookingId}` | auto id |
| Meeting holidays | `meetingRoomHolidays/{holidayId}` | `YYYY-MM-DD` when possible |
| Audit logs | `auditLogs/{logId}` | auto id |
| Visitor stats | `site_stats/visitors_all_time`, `site_daily_visitors/{date}` | fixed/stat date ids |

ทุก document ที่ staff แก้ไขได้ควรมี `createdAt`, `updatedAt`, `createdBy`, `updatedBy` เมื่อสร้าง/แก้จากหน้าเว็บได้จริง ส่วน catalog ควรมี `status` สำหรับซ่อน/archived โดยไม่ต้องลบข้อมูล

### `newsItems`

ใช้แทน `SGCU_APP_CONFIG.sheets.news`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `title` | string | yes | หัวข้อข่าว |
| `summary` | string | no | รายละเอียดสั้น |
| `body` | string | no | รายละเอียดเต็มในอนาคต |
| `date` | string | yes | วันที่แสดงผล เช่น `2026-05-06`; ในหน้า Staff ช่องนี้กรอกเป็นวันที่และเวลาเผยแพร่ |
| `academicYear` | string | no | ปีการศึกษา |
| `category` | string | no | หมวดข่าว |
| `audience` | string | no | กลุ่มเป้าหมาย |
| `previewUrl` | string | no | ลิงก์เอกสาร/รูป/ประกาศ |
| `expireDate` | string | no | วันหมดอายุ |
| `publishAt` | timestamp | no | เวลาที่ให้เริ่มแสดงข่าว สร้างจากช่องวันที่และเวลาเผยแพร่ ถ้าว่างจะแสดงทันทีเมื่อ `status` เป็น `published` |
| `pinned` | boolean | yes | ใช้เรียงข่าวปักหมุด |
| `status` | string | yes | `draft`, `published`, `archived` |
| `createdAt` | timestamp | yes | server timestamp |
| `updatedAt` | timestamp | yes | server timestamp |
| `createdBy` | string | no | email ผู้สร้าง |
| `updatedBy` | string | no | email ผู้แก้ล่าสุด |

### `downloadDocuments`

ใช้แทน `SGCU_APP_CONFIG.sheets.downloads`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `name` | string | yes | ชื่อเอกสาร |
| `description` | string | no | รายละเอียด |
| `organization` | string | no | องค์กรที่เกี่ยวข้อง |
| `category` | string | yes | หมวดหมู่ |
| `categoryOrder` | number | no | ใช้เรียงหมวดหมู่ ค่าน้อยขึ้นก่อน ระบบ staff คำนวณให้จากปุ่มขึ้น/ลง |
| `links.ex` | string | no | ลิงก์ EX |
| `links.pdf` | string | no | ลิงก์ PDF |
| `links.docx` | string | no | ลิงก์ DOCX |
| `links.xlsx` | string | no | ลิงก์ XLSX |
| `sortOrder` | number | no | ใช้เรียงเอกสารภายในหมวด ค่าน้อยขึ้นก่อน ระบบ staff คำนวณให้จากปุ่มขึ้น/ลง |
| `status` | string | yes | `published`, `hidden`, `archived` |
| `createdAt` | timestamp | yes | server timestamp |
| `updatedAt` | timestamp | yes | server timestamp |
| `createdBy` | string | no | email ผู้สร้าง |
| `updatedBy` | string | no | email ผู้แก้ล่าสุด |

### `borrowAssetCatalog`

ใช้แทน `SGCU_APP_CONFIG.sheets.borrowAssets`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `type` | string | yes | ประเภทพัสดุ |
| `code` | string | yes | รหัสพัสดุ ใช้เป็น document id ได้ |
| `name` | string | yes | รายการ |
| `location` | string | no | ที่เก็บ |
| `approved` | boolean | yes | อนุมัติให้ยืมหรือไม่ |
| `total` | number | no | จำนวนทั้งหมด |
| `borrowed` | number | no | จำนวนที่ยืมอยู่ |
| `damaged` | number | no | จำนวนชำรุด |
| `remaining` | number | no | จำนวนคงเหลือ |
| `unit` | string | no | หน่วย |
| `note` | string | no | หมายเหตุ |
| `updatedAt` | timestamp | yes | server timestamp |

### `organizationCatalog`

ใช้เป็นแหล่งข้อมูลหลักของทะเบียนองค์กร แทน Google Sheet `orgFilters` เดิม

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `group` | string | yes | ประเภทองค์กร |
| `name` | string | yes | ชื่อฝ่าย/ชมรม |
| `code` | string | no | รหัสองค์กร |
| `bankAccount` | string | no | ใช้ auto-fill PDF ถ้ามี |
| `status` | string | yes | `active`, `hidden`, `archived` |
| `updatedAt` | timestamp | yes | server timestamp |

## Migration Rule

ย้ายทีละ collection และต้องมี fallback ไป Google Sheets ระหว่างเปลี่ยนผ่าน

1. อ่าน Firestore ก่อน
2. ถ้า Firestore ว่างหรืออ่านไม่ได้ ให้ fallback ไป Google Sheets เดิม
3. เพิ่มหน้า staff admin สำหรับแก้ข้อมูล
4. เมื่อใช้งานจริงนิ่งแล้ว ค่อยปิด fallback ของ feature นั้น

หมายเหตุ: `organizationCatalog` ปิด fallback ไป Google Sheets แล้ว เว็บอ่านทะเบียนองค์กรจาก Firestore เท่านั้น และใช้การ import CSV เก่าเพื่อเติมข้อมูลเริ่มต้น

### Legacy Collection Cleanup

ถ้า Firebase project มี collection เก่า `borrowAssetsRequests` ให้ย้าย document ทั้งหมดไป `borrowAssetRequests` ก่อน deploy rules ใหม่ เพราะระบบใช้ชื่อ canonical เดียวแล้ว

1. export/สำรองข้อมูล `borrowAssetsRequests`
2. copy document ไป `borrowAssetRequests` โดยคง field เดิมและเติม `migratedFrom: "borrowAssetsRequests"`, `migratedAt`
3. ตรวจหน้า staff ว่าคำขอเดิมแสดงครบ
4. ค่อย archive/delete collection เก่าในภายหลัง

## Ownership

ข้อมูลที่ควรให้ Staff แก้ผ่านหน้าเว็บ:

- `newsItems`
- `downloadDocuments`
- `borrowAssetCatalog`
- `organizationCatalog`
- `appSettings/global`

ข้อมูลที่ควรให้ Head Staff เท่านั้นแก้:

- `staffProfiles`
- `staffPositionCatalog`
- `staffPositionCodeCounters`
- Firestore rules
- Firebase project settings
