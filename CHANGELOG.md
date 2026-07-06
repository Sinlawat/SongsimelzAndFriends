# Changelog

บันทึกการเปลี่ยนแปลงของโปรเจค SongsimelzAndFriends
รูปแบบอิงจาก [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) และใช้ [Semantic Versioning](https://semver.org/)

---

## [1.2.0] - 2026-07-06

### Changed
- **รูปแบบแสดงสกิลใน `ReadonlySkillQueue`** (`FormationBoard.tsx` — ครอบคลุม Counter Card ในหน้า GVG และหน้า Confirm step 4)
  - แสดง**สกิลทั้งหมด**ของอัศวินที่เลือก ไม่ใช่เฉพาะสกิลที่จองแล้ว
  - เรียงจากบนลงล่าง: **อเวค → สกิลบน (skill2) → สกิลล่าง (skill1)** (แถวอเวคแสดงเฉพาะตัวที่ `awake = true` หรือมี `img_skill_3`)
  - เปลี่ยนตัวเลขสีขาวท้ายแถวเป็นชื่อสกิลภาษาไทย: `สกิลล่าง` / `สกิลบน` / `สกิลอเวค`
  - **badge วงกลมลำดับจองคงรูปแบบเดิม** (ทอง `#f59e0b` / ม่วง `#a855f7` สำหรับอเวค) แสดงเฉพาะสกิลที่จองไว้
  - สกิลที่ไม่ได้จอง: แถวหรี่แสง (opacity 0.55) + วงกลม placeholder เส้นประ เพื่อให้เห็น layout สกิลครบแต่แยกจากสกิลที่จองได้ชัดเจน
  - ปรับขนาด badge/รูปสกิลเป็น 14px และความกว้างคอลัมน์เป็น 4.5rem ให้ป้ายชื่อภาษาไทยพอดี

---

## [1.1.0] - 2026-07-06

### Added
- **หน้า Login เต็มจอ** (`src/pages/LoginPage.tsx`) — บังคับล็อกอินก่อนเข้าใช้งานทุกหน้า
- **Login ด้วย username หรือ email** ในช่องเดียว
  - `AuthContext.signIn(identifier, password)` — ตรวจ `@` อัตโนมัติ ถ้าเป็น username จะ lookup email ผ่าน RPC ก่อน
  - Error message ภาษาไทย
- **Auth gate ใน `App.tsx`** — 3 สถานะ: loading → splash / ไม่มี user → LoginPage / มี user → เข้าแอป
- **SQL migration** (`supabase_migration_v1.1_username_login.sql`)
  - ตาราง `public.profiles` (username unique) + RLS
  - Trigger `on_auth_user_created` สร้าง profile อัตโนมัติตอน signup
  - Backfill user เดิม: username = ส่วนหน้า `@` ของ email
  - RPC `get_email_by_username` (security definer, case-insensitive)

### Changed
- **ลำดับแสดงสกิลใน `ReadonlySkillQueue`** (`FormationBoard.tsx`) —
  แถวสกิล Awake (skill3) ลอยขึ้น**บนสุดเสมอ** ไม่ว่าจะจองเป็นลำดับที่เท่าไหร่
  ส่วน badge ตัวเลขยังแสดงลำดับจองจริงตามเดิม
  (ครอบคลุมทั้ง Counter Card ในหน้า GVG และหน้า Confirm step 4)

### Notes
- ต้องรัน SQL migration ก่อน deploy ไม่งั้น login ด้วย username จะหา RPC ไม่เจอ
- `LoginModal.tsx` เดิมยังอยู่ (legacy) แต่หน้าเข้าใช้งานจริงคือ `LoginPage`

---

## [1.0.0] - 2026-07-06

### Added
- **รองรับ Awakened Knights (อัศวินปลุกพลัง)**
  - `types/index.ts` — เพิ่ม `img_skill_3?: string` และ `awake?: boolean` ใน `Knight` interface พร้อม helper `getSkillImage()`
  - `SkillQueueStep.tsx` (Contribute step 3) — การ์ด "✦ Awake" สำหรับตัวที่ `awake = true` กดจองได้เหมือนสกิลอื่น นับรวมใน limit 3 จอง/ทีม
  - ธีมสีม่วง `#a855f7` แยกจากสีทองปกติ — border, hover, วงกลมลำดับจอง และ summary bar
  - `FormationBoard.tsx` — `ReadonlySkillQueue` รองรับ `skill3`: แถว awake พื้นม่วง + badge ม่วง (Counter Card + หน้า Confirm)
  - `KnightSelectModal.tsx` — เพิ่ม `img_skill_3, awake` ใน select query
  - `GVGPage.tsx` — เพิ่ม 2 ฟิลด์ใน join ของ defense knights (query ที่ใช้ `select('*')` ได้ฟิลด์ใหม่อัตโนมัติ)
- อัศวินที่ `awake = false/null` แสดงผลเหมือนเดิมทุกอย่าง

---

## [0.x] - ก่อนหน้า

### พัฒนาสะสมจาก SK Rebirth Calculator
- Stat Calculator + import อุปกรณ์จาก JSON (ต่อยอดจาก EquipmentScan OCR)
- Gear Optimizer / Multi-Knight Optimizer
- ระบบ GVG: Defense Formation, Contribute flow 4 step, Skill Queue, Counter Card
- Supabase auth (email) + LoginModal
- Security hardening: RLS audit, แก้ Vercel config
