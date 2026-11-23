# Operations Monitoring

คู่มือนี้ใช้ตั้งค่า monitoring และ budget alert สำหรับ Firebase/Google Cloud ของ Treasurer SGCU

## Scope

Firebase project ปัจจุบัน:

```text
departmentwebsite-5aec1
```

ระบบนี้เป็น static web app ที่ workflow เผยแพร่ผ่าน GitHub Pages และใช้ Firestore, Auth, Analytics, Cloud Functions และ private Cloud Storage; มี Firebase Hosting config สำหรับ Push rewrites แยกอยู่ใน repository ความเสี่ยงค่าใช้จ่ายหลักอยู่ที่ Firestore document reads/writes และ storage/indexes

## Budget Alert Setup

ตั้งใน Google Cloud Console:

1. เปิด Google Cloud Console
2. เลือก project `departmentwebsite-5aec1`
3. ไปที่ Billing
4. เปิด Budgets & alerts
5. สร้าง budget ใหม่สำหรับ project นี้
6. ตั้ง budget รายเดือนตามวงเงินที่ทีมรับได้
7. ตั้ง alert threshold อย่างน้อย:
   - 50%: แจ้งเตือนเร็ว
   - 80%: เริ่มตรวจ usage
   - 100%: ต้องหยุด deploy/feature ที่เพิ่ม read จนกว่าจะตรวจ
8. ใส่อีเมล Head Staff และอีเมลกลางของทีมเหรัญญิกเป็น recipients

ถ้า budget alert ส่งไปแค่ billing admin ให้เพิ่ม email forwarding หรือ Google Group ของทีม เพื่อไม่ให้ alert ติดอยู่กับบัญชีคนเดียว

## Firestore Usage Review

ตรวจอย่างน้อยเดือนละครั้งใน Firebase Console:

1. เปิด Firebase Console
2. เลือก project `departmentwebsite-5aec1`
3. ไปที่ Firestore Database
4. ดู Usage tab
5. ตรวจแนวโน้ม:
   - document reads ต่อวัน
   - document writes ต่อวัน
   - storage size
   - index storage

สัญญาณที่ต้องตรวจทันที:

- reads เพิ่มขึ้นผิดปกติหลัง deploy
- หน้า staff เปิดครั้งเดียวแล้ว reads สูงหลายพัน
- storage/index โตต่อเนื่องทั้งที่ไม่มี workflow ใหม่
- มี error ให้สร้าง Firestore index ใน browser console

## Collection Watchlist

คอลเลกชันที่ควรจับตาก่อน:

| Collection | เหตุผล | แนวทางดูแล |
| --- | --- | --- |
| `meetingRoomBookings` | โตตามเวลาและ public อ่านได้ | จำกัดช่วงวันที่, archive ข้อมูลเก่า |
| `borrowAssetRequests` | มีทั้งคิวปัจจุบันและประวัติ | แยก active/history query, export ประวัติรายปี |
| `budgetApprovalRequests` | ข้อมูลการเงินสำคัญ | เคลียร์/backup รายปีตาม workflow |
| `auditLogs` | โตจากทุก workflow | เก็บตาม retention policy |
| `organizationRepresentativeApplications` | ใช้กับสิทธิ์องค์กร | ตรวจ query และสิทธิ์ staff |

## Monthly Checklist

1. ดู billing current month ว่าไม่เกิน threshold
2. ดู Firestore reads/writes/storage เทียบเดือนก่อน
3. เปิดหน้า workflow หลักและดู console error:
   - คำของบประมาณ
   - ยืมพัสดุ
   - จองห้องประชุม
   - Staff approval
   - อนุมัติตัวแทนองค์กร
4. Export/backup collection สำคัญถ้ามีการเปลี่ยนรุ่นหรือก่อนลบข้อมูลเก่า
5. บันทึก incident หรือ usage spike ในเอกสารส่งต่อรุ่น

## Incident Response

ถ้าได้รับ budget alert หรือพบ usage spike:

1. หยุด deploy feature ใหม่ชั่วคราว
2. เช็ก deploy ล่าสุดว่ามีการเพิ่ม `onSnapshot`, `getDocs`, หรือ query ที่อ่านทั้ง collection หรือไม่
3. เปิด Firebase Usage เพื่อตรวจช่วงเวลาที่ reads/writes พุ่ง
4. ตรวจ browser console ของหน้าที่เพิ่งแก้
5. ถ้าเกิดจาก query อ่านกว้าง ให้จำกัดด้วย `where`, `limit`, หรือโหลดเมื่อเปิด tab เท่านั้น
6. ถ้าเกิดจากข้อมูลเก่าสะสม ให้ export แล้ว archive/ลบตาม policy

## Retention Recommendation

คำแนะนำเริ่มต้น:

- `budgetApprovalRequests`: backup แล้วเคลียร์รายปี ถ้า workflow ทีมทำแบบนี้อยู่แล้ว
- `meetingRoomBookings`: เก็บ active/current year ในระบบหลัก, export ข้อมูลเก่ารายปี
- `borrowAssetRequests`: เก็บ active ในระบบหลัก, export history รายปีหรือรายเทอม
- `auditLogs`: เก็บ 1-2 ปี ถ้าไม่มีข้อกำหนดอื่น

