# ทดลองจัดการโครงการในเครื่อง

## การจัดเก็บไฟล์และคอมมิท

- เก็บโค้ด เครื่องมือ ทดสอบ HTML/CSS และ `firebase.emulator.json` ใน Git; โมดูลแกนกลางอยู่ `functions/project-live/` และไฟล์ชื่อเดียวกันในโฟลเดอร์นี้เป็น adapter ของเครื่องมือเดิม
- รายงานผลรัน 6 ไฟล์ (`candidate-rehearsal-result.json`, `concurrency-results.json`, `drive-roundtrip-recovery-result.json`, `import-plan.json`, `recovery-drill-result.json`, `usage-estimate.json`) อยู่ในเครื่องตาม `.gitignore` ไม่ใช่ข้อมูลที่ต้องใช้เพื่อเปิดเว็บ; บันทึกเก่าด้านล่างอาจอ้างถึงรายงานเหล่านี้
- ต้นฉบับ ข้อมูลจริง สำรอง และ credential ต้องอยู่นอก repository ในพื้นที่ส่วนตัว ไม่ใช้ Git เก็บข้อมูลเหล่านี้
- การจัดระเบียบนี้แยกคอมมิทเครื่องมือจากงาน UI ที่ค้างไว้ และไม่ถือเป็นการอนุมัติให้เผยแพร่ UI; ทดสอบ branch ก่อน merge main เสมอ

ตรวจเครื่องมือด้วย `node --test tools/project-pilot/*.test.mjs` และ `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tools/project-pilot -p 'test_*.py'` ส่วน Emulator ต้องเปิดแยกและใช้โปรเจกต์ demo ตามคำสั่งของแต่ละเครื่องมือ พรีวิวหน้าเว็บด้วยข้อมูลจำลองใช้ `node tools/serve-project-live-preview.mjs`


ข้อกำหนดผู้ใช้ล่าสุด (2026-11-14): เมนูจัดการโครงการอยู่เฉพาะโหมดสตาฟ ห้ามเพิ่มในเมนูทั่วไป ทั้ง desktop/mobile; งานรอบต่อไปต้องทดสอบ flow ที่เปลี่ยนบน branch และผ่าน checks ก่อน merge main (main deploy อัตโนมัติ) PR #84 เอาเมนูทั่วไปออกหลังตรวจ routing, build HTML และ CI ผ่าน

## เชื่อมเว็บหลักและเปิดแอดมิน (2026-11-14)

ผู้ใช้ยืนยันว่าเข้าเว็บหลักได้แล้วหลังแก้เมนู PR #82 (2026-11-14) งานถัดมาปรับธีมหน้าโครงการให้ใช้ theme tokens/ตัวอักษร/ปุ่มของเว็บหลัก จัดยอดเป็น grid และฟอร์ม responsive โดยไม่เปลี่ยนข้อมูลหรือสิทธิ์ เมิร์จ PR #83 (7f5137f4f6b9c76b29ce38bfd16531457538ec46) ผ่าน checks/build และ Chrome + Emulator ด้วย full stylesheet ตรวจ desktop/mobile 390px ไม่ล้นข้างและ workflow เดิมผ่าน

แก้เมนูหายตามรายงานผู้ใช้: updateNavForStaff กรองตาม legacy catalog ซ้ำแล้วซ่อน project-live-staff แม้ getAllowedPagesForCurrentState อนุญาต แก้ให้ชั้นสุดท้ายคงสิทธิ์หน้าโครงการตามบัญชี และเพิ่มเมนู desktop/mobile โหมดทั่วไปด้วย PR #82 (35d5c179d0984133d651b6c61b62b012e94ab437) Regression test ทำให้ fail ก่อนแก้ แล้วผ่านหลังแก้ทั้งสองโหมดและบัญชีไม่มีสิทธิ์ ไม่แก้ยอดหรือเปิดสิทธิ์เพิ่ม

ผู้ใช้อนุญาตให้แอดมินทำได้ทุกอย่างในส่วนโครงการแล้ว: เปิด projectSystemAdmins ให้บัญชี `tuwanon.kimchiang@gmail.com` จริงและอ่านกลับได้ 407 โครงการ บัญชีปี 69 ยังไม่มีสิทธิ์ ไม่มีการแก้ยอดเงินจริงเพื่อทดสอบ บันทึกก่อนหน้านี้ที่ระบุ head-only เป็นสถานะเก่า

โค้ดหลักย้ายไป functions/project-live และเครื่องมือเดิม import ต่อจากที่เดียวกัน หน้าเว็บหลักใช้ Google session เดิม เพิ่มการแก้เงิน/สถานะ/ประวัติ/สำรอง และ admin-only สำหรับเปิด–ระงับสิทธิ์เหรัญญิก/กู้คืนแบบมี safety backup การแก้ของแอดมินใช้ UID จริงใน audit ไม่สวมบัญชีเหรัญญิก

สร้าง private source จาก candidate ที่อนุมัติและตรวจ checksum อ่านกลับบน bucket แยกพร้อม public access prevention แล้ว ไม่มีการ import checkpoint ใหม่หรือเปลี่ยนเงิน เมิร์จ PR #81 เข้า main และเผยแพร่เว็บหลักแล้ว เวอร์ชัน 0.5.69 (4001da56fd4e917071b8091d21a7b286ef3b6765) ตรวจ build-info/หน้าใหม่/API URL/ไม่มี server source บนเว็บจริงผ่าน เหลือเจ้าของบัญชียืนยัน Google login แอดมินบนเว็บหลัก API และ scheduled backup deploy ที่ asia-southeast1 ด้วย Node 22; cloud backup แรก 2026-11-14T06:46:28.089Z ตรวจ checksum และซ้อมกู้ใน Emulator ผ่านครบ 407 โครงการ/audit 0 มีสำเนาส่วนตัว cloud-backup-2ea689657c13b9587b89fd1a7d9f16679facc2ed9716eea35fef0f048a6a4770.json ดูรายละเอียด docs/project-live-web.md

ทดสอบ: เดิม 99 ข้อ, functions 17 ข้อ, main-site check/build, integration admin+restore+revocation และ Chrome ผ่าน (mock เฉพาะ session; ข้อมูลอยู่ Emulator และบล็อก network ภายนอก) Local 4189 restart รองรับ admin แล้ว; หลัง cloud restore ต้องเปิด local ใหม่โดยใช้ active datasetId

## เปิดข้อมูลจริงเฉพาะเหรัญญิกปี 68 แล้ว (2026-11-14)

**สถานะล่าสุดแทนบันทึก “ยังไม่เขียน/ยังไม่เปิด” ด้านล่าง:** นำเข้าชุดที่ผู้ใช้ยืนยัน 407 โครงการไป Firestore จริง `departmentwebsite-5aec1/projectDatasets/year2568-initial` แล้ว เปิด active พร้อม grant เพียง `6534324223@student.chula.ac.th` ใน projectAccess/2568/members แบบ atomic ไม่ให้บัญชีปี 69/แอดมิน ไม่ใช้ยอดหรือประวัติทดลอง การกดยืนยันในหน้าใหม่เป็นการแก้ข้อมูลจริง

เปิดหน้าใช้งานบนเครื่องนี้ที่ http://127.0.0.1:4189 ใช้ Google เดิม ส่วน 4188 เป็นหน้าตรวจ/สรุปข้อมูลตั้งต้น ไม่มีการ publish เว็บหลัก และไม่ได้ deploy rules ใหม่ ก่อนนำเข้าตรวจ rules ที่ deploy อยู่ผ่าน Firebase Rules REST แล้วตรงกับ firestore.rules ใน repository ทุกตัวอักษร ซึ่งปิด client access สำหรับพื้นที่ใหม่ด้วย catch-all deny

ลำดับที่ทำจริง: ตรวจ Auth เหรัญญิกพร้อมใช้งาน/อีเมลยืนยัน, ตรวจปลายทางยังไม่มีและ grant ปี 68 ว่าง, initializeLiveDataset สร้าง 407 โครงการ+overview+root ใน batch.create เดียว active=false, อ่านกลับตรวจทุกโครงการ/สูตร/สถานะ/ผู้รับผิดชอบว่าง/ไม่มีประวัติทดลองครบ, activateLiveDataset ตรวจ Auth ซ้ำและเปิด root พร้อม grant ผูก datasetId ภายใน transaction เดียว การเรียกเว็บไม่ทำ import/activation อัตโนมัติ

ข้อมูลตั้งต้นยังตรงต้นฉบับ ไม่มีการแก้ยอดจริงเพื่อทดสอบ initial backup มี audit=0 ไม่มีการสร้าง projectBaselines ตามแผนนำเข้ารุ่นก่อน เพราะชุดจริงใช้ checkpoint ที่ตรวจต้นฉบับแล้วใน projectDatasets โดยตรง รหัสโครงการจริง PROJECT68 แยกจาก TEST68 รุ่นซ้อม ส่วนชื่อ field trialAssignee ยังใช้ในโมเดลร่วมแต่เป็น null ทั้งหมดในระยะ head-only

โค้ดหลัก: live-store.mjs (initialize/verify/activate/query/commit/status/history/backup/restore), live-runtime.mjs (server-owned Auth/Firestore clients), live-api.mjs, live.html/live.js, live-backup.mjs และ run-live-api.mjs ทุก API ตรวจ Google ID token แบบ checkRevoked และบัญชีจริงใหม่ทุกครั้ง Store ตรวจ active ของชุดและ grant ผูก datasetId/UID/ปี/head ใน transaction เดียวกับข้อมูล ไม่เปิด role-switch, assign, reset, propose หรือ restore ผ่าน HTTP ในระยะแรก

สำรองอัตโนมัติทุก 12 ชั่วโมงขณะ process ทำงาน ตรวจรอบทุกนาที ล้มเหลวลองใหม่ใน 1 ชั่วโมง เก็บใน `~/Library/Application Support/SGCU-Project-Pilot/live-backups/year2568-initial/` ตรวจ checksum/schema ของไฟล์ที่อ่านกลับก่อนเลื่อน status และตรวจไฟล์ล่าสุดตอน restart ไม่มีลบรุ่นเก่า ไม่ส่ง Drive อัตโนมัติ ไฟล์ยังต้องอัปโหลดนอกเครื่องด้วยมือตามแผนเดิม หากเครื่องปิดจะไม่สำรอง ไม่มีการรับรอง RPO กรณีเครื่องสูญหายจากสำเนาในเครื่องอย่างเดียว

สำรองแรก `backup-3f22b2b1-da35-43db-b7f0-36b5b0725f13.json` สร้าง 2026-11-14T06:15:22.633Z ตรวจผ่าน 407 โครงการ/0 เหตุการณ์ แล้วนำไฟล์จริงไปซ้อม restore ใน Emulator ตรวจเงิน/สถานะ/สูตร/ลำดับ/หมุน version ครบ ชุดกู้เริ่ม inactive และไม่คืน grant ล้างเฉพาะชุดซ้อมหลังตรวจ

```sh
# เปิดชุดที่มีอยู่แล้วเท่านั้น ไม่ import หรือเปิดสิทธิ์ให้เอง
GCLOUD_PROJECT=departmentwebsite-5aec1 node tools/project-pilot/run-live-api.mjs "$HOME/Library/Application Support/SGCU-Project-Pilot/production-candidate-2568-2026-11-14" year2568-initial --firebase-cli
# ดูแผน/สถานะก่อนทำงาน ฝั่ง admin เป็น CLI เท่านั้น
GCLOUD_PROJECT=departmentwebsite-5aec1 node tools/project-pilot/live-admin.mjs plan "$HOME/Library/Application Support/SGCU-Project-Pilot/production-candidate-2568-2026-11-14" year2568-initial --firebase-cli
```

live-admin มี initialize/verify/activate/restore; mutation ต้องระบุ --apply และไม่ overwrite ปลายทาง การ activate ปฏิเสธเมื่อมี grant เดิมแม้ inactive เพื่อไม่คืนสิทธิ์ที่ถูกถอนเอง การ restore ใช้ปลายทางใหม่เท่านั้น มีสถานะ restoring จนเขียนครบ หากล้มเหลวไม่เปิดอ่านชุดค้างและไม่กลับเป็นข้อมูลว่าง การกู้ที่สำเร็จเริ่ม inactive เสมอ ต้องจัดการแผนสลับ grant ต่างหาก ไม่ควรใช้ activate ตัวเริ่มต้นเพื่อข้าม grant ที่มีอยู่

ผลทดสอบ: 99 unit/HTTP ผ่าน; live-store integration กับ 407 โครงการผ่าน ทั้ง inactive gate, grant ผูกชุด, บันทึกพร้อมกันสำเร็จหนึ่ง/เก่าถูกปฏิเสธ, restart, ถอนสิทธิ์, backup/restore, กู้ไม่เปิดสิทธิ์, ไฟล์เสีย, กู้ล้มกลางทาง, สำรองไม่ซ้อน/restart/ตรวจไฟล์เสีย; activation ปฏิเสธบัญชีอื่นและ grant เดิมแล้วเปิด head เดียวได้ใน Emulator; Chrome ผ่านหน้าใหม่→preview→commit→ประวัติ→ดาวน์โหลดและตรวจ backup→ถอน grant ซ่อนข้อมูล โดย mock เฉพาะ Google SDK และบล็อก network ภายนอกระหว่างทดสอบ UI; ตรวจ API ล่าสุดเพิ่ม 5 tests ผ่าน ผู้ไม่ล็อกอินเรียกเว็บจริงได้ 401

เจ้าของบัญชียืนยันแล้วว่าเข้าสู่ระบบ Google ที่หน้า 4189 และเห็นครบ 407 โครงการได้ (2026-11-14) จึงผ่านการล็อกอินและอ่านข้อมูลจริงครบเส้นทาง; ไม่ได้ให้ผู้ใช้แก้ยอดจริงเพื่อทดสอบ ไม่มีการขอรหัสผ่านหรือสร้างการแก้เงินทดสอบบน production ข้อจำกัดปัจจุบัน: local server ต้องเปิดอยู่, head-only, backup โหลดทั้งชุดในหน่วยความจำ, ข้อมูลสรุป/document จำกัด 750 KB, ยังไม่มี offsite automation/การเผยแพร่เว็บหลัก


## ผู้ใช้ยืนยันข้อมูลตั้งต้นแล้ว (2026-11-14)

หลังผู้ใช้ตรวจยอดทั้ง 8 ช่องของ 407 โครงการและตอบ “ได้” ให้ใช้ชุดนี้เริ่มปี 2568 บันทึก acceptance.json ในโฟลเดอร์ส่วนตัว production-candidate-2568-2026-11-14 แล้ว ไม่ต้องถามยืนยันข้อมูลชุดเดิมซ้ำ การยืนยันผูก sourceSha256/snapshotSha256/projectCount/totals ของไฟล์ที่ตรวจจริง ไม่ครอบคลุมไฟล์เปลี่ยนหรือ trial backup

`approved-baseline.mjs` กำหนด fingerprint ของต้นฉบับที่อนุมัติ ยอดเงินจริงอยู่ในไฟล์ส่วนตัวเท่านั้น acceptBaseline ตรวจ fingerprint และสูตรซ้ำก่อนสร้างหลักฐานการยืนยัน พร้อม buildApprovedBaselineImport สร้างแผน 409 เอกสาร (407 โครงการ + source metadata + root) ใน projectBaselines/{baselineId} ใช้รหัส YEAR68 ของต้นฉบับ ไม่ใช้ TEST68 หรือ checkpoint จากชุดซ้อม เก็บสถานะ imported-inactive และ accessActivated=false ไม่มีการเขียน grant/assignment/active pointer

