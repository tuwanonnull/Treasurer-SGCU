# Sheets to Firestore Migration Plan

แผนนี้ใช้สำหรับย้ายข้อมูลจาก Google Sheets ไป Firestore แบบไม่ทำให้ production พัง และยังให้รุ่นถัดไปดูแลต่อได้ง่าย

## Principle

ทุก feature ต้องย้ายแบบ incremental:

1. เพิ่ม Firestore collection ใหม่
2. เพิ่ม reader ที่อ่าน Firestore ก่อน แล้ว fallback ไป Google Sheets
3. เพิ่ม staff admin UI สำหรับ create/update/hide
4. เพิ่ม import/export CSV
5. ใช้งานจริงจนเสถียร
6. ปิด Google Sheets fallback เฉพาะ feature นั้น

## Phase 1: Documentation and Data Contracts

Status: completed

Deliverables:

- `docs/data-model.md`
- `docs/handover.md`
- `docs/migration-plan.md`

Acceptance criteria:

- มีรายการ data source ปัจจุบันครบ
- มี collection เป้าหมายสำหรับ Firestore
- มี playbook ส่งต่อขั้นพื้นฐาน

## Phase 2: News Migration

Target collection: `newsItems`

Current source: `SGCU_APP_CONFIG.sheets.news`

Recommended implementation:

- เพิ่ม `firestore.collections.newsItems` ใน `web/js/core/app.config.js`
- เพิ่ม reader ใหม่ใน `web/js/features/news/app.news.js`
- reader อ่าน `newsItems` ที่ `status == "published"`
- ถ้า Firestore ว่างหรือ permission denied ให้ใช้ Google Sheets path เดิม
- คง format `newsItems` ใน memory ให้เข้ากับ renderer เดิมก่อน

Acceptance criteria:

- หน้า Home preview และหน้า News แสดงข้อมูลจาก Firestore ได้
- ถ้า Firestore ยังไม่มีข้อมูล หน้าเดิมยังใช้ Google Sheets ได้
- pinned/sort/filter เดิมยังทำงาน
- ไม่มีการแก้ UI ใหญ่ในเฟสนี้

Current status:

- เพิ่ม `firestore.collections.newsItems` แล้ว
- เพิ่ม `getDocs` ใน Firebase bridge แล้ว
- เพิ่ม Firestore reader สำหรับ News แล้ว
- เพิ่ม fallback ไป Google Sheets เดิมแล้ว
- เพิ่ม Staff Admin UI พื้นฐานสำหรับ list/create/update/archive ข่าวแล้ว
- เพิ่ม import/export CSV สำหรับข่าวแล้ว

## Phase 3: Downloads Migration

Target collection: `downloadDocuments`

Current source: `SGCU_APP_CONFIG.sheets.downloads`

Recommended implementation:

- เพิ่ม `firestore.collections.downloadDocuments`
- เพิ่ม reader อ่าน Firestore ก่อน
- แปลง document เป็นโครงสร้างเดิมที่ renderer ใช้
- fallback ไป Google Sheets เดิมถ้า collection ว่างหรืออ่านไม่ได้

Acceptance criteria:

- หน้า Financial Docs แสดงหมวดและปุ่ม EX/PDF/DOCX/XLSX เหมือนเดิม
- category filter ยังทำงาน
- cache ไม่ทำให้ข้อมูล Firestore เก่าค้างเกิน TTL

## Phase 4: Staff Admin UI

Target pages:

- Content management staff page
- Existing staff-only navigation

Minimum controls:

- List
- Search/filter
- Create
- Edit
- Hide/publish
- Archive
- CSV export

Collections:

- `newsItems`
- `downloadDocuments`

Acceptance criteria:

- Staff ที่ผ่าน rules แก้ข้อมูลได้
- Non-staff เขียนไม่ได้
- มี `createdAt`, `updatedAt`, `createdBy`, `updatedBy`
- มีข้อความ error เมื่อ permission ไม่พอ

## Phase 5: Borrow Asset Catalog

Target collection: `borrowAssetCatalog`

Current source: `SGCU_APP_CONFIG.sheets.borrowAssets`

Recommended implementation:

- ใช้ `code` เป็น document id
- อ่าน catalog จาก Firestore ก่อน
- เชื่อมกับ stock/request workflow เดิม
- เพิ่ม import CSV จาก header เดิมของ Google Sheets

Acceptance criteria:

- ตารางพัสดุ public/staff แสดงเหมือนเดิม
- form ยืมพัสดุ autocomplete จาก catalog ใหม่
- staff แก้ status/จำนวน/หมายเหตุได้

## Phase 6: Organization Catalog

Target collection: `organizationCatalog`

Current source: Firestore `organizationCatalog`

Recommended implementation:

- ใช้เป็น source หลักของ dropdown องค์กร
- ใช้ bank account สำหรับ PDF auto-fill
- อัปโหลด CSV เก่าจากชีต ALL เพื่อ import ข้อมูลตั้งต้น
- ไม่ fallback ไป Google Sheets แล้ว

Acceptance criteria:

- Dropdown ประเภทองค์กรและฝ่าย/ชมรมทำงานเหมือนเดิม
- PDF auto-fill ยังเจอเลขบัญชี
- Staff แก้ข้อมูล master ได้โดยไม่แตะโค้ด

## Phase 7: Project Status Decision

Current source: `projectSources` -> yearly Project Status sheets

Recommendation:

ยังไม่ควรย้ายทันที ถ้า workflow ของทีมยังพึ่ง Google Sheets, สูตร, และการตรวจแบบตาราง

ทางเลือก:

- Keep Sheets as source of truth แล้ว import/cache เข้า Firestore เพื่ออ่านเร็วขึ้น
- ทำ admin UI ใหม่ทั้งหมดเมื่อพร้อมเปลี่ยน workflow

Decision criteria:

- ทีมรุ่นถัดไปยอมกรอกผ่านเว็บแทนชีตหรือไม่
- ต้องใช้สูตร/format/approval ในชีตมากแค่ไหน
- จำนวนคนแก้พร้อมกันเยอะหรือไม่

## Rollback Strategy

ทุก phase ต้อง rollback ง่าย:

- อย่าลบ Google Sheets URL เดิมจนกว่า phase นั้นเสถียร
- ใช้ feature flag หรือ fallback path
- เก็บ CSV export ก่อน import ทุกครั้ง
- ถ้า Firestore fail ให้หน้าเว็บยังแสดงข้อมูลจาก Sheets เดิม
