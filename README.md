# RunSphere (ต้นแบบ / prototype)

เว็บแอปส่งเสริมสุขภาพสำหรับนักเรียน **โรงเรียนสาธิตมหาวิทยาลัยขอนแก่น (มอดินแดง)**
ผู้เล่นเดินไปยังจุดที่สุ่มบนแผนที่ภายในโรงเรียน → ถึงจุดได้เหรียญ → นำเหรียญไปซื้ออาหารเลี้ยงสัตว์เลี้ยงในแอป

> ⚠️ นี่คือ **ต้นแบบเพื่อการทดลอง** — พิกัดขอบเขตโรงเรียนและจุดภารกิจใน `src/config/game.ts`
> เป็น **ค่าประมาณ / placeholder** ต้องตรวจสอบและแก้ให้ตรงกับสถานที่จริงก่อนใช้งาน (ดู [แก้พิกัดและรายการจุด](#6-แก้พิกัดและรายการจุด))

---

## สารบัญ

1. [ฟีเจอร์](#ฟีเจอร์)
2. [Tech stack](#tech-stack)
3. [ทดลองรันในเครื่อง (เร็วที่สุด: ใช้ Firebase Emulator)](#ทดลองรันในเครื่อง-เร็วที่สุด-ใช้-firebase-emulator)
4. [1. สร้าง Firebase project](#1-สร้าง-firebase-project)
5. [2. สร้างและจำกัด Google Maps API key](#2-สร้างและจำกัด-google-maps-api-key)
6. [3. Environment variables](#3-environment-variables)
7. [4. Deploy ขึ้น Vercel](#4-deploy-ขึ้น-vercel)
8. [5. ตั้ง Authorized domains ใน Firebase](#5-ตั้ง-authorized-domains-ใน-firebase)
9. [6. แก้พิกัดและรายการจุด](#6-แก้พิกัดและรายการจุด)
10. [7. ปรับกติกาเกม](#7-ปรับกติกาเกม)
11. [8. Mock GPS (ทดสอบบนคอมพิวเตอร์)](#8-mock-gps-ทดสอบบนคอมพิวเตอร์)
12. [9. ทดสอบ](#9-ทดสอบ)
13. [สถาปัตยกรรม](#สถาปัตยกรรม)
14. [ข้อจำกัดที่รู้อยู่](#ข้อจำกัดที่รู้อยู่)

---

## ฟีเจอร์

- **ล็อกอินด้วยอีเมล + รหัสผ่าน** (Firebase Auth): สมัคร / เข้าสู่ระบบ / ลืมรหัสผ่าน, รหัสผ่านขั้นต่ำ 8 ตัว, error ภาษาไทย
  ขอแค่อีเมล รหัสผ่าน และ **ชื่อเล่น** (ไม่ต้องใช้ชื่อจริง) · การยืนยันอีเมลเป็น feature flag (ปิดเป็นค่าเริ่มต้น)
- **แผนที่ Google แบบ hybrid** (ดาวเทียม + ชื่อสถานที่) จำกัดให้เลื่อนได้เฉพาะรอบโรงเรียน โหลดครั้งเดียวต่อ session ไม่ remount เมื่อสลับหน้า
  ถ้ายังไม่มี key หรือ key ใช้ไม่ได้ จะใช้ **แผนที่จำลอง (SVG)** แทนอัตโนมัติ
- **Geofence**: เริ่มเกมได้เฉพาะในโรงเรียน
- **ภารกิจจุดสุ่ม** จากรายการที่เตรียมไว้ ห่าง 50–300 ม. ไม่ซ้ำจุดก่อนหน้า ครั้งละ 1 ภารกิจ แสดงระยะ ทิศทาง และลูกศร
- **ตรวจการถึงจุดที่ server เท่านั้น**: รัศมี 28 ม., accuracy ≤ 40 ม., ต้องอ่านในรัศมีติดกัน 3 ครั้ง
- **กันโกงเบื้องต้น**: ตรวจ accuracy, ความเร็ว (จับ teleport), timestamp (กันค่าเก่า/ส่งซ้ำ), เวลาเดินขั้นต่ำ, rate limit
- **เหรียญ + สัตว์เลี้ยง**: เหรียญตามระยะทาง/ความยาก, ความอิ่ม/ความสุขลดตามเวลา (ไม่ตาย ไม่หาย), เลเวล, อนิเมชันตอนกิน
- **สุขภาพ**: ระยะทางสะสม, จำนวนจุด, สถิติรายวัน/สัปดาห์, คำเตือนความปลอดภัยก่อนเล่น, daily cap, เตือนพักดื่มน้ำ, ช่วงเวลาเล่น (ปิดเป็นค่าเริ่มต้น)
- **ความเป็นส่วนตัว**: ไม่เก็บเส้นทางเดิน, หน้าอธิบายการใช้ตำแหน่ง (`/privacy`), ปุ่มลบบัญชี
- **PWA**: ติดตั้งลงหน้าจอโฮมได้ มีหน้าออฟไลน์
- **Mock GPS** (dev mode) จำลองการเดิน, วาร์ป, accuracy แย่, ปฏิเสธสิทธิ์

## Tech stack

| ส่วน | ใช้ |
| --- | --- |
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind CSS 4, mobile-first, PWA |
| Map | Google Maps JavaScript API ผ่าน `@vis.gl/react-google-maps` (mapTypeId `hybrid`) |
| Backend | Next.js Route Handlers (`src/app/api/*`) + Firebase Admin SDK |
| Database/Auth | Firestore + Firebase Authentication (Email/Password) |
| Hosting | Vercel |
| Test | Vitest (unit), สคริปต์ E2E กับ Firebase Emulator |

ต้องใช้ **Node.js 20 ขึ้นไป** (ทดสอบกับ Node 22)

---

## ทดลองรันในเครื่อง (เร็วที่สุด: ใช้ Firebase Emulator)

ไม่ต้องสร้างโปรเจกต์ Firebase จริงก่อน — ต้องมี **Java 11+** (สำหรับ Firestore Emulator)

```bash
npm install

# เทอร์มินัล 1: รัน Firebase Emulator (Auth + Firestore)
npm run emulators

# เทอร์มินัล 2: สร้าง .env.local สำหรับ emulator แล้วรันแอป
cat > .env.local <<'EOF'
NEXT_PUBLIC_FIREBASE_API_KEY=demo-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=demo-runsphere.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-runsphere
NEXT_PUBLIC_FIREBASE_APP_ID=demo-app
FIREBASE_PROJECT_ID=demo-runsphere
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
EOF
npm run dev
```

เปิด http://localhost:3000 → สมัคร → กด "เข้าใจแล้ว" → เปิด **🧪 Mock GPS** มุมขวาบน → "สุ่มจุดภารกิจ" → "เดินไปที่จุด"

ถ้าไม่ใส่ `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` จะเห็นแผนที่จำลอง (ไม่เสียเงิน) ซึ่งพอสำหรับพัฒนา

---

## 1. สร้าง Firebase project

1. ไปที่ <https://console.firebase.google.com> → **Add project** (ปิด Google Analytics ได้)
2. **Authentication** → Get started → แท็บ **Sign-in method** → เปิด **Email/Password** (ไม่ต้องเปิด Email link)
   - ไม่ต้องเปิด Google หรือ Anonymous
   - (แนะนำ) แท็บ **Templates** → เปลี่ยนภาษาอีเมลเป็นไทย และแก้ชื่อผู้ส่ง
3. **Firestore Database** → Create database → เลือก location **asia-southeast1 (Singapore)** → เริ่มแบบ **production mode**
4. **Deploy Security Rules** จากไฟล์ `firestore.rules` ใน repo:
   ```bash
   npx -y firebase-tools@15.36.0 login
   npx -y firebase-tools@15.36.0 deploy --only firestore:rules --project <your-project-id>
   ```
   หรือคัดลอกเนื้อหา `firestore.rules` ไปวางในแท็บ **Rules** ของ Firestore แล้วกด Publish
5. **Web app config** (ค่า public): Project settings (⚙️) → General → Your apps → **Add app → Web** →
   คัดลอก `apiKey`, `authDomain`, `projectId`, `appId` ไปใส่ `NEXT_PUBLIC_FIREBASE_*`
6. **Service account** (ค่า secret สำหรับ server): Project settings → **Service accounts** → **Generate new private key**
   → ได้ไฟล์ JSON นำ `project_id`, `client_email`, `private_key` ไปใส่ `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
   - ⚠️ **ห้าม commit ไฟล์ JSON นี้หรือ `.env.local` ลง git** (`.gitignore` กันไว้แล้ว) เก็บไว้ที่ปลอดภัย ลบไฟล์ทิ้งหลังใส่ใน Vercel

> หมายเหตุ: Firebase แผน Spark (ฟรี) ใช้ได้กับต้นแบบนี้ ไม่ต้องอัปเกรดเป็น Blaze

## 2. สร้างและจำกัด Google Maps API key

> ⚠️ **Google Cloud ต้องผูกบัตรเครดิต (billing account)** จึงจะใช้ Maps JavaScript API ได้ แม้การใช้งานจะอยู่ในโควตาฟรีรายเดือนก็ตาม
> แอปนี้ใช้ **เฉพาะ Maps JavaScript API** (ไม่ใช้ Places / Directions / Geocoding — คำนวณระยะ/ทิศเองด้วย haversine)

1. <https://console.cloud.google.com> → เลือก/สร้างโปรเจกต์ (ใช้โปรเจกต์เดียวกับ Firebase ได้) → **Billing** → ผูก billing account
2. **APIs & Services → Library** → เปิด **Maps JavaScript API** อย่างเดียว
3. **APIs & Services → Credentials** → **Create credentials → API key** → แก้ไข key:
   - **Application restrictions → Websites (HTTP referrers)** ใส่:
     ```
     https://<your-app>.vercel.app/*
     https://<your-app>-*.vercel.app/*        (preview deployments — ถ้าต้องการ)
     https://<your-custom-domain>/*            (ถ้ามี)
     http://localhost:3000/*
     ```
   - **API restrictions → Restrict key** → เลือก **Maps JavaScript API** เท่านั้น
4. **ตั้ง budget alert**: Billing → **Budgets & alerts** → Create budget → ตั้งงบ เช่น 5–10 USD/เดือน → แจ้งเตือนที่ 50% / 90% / 100%
   (budget alert แค่ "แจ้งเตือน" ไม่ได้หยุดการใช้งาน)
5. **ตั้ง daily quota cap** (หยุดจริงเมื่อเกิน): APIs & Services → **Maps JavaScript API → Quotas & System Limits** →
   แก้ **Map loads per day** ให้ต่ำ เช่น 500–1,000 ต่อวัน (นักเรียน 1 คนเปิดแอป 1 ครั้ง ≈ 1 map load เพราะแอปไม่ remount แผนที่)
6. (ไม่บังคับ) **Map ID**: Google Maps Platform → Map management → Create Map ID (JavaScript, Raster) →
   ใส่ใน `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` ถ้าไม่ใส่จะใช้ `DEMO_MAP_ID` (ใช้ได้ระหว่างทดลอง)

ถ้า key ใช้ไม่ได้ (เช่น referrer ไม่ตรง) แอปจะสลับเป็นแผนที่จำลองพร้อมข้อความเตือน เกมยังเล่นต่อได้

## 3. Environment variables

คัดลอก `.env.example` → `.env.local` (สำหรับเครื่องตัวเอง) แล้วเติมค่า

| ตัวแปร | ประเภท | คำอธิบาย |
| --- | --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | public | Firebase web config |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | public | เช่น `your-project.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | public | |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | public | |
| `FIREBASE_PROJECT_ID` | server | จาก service account |
| `FIREBASE_CLIENT_EMAIL` | **secret** | จาก service account |
| `FIREBASE_PRIVATE_KEY` | **secret** | จาก service account (คง `\n` ไว้ได้ โค้ดแปลงให้) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | public (จำกัด referrer) | เว้นว่าง = แผนที่จำลอง |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | public | ไม่บังคับ |
| `NEXT_PUBLIC_REQUIRE_EMAIL_VERIFICATION` | flag | `true` = ต้องยืนยันอีเมลก่อนเล่น (ค่าเริ่มต้น `false`) |
| `NEXT_PUBLIC_ENABLE_MOCK_GPS` | flag | `true` = แสดงแผง Mock GPS ใน production (ควร `false` ตอนใช้จริง) |

ตัวแปร `NEXT_PUBLIC_*` ถูกฝังตอน build — แก้แล้วต้อง **redeploy**

## 4. Deploy ขึ้น Vercel

1. Push repo ขึ้น GitHub
2. <https://vercel.com/new> → Import repository → Framework: **Next.js** (ตรวจจับอัตโนมัติ)
3. **Environment Variables** → ใส่ทุกตัวในตารางด้านบน (Production และ Preview)
   - `FIREBASE_PRIVATE_KEY`: วางทั้งก้อนตั้งแต่ `-----BEGIN PRIVATE KEY-----` ถึง `-----END PRIVATE KEY-----\n` (แบบมี `\n` ก็ได้)
4. **Deploy** → ได้โดเมน `https://<your-app>.vercel.app`
5. นำโดเมนไปใส่ใน **Firebase Authorized domains** (ข้อ 5) และ **HTTP referrers ของ Maps key** (ข้อ 2)

## 5. ตั้ง Authorized domains ใน Firebase

Firebase console → **Authentication → Settings → Authorized domains** → **Add domain**:
- `<your-app>.vercel.app`
- โดเมนจริงของคุณ (ถ้ามี)
- (`localhost` มีให้อยู่แล้ว)

ถ้าไม่ใส่ อีเมลรีเซ็ตรหัสผ่าน/ยืนยันอีเมลอาจลิงก์กลับมาที่แอปไม่ได้

---

## 6. แก้พิกัดและรายการจุด

ทุกอย่างอยู่ใน **`src/config/game.ts`** ไฟล์เดียว (ทั้ง client และ server ใช้ไฟล์นี้)

### หาพิกัด
เปิด Google Maps (มุมมองดาวเทียม) → **คลิกขวา** ที่ตำแหน่ง → คลิกตัวเลขพิกัดบนสุดเพื่อคัดลอก เช่น `16.4745, 102.8260` (ละติจูด, ลองจิจูด)

### ขอบเขตโรงเรียน (`GEOFENCE.polygon`)
ใส่มุมรั้วโรงเรียนเรียงรอบรูป (ตามหรือทวนเข็มนาฬิกา) อย่างน้อย 3 จุด ไม่ต้องปิดรูปด้วยจุดแรกซ้ำ

```ts
polygon: [
  { lat: 16.4764, lng: 102.8238 },
  { lat: 16.4766, lng: 102.8281 },
  // ...
],
```

### จุดภารกิจ (`SPOTS`)
เพิ่มจุดใหม่โดยคัดลอกบล็อกเดิม:

```ts
{
  id: "science-building",     // ห้ามซ้ำ ห้ามเปลี่ยนภายหลัง
  name: "หน้าอาคารวิทยาศาสตร์", // ชื่อที่ผู้เล่นเห็น
  hint: "ใต้ต้นจามจุรี",        // ไม่บังคับ
  position: { lat: 16.4750, lng: 102.8255 },
  difficulty: 2,              // 1–3 มีผลกับเหรียญโบนัส
  // enabled: false,          // ปิดชั่วคราว
},
```

แนวทางเลือกจุด: ที่โล่ง (GPS แม่นกว่า), ปลอดภัย, **ไม่ใช่** ถนนรถวิ่ง บันได ริมน้ำ หรือพื้นที่หวงห้าม · กระจายให้ห่างกัน 50–300 ม.

หลังแก้ให้รัน `npm test` — มี test ตรวจว่า **ทุกจุดอยู่ใน geofence** และ id ไม่ซ้ำ แล้วค่อย deploy

## 7. ปรับกติกาเกม

ใน `GAME_CONFIG` (`src/config/game.ts`):

| ค่า | ค่าเริ่มต้น | ความหมาย |
| --- | --- | --- |
| `arrival.radiusM` | 28 | รัศมีที่นับว่าถึงจุด (ม.) |
| `arrival.maxAccuracyM` | 40 | accuracy แย่กว่านี้ไม่นับ |
| `arrival.requiredConsecutive` | 3 | ต้องอ่านในรัศมีติดกันกี่ครั้ง |
| `start.minSpotDistanceM` / `maxSpotDistanceM` | 50 / 300 | ระยะจุดจากผู้เล่น |
| `antiCheat.maxSpeedMps` | 7 | ความเร็วสูงสุดที่ยอมรับ (m/s) |
| `coins.*` | | สูตรเหรียญ = base + ระยะ/metersPerCoin + โบนัสความยาก (มีเพดาน) |
| `health.dailySpotCap` | 12 | จำนวนจุดสูงสุดต่อวัน |
| `health.restReminderEvery` | 3 | เตือนพักทุกกี่จุด |
| `playHours.enabled` | `false` | เปิดเพื่อจำกัดช่วงเวลาเล่น (`start`/`end` เป็นเวลาไทย) |

สัตว์เลี้ยงและอาหารอยู่ใน `src/config/pets.ts` (เพิ่มชนิดสัตว์ได้ที่ `PET_SPECIES`)

## 8. Mock GPS (ทดสอบบนคอมพิวเตอร์)

เปิดอัตโนมัติเมื่อรัน `npm run dev` (หรือตั้ง `NEXT_PUBLIC_ENABLE_MOCK_GPS=true`) → ปุ่ม **🧪 Mock GPS** มุมขวาบนของหน้าแผนที่

- **คลิกบนแผนที่** เพื่อย้ายตำแหน่ง
- **เดินไปที่จุด** ด้วยความเร็ว 1.4 / 3 / 6 m/s (หรือ 15 m/s เพื่อทดสอบ anti-cheat)
- **วาร์ปไปจุด** → จะถูกจับว่า "เร็วผิดปกติ"
- ปรับ **accuracy** (ปุ่มลัด 8 / 35 / 60 / 1200 ม.) เพื่อจำลอง GPS แย่และ "ตำแหน่งโดยประมาณ"
- จำลอง **ปฏิเสธสิทธิ์ตำแหน่ง** / **GPS ใช้ไม่ได้**
- ปุ่ม **นอกโรงเรียน** เพื่อทดสอบ geofence

ทดสอบ GPS จริงบนมือถือ: ต้องเปิดผ่าน **https** (เช่น Vercel preview) เพราะเบราว์เซอร์ไม่ให้ใช้ตำแหน่งบน http (ยกเว้น localhost)

## 9. ทดสอบ

```bash
npm run lint        # ESLint
npm run typecheck   # TypeScript
npm test            # Unit tests (haversine, point-in-polygon, เลือกจุด, accuracy, anti-cheat, สัตว์เลี้ยง, config)
npm run build       # production build
```

### ทดสอบแบบ end-to-end (API + Security Rules กับ Emulator)

```bash
npm run emulators            # เทอร์มินัล 1
npm run dev                  # เทอร์มินัล 2 (ใช้ .env.local แบบ emulator ด้านบน)
npm run test:e2e             # เทอร์มินัล 3 — ใช้เวลา ~1–2 นาที (จำลองการเดินจริง)
```

ตรวจ 40 กรณี เช่น token ไม่ถูกต้อง, uid จาก client ถูกเมิน, นอก geofence, accuracy แย่, ตำแหน่งโดยประมาณ, timestamp เก่า/ซ้ำ,
teleport, rate limit, การเดินถึงจุด + ได้เหรียญ, cooldown, ไม่ซ้ำจุดเดิม, ให้อาหาร, เหรียญไม่พอ, Security Rules (อ่านได้เฉพาะของตัวเอง เขียนไม่ได้), ลบบัญชี
ถ้าแก้ geofence แล้ว ให้ตั้ง `E2E_CENTER="lat,lng"` เป็นจุดที่อยู่ในโรงเรียน

---

## สถาปัตยกรรม

### โครงสร้างโฟลเดอร์

```
src/
  config/
    game.ts            ← geofence, จุดภารกิจ, กติกา, feature flags (แก้ที่นี่)
    pets.ts            ← ชนิดสัตว์เลี้ยง, อาหาร, อัตราลดค่าสถานะ
  lib/                 ← logic ล้วน (pure) + unit tests ใน __tests__/
    geo.ts             haversine, bearing, point-in-polygon
    missions.ts        เลือกจุด, คำนวณเหรียญ, เวลาเดินขั้นต่ำ
    arrival.ts         ตรวจการถึงจุดทีละครั้ง (state machine)
    anticheat.ts       timestamp, ความเร็ว, rate limit
    pet.ts             ลดค่าตามเวลา, ให้อาหาร, เลเวล
    server/            ← ใช้เฉพาะฝั่ง server
      firebase-admin.ts, auth.ts (ตรวจ ID token), game-service.ts (Firestore transactions)
  app/
    (auth)/            login, register, forgot-password, verify-email
    (game)/            layout (auth guard + แผนที่ถาวร) + play, pet, stats, settings
    api/               Route Handlers: profile, me, stats, missions/{start,check,cancel}, pet/feed, account
    privacy/           หน้าอธิบายการใช้ตำแหน่ง
  components/          UI, providers (Auth/Geo/Game), map, pet
firestore.rules        Security Rules
scripts/e2e-emulator.mjs
```

### ข้อมูลใน Firestore

| Path | เนื้อหา |
| --- | --- |
| `users/{uid}` | ชื่อเล่น, เหรียญ, `activeMissionId`, `lastSpotId`, ยอดรวม (จุด/ระยะ/เหรียญ) |
| `users/{uid}/pets/{petId}` | ชนิด, ความอิ่ม, ความสุข, XP, เลเวล, `updatedAt` (ใช้ collection เพื่อรองรับหลายตัว/หลายชนิดในอนาคต) |
| `users/{uid}/missions/{id}` | จุด, สถานะ, เวลาเริ่ม/จบ, เหรียญ, ระยะทางโดยประมาณ — **ไม่มีเส้นทางเดิน** (ตำแหน่งล่าสุด 1 จุดถูกเก็บชั่วคราวเพื่อตรวจความเร็ว และลบเมื่อจบภารกิจ) |
| `users/{uid}/daily/{YYYY-MM-DD}` | จำนวนจุด, ระยะ, เหรียญของวันนั้น (เวลาไทย) |

ต่างจากที่เสนอไว้ตอนแรก: ไม่ใช้ `config/geofence` และ `config/spots` ใน Firestore เพราะต้องการให้แก้ที่ไฟล์เดียว
(`src/config/game.ts`), ไม่มีหน้า admin, และไม่เสีย read ทุกครั้ง — ถ้าอนาคตต้องการแก้ผ่านหน้าเว็บค่อยย้ายไป Firestore

### Flow การรับเหรียญ

```
client (watchPosition, enableHighAccuracy)
  │  POST /api/missions/start  {lat,lng,accuracy,timestamp} + Bearer ID token
  ▼
server: verifyIdToken → ตรวจ play hours, daily cap, cooldown, timestamp, accuracy, geofence
        → สุ่มจุด (ห่าง 50–300 ม., ไม่ซ้ำ) → สร้าง mission (transaction)
  │
  │  ระหว่างเดิน: POST /api/missions/check ทุก ~3 วิ (ใกล้จุด) / ~15 วิ (ไกล)
  ▼
server (transaction): หมดอายุ? → rate limit → timestamp ใหม่กว่าเดิม? → accuracy ≤ 40?
        → ความเร็วจากจุดก่อนหน้า ≤ 7 m/s? → ในรัศมี 28 ม.? นับติดกัน
        → ครบ 3 ครั้ง และเลยเวลาเดินขั้นต่ำ → ให้เหรียญ + อัปเดตสัตว์เลี้ยง + สถิติรายวัน → ลบตำแหน่งล่าสุด
```

client ส่งแค่ตำแหน่ง — **การตัดสินและการให้เหรียญทั้งหมดทำที่ server** · Security Rules ปิดการเขียนจาก client ทั้งหมด

---

## ข้อจำกัดที่รู้อยู่

- **พิกัด geofence และจุดภารกิจเป็นค่าประมาณ** ต้องสำรวจและแก้จริง
- กันโกงเป็น **ระดับพื้นฐาน**: ผู้ที่ตั้งใจปลอม GPS ทั้งเครื่อง (mock location app) แล้ว "เดิน" ด้วยความเร็วสมจริงยังผ่านได้ — เว็บแอปตรวจสิ่งนี้ไม่ได้
- ระยะทางสะสมเป็น **ระยะเส้นตรง** จากจุดเริ่มถึงจุดหมาย (เพราะไม่เก็บเส้นทาง) จึงน้อยกว่าระยะเดินจริง
- `watchPosition` หยุดทำงานเมื่อปิดจอ/สลับแอป (ข้อจำกัดของเว็บ) ต้องเปิดแอปค้างไว้ระหว่างเดิน
- Mock GPS ถูกซ่อนใน production build เว้นแต่ตั้ง `NEXT_PUBLIC_ENABLE_MOCK_GPS=true`
- ยังไม่มี: ระบบเพื่อน/leaderboard, หน้า admin, ระบบขอความยินยอมจากผู้ปกครอง (นอกขอบเขตต้นแบบ)