แผน approved-import-plan.json และ acceptance.json เก็บส่วนตัวแบบ 0600 แยกจาก snapshot/manifest เดิม ไม่มีการเขียนทับต้นฉบับ การยืนยันครอบคลุม initial-data-only ไม่ถือว่าเปิดสิทธิ์หรือผ่าน production readiness แล้ว

ตัวนำเข้าใช้ atomic batch.create ทั้งชุด จำกัดไม่เกิน 450 เอกสารและ 8 MiB ปฏิเสธเอกสารใดที่มีอยู่ก่อนโดยไม่เขียนบางส่วน ไม่ update/overwrite ปลายทาง verifyApprovedBaseline ตรวจทุกโครงการ ทุก field ของ payload และ metadata เทียบกับแผนที่สร้างจากต้นฉบับอนุมัติหลังนำเข้า ไม่ใช่การดูเฉพาะจำนวนเอกสาร

```sh
GCLOUD_PROJECT=demo-project-pilot FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9197 FIRESTORE_EMULATOR_HOST=127.0.0.1:8187 node tools/project-pilot/approved-baseline-emulator-test.mjs '/private/production-candidate-directory'
```

ผล Emulator: 407 โครงการ/409 เอกสารผ่าน ยืนยันผิดชุดถูกปฏิเสธ, child มีอยู่ก่อนทำให้ทั้ง batch ล้มโดย root ไม่ถูกสร้าง, นำเข้าสำเร็จตรวจเทียบครบ, นำเข้าซ้ำไม่เขียนทับ, แก้ payload หลังนำเข้าแล้วตัวตรวจจับได้, snapshot เดิมไม่เปลี่ยน ล้างเฉพาะพื้นที่ทดสอบหลังจบ ไม่เขียน Firebase จริง ไม่มี production CLI สำหรับสั่ง import หรือเปิด grant ในรอบนี้

หน้า 4188 อ่าน acceptance.json และเทียบกับชุดข้อมูลก่อนส่ง status=approved-for-import/baselineAccepted=true แสดง “ยืนยันใช้เป็นข้อมูลตั้งต้นแล้ว” แยกจาก “ยังไม่เปิดใช้งาน” หากไฟล์ยืนยันเสียหรือไม่ตรงชุดจะส่ง error ไม่แสดงผลยืนยันปลอม Unit/HTTP ที่เกี่ยวข้อง 7 tests ผ่านหลังแก้หน้านี้ งานถัดไปยังเป็นการเชื่อม production store/API/backup และตรวจสิทธิ์ก่อนเปิดใช้ ไม่ใช่ให้ผู้ใช้ยืนยันยอดชุดเดิมซ้ำ


## เชื่อมสรุปข้อมูลตั้งต้นและซ้อมจัดเก็บแยก (2026-11-14)

เจ้าของบัญชีรายงานผลหน้า 4188 ว่า “ยืนยันบัญชีแล้ว ยังไม่ได้เปิดสิทธิ์ใช้งานปี 2568” จึงผ่าน Google login และการตรวจบัญชีจริงแล้ว ยังไม่มี grant ปี 68 ที่ใช้งานได้ ไม่ได้เปิดสิทธิ์ในรอบนี้

`production-candidate.mjs` โหลด snapshot/manifest ส่วนตัวที่สร้างจากต้นฉบับ ตรวจ SHA-256, ปี, provenance, ยอดรวม, สูตรเงินทุกโครงการ และต้องไม่มี grant/assignment/คำขอ/ประวัติใน manifest ไม่รับ trial backup หรือไฟล์เปลี่ยนหลังสร้าง โหลดใหม่และตรวจใหม่ทุกครั้ง ไม่ cache ยอดเมื่อไฟล์เสีย checksum ตรวจความสอดคล้อง ไม่ใช่ลายเซ็นยืนยันผู้จัดทำไฟล์

หน้า 4188 เพิ่มปุ่ม “ตรวจยอดตั้งต้น” หลังตรวจบัญชีสำเร็จ GET /api/candidate คืนจำนวนโครงการและยอดรวม 8 ช่อง ไม่ส่งรายละเอียดรายโครงการ API ตรวจ token/บัญชีก่อนอ่านและตรวจซ้ำหลังอ่าน ไม่ต้องเปิด grant เพื่ออ่านสรุปเตรียมใช้งานนี้ จำกัดเฉพาะบัญชีเหรัญญิกปี 68 ที่เลือกไว้เหมือน preflight เดิม ปฏิเสธ mutation ปุ่มนี้ไม่เขียนข้อมูล ไม่อ่านข้อมูลจาก Emulator หรือ checkpoint ที่ซ้อมแก้ แสดงเป็น awaiting-review/activated=false เสมอ

```sh
PROJECT_CANDIDATE_DIRECTORY="$HOME/Library/Application Support/SGCU-Project-Pilot/production-candidate-2568-2026-11-14" GCLOUD_PROJECT=departmentwebsite-5aec1 node tools/project-pilot/run-production-preflight.mjs --firebase-cli
```

`candidate-store.mjs` เป็น store สำหรับ **ซ้อมใน Emulator เท่านั้น** เก็บใน projectCandidates และใช้ projectCandidateAccess/{datasetId}/members แยกจาก projectTrials และ projectAccess เดิม รับ head หนึ่งคนและ manifest ที่ตรวจแล้วเท่านั้น ไม่มีช่องรับ seed/checkpoint ทดลอง ใช้ธุรกรรมและโมเดลเดิมเพื่อทดสอบ persistence/recovery รหัสภายในยังเป็น TEST68 เพราะยังเป็นชุดซ้อม ไม่ใช่ schema production ที่พร้อม deploy

แยก backup envelope เป็น SGCU-candidate-rehearsal-backup ตรวจ manifest, source และทะเบียนบัญชีตรงกัน ปฏิเสธ trial backup ตรง ๆ และไฟล์เสียก่อนเริ่มเขียน กู้ลง ID ใหม่เท่านั้น หมุน version ปฏิเสธหน้าจอเก่า และไม่สร้าง/คืน grant จาก backup ชุดซ้อมที่แก้แล้วไม่ใช่ข้อมูลสำหรับนำเข้า production

```sh
GCLOUD_PROJECT=demo-project-pilot FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9197 FIRESTORE_EMULATOR_HOST=127.0.0.1:8187 node tools/project-pilot/candidate-store-emulator-test.mjs '/private/production-candidate-directory'
node --test tools/project-pilot/*.test.mjs
```

ผล: 98 unit/HTTP tests ผ่าน และ integration กับ candidate จริง 407 โครงการผ่าน ตรวจยอดตั้งต้นครบ/ไม่มีประวัติทดลอง, บันทึกพร้อมกันสำเร็จหนึ่งและปฏิเสธหนึ่ง, เปิด store ใหม่คงยอด, ถอน grant แล้วเขียนไม่ได้, กู้ยอด/ประวัติครบและหมุน version, กู้ไม่คืน grant, ปฏิเสธ trial backup/ไฟล์เสีย/ปลายทางเดิม, sentinel ใน projectTrials และไฟล์ snapshot เดิมไม่เปลี่ยน ล้างเฉพาะพื้นที่ซ้อมหลังจบ ไม่เรียก Auth จริงระหว่างทดสอบเหล่านี้

ยังเหลือก่อนเปิดใช้งานจริง: ให้เหรัญญิกตรวจยอดตั้งต้น, schema/store/backup production ที่แยกจากชุดซ้อม (รวม namespace/IDs และการเปิด ready อย่างครบถ้วน), กฎ client และการตรวจสิทธิ์ของ API จริง, ตรวจ Auth/grant ซ้ำก่อนเปิดเฉพาะเหรัญญิกปี 68 และซ้อมผ่านหน้าเว็บครบ การเพิ่มสรุปครั้งนี้ตรวจ unit/HTTP และ syntax แล้ว ยังไม่ได้ทดสอบปุ่มใหม่ใน browser ด้วยบัญชีจริง ไม่ deploy หรือเขียน Firestore จริง


## แก้หน้าล็อกอินให้ตรงกับ Google เดิม (2026-11-14)

ผู้ใช้ยืนยันว่าระบบสตาฟเข้า Google แล้วเชื่อม Firebase แก้หน้า 4188 จาก email/password เป็นปุ่มเข้าสู่ระบบด้วย Google ใช้ select_account และ login_hint บัญชีเหรัญญิกปี 68 เป็นตัวช่วยเลือกเท่านั้น ฝั่งเซิร์ฟเวอร์ยังตรวจ UID/อีเมล/บัญชีและ grant ตามเดิม ไม่ใช้ hint เป็นสิทธิ์ เพิ่ม CSP สำหรับ apis.google.com และ iframe ของ authDomain ที่ระบุแน่นอน พร้อมข้อความกรณี popup ถูกบล็อก/ปิด/โดเมนไม่อนุญาต

อ่าน authorizedDomains จาก Firebase แบบอ่านอย่างเดียวแล้วพบ localhost และ 127.0.0.1 อยู่ในรายการ ไม่ต้องเปลี่ยนการตั้งค่า Firebase ทดสอบ syntax และ preflight unit/HTTP 4 tests ผ่าน รีสตาร์ตหน้า 4188 แล้ว ยังรอเจ้าของบัญชีกด Google และตรวจผล end-to-end ห้ามอ้างว่าล็อกอินจริงผ่านก่อนผลนี้ การเลือกบัญชี Google ใหม่ที่ไม่เคยใช้ Firebase อาจทำให้ Firebase สร้าง Auth account ตามพฤติกรรม provider จึงให้เลือกบัญชีเดิมที่ยืนยันไว้เสมอ

อ้างอิง Google popup: https://firebase.google.com/docs/auth/web/google-signin

## เตรียมล็อกอินจริงและข้อมูลตั้งต้นแยกจาก trial (2026-11-14)

ผู้ใช้เลือกใช้สำเนาต้นฉบับปี 68 ที่เคยตรวจไว้ สร้างใหม่จาก `SUCU68 Project Status.xlsx` ด้วย `prepare-production-data.py` โดยตรวจ SHA-256 เทียบต้นฉบับเดิมก่อนและหลังอ่าน ไม่อ่าน checkpoint, trial backup, คำขอ หรือประวัติทดลอง รับเฉพาะ XLSX และปฏิเสธ hash ไม่ตรง ตรวจสูตรและยอดครบ 407 โครงการ ผลสร้างใหม่ตรงกับ snapshot ต้นฉบับเดิมทุกฟิลด์ ยังคงสถานะย้อนหลังและไม่รัน automation

ชุดส่วนตัวอยู่ที่ `~/Library/Application Support/SGCU-Project-Pilot/production-candidate-2568-2026-11-14/` มี snapshot.json กับ manifest.json (0700 directory/0600 files) แยกจาก year68-trial และ automatic-backups สถานะ awaiting-review, activated=false ไม่มี grant/assignment/คำขอ/ประวัติจากชุดทดลอง ข้อมูลแหล่งภายนอกยังไม่ได้ตรวจความสดใหม่ ชุดนี้ยังไม่ได้ import Firestore

เพิ่มหน้าตรวจล็อกอินจริงที่พอร์ต 4188 แยกจาก 4186/4187 ใช้ Firebase Web SDK GoogleAuthProvider/signInWithPopup ของโปรเจกต์เดิมตามระบบสตาฟ ไม่มีช่องรับรหัสผ่าน เก็บ session ในหน่วยความจำ browser ไม่มี role selector เซิร์ฟเวอร์รับ Bearer token และใช้ verifyIdToken(token, true) ตรวจ revoked/disabled จากนั้นอ่านบัญชีปัจจุบัน ตรวจ UID/email/emailVerified/aud/iss และจำกัดเฉพาะเหรัญญิกปี 68 ที่ยืนยันไว้ บัญชีปี 69 และแอดมินไม่ได้รับสิทธิ์ปี 68 จากบทบาทเดิม

GET /api/readiness อ่าน grant ปี 2568 เฉพาะ UID ที่ตรวจแล้วผ่าน REST field mask และแสดง authenticated/grantReady แยกจาก activated=false/dataReady=false เสมอ ไม่เปิดข้อมูล ไม่ต่อ store ทดลอง ไม่มี mutation endpoint ปฏิเสธ cross-origin และไม่ cache ผล อ่าน grant ใหม่ทุกคำขอ ข้อผิดพลาดบริการไม่ fallback เป็นสิทธิ์สำเร็จ หน้านี้เป็นขั้นตรวจบัญชี ไม่ใช่เว็บ production ที่พร้อมทำงาน

```sh
# ใช้ ADC ที่ผู้ดูแลตั้งไว้ หรือเลือกบัญชี CLI เดิมอย่างชัดเจนด้วย flag ด้านล่าง
GCLOUD_PROJECT=departmentwebsite-5aec1 node tools/project-pilot/run-production-preflight.mjs --firebase-cli
# เปิด http://127.0.0.1:4188 แล้วให้เจ้าของบัญชีล็อกอินเอง
node --test tools/project-pilot/production-preflight.test.mjs
python3 -B tools/project-pilot/prepare-production-data.py '/path/to/SUCU68 Project Status.xlsx' --expected-source-sha256 REVIEWED_SOURCE_SHA256
```

ตัวเลือก --firebase-cli ใช้แนวทางเดียวกับ read-production-staff.mjs ตรวจ .firebaserc ก่อนใช้ ไม่ส่ง credential ฝั่งผู้ดูแลเข้า browser และไม่คัดลอก credential ลงไฟล์ ไม่เลือก CLI เป็น fallback อัตโนมัติ หากไม่มี flag จะใช้ ADC ตามปกติ เซิร์ฟเวอร์ฟังเฉพาะ loopback และปฏิเสธ environment ของ Emulator

ผลตรวจ: unit/HTTP ทั้งชุด 95 tests ผ่าน รวมตรวจปฏิเสธบัญชีอื่น/token ผิดโปรเจกต์/revoked/disabled/email ไม่ยืนยัน และไม่ยกระดับแม้มี grant; หลังเพิ่ม CLI mode รัน 4 tests ของ preflight ซ้ำผ่าน ทดสอบปฏิเสธ trial JSON/hash ต้นฉบับผิดผ่าน เปิดเซิร์ฟเวอร์จริงในเครื่องได้ หน้า HTML ตอบ 200 และ readiness ไม่มี token ตอบ 401 ยังไม่ได้ทดสอบล็อกอินจริงด้วยเจ้าของบัญชีหรือ browser end-to-end จึงยังไม่ยืนยัน production token flow สำเร็จ

สิ่งที่ยังเหลือก่อนเปิดใช้: เจ้าของบัญชีทดสอบล็อกอิน, ตรวจข้อมูลตั้งต้นและยอด, เตรียม store/transaction/backup สำหรับชุดใช้งานแยกจาก trial, ตรวจ Auth/grant ซ้ำก่อนเปิดสิทธิ์ และทดสอบเส้นทางใช้งานจริงครบ ไม่ได้ deploy/เปิด grant/เขียนข้อมูลโครงการใน Firebase ในรอบนี้ การ sign-in ที่เจ้าของบัญชีทำจะเป็นการใช้ Auth จริงและอาจอัปเดต metadata การเข้าสู่ระบบตามปกติ

อ้างอิงการตรวจ token และการถอน session: https://firebase.google.com/docs/auth/admin/verify-id-tokens และ https://firebase.google.com/docs/auth/admin/manage-sessions


## ปีตามรหัสตำแหน่งและแผนเริ่มเฉพาะเหรัญญิกปี 68