ก่อนลบข้อมูล production ให้ export collection และยืนยันกับ Head Staff ทุกครั้ง


## Abuse protection — source state 2026-11-23

ยังไม่ได้ตรวจหรือเปลี่ยน configuration บน production ในงานนี้

| ระบบ | สิ่งที่โค้ดบังคับ | ข้อจำกัด |
| --- | --- | --- |
| Push HTTP | ID token พร้อมตรวจ revocation; POST; body ไม่เกิน 8 KiB; โควตา transaction ต่อ UID/action | คำขอที่ถูกปฏิเสธยังมีค่า invocation/read; หลายบัญชีแยกโควตากัน |
| อุปกรณ์ | สูงสุด 10 subscription ต่อ UID; lock ป้องกันสมัครพร้อมกัน; ไม่เขียนทับเจ้าของ endpoint | รายการเก่าที่เกิน 10 ไม่ถูกลบอัตโนมัติ; ต้องตรวจและยกเลิกอุปกรณ์เก่า |
| Push delivery | ตรวจ allowlist HTTPS ทุกครั้งก่อนส่ง รวมข้อมูลเก่า; timeout 10 วินาที | ผู้ให้บริการนอก allowlist ต้องผ่านการทบทวนก่อนเพิ่ม |
| Visitor Rules | เพิ่มครั้งละ 1, เริ่มที่ 1, server timestamp, เฉพาะ bucket วันที่กรุงเทพฯ ปัจจุบัน, unique marker แบบ atomic | ไม่ใช่ rate limit ต่อบุคคล; ผู้โจมตีสร้าง browser ID ใหม่หรือเพิ่มตัวนับวันนี้ซ้ำได้ |
| App Check | รองรับ reCAPTCHA Enterprise บน client และตรวจ token ใน Push API แบบเปิดด้วย parameter | ยังต้องลงทะเบียน site key และเปิด enforcement ใน Console; ไม่แทน authentication หรือ quota |

Budget alerts ไม่ใช่ hard spending cap และ maxInstances ไม่ใช่เพดานค่าใช้จ่ายรวม เฝ้าดู 429, Functions invocation, Firestore rejected requests/reads/writes และการเติบโตของ unique browser markers ร่วมกัน

### เปิด App Check อย่างเป็นขั้นตอน

1. ลงทะเบียนเว็บและโดเมนที่ใช้งานจริงใน Firebase App Check/reCAPTCHA Enterprise แล้วใส่ public site key ที่ `SGCU_APP_CONFIG.appCheck.siteKey` (ห้ามใส่ secret/debug token)
2. เผยแพร่ client ก่อน ทดสอบการเข้าสู่ระบบ หน้าอ่านข้อมูล เขียนคำขอ สถิติ Push คำร้องขอสิทธิ์เข้าระบบ (Firebase app แยก) และ `meeting-room-calendar.html` บนเบราว์เซอร์/อุปกรณ์จริง
3. ตรวจ metrics ของ App Check ให้แน่ใจว่าคำขอจากผู้ใช้จริงมี token ก่อนเปิด enforcement ของ Firestore ซึ่งกระทบทุก collection ไม่ใช่เฉพาะสถิติ
4. ตั้ง `PUSH_ENFORCE_APP_CHECK=true` ใน parameters ของ Functions และ deploy เฉพาะ Push HTTP functions เพื่อบังคับตรวจ custom backend
5. ตรวจบัญชี/เบราว์เซอร์ที่เปิดแท็บเวอร์ชันเก่า พร้อมแนะนำรีโหลด หากเกิดการปฏิเสธผู้ใช้จริง ให้ปิด enforcement ที่ Console และย้อน parameter Push เป็น false แล้ว deploy กลับ โดยไม่ต้องลบข้อมูล

อ้างอิง: [Firebase App Check](https://firebase.google.com/docs/app-check), [เปิด enforcement](https://firebase.google.com/docs/app-check/enable-enforcement), [ตรวจ token ที่ custom backend](https://firebase.google.com/docs/app-check/custom-resource-backend)

### สำรองและซ้อมกู้คืน

- งาน `projectLiveBackup` สำรองเฉพาะระบบโครงการ ไม่ครอบคลุมคำของบ/ยืมพัสดุ/จองห้องหรือทุก collection ของเว็บ
- ตรวจ `projectBackupStatus/2568`: verified, failed, datasetId และ backupAt ต้องตรง active dataset และรอบปัจจุบัน อย่าใช้บันทึกความสำเร็จเก่าแทนการตรวจรอบล่าสุด
- เก็บสำเนาที่ตรวจ checksum แล้วนอกบัญชีผู้ดูแลชุดเดียวกันตามนโยบายทีม; ห้ามนำ backup ใส่ `web/`, `dist/` หรือ Git
- ซ้อม restore ในสภาพแวดล้อมแยก ตรวจจำนวนรายการ ยอดรวม ประวัติ และสิทธิ์ก่อนอนุมัติการกู้ production; ดูรูปแบบ v1/v2 ใน `project-live-web.md`
- Quota และ device-lock documents มีจำนวนคงที่ต่อบัญชี แต่ยังสะสมตามจำนวนบัญชี ให้ล้างเฉพาะบัญชีที่เลิกใช้ตามนโยบาย; อย่าลบ lock ของบัญชีที่ยังมีการสมัครพร้อมกัน
