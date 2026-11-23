# Web Push setup and test

ขั้นนี้เปิดระบบสมัครอุปกรณ์ ยกเลิกอุปกรณ์ และส่งข้อความทดสอบจาก Firebase Functions
โดย endpoint ทุกตัวที่แก้ไขข้อมูลต้องได้รับ Firebase ID token ของผู้ใช้

## 1. ทดสอบโค้ดก่อน deploy

```bash
npm run test:push
npm run build
npm run check
```

## 2. สร้าง VAPID key

รันคำสั่งด้านล่างบนเครื่องผู้ดูแล และเก็บค่า private key เป็นความลับ

```bash
npx web-push generate-vapid-keys
```

ตั้งค่าพารามิเตอร์ public key และอีเมลผู้ดูแลใน `functions/.env.departmentwebsite-5aec1`

```dotenv
WEB_PUSH_VAPID_PUBLIC_KEY=ใส่ค่า_Public_Key
WEB_PUSH_VAPID_SUBJECT=mailto:อีเมลผู้ดูแล
```

ห้ามบันทึก private key ลงไฟล์หรือ commit เข้า Git ให้บันทึกด้วย Secret Manager:

```bash
npx firebase functions:secrets:set WEB_PUSH_VAPID_PRIVATE_KEY
```

เมื่อ CLI ถามค่า secret ให้วาง Private Key ที่ได้จากขั้นตอนสร้าง VAPID key

## 3. Deploy

Firebase Functions และ Cloud Secret Manager ต้องใช้โปรเจกต์ที่เปิด billing ตามข้อกำหนดของ Firebase

```bash
npx firebase deploy --only functions:pushConfig,functions:subscribePush,functions:unsubscribePush,functions:testPush,functions:dispatchMeetingPush,functions:sendMeetingReminders --project departmentwebsite-5aec1
```

เว็บหลักเผยแพร่ผ่าน GitHub Pages ตาม workflow ของ repository; ถ้าใช้งาน URL `/api/push/*` บน Firebase Hosting ต้อง deploy Hosting แยกโดยตรวจ target ก่อน GitHub Pages ไม่ใช้ rewrites จาก `firebase.json` ส่วน Project API/backup ไม่จำเป็นต้อง deploy สำหรับการแก้ Push นี้

## 4. ทดสอบบนอุปกรณ์จริง

1. เปิดเว็บไซต์ production และเข้าสู่ระบบ
2. ไปหน้าบัญชี/เข้าสู่ระบบ แล้วกด `เชื่อมต่ออุปกรณ์นี้`
3. อนุญาต Notification เมื่อเบราว์เซอร์ถาม
4. ตรวจว่าแสดงข้อความ `เชื่อมต่ออุปกรณ์แล้ว`
5. กด `ส่งแจ้งเตือนทดสอบ`
6. ปิดแท็บเว็บไซต์ แล้วกดทดสอบอีกครั้งจากอุปกรณ์อีกเครื่องที่เข้าสู่บัญชีเดียวกัน หรือเรียก endpoint หลังยืนยันตัวตน

บน iPhone/iPad ต้องเพิ่มเว็บไซต์ลง Home Screen ก่อน จากนั้นเปิดผ่านไอคอน Home Screen
แล้วจึงกดเชื่อมต่ออุปกรณ์

## ข้อมูลที่จัดเก็บ

Firestore collection `pushSubscriptions` เก็บ subscription แยกตามอุปกรณ์ โดยใช้ SHA-256
ของ endpoint เป็น document ID พร้อม `uid`, email, user agent และเวลาแก้ไข ข้อมูล collection นี้
ไม่เปิดให้อ่านหรือเขียนโดยตรงจากหน้าเว็บ การเข้าถึงทำผ่าน Firebase Admin SDK ใน Functions เท่านั้น


## โควตาและความปลอดภัย

ค่าตั้งต้นใน `functions/push-limits.js` ต่อบัญชีในหน้าต่าง 60 วินาที:

| คำสั่ง | จำนวนสูงสุด |
| --- | --- |
| subscribe | 10 |
| unsubscribe | 20 |
| test | 3 |
| meeting event | 30 |

เมื่อเกินคืน HTTP 429 พร้อม `Retry-After`; ไม่ retry อัตโนมัติแบบวนไม่สิ้นสุด คำขอที่ยืนยันตัวตนแล้วแต่ข้อมูลไม่ถูกต้องก็นับโควตา อุปกรณ์สูงสุด 10 รายการต่อ UID และคืน 409 เมื่อเต็มหรือ endpoint เป็นของบัญชีอื่น หากสลับบัญชีบนเครื่องเดียวกัน ต้องยกเลิกอุปกรณ์จากบัญชีเดิมก่อนเชื่อมบัญชีใหม่

Endpoint ยอมรับเฉพาะ HTTPS พอร์ตปกติ ไม่มี user/password/fragment บน `fcm.googleapis.com`, `updates.push.services.mozilla.com`, `updates.push.services.mozilla.net`, `web.push.apple.com` และ subdomain ของ `push.apple.com` ทั้งตอนสมัครและก่อนส่งจริง ผู้ใช้ผู้ให้บริการอื่นจะถูกปฏิเสธจนกว่าจะทบทวน allowlist; ข้อมูลเก่าไม่ได้รับข้อยกเว้น

การส่งถึงผู้รับอ่านเฉพาะ subscription ของอีเมลนั้น สูงสุด 10 รายการ ไม่ scan subscription ทั้งระบบ การแจ้งเหตุการณ์ห้องประชุมใช้ version/status จากฐานข้อมูลเป็นกุญแจกันซ้ำ ไม่ใช้ previousStatus ที่ client ส่งมาเป็นส่วนของกุญแจ การ claim event ยังเกิดก่อนส่ง: หากส่งล้มเหลวหลัง claim อาจไม่ส่งซ้ำ จึงไม่ใช่ระบบรับประกันการส่งถึง

`pushRateLimits` และ `pushDeviceLocks` ใช้ Admin SDK เท่านั้น และถูกปิดด้วย default-deny Firestore Rules ไม่มีการลบอุปกรณ์หรือข้อมูล production อัตโนมัติในการอัปเกรดนี้

## ทดสอบการแข่งกันเขียนบน Emulator

```sh
firebase emulators:exec --only firestore --project demo-budget-meeting --config firebase.budget-meeting-emulator.json 'node tools/tests/test-visitor-rules.mjs && node --test functions/test/push-limits.test.js'
```

ชุดทดสอบ quota ตรวจคำขอพร้อมกัน โควตาแยกบัญชี การสมัครพร้อมกันเมื่อใกล้เต็ม การต่ออายุ และการห้ามยึด endpoint ของบัญชีอื่น คำสั่ง `npm run test:push` อย่างเดียวจะข้ามส่วน Emulator ถ้าไม่มี `FIRESTORE_EMULATOR_HOST`

App Check ค่าเริ่มต้นยังไม่ enforce จนกว่า client/site key จะพร้อม ดู rollout ใน [Operations Monitoring](operations-monitoring.md) ต้องเผยแพร่ client, Functions และ Rules จึงครบทั้งสามส่วน อย่าเปิด enforcement ของ Firestore ก่อน client ส่ง token ได้