ตรวจโค้ดระบบสตาฟพบรูปแบบ `SGCU{XX}.10.{YY}.{ZZ}-{AAA}` ซึ่ง XX มาจากปีการศึกษาเมื่อสร้างรหัสตำแหน่ง `staff-position-years.mjs` แสดงหลักฐานจากรหัสเต็มและตรวจฝ่าย/ระดับให้ตรงบทบาท ไม่เดาจากรหัสนิสิต อีเมล วันที่สร้าง หรือปีปัจจุบัน เก็บหลายปีถ้ามีหลายรายการตำแหน่งและแสดง incomplete เมื่อบางรหัสตรวจไม่ได้ ปีตามรหัสไม่ใช่การยืนยันสิทธิ์เข้าข้อมูลย้อนหลัง

อ่าน production ซ้ำแบบอ่านอย่างเดียวโดยเพิ่ม field mask `positionCode` และเก็บผลเป็นไฟล์ส่วนตัวใหม่ พบเลขา 2 บัญชีและผู้ช่วย 21 บัญชีมีรหัสปี 2569 ครบทั้งหมด ไม่มีรหัสขาดในสองกลุ่มนี้ ผู้ใช้เลือกเริ่มปี 2568 เฉพาะเหรัญญิกปี 68 ก่อน ไม่เพิ่มทีมปี 69 หรือบัญชีแอดมินเป็นผู้แก้โครงการปี 68

บันทึก scope head-only ใน account-identity-notes.json และจัดร่าง year68-head-only-plan.json ไว้นอก Git ร่างมี grant เหรัญญิก 1 บัญชี ไม่มีการมอบหมายผู้ช่วย ไม่มีการเขียน Firebase ต้องตรวจ Auth/grant ใหม่ก่อนเปิดใช้จริง ตัวแสดงผลส่ง initialAccess.activated=false เสมอ และตรวจว่าบัญชีที่เลือกตรงกับบทบาท/ปีที่ผู้ใช้ยืนยัน

ตารางตรวจบัญชีเพิ่มคอลัมน์ปีตามรหัสตำแหน่ง แสดงแยกจากข้อมูลปี/แอดมินที่ผู้ใช้ยืนยันและแผนเริ่มใช้งาน ตัว loader คำนวณปีใหม่จากรหัสแทนการเชื่อตัวเลขปีสำเร็จรูปในไฟล์ ทดสอบ parser/loader และ Chrome สำหรับคอลัมน์ปีและแผน head-only ผ่าน

## อ่านข้อมูลสตาฟจริงมาแสดงเป็นสำเนา

อ่าน production `departmentwebsite-5aec1` สำเร็จวันที่ 2026-11-14 โดยใช้บัญชี Firebase CLI ที่เข้าสู่ระบบในเครื่อง อ่าน Firestore staffProfiles เฉพาะ position/positions/email ผ่าน REST list แบบแบ่งหน้าและ field mask, ตรวจ Auth เฉพาะอีเมลที่เกี่ยวข้อง และอ่าน projectAccess/2568/members ไม่มีการเขียน production พบ 26 บัญชีที่มีตำแหน่งเกี่ยวข้อง: ตำแหน่งเหรัญญิก 3 บัญชี เลขา 2 บัญชี ผู้ช่วย 21 บัญชี ทุกบัญชีที่เกี่ยวข้องผ่านการตรวจ Auth

ผู้ใช้ยืนยันเพิ่มเติมว่าตำแหน่งเหรัญญิก 3 บัญชีแบ่งเป็นเหรัญญิกปี 68, เหรัญญิกปี 69 และแอดมินระบบ โดยเหรัญญิกปี 68 กับแอดมินเป็นบุคคลเดียวกันคนละบัญชี ข้อมูลอีเมล/UID และการยืนยันเก็บในโฟลเดอร์ส่วนตัวนอก Git ไม่เปลี่ยน staffProfiles และไม่ให้สิทธิ์บัญชีแอดมินเป็น head อัตโนมัติ เลขา/ผู้ช่วยยังต้องตรวจสังกัดปี

`read-production-staff.mjs SNAPSHOT_FILE PRIVATE_NEW_OUTPUT_FILE departmentwebsite-5aec1` ใช้สำหรับอ่านใหม่อย่างชัดเจน ไม่ทำงานเบื้องหลัง ไม่ overwrite ผลเดิม ไม่มี secret อยู่ใน source หาก Firebase CLI อยู่ต่างตำแหน่งกำหนด FIREBASE_TOOLS_DIR ได้ CLI แยกจาก Emulator guard และตรวจ project ตรง .firebaserc ก่อนอ่าน ผลตรวจไม่ถือเป็นการอนุมัติหรือหลักฐานสมาชิกปีจากตำแหน่งปัจจุบัน

เปิดหน้าเว็บทดลองด้วย PROJECT_STAFF_REVIEW_FILE ชี้ไฟล์ส่วนตัวแล้ว GET staff-review อ่านเฉพาะผลสำเนา ไม่มี credential production เข้าเว็บเซิร์ฟเวอร์หรือ browser `staff-review-file.mjs` ตรวจแหล่งข้อมูล/ปี/โหมดอ่านอย่างเดียว ตัดฟิลด์นอกผลตรวจ (รวม grant plan) และอ่าน account-identity-notes.json ที่ผู้ใช้ยืนยันแยกต่างหาก แสดงเวลาที่อ่านจริง ไม่เปลี่ยนเป็นเวลาปัจจุบันเมื่อกดซ้ำ หากไฟล์เสียตอบ error ไม่ fallback เป็นข้อมูลสดหรือแสร้งเป็นชุดว่าง

อ้างอิง API: https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases.documents/list
ทดสอบ loader รวมข้อมูลผิดปี/ผิดแหล่ง/โหมดเขียน/บทบาทไม่ถูกต้องและ notes ผ่าน พร้อม Chrome ทดสอบสำเนาจากระบบจริงด้วย fixture ไม่เรียก production ระหว่างทดสอบ

## หน้าตรวจบัญชีส่วนโครงการ

หน้า 4187 เพิ่มส่วนตรวจบัญชีให้เฉพาะเหรัญญิก ปุ่ม “ตรวจบัญชีสตาฟ” เรียก GET /api/year68/trial/staff-review เมื่อกดเท่านั้น ไม่เรียกพร้อม refresh/เปิดหน้า และไม่ทำ polling แสดงอีเมล ตำแหน่ง ผลยืนยันบัญชี และรายการที่ต้องตรวจสอบ โดยใช้ textContent กับค่าจากข้อมูล ไม่มีปุ่มให้สิทธิ์/เปลี่ยนบทบาทจากหน้านี้

API ตรวจ token และ project grant ก่อนอ่าน ตรวจซ้ำก่อนส่งผลหลังอ่าน Auth และปฏิเสธเลขา/ผู้ช่วย รวมทั้งปฏิเสธ POST ข้อมูลอ่านจาก Emulator เท่านั้น ไม่มีการเรียก production หากไม่มี staffProfiles จะแสดงว่ายังไม่มีรายชื่อในชุดทดลอง ไม่ใช้บัญชีจำลองจาก role registry มาปลอมเป็นรายชื่อจริง ผลตรวจเก่าถูกล้างเมื่อ refresh และไม่แสดงผลคำขอเก่าที่กลับมาหลัง refresh

ทดสอบ 12 กลุ่มผ่านและ Chrome ผ่าน: ไม่มีการอ่านตอนเปิดหน้า, แสดงรายการหลังคลิก, สิทธิ์ head-only ทั้ง UI/API, POST ถูกปฏิเสธ, grant เดิมไม่เปลี่ยน และขั้นตอนเสนอ/อนุมัติ/สำรอง/กู้คืนเดิมยังผ่าน

## เตรียมรายชื่อก่อนเชื่อมบัญชีจริง

`staff-access-review.mjs` ต่อการอ่าน staffProfiles กับ Firebase Auth getUserByEmail และ projectAccess ของปีที่เลือกแล้วผ่าน server-owned adapter แบบอ่านอย่างเดียว รายงานบัญชีไม่พบ/ปิดใช้งาน/อีเมลยังไม่ยืนยัน ตรวจสิทธิ์เดิมแยก new-access, role-change, previously-revoked และ existing-access-outside-roster ไม่เปิดสิทธิ์คืน ไม่ลบคนเดิม ไม่อ่าน token/password hash มาใส่ผลลัพธ์ หาก Auth ล่มจะส่ง error ไม่แปลงเป็นรายชื่อไม่มีบัญชี

ผลเป็น review-only, readyToActivate=false และยังไม่ยืนยันสมาชิกปีการศึกษาจากตำแหน่งสตาฟปัจจุบัน ต่อ HTTP route แบบอ่านอย่างเดียวใน Emulator ตามหัวข้อด้านบนแล้ว ยังไม่ได้ดึงบัญชี production ทดสอบ 12 กลุ่มผ่านและทดสอบ Firestore/Auth Emulator ร่วมกันผ่าน โดยใช้ collection ทดสอบแยกและล้างเฉพาะ fixture เมื่อจบ ยืนยันการอ่านไม่เปลี่ยน grant ที่ถูกถอน


ผู้ใช้ยืนยันให้ใช้อีเมลเดิมในระบบสตาฟ ไม่ขอให้กรอกอีเมลใหม่ ตรวจโค้ดพบการอ่าน `staffProfiles/{email}` และตำแหน่งใน `positions[].name`/`position` แล้ว `staff-project-roster.mjs` เตรียมรายชื่อเสนอจากข้อมูลนี้แบบอ่านอย่างเดียว แยกเหรัญญิก/เลขา/ผู้ช่วยด้วยชื่อตำแหน่งตรงกัน ไม่ใช้ role 0 หรือ division 00 ซึ่งเหรัญญิกและเลขาใช้ร่วมกัน ไม่ใช้ override email หรือสิทธิ์เข้าหน้าเว็บแทนตำแหน่ง หลายบทบาทขัดกันหรืออีเมลขัดกับ document ID จะส่งรายการให้ตรวจ ไม่เลือกสิทธิ์สูงสุดเอง

ตัวเตรียมรายชื่อยังไม่อ่าน Firestore จริง ไม่ได้ต่อ route หรือให้สิทธิ์ใคร ต้องนำรายชื่อไปตรวจ UID/Auth และปีที่สังกัดก่อนใช้แผนสิทธิ์ โครงการยังไม่มอบหมายจากชื่อเก่าใน AI อัตโนมัติ ทดสอบรวมตัวเตรียมรายชื่อและแผนสิทธิ์ 8 กลุ่มผ่าน

ผู้ใช้ยืนยันให้เริ่มใช้งานจริงปีการศึกษา 2568 (2026-11-14) ต้องแยกชุดใช้งานจาก trial ปี 68 ที่มีการแก้ยอด/สถานะเพื่อทดสอบ ไม่ยก trial เป็นข้อมูลจริงโดยอัตโนมัติ ยังต้องระบุฐานข้อมูลเริ่มต้นที่ต้องการใช้และตรวจยอดก่อนนำเข้า

`project-access-plan.mjs` เตรียมแผนสิทธิ์แบบอ่านอย่างเดียว รับปี รายชื่ออีเมล/บทบาท/รหัสโครงการ และข้อมูล Auth จากฝั่งเซิร์ฟเวอร์ที่เชื่อถือได้ จับคู่ UID ด้วยอีเมลตรงกันเท่านั้น (trim/lowercase ไม่แปลง student เป็น alumni) ปฏิเสธอีเมลยังไม่ยืนยัน บัญชีปิดใช้งาน รายชื่อซ้ำ บัญชีคลุมเครือ รหัสโครงการไม่พบ และโครงการมอบหมายซ้ำ ต้องมี head หนึ่งคนตามที่ตกลง ไม่ใช้ staffRole เดิมหรือชื่อ AI เป็นสิทธิ์โดยอัตโนมัติ

ผลลัพธ์แยก grants/assignments/โครงการยังไม่มอบหมาย ระบุ review-only และ writesPerformed=false ยังไม่ reconcile กับสิทธิ์เดิม ไม่เขียน Firestore ไม่สร้างผู้ใช้ ไม่เปลี่ยนเว็บหลัก และไม่ได้เชื่อม helper นี้เข้า endpoint ใด การเปลี่ยนสิทธิ์จริงต้องตรวจ grant เดิมและรายชื่อที่ผู้ใช้ยืนยันในขั้นเชื่อมต่อ

ทดสอบ 4 กลุ่มผ่าน: UID/บทบาทแยกจากระบบเดิม, ปิดบัญชี/อีเมลไม่ยืนยัน/ปลอม UID, คนซ้ำหรือมอบหมายซ้ำ, ปี/จำนวนเหรัญญิก/อีเมลคนละโดเมน ขั้นถัดไปรับบัญชีเหรัญญิกก่อน แล้วค่อยรับเลขา/ผู้ช่วยและมอบหมายโครงการทีละขั้น

## สำรองอัตโนมัติในเครื่อง (ยังไม่ส่ง Drive อัตโนมัติ)

ผู้ใช้กำหนด RPO ไม่เกิน 1 วัน และ RTO ไม่เกิน 1 วัน `run-emulator-web.mjs` เปิด `automatic-backup.mjs` เก็บชุดใหม่ทุก 12 ชั่วโมงขณะ server ทำงาน โดยตรวจรอบทุกนาทีแต่ไม่อ่าน Firestore จนถึงรอบ ล้มเหลวลองใหม่ทุก 1 ชั่วโมง ไม่ลบหรือทับชุดเก่า หน้าเหรัญญิกแสดงเวลาข้อมูลสำรองล่าสุด/ล้มเหลว/เกิน 24 ชั่วโมง ณ เวลาที่โหลดหน้า ไม่ได้ส่งอีเมลหรือ push และไม่แจ้งขณะเครื่องปิด

เก็บส่วนตัวใน `~/Library/Application Support/SGCU-Project-Pilot/automatic-backups/{trialId}` ชุดละ backup.json, manifest.json, RECOVERY.txt ก่อนนับว่าสำเร็จตรวจ schema และ hash ของไฟล์ที่เขียนจริง เปลี่ยน status.json แบบ atomic ชุดเสีย/ดิสก์เต็มไม่เลื่อนเวลาสำรองสำเร็จล่าสุด เมื่อเปิดใหม่ตรวจชุดล่าสุดก่อนใช้สถานะเดิม ไม่สำรองซ้ำหากยังไม่ถึงรอบ ไม่เขียนข้าม trial และไม่เปลี่ยนบัญชี/grant การสำรองตรวจบัญชี head ยังใช้งานได้และตรวจ grant ผ่าน transaction เดิม

ไม่มีการลบรุ่นเก่าอัตโนมัติ จึงต้องดูพื้นที่ดิสก์เมื่อข้อมูลสะสม ปิดเครื่องหรือ server แล้วจะไม่ทำงาน เปิดใหม่จะสำรองเมื่อถึงกำหนด โค้ดนี้ไม่ใช่งาน Cloud Scheduler/production backup และไม่รวมบัญชี สิทธิ์ โค้ด หรือไฟล์ Drive ที่ลิงก์ไว้

ยังไม่พบ Google Drive Desktop ในเครื่องนี้ ผู้ใช้เลือกอัปโหลดด้วยมือ การสำรองในเครื่องที่สำเร็จจึงไม่รับรอง RPO กรณีเครื่องสูญหาย ต้องมีสำเนานอกเครื่องที่ใหม่ไม่เกิน 24 ชั่วโมงด้วย สถานะบนเว็บระบุ local-only ไม่แอบนับเป็นสำรอง Drive ที่ตรวจแล้ว ไม่แก้สถานะของชุด Drive ที่ผู้ใช้เคยอัปโหลดและดาวน์โหลดกลับมาตรวจผ่าน

