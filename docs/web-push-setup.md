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
npx firebase deploy --only functions,hosting
```

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
