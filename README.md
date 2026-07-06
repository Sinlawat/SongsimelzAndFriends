# ⚔️ SongsimelzAndFriends

เว็บแอปคู่หูสำหรับเกม **Seven Knights Rebirth (SKRE)** สำหรับใช้ในกิลด์ — คำนวณสเตตัส จัดทีม GVG จองคิวสกิล และหาชุดอุปกรณ์ที่ดีที่สุด

🔗 Deploy บน Vercel · ฐานข้อมูล Supabase

---

## ✨ Features

### 🔐 Login Gate (V1.1)
- ต้องล็อกอินก่อนถึงจะเข้าใช้งานได้ทุกหน้า
- รองรับทั้ง **username** และ **email** ในช่องเดียว
  - มี `@` → login ด้วย email ตรง ๆ
  - ไม่มี `@` → ระบบ lookup email จาก username ผ่าน RPC ให้อัตโนมัติ

### 📊 Stat Calculator
- คำนวณสเตตัสอัศวินรวมโบนัสจากอุปกรณ์ (weapon / armor / accessory / gem)
- Import อุปกรณ์จาก JSON (ต่อยอดจาก EquipmentScan OCR)
- Gear Optimizer หาชุดที่ดีที่สุดต่ออัศวิน + Multi-Knight Optimizer จัดของพร้อมกันหลายตัว
- บันทึก/โหลดเซ็ตอุปกรณ์

### 🏰 GVG (Guild vs Guild)
- จัดทีมป้องกัน (Defense Formation) แบบ front/back row
- Contribute flow 4 step: เลือกทีม → จัดตำแหน่ง → จองคิวสกิล → ยืนยัน
- **Skill Queue**: จองลำดับการกดสกิลได้สูงสุด 3 จอง/ทีม
- **Awakened Knights (V1.0+)**: อัศวินที่ปลุกพลังแล้วมีการ์ดสกิล ✦ Awake เพิ่ม ธีมสีม่วง `#a855f7` แยกจากสีทองปกติ และแถว awake แสดงบนสุดเสมอใน Counter Card / หน้า Confirm
- **Full Skill Layout (V1.2)**: Counter Card / หน้า Confirm แสดงสกิลทั้งหมดของอัศวินที่เลือก เรียง อเวค → สกิลบน → สกิลล่าง พร้อมชื่อสกิลภาษาไทย (`สกิลล่าง` / `สกิลบน` / `สกิลอเวค`) — badge ลำดับจองคงเดิม สกิลที่ไม่ได้จองแสดงแบบหรี่แสง
- Counter Card ดูทีมศัตรูพร้อมคิวสกิลแบบ expanded

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS 3 |
| Routing | React Router 6 |
| Backend / Auth / DB | Supabase (PostgreSQL + RLS) |
| Hosting | Vercel |

---

## 🚀 Getting Started

### 1. ติดตั้ง dependencies

```bash
npm install
```

### 2. ตั้งค่า environment variables

สร้างไฟล์ `.env` ที่ root:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. รัน SQL migration (จำเป็นสำหรับ V1.1)

เปิด Supabase Dashboard → SQL Editor แล้วรันไฟล์:

```
supabase_migration_v1.1_username_login.sql
```

สคริปต์นี้จะสร้าง `profiles` table, trigger สร้าง profile อัตโนมัติตอน signup,
backfill user เดิม (username = ส่วนหน้า `@` ของ email) และ RPC `get_email_by_username`
— รันซ้ำได้ปลอดภัย (idempotent)

### 4. รัน dev server

```bash
npm run dev
```

### 5. Build ก่อน deploy

```bash
npm run build   # tsc + vite build — ต้องผ่านก่อน push ทุกครั้ง
```

---

## 📁 Project Structure

```
src/
├── components/
│   ├── gvg/                  # GVG: FormationBoard, SkillQueueStep,
│   │                         #      ContributeModal, KnightSelectModal ฯลฯ
│   ├── GearOptimizer.tsx     # Optimizer ต่ออัศวิน
│   ├── MultiKnightOptimizer.tsx
│   ├── LoginModal.tsx        # (legacy modal — หน้าเข้าใช้จริงคือ LoginPage)
│   └── ...
├── contexts/
│   └── AuthContext.tsx       # Supabase auth state + signIn (username/email)
├── pages/
│   ├── LoginPage.tsx         # หน้า login เต็มจอ (gate ทั้งแอป)
│   ├── HomePage.tsx
│   ├── StatCalculatorPage.tsx
│   └── GVGPage.tsx
├── hooks/                    # useStatCalculator, useAdmin
├── lib/                      # supabase client, savedSets
├── types/                    # Knight, SkillReservationData, database types
└── utils/                    # gearOptimizer, multiKnightOptimizer, transcendStats
```

---

## 🔑 Auth Flow

```
เปิดแอป → AuthContext เช็ค session
  ├─ loading   → Splash screen
  ├─ ไม่มี user → LoginPage (บังคับทุก route)
  └─ มี user   → เข้าแอปปกติ
```

- Username ไม่สนตัวพิมพ์ใหญ่-เล็ก (case-insensitive)
- แก้ username ของ user ได้ใน Supabase table editor ที่ตาราง `profiles`

> ⚠️ **หมายเหตุ security**: RPC `get_email_by_username` ทำให้ผู้ที่เดา username ถูก
> ทราบ email ได้ — ยอมรับได้สำหรับแอปกิลด์กลุ่มเล็ก ถ้าต้องการปิดจุดนี้
> ให้ย้าย login ไปทำบน Edge Function แทน

---

## 📝 Conventions

- ชื่อไฟล์ component ใช้ **PascalCase** เป๊ะ ๆ (`LoginPage.tsx`) — Vercel เป็น Linux
  แยก case ต่างจาก Windows ถ้าเปลี่ยนชื่อให้ใช้ `git mv` เสมอ
- รัน `npm run build` ให้ผ่านใน local ก่อน push ทุกครั้ง
- สีธีม: ทอง `#f59e0b` (ปกติ) / ม่วง `#a855f7` (awake) / พื้นหลัง `#0a0c14`

ดูประวัติการเปลี่ยนแปลงทั้งหมดได้ที่ [CHANGELOG.md](./CHANGELOG.md)