ทดสอบผ่าน 73 unit/HTTP tests และ Chrome: รอบ 12 ชั่วโมง, retry 1 ชั่วโมง, เก็บรุ่นก่อนเมื่อผิดพลาด, ดิสก์ใช้ไม่ได้, ไฟล์เสียหลัง restart, backup เก่าถูกปฏิเสธ, ไม่ทำงานซ้อน, แสดงสถานะเฉพาะ head, ไม่สำรองซ้ำตอน restart และขั้นตอนเดิมครบ

## ชุดสำรองนอกเครื่องและการซ้อมกู้คืน

ปลายทางที่ผู้ใช้เลือก: Google Drive จำกัดสิทธิ์เฉพาะเหรัญญิก ผู้ใช้แจ้งว่าอัปโหลดและดาวน์โหลดกลับเองแล้ว วันที่ 2026-11-14 ตรวจ Downloads/backup.json เทียบ SHA-256 กับ manifest ต้นฉบับตรงกัน และกู้ลงชุดแยกครบ 407 โครงการ/2 เหตุการณ์ใน 1.167 วินาที ผลอยู่ใน drive-roundtrip-recovery-result.json ยังไม่ได้ตรวจสิทธิ์แชร์ Drive โดยตรง และเวลาซ้อมไม่รวมการดาวน์โหลด เตรียมเครื่องใหม่ หรือกู้บัญชี

`recovery-kit.mjs BACKUP_FILE NEW_DIRECTORY` ตรวจ backup ก่อนจัดชุดใหม่ ปฏิเสธการเขียนทับโฟลเดอร์เดิม มี backup.json, manifest.json ระบุ SHA-256 ของ bytes จริง และ RECOVERY.txt วิธีซ้อม/กู้คืน ไฟล์ไม่ได้เข้ารหัส ต้องจำกัดสิทธิ์ปลายทาง ตรวจไฟล์ที่ดาวน์โหลดกลับด้วย `verify-recovery-kit.mjs MANIFEST DOWNLOADED_BACKUP` checksum ตรวจการเปลี่ยนแปลงเมื่อเทียบกับ manifest ที่เชื่อถือได้ ไม่ใช่ลายเซ็นรับรองผู้สร้าง

`recovery-drill.mjs BACKUP_FILE` ใช้ Emulator ที่กำหนดเท่านั้น ตรวจว่ามีบัญชีเหรัญญิกและ grant ที่ active อยู่ก่อน ไม่สร้าง/คืนสิทธิ์จากไฟล์ backup กู้ลง trial ชั่วคราวใหม่ เทียบทุก checkpoint และประวัติ ยอมให้เปลี่ยนเฉพาะ version/revision และ baseVersion ของคำขอรอที่ยังเป็นปัจจุบัน แล้วลบเฉพาะชุดซ้อม ไม่เปลี่ยนชุดต้นทาง

ผลซ้อม 2026-11-14: ข้อมูลจริงในชุดทดลอง 407 โครงการ ประวัติ 2 รายการ กู้และตรวจครบประมาณ 1.331 วินาทีบน Emulator ที่เปิดอยู่ ผลใน recovery-drill-result.json ยังไม่รวมดาวน์โหลดจาก Drive เตรียมเครื่องใหม่ กู้บัญชี/สิทธิ์ และเปิดระบบจริง จึงยังไม่ใช่หลักฐานว่าเหตุเครื่องสูญหายทั้งเครื่องจะฟื้นภายใน 1 วัน ไฟล์ลิงก์ Drive ต้องมีแผนเก็บแยก และยังต้องตกลงระยะข้อมูลย้อนหลังที่ยอมให้สูญหายก่อนกำหนดรอบสำรอง

ทดสอบ `recovery-kit-test.mjs BACKUP_FILE` ผ่าน: ชุดปกติ, ห้ามทับชุดเดิม, bytes เปลี่ยน, ไฟล์ขาด และข้อมูลเสียไม่สร้างชุดสำรอง

## แยกประวัติออกจากข้อมูลปัจจุบัน (storageVersion 2)

หน้า 4187 เก็บ checkpoint schema 2 เฉพาะยอด/สถานะ/การมอบหมายปัจจุบัน คำขอที่รออนุมัติ และรายชื่อผู้เคยแก้แต่ละช่องสถานะ เพื่อรักษาสิทธิ์ผู้ช่วยหลังเปิดใหม่ ประวัติทั้งหมดอยู่ใน `audit` และคำขอทั้งรอ/อนุมัติ/ปฏิเสธเก็บ payload เต็มใน `requests` การบันทึก checkpoint, summary, event และผลคำขออยู่ใน transaction เดียวกัน หน้าคำขอโหลดเฉพาะรายการรอ ส่วนเหตุการณ์ที่จบแล้วดูผ่านประวัติ

Backup ยังใช้ schema 1 แบบรวมครบทุกประวัติ โดยตรวจว่าสรุปสิทธิ์และคำขอรอที่สร้างจาก archive ตรงกับ checkpoint ก่อนดาวน์โหลด Restore ตรวจทั้งชุดแล้วเก็บกลับเป็น checkpoint ขนาดเล็ก การย้ายข้อมูลเดิมต้องหยุด server รุ่นเก่าก่อน เปิดรุ่นใหม่เพื่อ archive ให้ครบก่อนย่อ checkpoint และตั้ง ready หลังเสร็จเท่านั้น หากย้ายข้อมูลเดิมสะดุดให้เปิดรุ่นใหม่ซ้ำเพื่อทำต่อ (หากเป็นการ seed ครั้งแรก ให้ใช้ seed เดิมด้วย)

ตรวจด้วย 70 unit/HTTP tests, ทดสอบ Emulator transaction/overview/backup และ Chrome ทั้งสามบทบาท ทดสอบประวัติ 750 รายการ: full checkpoint 849,599 bytes เหลือ current checkpoint 2,190 bytes หลังแก้เพิ่มหนึ่งครั้ง กู้คืนได้ครบ ทดสอบจำลองการหยุดหลังเขียน checkpoint แล้วเปิดใหม่ทำต่อผ่าน รวมทั้งทดสอบ model 1,100 เหตุการณ์และการล็อกสิทธิ์ผู้ช่วยข้ามการเปิดใหม่

ผลวัดใหม่ใน `usage-estimate.json`: เปิดหน้าเหรัญญิก 28 reads, แก้ยอดพร้อม preview/refresh 35 reads/3 writes เท่าเดิม; อนุมัติพร้อม refresh 34 reads/4 writes (เพิ่ม 1 write เก็บผลคำขอ); backup ตัวอย่าง 407 โครงการ/60 เหตุการณ์/1 คำขอ ใช้ประมาณ 470 reads ไม่ใช่ตัววัดบิลจริง

ยังมีขีดจำกัด: summary รวมต้องต่ำกว่า 750 KB, backup โหลดทั้งประวัติใน transaction/หน่วยความจำ และ CLI restore รับไฟล์ไม่เกิน 100 MiB การแยกนี้แก้ประวัติสะสมชนเพดาน document ไม่ใช่การรับรองเก็บไม่จำกัดหรือสำรองนอกเครื่องอัตโนมัติ ก่อนใช้งานจริงต้องวางระบบ archive/backup แบบแบ่งชุดเมื่อข้อมูลโตขึ้น

```sh
GCLOUD_PROJECT=demo-project-pilot FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9197 FIRESTORE_EMULATOR_HOST=127.0.0.1:8187 node tools/project-pilot/history-storage-emulator-test.mjs /private/snapshot.json
```

## คิวบันทึกเมื่อมีคำขอพร้อมกัน

ทดสอบ 200 การแก้ยอดคนละโครงการ ส่งพร้อมกันครั้งละ 10 คำขอผ่าน store สอง instance ใน process เดียว ก่อนเพิ่มคิวมีสำเร็จ 133 และล้มเหลว 67 จากการชน transaction ของข้อมูลสรุปรวม (514 transaction attempts, ประมาณ 146 วินาที) ตรวจข้อมูลทุกโครงการแล้วไม่มีการบันทึกบางส่วน ยอดรวมและจำนวนประวัติตรงกับคำขอที่สำเร็จ

เพิ่ม `write-queue.mjs` จัดลำดับ mutation ของ trial เดียวกันภายใน process ไม่จัดคิวข้าม trial และไม่ครอบ preview/query ตัว Firestore transaction ยังตรวจ grant และ version เมื่อถึงคิวจริง จึงไม่ใช้สิทธิ์หรือข้อมูลที่ตรวจไว้ก่อนรอคิว ความผิดพลาดของคำขอหนึ่งไม่ทำให้คำขอถัดไปค้าง

หลังเพิ่มคิว ทดสอบแบบเดิมผ่าน 200/200, 200 transaction attempts, ประมาณ 2.1 วินาที (p95 ประมาณ 115 ms) ตรวจเงินรายโครงการ ยอดรวม ประวัติครบ ไม่เปลี่ยนโครงการอื่น ตัวเลขนี้เป็นการทดสอบ store ใน Emulator เครื่องนี้ ใช้บัญชี head จำลอง ไม่รวม HTTP/Auth/การ refresh ของ browser และไม่ใช่การรับรองความเร็ว production ชุดทดสอบไม่แตะชุดที่ผู้ใช้กำลังทดลอง

คิวนี้อยู่เฉพาะ process เดียว ไม่ใช่ distributed queue หากมีหลายเซิร์ฟเวอร์ Firestore transactions ยังเป็นตัวป้องกันเขียนทับและอาจเกิด retries ต้องออกแบบข้อมูลสรุปเพิ่มเติมก่อนขยายหลาย instance ผลก่อน/หลังเก็บใน `concurrency-results.json` รันทดสอบ queued เป็นรอบแยก; การเริ่มรอบ queued ขณะที่ baseline กำลังทำงานหนักเคยพบ Emulator transaction initialization error และไม่นับเป็นผลวัดสำเร็จ

```sh
node --test tools/project-pilot/write-queue.test.mjs
GCLOUD_PROJECT=demo-project-pilot FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9197 FIRESTORE_EMULATOR_HOST=127.0.0.1:8187 node tools/project-pilot/concurrent-load-emulator-test.mjs /private/snapshot.json 200 10
```

## โหลดประวัติเมื่อกดดู เพื่อลด reads ในหน้าปกติ

หน้า 4187 ไม่อ่าน collection ประวัติพร้อมการเปิดหน้า ค้นหา เปลี่ยนหน้า หรือโหลดใหม่หลังบันทึกแล้ว ผู้ใช้กด “ดูประวัติ” เพื่ออ่านล่าสุด 50 รายการผ่าน `/api/year68/trial/history` โดยตรวจ token/grant อีกครั้งและจำกัดตามโครงการที่ผู้ช่วยรับผิดชอบ กดโหลดข้อมูลล่าสุดหรือบันทึกแล้วจะกลับมาแสดงปุ่ม ไม่โหลดประวัติซ้ำอัตโนมัติ ชุดเดิม 4186 คงพฤติกรรมเดิม

ผลวัดใหม่ใน Emulator (ฐานข้อมูลยังมีประวัติเต็ม 50 รายการ, ไม่มีคำขอค้างนอกหน้า): เปิดภาพรวมเหรัญญิก 28 reads, ผู้ช่วยหนึ่งโครงการ 4 reads, ดูผล–แก้ยอด–โหลดใหม่ 35 reads/3 writes, เสนอแก้ยอด 35 reads/4 writes, อนุมัติ–โหลดใหม่ 34 reads/3 writes, ผู้ช่วยเปลี่ยนสถานะ 11 reads/3 writes การกดดูประวัติของเหรัญญิกแยกใช้ 52 reads เมื่อแสดง 50 เหตุการณ์ รวมการอ่าน grant สองจุดแล้ว ไม่ลบหรือหยุดบันทึกประวัติ

ทดสอบผ่านทั้งการกดปุ่มใน Chrome, การโหลดใหม่แล้วไม่โหลดประวัติอัตโนมัติ, query ปกติไม่อ่าน audit, อ่านประวัติไม่อ่าน checkpoint โครงการ, ผู้ช่วยที่ไม่มีงานไม่เห็นประวัติ, ถอน grant แล้วอ่านประวัติไม่ได้ และ workflow ดาวน์โหลด/กู้คืน/รีสตาร์ตเดิม

`usage-estimate.json` อัปเดตใช้ 35 reads ต่อ workflow แล้ว ตัวอย่าง 27 วัน × 50 ครั้ง + 3 วัน × 200 ครั้ง และสมมติ 35 บาท/USD เดิม: รวมทั้งทีม 0–0.95 บาท/เดือน, ต่อคนทีม 23 คน 3.67–21.76, ต่อคนทีม 34 คน 9.09–32.16 เฉพาะค่า document operations เพิ่มตามสมมติฐานโควตาสองแบบ **ไม่รวมการกดดูประวัติเพิ่มเติม บิลเดิม หรือบริการอื่น** ไม่ใช่ยอดรวมที่รับรองว่าจะไม่เกินงบ

## ผลวัดก่อนเปลี่ยนเป็นโหลดประวัติเมื่อกด (เก็บไว้เทียบ)

เพิ่ม `measure-usage-emulator.mjs`, `usage-cost.mjs` และผลรวมที่ไม่มีข้อมูลส่วนบุคคลใน `usage-estimate.json` วัดด้วยชุดจำลองแยก 407 โครงการและประวัติเต็มหน้า 50 รายการ รวมการอ่าน grant ของ API ก่อนเข้า transaction และประมาณขั้นต่ำหนึ่ง read ต่อ get/query นับ writes ที่ transaction สำเร็จ ไม่ใช่ตัววัด billing ของ Google:

| ขั้นตอน | Document reads โดยประมาณ | Writes |
|---|---:|---:|
| เปิดภาพรวมเหรัญญิก 25 โครงการ + ประวัติ 50 รายการ | 78 | 0 |
| ผู้ช่วยเปิด 1 โครงการ + ประวัติ 50 รายการ | 54 | 0 |
| เหรัญญิกดูผล → แก้ยอด → โหลดหน้าใหม่ | 85 | 3 |
| เลขาดูผล → เสนอแก้ยอด → โหลดหน้าใหม่ | 85 | 4 |
| เหรัญญิกอนุมัติ → โหลดหน้าใหม่ | 84 | 3 |
| ผู้ช่วยดูผล → เปลี่ยนสถานะ → โหลดหน้าใหม่ | 61 | 3 |
| ดาวน์โหลดสำรอง (407 โครงการ + ประวัติ 60 รายการในชุดวัด) | 469 | 0 |

ค่าจะแปรตามประวัติที่แสดง จำนวนโครงการ/คำขอค้าง และ retries ข้อมูลทดสอบทั้งหมดถูกลบเมื่อวัดเสร็จ ไม่วัดหรือเปลี่ยนฐานข้อมูลจริงและไม่เปลี่ยนชุดที่เปิดให้ผู้ใช้ทดลอง

ตรวจ [ราคา Firestore Standard](https://cloud.google.com/firestore/pricing) วันที่ 2026-11-14 โดยอ่านตาราง **Bangkok (asia-southeast3)** ใน HTML ของหน้าอย่างเป็นทางการ (ตารางเริ่มต้นหน้าเว็บเป็น Iowa อย่าใช้แทน Bangkok): Default USD $0.0315 ต่อ 100,000 reads, $0.0945 ต่อ 100,000 writes ฟรี reads 50,000/วัน และ writes 20,000/วันสำหรับฐานข้อมูลที่เข้าเกณฑ์หนึ่งฐานต่อ project โควตารีเซ็ตรายวัน ไม่รวมเป็นก้อนรายเดือน ราคาตามสกุลเงิน billing จริงต้องใช้ SKU สกุลนั้น

ผู้ใช้ขอเทียบทั้ง “รวมทั้งทีม” และ “ต่อคน” ตัวอย่างจึงใช้หนึ่งครั้งเท่ากับ workflow แก้ยอด 85 reads/3 writes เท่ากัน เพื่อเทียบสเกล (ไม่ใช่ข้อยืนยันว่าผู้ช่วยแก้ยอดได้ หรือเป็นสัดส่วนงานจริง) ทีม 1 เหรัญญิก + 2–3 เลขา + 20–30 ผู้ช่วย = 23–34 คน สมมติเดือน 30 วัน: 27 วัน × 50 ครั้ง และ 3 วัน × 200 ครั้ง; แปลงเงินเพื่อวางแผนด้วย **สมมติฐาน 35 บาท/USD** ไม่ใช่อัตราแลกเปลี่ยนปัจจุบันที่ยืนยันแล้ว:

| ความหมายของจำนวนครั้ง | ค่าอ่าน/เขียนส่วนโครงการเพิ่ม ถ้าโควตาฟรีเหลือครบ | ถ้าระบบเดิมใช้โควตาทั้ง reads/writes หมดแล้ว |
|---|---:|---:|
| รวมทั้งทีม | 0.00 บาท/เดือน | 2.02 บาท/เดือน |
| ต่อคน ทีม 23 คน | 25.49 บาท/เดือน | 46.48 บาท/เดือน |
| ต่อคน ทีม 34 คน | 45.63 บาท/เดือน | 68.71 บาท/เดือน |

หากใช้ 500 ครั้งแทน 200 ในสามวันยุ่ง ตัวเลขจะเป็น 0–2.95, 46.33–67.93 และ 77.35–100.42 บาท/เดือนตามลำดับ ช่วงนี้แสดงสมมติฐานโควตาสองแบบ ไม่ใช่ช่วงความเชื่อมั่นหรือเพดานค่าบริการ

ยังไม่รวมบิลเดิม, การเปิดหน้าเพิ่มเติม/ล็อกอิน, backups เพิ่มเติม, index-entry billing, storage/index size, network, Auth, hosting/API หรือ retries production ดังนั้นยังสรุปยอดรวมไม่เกิน 35 บาทไม่ได้ ตัวคำนวณรับ usage ของระบบเดิมรายวันได้ และคิดเฉพาะค่าเพิ่ม `cost(existing + project) - cost(existing)` เพื่อไม่คิดบิลเดิมซ้ำ ทดสอบการรีเซ็ตโควตารายวัน การแยก read/write และการหักบิลเดิม 5 กลุ่มผ่าน

ข้อค้นพบจาก [รายการ SKU ของ Google](https://cloud.google.com/skus/sku-groups/firestore-ops): `Cloud Firestore Read Ops Bangkok` SKU `851F-E669-E127` อยู่ใต้ service `App Engine (F17B-412E-CB64)` ซึ่งตรงกับ service ID ในบิลที่ผู้ใช้ส่ง จึงยังสรุปไม่ได้ว่า 28.61 บาทเป็นค่าเซิร์ฟเวอร์แยกจาก Firestore ต้องดูบิลช่วงเดียวกันแยกตาม SKU ก่อนรวมค่าใช้จ่ายใหม่

```sh
GCLOUD_PROJECT=demo-project-pilot FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9197 FIRESTORE_EMULATOR_HOST=127.0.0.1:8187 node tools/project-pilot/measure-usage-emulator.mjs /private/snapshot.json
node --test tools/project-pilot/usage-cost.test.mjs
```

## ดาวน์โหลดและกู้คืนชุด Firestore ที่ใช้ UID

เหรัญญิกดาวน์โหลดผ่านปุ่ม “ดาวน์โหลดชุดสำรองทั้งหมด” ที่หน้า 4187 ได้แล้ว ไฟล์ `sgcu-firestore-trial-backup.json` รวม snapshot ต้นทาง ทะเบียน UID/ชื่อ/บทบาทอ้างอิง checkpoint ครบทุกโครงการ ยอด สถานะ การมอบหมาย คำขอทั้งหมด และประวัติทั้งหมดพร้อมลำดับ ไม่จำกัด 25 โครงการหรือ 50 เหตุการณ์ที่หน้าเว็บแสดง เลขา/ผู้ช่วยดาวน์โหลดทั้งชุดไม่ได้ และ server ตรวจ grant ใน transaction เดียวกับการอ่านชุดสำรอง การดาวน์โหลดไม่เปลี่ยนข้อมูลโครงการหรือเพิ่มประวัติ

ไฟล์นี้ไม่ได้เข้ารหัส checksum ใช้ตรวจความเสียหาย ไม่ใช่ลายเซ็นรับรองผู้สร้าง ไม่รวมข้อมูล Auth, password, session, active grant, XLSX ทั้งเล่ม หรือไฟล์แนบ Drive การกู้ไม่สร้างบัญชีหรือเปิด grant ให้อัตโนมัติ ต้องมี UID/สิทธิ์ที่ตรงกันอยู่แล้ว หรือกู้บัญชี Emulator จาก export แยกของ Emulator ก่อน ตัวอย่างต่อไปนี้ใช้เฉพาะ Emulator ที่เปิดอยู่:

```sh
GCLOUD_PROJECT=demo-project-pilot FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9197 FIRESTORE_EMULATOR_HOST=127.0.0.1:8187 node tools/project-pilot/restore-firestore-backup.mjs /private/sgcu-firestore-trial-backup.json year68-recovered
# หยุดเฉพาะเว็บเดิมก่อนเปิดพอร์ตเดิม; คง Emulator ที่มีบัญชีเดิมไว้
PROJECT_TRIAL_ID=year68-recovered GCLOUD_PROJECT=demo-project-pilot FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9197 FIRESTORE_EMULATOR_HOST=127.0.0.1:8187 node tools/project-pilot/run-emulator-web.mjs /private/snapshot.json
```

ปลายทางต้องเป็น trial ID ใหม่เท่านั้น โปรแกรมตรวจ checksum, ตัวตนโครงการ, สูตรเงิน, ประวัติ, คำขอ และขนาดก่อนสร้างชุดกู้คืน ถ้ามีปลายทางอยู่แล้วจะปฏิเสธ ไม่เขียนทับชุดที่ใช้อยู่ ระหว่างกู้ใช้สถานะ `restoring` ซึ่ง server ไม่เปิดให้อ่านหรือแก้ได้ เมื่อทุกส่วนครบจึงเป็น `ready` หากเขียนไม่ครบให้กู้ลง ID ใหม่ ไม่เปิดชุดที่ค้างเป็นข้อมูลว่าง

กู้คืนแล้วหมุน version ทุกโครงการเพื่อปฏิเสธหน้าจอเก่า คำขอ pending ที่ตรงกับรุ่น ณ จุดสำรองยังอนุมัติต่อได้ ส่วนคำขอที่ stale อยู่แล้วยัง stale เก็บ audit เดิมครบและบันทึกที่มาของการกู้ (checksum/ชุดต้นทาง/เวลาสำรอง/เวลากู้) ไว้ใน metadata ของชุดใหม่ ลำดับหน้าและลำดับประวัติยังเหมือนเดิม

ทดสอบกับ 407 โครงการและ 59 เหตุการณ์ รวมคำขอ pending ทั้งที่ใช้ได้และเก่า ผ่านการตรวจยอด/สถานะ/ผู้รับผิดชอบ/ประวัติทุกโครงการ การปฏิเสธไฟล์เสียและปลายทางเดิม และจำลองเขียนล้มเหลว Browser test ดาวน์โหลดไฟล์จริงจาก Chrome แล้วกู้ไฟล์นั้น เปิดล็อกอินเซิร์ฟเวอร์อีกชุดได้ ชุด unit/HTTP เดิม 61 กลุ่มยังผ่าน การวัดกู้และตรวจในเครื่องครั้งนี้ประมาณ 0.6 วินาที ไม่รวมเตรียมเครื่อง ดาวน์โหลดไฟล์ และกู้บัญชี จึงไม่ใช่การรับรอง RTO production

```sh
GCLOUD_PROJECT=demo-project-pilot FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9197 FIRESTORE_EMULATOR_HOST=127.0.0.1:8187 node tools/project-pilot/firestore-backup-emulator-test.mjs /private/snapshot.json
```

ยังไม่มีการส่งไฟล์สำรองไป Drive อัตโนมัติ ไม่แก้ฐานข้อมูลจริง การดาวน์โหลดสำรองอ่านครบชุดเฉพาะเมื่อกดปุ่ม ไม่เพิ่มการอ่านครบชุดในการเปิดหน้าปกติ

## ลดการอ่านหน้าภาพรวมในชุด Emulator

`views/overview-v1` เก็บข้อมูลสรุปรายโครงการ (ยอด ผู้รับผิดชอบ และว่ามีคำขอค้างหรือไม่) โดยอัปเดตใน transaction เดียวกับการบันทึกโครงการ การเปิดหน้าไม่อ่าน checkpoint ครบทั้งปีอีกแล้ว: อ่าน grant และข้อมูลสรุปก่อน เลือกหน้าละ 25 โครงการจากรหัส/ชื่อ/องค์กร/ผู้ตรวจใน source ที่เซิร์ฟเวอร์โหลดไว้ แล้วอ่านรายละเอียดเฉพาะหน้านั้น รวมกับโครงการที่มีคำขอรอตรวจ คำขอรอตรวจจึงยังไม่หายเมื่อเปลี่ยนหน้าหรือค้นหา

ประวัติที่ใช้แสดงแยกสำเนาไว้ใน collection `audit` แล้ว query ล่าสุด 50 รายการ ผู้ช่วย query เฉพาะ ID โครงการที่รับผิดชอบในปัจจุบัน แบ่งกลุ่ม ID สูงสุด 30 ต่อ query แล้วรวม 50 รายการล่าสุด การย้ายผู้รับผิดชอบเปลี่ยนสิทธิ์อ่านและยอดรวมในคำขอถัดไป ไม่ต้องแก้ประวัติเก่า ประวัติเต็มยังอยู่ใน checkpoint ของแต่ละโครงการและ collection ประวัติ ไม่ลบเพื่อจำกัดจำนวนที่แสดง

ผลวัดด้วยตัวนับเอกสารที่คืนจาก `transaction.get` ใน store: ชุด 407 โครงการที่ไม่มีคำขอค้าง/ประวัติ หน้าแรกอ่านรายละเอียด 25 เอกสาร + grant 1 + overview 1; หน้าสุดท้ายอ่านรายละเอียด 7 เอกสาร เมื่อมีคำขอค้างหนึ่งโครงการนอกหน้าแรก อ่านรายละเอียด 26 เอกสาร ยอดรวมทั้งปีเท่าเดิม และผู้ช่วยที่มีหนึ่งโครงการอ่านรายละเอียดหนึ่งเอกสารเท่านั้น ทดสอบประวัติ 60 รายการแล้วอ่านมาแสดง 50 โดยยังเก็บครบ 60

ตัวเลขนี้เป็นเอกสารที่อ่านใน store ไม่ใช่ยอด billing: ยังไม่รวม grant ที่ API ตรวจ token/บทบาทก่อนเข้า store, minimum charge ของ query ที่ไม่พบผลลัพธ์, retries หรือ index-entry reads การบันทึกเพิ่ม write ของข้อมูลสรุปและสำเนาประวัติ จึงยังไม่ใช่ข้อสรุปว่าค่าใช้จ่ายจะเป็นศูนย์ ไม่มี polling/listener เพิ่มเข้ามา

```sh
GCLOUD_PROJECT=demo-project-pilot FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9197 FIRESTORE_EMULATOR_HOST=127.0.0.1:8187 node tools/project-pilot/overview-reads-emulator-test.mjs /path/to/private/snapshot.json
```

การเปิดรุ่นนี้ครั้งแรกจะสร้างข้อมูลสรุปและสำเนาประวัติจาก checkpoint ที่มีอยู่หนึ่งครั้งก่อนเปิดเว็บ ต้องหยุดเว็บรุ่นเดิมก่อนเปลี่ยนรุ่นเพื่อไม่ให้มี writer ที่ไม่อัปเดต summary เปิดครั้งถัดไปไม่อ่านทุกโครงการเพื่อ initialize อีกแล้ว ชุดทดลองนี้ยังใช้ summary document ร่วมกันและจำกัดขนาด 750 KB; ต้องประเมิน contention/ขนาดและจัดทำ indexes ก่อนพิจารณา production

## บันทึกโครงการใน Firestore Emulator ด้วย transaction

ชุดล็อกอิน 4187 ใช้ `firestore-trial.mjs` แล้ว เก็บ checkpoint แยกหนึ่ง document ต่อโครงการที่ `projectTrials/{trialId}/projects/{hash}` และมีตัวชี้คำขอเพื่อค้นหาโครงการตอนอนุมัติ การแก้หนึ่งโครงการตรวจ grant, version, สิทธิ์สถานะ, สูตรเงิน และเขียนยอด/คำขอ/ประวัติของโครงการนั้นใน transaction เดียว ไม่มีการเขียนทั้ง 407 โครงการทุกครั้ง หากบันทึกชนกัน Firestore ลอง transaction ใหม่และ model ปฏิเสธ version เก่า การอนุมัติตรวจ grant ของผู้เสนอด้วย; การมอบหมายตรวจ grant ของผู้ช่วยปลายทางด้วย

UID และชื่อบัญชีอยู่ในทะเบียนที่ตรวจความตรงกันด้วย hash ร่วมกับปี/source snapshot ถ้าไม่ตรงจะไม่เปิดทับชุดเดิม บัญชี `*-local@example.test` ถูกใช้ซ้ำเมื่อเปิดเว็บ ไม่สร้าง UID ใหม่หรือเปิด grant ที่เคยถูกถอนกลับให้อัตโนมัติ การเริ่มข้อมูลทำเฉพาะ document ที่ยังไม่มี การย้ายชุดเก่าใช้ seed ส่วนตัวและไม่เขียนทับ document ที่มีอยู่แล้ว

ทดสอบ transaction สอง instance แก้ version เดียวกัน: สำเร็จหนึ่งคำขอ อีกคำขอถูกปฏิเสธ ไม่เพิ่มประวัติหรือยอดบางส่วน โครงการอื่นไม่เปลี่ยน version เปิด store ใหม่แล้วคำขอค้างยังอยู่และอนุมัติต่อได้ ทดสอบปิดเปิด HTTP server จริงใน browser แล้วเงิน/คำขอ/ประวัติ/ผู้รับผิดชอบเหมือนเดิม พร้อมผ่าน unit/HTTP เดิม 61 กลุ่ม

```sh
# เมื่อ Emulator เปิดอยู่ ใช้ชุดสุ่มแยกจากเว็บและลบทิ้งเมื่อทดสอบจบ
GCLOUD_PROJECT=demo-project-pilot FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9197 FIRESTORE_EMULATOR_HOST=127.0.0.1:8187 node tools/project-pilot/firestore-trial-emulator-test.mjs /path/to/private/snapshot.json
```

การรีสตาร์ต **เว็บ** ใช้ข้อมูล Firestore ที่ยังเปิดอยู่ได้ ส่วนการปิด **Emulator** ต้อง export/import ข้อมูล จึงควรเปิด CLI ด้วย `--import=/private/export` และ `--export-on-exit=/private/export` หลังมี export ตั้งต้นแล้ว เครื่องปิดฉับพลันอาจสูญเสียการเปลี่ยนหลัง export ล่าสุด ไม่ใช่ความทนทานหรือระบบสำรองของ production

ข้อจำกัดที่ยังต้องแก้ก่อนใช้จริง: checkpoint ยังรวมประวัติใน document โครงการและจำกัด payload 750 KB เมื่อเกินจะปฏิเสธการบันทึก ไม่ตัดประวัติ แม้เพิ่ม collection ประวัติสำหรับอ่านหน้าภาพรวมแล้ว ยังต้องแยกประวัติออกจาก checkpoint สำหรับการเก็บระยะยาว ชุด UID ใช้ backup/restore รูปแบบใหม่ตามหัวข้อแรก แยกจากชุดเดิม 4186

## หน้าล็อกอินและ API ที่ใช้บัญชี Emulator

เปิดชุดใหม่แยกที่ `http://127.0.0.1:4187` โดยใช้สำเนาปี 68 เป็นข้อมูลทดสอบ ส่วนชุดเดิมที่ 4186 และไฟล์บันทึกเดิมไม่ถูกนำมาเขียนทับ:

```sh
firebase emulators:exec --only auth,firestore --project demo-project-pilot --config tools/project-pilot/firebase.emulator.json 'node tools/project-pilot/run-emulator-web.mjs /path/to/private/snapshot.json'
```

อีเมลทดลอง: `head-local@example.test`, `secretary-local@example.test`, `assistanta-local@example.test`, `assistantb-local@example.test` รหัสผ่านเหมือนกัน `Local-trial-12345` ทั้งหมดสร้างเฉพาะใน Auth Emulator และไม่ใช่บัญชีจริง เลือกบทบาทจากหน้าเว็บไม่ได้แล้ว ให้ล็อกอินด้วยอีเมลและรหัสผ่าน บัญชีผู้ช่วยจะยังไม่เห็นโครงการจนเหรัญญิกมอบหมายให้

API ตรวจ token และ grant ทุกคำขอ โดยผูก UID กับทะเบียนบัญชีที่สร้างฝั่งเซิร์ฟเวอร์ ไม่ใช้ role หรือ UID ที่ส่งจากฟอร์ม ชุดทดลองเงินรองรับทะเบียนบัญชีแบบกำหนดเองและโหลด checkpoint รายโครงการด้วย UID ประวัติและผู้รับผิดชอบใช้ UID จริงจาก Emulator เลขาเสนอแก้ยอดได้แต่อนุมัติเองไม่ได้ สิทธิ์ที่เปลี่ยนจากทะเบียนตั้งต้นถูกปฏิเสธ ไม่เปลี่ยนสิทธิ์ย้อนหลังตามประวัติเก่า

ล็อกอินใช้ session cookie แบบ HttpOnly/SameSite=Strict และเก็บ ID token เฉพาะในหน่วยความจำฝั่งเซิร์ฟเวอร์ ไม่มี refresh token ที่บันทึกไว้ session อายุสูงสุด 55 นาทีแล้วต้องเข้าสู่ระบบใหม่ ออกจากระบบแล้ว session ใช้ไม่ได้ เมื่อโหลดข้อมูลแล้วพบว่าสิทธิ์ถูกถอน หน้าเว็บจะซ่อนข้อมูลและแสดงฟอร์มล็อกอิน การถอนสิทธิ์ไม่ได้ลบข้อมูลที่ผู้ใช้เคยเห็นออกจากหน้าจอทันทีหากยังไม่ได้เรียก API อีกครั้ง

ทดสอบผ่าน Chrome สี่บัญชีแยก session: รหัสผ่านผิด, cookie อ่านจาก JavaScript ไม่ได้, `/api/session` เดิมใช้ข้ามล็อกอินไม่ได้, มอบหมายผู้ช่วย/จำกัดโครงการ, ผู้ช่วยปลอมคำขอแก้เงินไม่ได้, เลขาเสนอและเหรัญญิกอนุมัติพร้อมบันทึก UID, ถอน grant แล้วซ่อนข้อมูล, logout และไฟล์ต้นฉบับไม่เปลี่ยน ชุด unit/HTTP เดิม 61 กลุ่มผ่านทั้งหมด

```sh
firebase emulators:exec --only auth,firestore --project demo-project-pilot --config tools/project-pilot/firebase.emulator.json 'node tools/project-pilot/emulator-login-browser-test.mjs /path/to/private/snapshot.json'
```

ชุด 4187 บันทึกด้วย Firestore transaction และดาวน์โหลด/กู้คืนข้อมูล UID ลงชุดใหม่ได้ตามหัวข้อด้านบน; หน้าเดิม 4186 ยังมีการบันทึกและสำรองตามเดิม ไม่ใช่การ deploy หรือระบบ production

## ตรวจบัญชีด้วย Firebase Emulator

`firebase-identity.mjs` เชื่อม `project-identity.mjs` กับ Firebase Admin SDK ที่ติดตั้งใน `functions` แล้ว ตรวจ token ด้วย `verifyIdToken(token, true)` และอ่านสิทธิ์จาก `projectAccess/{academicYear}/members/{uid}` ใช้ได้เฉพาะ `demo-project-pilot`, Auth `127.0.0.1:9197` และ Firestore `127.0.0.1:8187`; ถ้าค่าไม่ตรงจะหยุดก่อนสร้าง SDK client ไม่มีการใช้ production แทน

กฎใน `project-access.rules` ใช้กับ emulator ชุดนี้เท่านั้น: client ทุกบทบาทอ่านหรือแก้ grant โดยตรงไม่ได้ การสร้างสิทธิ์ทดสอบใช้ Admin SDK ฝั่งเซิร์ฟเวอร์ กฎนี้ไม่ใช่กฎ deploy ของเว็บหลัก และ Admin SDK ข้าม Security Rules จึงยังต้องตรวจสิทธิ์ใน API ทุกครั้ง

รันจากราก repository:

```sh
firebase emulators:exec --only auth,firestore --project demo-project-pilot --config tools/project-pilot/firebase.emulator.json 'node tools/project-pilot/firebase-identity-emulator-test.mjs'
node --test tools/project-pilot/firebase-identity.test.mjs tools/project-pilot/project-identity.test.mjs
```

ผ่านทั้ง integration test กับบัญชี/token ที่สร้างจาก Auth Emulator และ unit tests 8 กลุ่ม: แยก head/secretary/assistant, เลขาต้องเสนอ H รอตรวจ, ไม่มีสิทธิ์หรือปีผิดถูกปฏิเสธ, token ไม่ถูกต้อง/ถูกถอน/บัญชีปิดถูกปฏิเสธ, client รวมถึง head แก้สิทธิ์ตรงไม่ได้ และถอน grant แล้วมีผลในคำขอถัดไป สคริปต์ลบบัญชีและ grant ทดสอบเมื่อจบ ไม่แตะข้อมูลปี 68 หรือโฟลเดอร์ชุดทดลองที่ใช้อยู่

ขอบเขต: ต่อเข้าหน้าล็อกอินและ HTTP route ของชุด 4187 แล้วตามหัวข้อด้านบน และทดสอบการบันทึกโครงการด้วย Firestore transaction แล้วตามหัวข้อแรก การอ่าน grant ใช้หนึ่ง document read ต่อครั้งที่ resolve สำเร็จผ่านการตรวจ token ไม่มี listener/polling ใน adapter นี้ การทดสอบ emulator ไม่ใช่การวัดค่าใช้จ่าย production และไม่ยืนยันการตรวจลายเซ็น token จริงของ production

## เตรียมแยกสิทธิ์บัญชีสำหรับการเชื่อมเว็บหลัก

`project-identity.mjs` เป็นขอบเขตตรวจตัวตนสำหรับขั้นเชื่อมต่อ ยังไม่ได้ต่อเข้ากับ route ของเซิร์ฟเวอร์ทดลองหรือ Firebase จริง ตัว resolver รับฟังก์ชันตรวจ token และอ่านสิทธิ์ที่ฝั่งเซิร์ฟเวอร์เป็นผู้กำหนดเท่านั้น ผลลัพธ์มี UID, บทบาทส่วนโครงการ และปีการศึกษา ไม่รับบทบาทจากฟอร์ม ไม่ใช้สิทธิ์เข้าหน้าเว็บหรือชื่อบุคคลใน AI เป็นสิทธิ์แก้โครงการ

เหตุผลที่แยก: `isHeadStaffProfile` ใน `js/features/project/app.sorting-auth.js` จัดเหรัญญิกและเลขานุการเป็น head สำหรับบางหน้าของเว็บเดิม และ `isHeadStaff` ใน `firestore.rules` มีเกณฑ์ชื่อที่กว้าง จึงไม่ใช้ฟังก์ชันเหล่านี้ตัดสินสิทธิ์อนุมัติยอดของส่วนโครงการใหม่ โดยไม่เปลี่ยนพฤติกรรมหน้าอื่น

สัญญาข้อมูลสิทธิ์ที่เตรียมไว้: `{ uid, academicYear, active: true, projectRole: 'head' | 'secretary' | 'assistant' }` ต้องมาจากที่เก็บซึ่งผู้ใช้แก้สิทธิ์ตนเองไม่ได้ ตรวจบัญชีและปีตรงกันทุกคำขอ ไม่มี fallback เป็น head เมื่ออ่านสิทธิ์ล้มเหลว ตรวจถอน token ผ่าน dependency และไม่ cache สิทธิ์ข้ามคำขอ มี Firebase SDK adapter สำหรับ emulator ตามหัวข้อด้านบนแล้ว

ทดสอบ 7 กลุ่มผ่านด้วยตัวตรวจ token/ที่เก็บสิทธิ์จำลอง ครอบคลุมบทบาทแยกกัน เลขายังต้องเสนอ H ให้เหรัญญิกตรวจ ข้อมูลสิทธิ์เดิมไม่ยกระดับเอง ปี/บัญชีผิดถูกปฏิเสธ และถอนสิทธิ์แล้วคำขอถัดไปถูกปฏิเสธ:

```sh
node --test tools/project-pilot/project-identity.test.mjs
```

งานเชื่อมที่ยังเหลือ: mapping บัญชีจริงที่อนุมัติแล้ว รวมถึงตรวจสิทธิ์ร่วมกับการบันทึกแบบ transaction และทดสอบ persistence/recovery ใน emulator ก่อนใช้งานจริง การเชื่อมบัญชี Emulator ยังไม่ทำให้ชุดทดลองใช้เป็น production ได้

## หน้าจอค้างและการแก้พร้อมกัน

ฟอร์มสถานะแสดงเฉพาะช่องที่มีสถานะใหม่ให้เลือกตามสิทธิ์ โดยไม่นับสถานะปัจจุบันเป็นตัวเลือก ถ้าไม่มีช่องที่แก้ได้จะซ่อนฟอร์มและแจ้งข้อความ ส่วนสถานะปัจจุบันยังอ่านได้ครบ

ทดสอบด้วย browser context สองชุดที่แยก session: ผู้ช่วยดูผลก่อนบันทึกไว้ แล้วเหรัญญิกแก้ช่องเดียวกัน ระบบปฏิเสธการบันทึกเก่าด้วย 409; ถ้าเหรัญญิกย้ายผู้รับผิดชอบไปคนอื่น ระบบปฏิเสธผู้ช่วยเดิมด้วย 403 ทั้งสองกรณียอด สถานะ คำขอ ประวัติ และรายการสำรองไม่เปลี่ยนจากคำขอที่ถูกปฏิเสธ กดโหลดข้อมูลล่าสุดแล้วตัวเลือกที่ไม่มีสิทธิ์หรือโครงการที่ไม่รับผิดชอบจะหายไป ไม่มีการโหลดซ้ำตามเวลาในการตรวจนี้ และข้อมูลที่แสดงค้างอยู่จะเปลี่ยนเมื่อโหลดใหม่

```sh
node tools/project-pilot/concurrent-status-browser-test.mjs /path/to/private-preview/snapshot.json
```

## ดาวน์โหลดชุดสำรองแบบย้ายที่เก็บได้

เหรัญญิกกด “ดาวน์โหลดชุดสำรองทั้งหมด” ที่ `/year68-trial` ได้ไฟล์ `sgcu-year68-trial-backup.json` ซึ่งรวม snapshot ข้อมูลตั้งต้นและ checkpoint ชุดทดลอง (ยอด สถานะ ผู้รับผิดชอบจำลอง คำขอค้าง และประวัติทั้งหมด ไม่จำกัด 50 เหตุการณ์ที่หน้าเว็บแสดง) การส่งออกไม่เปลี่ยนข้อมูลหรือ revision ผู้ช่วยและเลขาดาวน์โหลดทั้งชุดไม่ได้

ไฟล์นี้เป็นข้อมูลชุดทดลอง ไม่รวมไฟล์ XLSX เดิมทั้งเล่ม โค้ดแอป หรือเอกสารแนบจาก Drive ผู้ใช้สามารถเก็บไฟล์ใน Drive ส่วนตัวหรือสื่ออีกชุดได้ ไม่มีการอัปโหลดอัตโนมัติและยังไม่ได้ตั้งสำรองนอกเครื่องตามเวลา ไฟล์ไม่ได้เข้ารหัส; checksum ตรวจความเสียหายของไฟล์ ไม่ใช่ลายเซ็นยืนยันผู้สร้าง

กู้คืนโดยใช้โค้ดรุ่นที่รองรับไฟล์นี้ ระบุโฟลเดอร์ปลายทางใหม่ที่ยังไม่มีอยู่และอยู่นอก repository:

```sh
node tools/project-pilot/restore-portable.mjs '/path/sgcu-year68-trial-backup.json' '/private-data/restored-trial'
node tools/project-pilot/server.mjs --year68-snapshot '/private-data/restored-trial/snapshot.json' --trial-directory '/private-data/restored-trial'
```

ตรวจ checksum, source identity, สูตรเงิน ยอดรวม และประวัติก่อนสร้างไฟล์ กู้คืนแบบนี้ไม่เขียนทับชุดที่ใช้อยู่ หมุน version เพื่อปฏิเสธหน้าจอเก่าและเพิ่มเหตุการณ์กู้คืน คำขอที่ยังใช้ได้ ณ จุดสำรองยังอนุมัติต่อได้ กรณีเขียนได้ไม่ครบจะทิ้ง marker ป้องกันเซิร์ฟเวอร์เปิดโฟลเดอร์นั้นเป็นชุดใหม่ ให้ใช้ไฟล์สำรองเดิมลองอีกโฟลเดอร์

ทดสอบผ่าน 53 กลุ่ม รวมการดาวน์โหลดจริงด้วย Chrome และเปิดเซิร์ฟเวอร์จากโฟลเดอร์ที่กู้คืนครบ 407 โครงการ พร้อมคำขอค้างและประวัติ การวัดกู้คืนและตรวจข้อมูลบนเครื่องทดลองครั้งนี้ใช้ประมาณ 0.4 วินาที ไม่รวมการเตรียมเครื่องใหม่/ดาวน์โหลดจากนอกเครื่อง และไม่ใช่การรับรอง RTO ของ production

```sh
node --test tools/project-pilot/portable-backup.test.mjs
node tools/project-pilot/portable-backup-browser-test.mjs /path/to/private-preview/snapshot.json
```

## เหตุผลที่ต้องกรอก

ตามที่ผู้ใช้ยืนยัน: การเปลี่ยนสถานะทั่วไป (ทั้งบันทึกตรงและเสนอให้ตรวจ) และการมอบหมายผู้ช่วยไม่บังคับเหตุผล หากต้องการยังใส่หมายเหตุได้ ส่วนการแก้ยอดเงิน ยกเลิก H14/Y11/AZ12 และส่งกลับคำขอยังต้องมีเหตุผล 3–1,000 ตัวอักษร การอนุมัติใช้เหตุผลจากผู้เสนอ ไม่ต้องกรอกซ้ำ

ช่องที่ไม่บังคับรับค่าว่างหรือไม่ส่งช่องเหตุผลก็ได้ ถ้าใส่ต้องเป็นข้อความไม่เกิน 1,000 ตัวอักษร ประวัติยังเก็บผู้แก้ เวลา ค่าเดิม/ใหม่ และคำขอครบ แม้เหตุผลว่าง ใช้นโยบายเดียวกันทั้ง `/year68-trial` และข้อมูลจำลองสองโครงการ `/` ทดสอบการเก็บ/โหลดและกู้คืนรายการไม่มีเหตุผลแล้ว

## ทดลองผู้ช่วยกับโครงการที่มอบหมาย

เหรัญญิกเปิดโครงการที่ `/year68-trial` แล้วมอบหมายบัญชีจำลอง A/B พร้อมเหตุผล จากนั้นสลับบัญชีผู้ช่วย ผู้ช่วยเห็นเฉพาะโครงการ ยอดรวม รายการคำขอ และประวัติในขอบเขตที่ได้รับมอบหมาย ตัวกรองและการแบ่งหน้าทำหลังกรองสิทธิ์แล้ว ไม่มีช่องแก้ยอด มอบหมาย กู้คืน หรือล้างชุดสำหรับผู้ช่วย เซิร์ฟเวอร์ปฏิเสธการส่งคำขอเหล่านี้ด้วย

การมอบหมายนี้เป็นการเริ่มจำลองจากสถานะต้นทางปี 68 ไม่ใช่การจับคู่ชื่อใน AI กับบัญชีจริง และไม่อ้างว่ารู้ประวัติผู้แก้ในชีตปี 68 ใช้ประวัติการเปลี่ยนสถานะทั้งหมดในชุดทดลองเป็นตัวล็อก (รวมการเปลี่ยนก่อนมอบหมายด้วย) ไม่ล้างประวัติเมื่อย้ายจาก A ไป B หรือยกเลิกแล้วมอบหมายใหม่

ผู้ช่วยเปลี่ยนตรง Q1–Q4/Y1–Y3/AZ1–AZ4/AZ7–AZ8 ได้เมื่อไม่มีผู้แก้อื่นในช่องนั้น ประวัติแยกตามช่องและจำผู้แก้ทุกคน ไม่ใช่คนล่าสุด การอนุมัติคำขอสถานะนับเป็นเหรัญญิกแก้ AZ12 เสนอให้เหรัญญิกตรวจได้แม้ช่องถูกล็อก แต่ยังต้องรับผิดชอบโครงการนั้น สถานะอื่นห้ามตามตารางผู้ใช้

การเปลี่ยนผู้รับผิดชอบทำให้คำขอเดิมเก่าและต้องส่งกลับก่อนเสนอใหม่ เก็บการมอบหมายและประวัติล็อกลงไฟล์ด้วย ตรวจประวัติตามลำดับเมื่อโหลดเพื่อยืนยันสิทธิ์ ณ ตอนเกิดเหตุการณ์ การกู้คืนไม่ล้างประวัติผู้แก้ที่อยู่ในชุดสำรองนั้น

ทดสอบรวม 45 กลุ่มผ่าน รวมทั้ง matrix ผู้ช่วย 57 เป้าหมาย การเข้าถึงโครงการคนอื่น การส่งช่องเงินแฝง การจำผู้แก้ทุกคน การย้ายผู้รับผิดชอบ restart/restore และหน้าจอคอม/มือถือ:

```sh
node --test tools/project-pilot/assistant-trial.test.mjs
node tools/project-pilot/assistant-trial-browser-test.mjs /path/to/private-preview/snapshot.json
```

## เปลี่ยนสถานะพร้อมคำนวณยอดในชุดทดลอง

หน้า `/year68-trial` มีฟอร์มสถานะแยกจากฟอร์มยอดเงิน เลือก H/Q/Y/AZ/BA และสถานะใหม่ ระบุเหตุผล กดดูผลสถานะและยอดก่อนยืนยัน เซิร์ฟเวอร์ใช้สิทธิ์จากตารางผู้ใช้ชุดเดียวกับรุ่นจำลองเดิม: เหรัญญิกแก้ตรงทุกสถานะ; เลขาแก้ตรง Q1–Q5/Y1–Y8, เสนอให้เหรัญญิกตรวจ H1–H14/Q6–Q13/Y11, ช่องอื่นไม่อนุญาต

สถานะที่ต้องตรวจยังไม่เปลี่ยนสถานะหรือยอดจนอนุมัติ เมื่อบันทึกหรืออนุมัติจะเปลี่ยนสถานะ ยอดทั้งชุด ยอดรวม และประวัติพร้อมกัน การเปลี่ยนสถานะทำให้คำขอแก้เงินที่อ้างรุ่นเดิมเก่า เช่นเดียวกับการแก้เงินที่ทำให้คำขอสถานะเก่า ดูสถานะก่อน–หลังและผลเงินได้ทั้งในคำขอและประวัติ

ไฟล์ที่เก็บไว้ก่อนเพิ่มสถานะยังอ่านได้ ประวัติรุ่นเก่าที่ไม่มีสถานะแนบใช้สถานะจากสำเนาต้นทางในการตรวจสูตร ประวัติและคำขอใหม่เก็บสถานะครบ 5 ช่อง ณ ตอนเสนอ/บันทึก เพื่อให้ตรวจสูตรเก่าได้แม้สถานะปัจจุบันเปลี่ยนแล้ว ทดสอบ restart/restore พร้อมประวัติผสมแล้ว

ทดสอบระบบรวม 39 กลุ่ม ครอบคลุมสิทธิ์เป้าหมายทั้ง 57 สถานะ เทียบผลสูตรกับ Python 2,442 กรณีแก้เงิน + 2,442 กรณีเปลี่ยนสถานะ และทดสอบหน้าจอคอม/มือถือ:

```sh
node --test tools/project-pilot/status-finance.test.mjs
node tools/project-pilot/status-finance-browser-test.mjs /path/to/private-preview/snapshot.json
python3 -B tools/project-pilot/check_finance_parity.py /path/to/private-preview/snapshot.json
```

ยังใช้ร้อยละและเงื่อนไขเอกสารจากสำเนา ไม่เปลี่ยนสถานะอัตโนมัติกับข้อมูลย้อนหลัง เปิดผู้ช่วยจำลองเฉพาะโครงการที่เหรัญญิกมอบหมายตามหัวข้อด้านบน และไม่แก้สำเนา `/year68` หรือข้อมูลจริง

## บันทึกลงไฟล์ สำรอง และกู้คืนชุดทดลอง

เปิดโหมดเก็บข้อมูลด้วยโฟลเดอร์ส่วนตัวนอก repository (ควรอยู่นอก temp เพื่อไม่ถูกระบบล้าง):

```sh
node tools/project-pilot/server.mjs --year68-snapshot '/private-data/snapshot.json' --trial-directory '/private-data/financial-trial'
```

โหมดนี้เก็บยอด คำขอ ประวัติ และ version ใน `state.json` หลังรีสตาร์ตเลือกบัญชีทดลองใหม่ได้ ข้อมูลเดิมยังอยู่ ใช้ไฟล์ 0600/โฟลเดอร์ 0700 ตรวจ checksum และผูกกับสำเนาต้นทาง ตรวจสูตรเงิน ยอดรวม ตัวตนโครงการ คำขอ และประวัติก่อนโหลด มี writer lock ป้องกันเปิดสอง process เขียนที่เดียวกัน หาก process เดิมหยุดฉับพลัน จะเรียกคืน lock ได้เมื่อ PID เดิมไม่มีอยู่แล้ว

ทุกการบันทึกสร้าง candidate แยกจากข้อมูลที่ใช้งาน เขียนไฟล์ชั่วคราวและ fsync ก่อน rename เป็นไฟล์หลัก แล้วจึงเปลี่ยนข้อมูลในหน่วยความจำ หากเขียนไฟล์ล้มเหลว จะไม่รายงานสำเร็จและไม่เปลี่ยนสถานะในหน่วยความจำ มีสำรองตั้งต้นและสำรองก่อนเปลี่ยนข้อมูล เก็บล่าสุด 20 ชุด; การลบไฟล์เก่าไม่สำเร็จจะเก็บเกินไว้แล้วลองใหม่รอบหน้า

เหรัญญิกเลือกชุดสำรองและยืนยันกู้คืนที่ท้ายหน้า `/year68-trial` ระบบสำรองปัจจุบันก่อนแทนที่และเพิ่มประวัติกู้คืน หมุน version ใหม่เพื่อปฏิเสธคำขอจากหน้าจอก่อนกู้คืน คำขอรอตรวจที่ยังตรงกับยอด ณ จุดสำรองยังอนุมัติต่อได้ ส่วนคำขอที่เก่าอยู่แล้วจะยังเก่า

หากไฟล์หลักเสีย เซิร์ฟเวอร์จะไม่ล้างข้อมูลเอง ให้หยุดเซิร์ฟเวอร์แล้วระบุชื่อชุดสำรองที่ต้องการกู้คืน:

```sh
node tools/project-pilot/server.mjs --year68-snapshot '/private-data/snapshot.json' --trial-directory '/private-data/financial-trial' --restore-backup 'backup-<timestamp>-<uuid>.json'
node --test tools/project-pilot/finance-store.test.mjs
node tools/project-pilot/finance-trial-browser-test.mjs /path/to/private-preview/snapshot.json --persistent
```

ผลตรวจรวม 33 กลุ่มผ่าน ทดสอบคำขอค้างหลัง restart, กู้คืนผ่านเว็บ, ไฟล์เสีย, เขียนไฟล์ล้มเหลว, ป้องกันเขียนพร้อมกัน, เก็บ 20 สำรอง และสูตรครบ 407 โครงการหลังบันทึก/โหลด checkpoint สำเนาที่เปิดทดสอบจริงเก็บสถานะเดิมก่อนเปลี่ยนจากโหมดหน่วยความจำ

ขอบเขต: สำรองอยู่บนเครื่องและดิสก์เดียวกัน ไม่ป้องกันเครื่องสูญหายหรือดิสก์เสีย ไม่มี offsite backup/encryption หรือการยืนยัน RTO/RPO ของ production การใช้ atomic rename นี้ไม่รับประกันความทนทานของ directory metadata เมื่อไฟดับทุกกรณี และยังไม่ใช่ฐานข้อมูลสำหรับหลายเซิร์ฟเวอร์ หากไม่ระบุ `--trial-directory` จะใช้โหมดหน่วยความจำเดิม

## ชุดทดลองบันทึกและอนุมัติยอดพร้อมสูตร

เปิด http://127.0.0.1:4186/year68-trial หลังเริ่มเซิร์ฟเวอร์ด้วย snapshot ที่มี `formulaInputs` ชุดนี้คัดลอกปี 68 ในหน่วยความจำ ใช้รหัส TEST68 แยกจากสำเนา YEAR68 ที่ `/year68` ไม่มีการเขียน snapshot, XLSX หรือ Firebase

1. เลือกเลขานุการ ค้นหาโครงการ เปิดรายละเอียด กรอกยอด O/V/AJ ทิศทาง U และเหตุผล แล้วดูผลก่อนบันทึกและเสนอให้เหรัญญิกตรวจ ยอดชุดทดลองยังไม่เปลี่ยน
2. เลือกเหรัญญิก ดูยอดก่อน–หลังทุกช่องและเหตุผลในคำขอ แล้วอนุมัติ ยอดคำนวณและยอดรวมทั้งชุดเปลี่ยนพร้อมกัน
3. เหรัญญิกแก้ตรงได้ผ่านฟอร์มเดียวกัน ทุกการเสนอ บันทึก อนุมัติ และส่งกลับมีประวัติพร้อมยอดก่อน–หลังและผู้กระทำ
4. ถ้าโครงการเปลี่ยนระหว่างรอตรวจ คำขอเดิมอนุมัติไม่ได้ ให้ส่งกลับพร้อมเหตุผลและเสนอใหม่ การอนุมัติซ้ำถูกปฏิเสธ
5. เหรัญญิกกดล้างชุดทดลองพร้อมยืนยันได้ ล้างยอดทดลอง คำขอ และประวัติ แล้วเริ่มจากสำเนาเดิม รุ่นข้อมูลใหม่ป้องกันคำขอจากหน้าจอก่อนล้างหลุดเข้ามา

ใช้ version token แยกโครงการและตรวจผลสูตรก่อนอนุมัติ เซิร์ฟเวอร์คำนวณเอง ไม่รับค่าผลสูตรจาก client การตรวจและแทนที่ยอดทำพร้อมกันแบบ synchronous ใน process เดียว นี่ไม่ใช่ Firestore transaction และยังไม่ใช่หลักฐานรองรับการใช้งานหลายเซิร์ฟเวอร์

หากไม่ระบุ `--trial-directory` ข้อมูลอยู่เฉพาะหน่วยความจำและรีสตาร์ตแล้วเริ่มใหม่ หากระบุจะใช้การบันทึก/สำรองตามหัวข้อข้างบน ชุดนี้รองรับเงินและสถานะโดยคงร้อยละและเงื่อนไขเอกสารจากไฟล์ ไม่รันสถานะอัตโนมัติ ผู้ช่วยเห็นเฉพาะโครงการที่มอบหมายและแก้ได้เฉพาะสถานะที่อนุญาต บัญชีจริงยังไม่ได้เชื่อม

```sh
node --test tools/project-pilot/model.test.mjs tools/project-pilot/year68.test.mjs tools/project-pilot/finance.test.mjs tools/project-pilot/finance-trial.test.mjs
node tools/project-pilot/rehearse-finance-trial.mjs /path/to/private-preview/snapshot.json
node tools/project-pilot/finance-trial-browser-test.mjs /path/to/private-preview/snapshot.json
```

ผลตรวจ: 29 กลุ่มทดสอบผ่าน ซ้อมเสนอและอนุมัติพร้อมสูตรครบ 407 โครงการ ตรวจยอดรวม ประวัติ การล้างชุด และต้นฉบับไม่เปลี่ยน ทดสอบผ่าน Chrome ทั้งหน้าคอมและมือถือ

## หน้าตรวจข้อมูลปี 68 แบบอ่านอย่างเดียว

ผู้ใช้ยืนยันคอลัมน์ AI “ผู้สอบตรวจสอบเอกสาร” เป็นผู้ช่วยที่รับผิดชอบ และยืนยัน Z `-` หมายถึงไม่มีเอกสาร เตรียมสำเนา 407 โครงการโดยคงสถานะย้อนหลัง ไม่รัน automation และไม่ผูกชื่อกับบัญชีจริงจนตรวจ mapping แล้ว ยอดเงิน 8 คอลัมน์เก็บเป็นจำนวนเต็มสตางค์ พร้อมค่าต้นฉบับสำหรับตรวจสอบ

```sh
python3 -B tools/project-pilot/build_year68_snapshot.py /path/to/private-audit --source '/path/to/SUCU68 Project Status.xlsx'
node tools/project-pilot/server.mjs --year68-snapshot /path/to/private-preview/snapshot.json
node --test tools/project-pilot/model.test.mjs tools/project-pilot/year68.test.mjs
node tools/project-pilot/year68-browser-test.mjs /path/to/private-preview/snapshot.json
```

เปิด http://127.0.0.1:4186/year68 เลือกเหรัญญิกหรือเลขานุการทดลอง ค้นหาด้วยรหัส ชื่อโครงการ องค์กร หรือชื่อผู้ตรวจเอกสาร เปิดรายละเอียดเพื่อเทียบเงินและสถานะ ข้อมูลแบ่งหน้าละ 25 โครงการ API ปฏิเสธการเขียนและไม่ให้บัญชีผู้ช่วยทดลองอ่านข้อมูลจริงที่ยังไม่ได้ผูกบัญชี ข้อมูลจริงอยู่ในโฟลเดอร์ส่วนตัวนอก repository เท่านั้น

การตรวจสูตรครอบคลุมสูตรท้องถิ่นที่สร้างใหม่และยอดเงิน ไม่ครอบคลุมสูตรทั้งหมดใน workbook หรือความสดใหม่ของข้อมูลภายนอก ยังไม่มีการนำเข้าฐานข้อมูลจริง

### ทดลองคำนวณยอดที่เกี่ยวข้องบนเว็บ

สำเนาที่สร้างใหม่ด้วย `build_year68_snapshot.py` มีข้อมูลร้อยละยืมและเงื่อนไขสูตรสำหรับหน้า “ทดลองคำนวณยอด” ในรายละเอียดโครงการ เลือกเหรัญญิกหรือเลขานุการทดลอง แล้วกรอก O (อนุมัติ), V (โอน), U (เพิ่ม/ลด), AJ (ใช้จริง) เพื่อดูผลก่อน–หลังของเงินทั้ง 8 ช่อง ใช้สถานะและร้อยละเดิมของโครงการ ไม่บันทึกหรือส่งคำขออนุมัติ และไม่คำนวณอัตโนมัติเมื่อเพียงเปิดหน้า

สูตรบนเซิร์ฟเวอร์ใช้ BigInt หน่วยสตางค์และร้อยละแบบเศษส่วน ปัด HALF_UP โดยไม่คูณเงินด้วย floating point ช่องว่างยังแยกจากศูนย์และผลสูตรติดลบได้ ปฏิเสธการส่งช่องผลลัพธ์สูตร เช่น AE/BF จาก client ตรวจต้นทุนสูตรก่อนคำนวณว่าตรงกับสำเนา API มี session/role/Origin checks เช่นเดียวกับรุ่นทดลองเดิม

```sh
node --test tools/project-pilot/model.test.mjs tools/project-pilot/year68.test.mjs tools/project-pilot/finance.test.mjs
python3 -B tools/project-pilot/check_finance_parity.py /path/to/private-preview/snapshot.json
```

ตรวจเทียบ Python Decimal กับ JavaScript ครบ 407 โครงการ × 6 กรณี = 2,442 กรณี (ค่าเดิม, เพิ่มยอดอนุมัติหนึ่งสตางค์, เปลี่ยนใช้จริง, เพิ่ม/ลดโอน, ล้างใช้จริงและโอน) การเปลี่ยนข้อมูลเป็นการจำลองในคำขอเท่านั้น ยังไม่ได้เชื่อมสูตรนี้เข้ากับการบันทึก/อนุมัติใน model ข้อมูลจำลองสองโครงการ

ตัวกรอง “ตรวจโครงการแยกตามชื่อใน AI” จัดกลุ่มข้อความชื่อตามต้นฉบับ พร้อมจำนวนโครงการ และกรองแบบตรงชื่อร่วมกับคำค้นได้ ไม่รวมชื่อใกล้เคียงและไม่อนุมานว่าเป็นบุคคลเดียวกัน พบ 21 รายการชื่อใน 407 โครงการ ไม่มี AI ว่าง ผู้ใช้ยืนยันว่าปี 68 จบแล้วและใช้ทดลองเท่านั้น ไม่ต้องจับคู่บัญชีจริงหรือเปิดงานย้อนหลัง

ซ้อมขั้นตอนเงินด้วยสำเนาแต่ละโครงการในหน่วยความจำ แยก model ต่อโครงการ กำหนดผู้ช่วยจำลองอย่างชัดเจน ไม่มอบหมายบัญชีจริง ไม่รัน automation กับประวัติ และไม่สันนิษฐานว่าประวัติผู้แก้ว่าง (จึงล็อกการแก้สถานะโดยตรงของผู้ช่วยในชุดซ้อม):

```sh
node tools/project-pilot/rehearse-year68.mjs /path/to/private-preview/snapshot.json
```

ตรวจ 11 เงื่อนไขต่อโครงการ ได้แก่สถานะเดิม สิทธิ์ผู้ช่วย การเสนอ/อนุมัติแก้หนึ่งสตางค์ การแก้ตรง คำขอเก่า การอนุมัติซ้ำ การส่งกลับ และประวัติ ผลรายโครงการเก็บ temp ส่วนตัว สำเนาเดิมไม่เปลี่ยน การซ้อมนี้แก้เฉพาะ O ยังไม่คำนวณสูตรเงินที่พึ่งพากัน และไม่ใช่การทดสอบโหลด Firestore หรือ backup/restore ไม่มี route เว็บที่เปิดแก้สำเนาปี 68

เริ่มจากราก repository:

```sh
node tools/project-pilot/server.mjs
```

เปิด http://127.0.0.1:4186 แล้วลองตามลำดับ:

1. เลือกผู้ช่วย A: เห็นเฉพาะ DEMO-68-001 เปลี่ยนสถานะเอกสารได้ ไม่มีช่องแก้ยอด
2. เลือกเลขานุการ: เสนอยอดใหม่พร้อมเหตุผล ยอดอนุมัติปัจจุบันยังเท่าเดิม
3. เลือกเหรัญญิก: ตรวจยอดเดิม/ใหม่และเหตุผล แล้วอนุมัติหรือส่งกลับ
4. ลองเสนออีกครั้ง แล้วให้ผู้ช่วยเปลี่ยนสถานะก่อนอนุมัติ: ระบบต้องปฏิเสธคำขอที่อ้างอิงข้อมูลเก่า ให้ส่งกลับและเสนอใหม่
5. เหรัญญิกส่งออกข้อมูลทดลองรวมประวัติเป็น JSON ได้
6. เหรัญญิกแก้ยอดโดยตรงพร้อมเหตุผลและยืนยันได้ทันที ไม่ต้องผ่านเลขา; หากมีคำขอเลขาค้างอยู่ คำขอนั้นจะเก่าและต้องส่งกลับให้เสนอใหม่

ทดสอบ:

```sh
node --test tools/project-pilot/model.test.mjs
```

## ขอบเขตและข้อจำกัด

- ข้อมูลจำลองสองโครงการ ไม่ใช่ข้อมูลหรือสูตรที่นำเข้าจากไฟล์ปี 68
- เก็บข้อมูลในหน่วยความจำ รีสตาร์ตเซิร์ฟเวอร์แล้วเริ่มใหม่ ไม่มี daily backup/restore และไม่ใช่การทดสอบ RPO/RTO
- เลือกบัญชีได้เพื่อทดสอบเท่านั้น ไม่ใช่ระบบยืนยันตัวตนจริง ห้ามนำเซิร์ฟเวอร์นี้ขึ้น production หรือทำ public tunnel
- เซิร์ฟเวอร์ฟังเฉพาะ 127.0.0.1 ตรวจ Host/Origin และตรวจสิทธิ์จาก session ที่เซิร์ฟเวอร์ถือไว้ ทุก mutation มี field allowlist
- ไม่เรียก Firebase, Sheets หรือบริการภายนอก ไม่สร้างค่าใช้จ่ายคลาวด์จากการทดลองนี้
- ยอดเงินตัวอย่างคือยอดอนุมัติหนึ่งช่อง เก็บเป็นจำนวนเต็มหน่วยสตางค์ ยังไม่ครอบคลุมยอดโอน/ยืม/คืนและสูตรทั้งหมด
- เลขาเสนอ เหรัญญิกตรวจ หรือเหรัญญิกแก้ยอดโดยตรงได้พร้อมเหตุผลและประวัติ
- สถานะอ้างอิงคู่มือเดิม `docs/project-status-manual.md` หัวข้อ 4.1–4.5 และตรวจเทียบ validation ทั้ง 57 ตัวเลือกกับไฟล์แนบปี 68 แล้ว: H อนุมัติโครงการ, Q โอนงบ, Y ยืมรองจ่าย, AZ ปิดโครงการ, BA ฎีกา แยกเก็บและแสดงทั้ง 5 ช่อง ช่อง BJ/BK เป็นค่าที่สูตรคัดลอก ไม่เพิ่มช่องแก้ซ้ำ
- สิทธิ์ตามตารางผู้ใช้: เหรัญญิกได้ทุกสถานะ; เลขาเปลี่ยนตรง Q1–Q5/Y1–Y8, เสนอรอตรวจ H1–H14/Q6–Q13/Y11, อื่น ๆ ห้าม; ผู้ช่วยเปลี่ยนตรง Q1–Q4/Y1–Y3/AZ1–AZ4/AZ7–AZ8 เฉพาะโครงการตัวเองและยังไม่มีผู้แก้อื่นในประวัติช่องนั้น, AZ12 เสนอรอตรวจได้, อื่น ๆ ห้าม
- “ยังไม่มีใครแก้นอกจากตัวเอง” ตีความแยกตามช่องสถานะของโครงการ ใช้ประวัติผู้แก้ทั้งหมด ไม่ใช่แค่คนล่าสุด ระบบตั้งค่าเริ่มต้นไม่นับเป็นคนแก้ ส่วนการอนุมัตินับเป็นเหรัญญิกแก้ และการเปลี่ยนอัตโนมัตินับเป็นระบบแก้ (ล็อกผู้ช่วยในช่องนั้นด้วย)
- คำขอสถานะยังไม่เปลี่ยนข้อมูลจริงจนเหรัญญิกอนุมัติ มีเหตุผล ยอด/สถานะเดิม–ใหม่ ประวัติ และ version check เช่นเดียวกับคำขอแก้ยอด; เลขาไม่มีสิทธิ์ AZ/BA ทุกสถานะ
- ค่าเริ่มต้น Y1, AZ1, BA1 ตามผู้ใช้; H/Q ว่างก่อนเข้าเกณฑ์ กรณี BA1 เป็นค่าเริ่มต้นของข้อมูลจำลอง ไม่ใช่หลักฐานว่ามีการรับเงินจริง
- กฎอัตโนมัติอ้างอิง `app.sorting-auth.js` getAdvanceCheckMeta/getTransferCheckMeta และเกณฑ์ remainingDays < 0 ในตารางหน้าภาพรวม: Q1 เมื่อ Q ว่างและเลย AK (AW < 0); Y8 เมื่อ Y เป็น Y1 และเลย M ลบ 8 วัน ไม่เปลี่ยนรายการแค่ใกล้กำหนดหรือครบกำหนดวันนี้
- รุ่นทดลองใช้วันที่ M/AK ที่เหรัญญิกกำหนดในฟอร์มจำลอง ไม่คำนวณสูตร AK จาก M ให้เอง และไม่อ่านชีตสด ตรวจตามวัน Asia/Bangkok ทุก 60 วินาทีระหว่างเซิร์ฟเวอร์ทำงาน รวมถึงก่อนอ่าน/บันทึกข้อมูล มีประวัติระบบและไม่เขียนซ้ำถ้าสถานะไม่เข้าเงื่อนไขแล้ว
- เฉพาะข้อมูลจำลองสองโครงการที่ `/`: สถานะยังไม่เชื่อมสูตรเงิน ส่วนชุด `/year68-trial` เชื่อมสถานะกับสูตรเงินตามหัวข้อด้านบนแล้ว
- มี version check ทั้งตอนแก้และอนุมัติ; การทำงานในหน่วยความจำเป็น synchronous สำหรับ local single-process demo เท่านั้น
- ฝั่ง production ต้องใช้ authentication จริง สิทธิ์ที่ฐานข้อมูล/ธุรกรรมแบบ atomic และประวัติที่ป้องกันการแก้ย้อนหลัง
- อยู่ใต้ tools/ ซึ่ง static build เดิมไม่คัดลอกไป dist จึงไม่เพิ่มหน้าทดลองหรือบัญชีทดลองบนเว็บจริง

## เกณฑ์ก่อนใช้งานจริง

อ่านตรวจไฟล์โดยไม่แก้ต้นฉบับ (Python standard library ไม่ต้องติดตั้ง package):

```sh
python3 tools/project-pilot/inspect_workbook.py '/path/to/SUCU68 Project Status.xlsx'
```

ผลตรวจและข้อมูลที่ดึงออกเก็บใน temp directory ส่วนตัวนอก repository (directory 0700, files 0600) ตรวจ SHA-256 ต้นฉบับก่อน/หลัง โปรแกรมอ่าน formula และ cached values แต่ไม่คำนวณสูตรหรือโหลดข้อมูลภายนอก ผลตรวจล่าสุดมี 407 โครงการ รหัสไม่ซ้ำ รายละเอียดเกณฑ์และประเด็นที่ยังต้องตรวจอยู่ใน import-plan.json ยังไม่ได้นำข้อมูลจริงมาแทนข้อมูลจำลองของเซิร์ฟเวอร์

เตรียมยอดทุกประเภทเป็น 2 ตำแหน่งตามผู้ใช้ โดยใช้ Decimal ROUND_HALF_UP ต่อช่อง เก็บต้นฉบับเทียบและจำนวนเต็มสตางค์ไว้ ไม่แทนช่องว่างด้วยศูนย์ ไม่ห้ามยอดติดลบของรายการคืน/เบิก และยังไม่คำนวณสูตรใหม่:

```sh
python3 -B tools/project-pilot/test_normalize_money.py
python3 -B tools/project-pilot/normalize_money.py /path/to/private-audit/project-records.json
```

ผลลัพธ์ candidate และรายงานผลต่างอยู่ใน temp directory ส่วนตัวชุดใหม่ ยังต้องแปลงและตรวจสูตรให้ตรงหลังปัดค่าตั้งต้นก่อนใช้งานจริง การรวมค่าที่ปัดรายแถวอาจต่างจากการปัดยอดรวมครั้งเดียว

ตรวจสูตรเงินหลักและร้อยละที่พึ่งพากัน โดยตรวจ signature สูตรจริง 11 ชุดก่อนคำนวณ และตรวจสูตรบวกเลขตั้งต้นด้วย AST ที่อนุญาตเฉพาะ literal arithmetic ไม่ execute สูตรหรือโค้ดจากไฟล์:

```sh
python3 -B tools/project-pilot/test_reconcile_formulas.py
python3 -B tools/project-pilot/reconcile_formulas.py /path/to/private-audit --source '/path/to/SUCU68 Project Status.xlsx'
```

ผลตรวจ 407 โครงการ / 4,477 การเปรียบเทียบ: สูตรตามตัวอักษรต่างจากค่าบันทึก 183 ช่อง (AD/AE/BT ใน 61 โครงการ) เพราะ Z เป็น `-` แต่สูตรตรวจว่าไม่ว่าง เมื่อทดสอบสมมติฐาน `-` = ไม่มีเอกสาร ผลสูตรท้องถิ่นและผลเงินที่ปัด 2 ตำแหน่งตรงทั้งหมด สมมติฐานนี้ยังไม่ถูกนำไปแก้สูตร/ข้อมูลจริง และยังไม่ยืนยันข้อมูลจาก external sources สด รายงาน HTML/JSON และรายละเอียดรายแถวอยู่เฉพาะ temp directory ส่วนตัว

ตรวจ mapping/สูตรและ reconcile ยอดทุกโครงการจากสำเนาไฟล์ปี 68; กำหนดสถานะที่อนุญาต; ทดสอบ Firestore rules และ transactions ด้วย Emulator; ประเมินโหลดปกติ/วันตัดงบและค่า backup; ทดลองกู้คืนภายในหนึ่งวัน จากนั้นจึงพิจารณาย้ายข้อมูลจริง

งบเป้าหมาย 0–35 บาท/เดือน ยอมรับสูงสุด 70 บาท/เดือน เป็นความต้องการ ไม่ใช่เพดานอัตโนมัติที่รุ่นนี้ตั้งค่าให้แล้ว
