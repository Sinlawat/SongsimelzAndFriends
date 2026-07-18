# Changelog

บันทึกการเปลี่ยนแปลงของโปรเจค SongsimelzAndFriends
รูปแบบอิงจาก [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) และใช้ [Semantic Versioning](https://semver.org/)

---

## [1.4.0] - 2026-07-18

### Added
- **หน้า Home แสดงทีมทั้งหมด** (จากเดิมแค่ 20 ทีม) — โหลดครั้งละ 20 ทีม พร้อมปุ่ม
  **"โหลดเพิ่ม (เหลือ N ทีม)"** และตัวนับ "แสดง X / Y ทีม"
- **SQL migration** (`supabase_migration_v1.4_defense_pagination.sql`)
  - RPC `get_defenses_page(p_limit, p_offset, p_team_type)` — เรียง, กรอง, นับ counter
    และคืน total_count ในขั้นตอนเดียวฝั่ง DB

### Changed
- **การเรียงถูกต้องขึ้น** — เดิมดึง 20 ทีม*ล่าสุด*แล้วค่อยเรียง counter ฝั่ง client
  (ทีมเก่าที่ counter เยอะไม่ติดลิสต์) ตอนนี้เรียงจาก*ทุกทีม*ใน DB จริง
- **Filter ประเภททีมกรองฝั่ง server** — ครอบคลุมทุกทีมใน DB ไม่ใช่แค่ที่โหลดมาแล้ว
  (แก้ข้อจำกัดของ V1.3) เปลี่ยน filter = โหลดหน้าแรกของประเภทนั้นใหม่
- **Performance** — จาก 21 queries ต่อการโหลด (N+1 นับ counter ทีละทีม)
  เหลือ 2 queries (RPC + ดึงข้อมูลอัศวินทั้งหน้าครั้งเดียว)

### Notes
- ต้องรัน SQL migration ก่อน deploy — หน้า Home เรียก RPC ใหม่ ถ้าไม่มีจะโหลดไม่ขึ้น

---

## [1.3.0] - 2026-07-18

### Added
- **ประเภททีม Defense 6 แบบ**: ทีมถึก / ทีมเวท / ทีมกาย / ทีมผสม / ทีมเดธ / ทีมอื่นๆ
  (ค่าใน DB: `tank / magic / physical / hybrid / death / other` — แต่ละแบบมีสีประจำ)
- **Filter chips ในหน้า Home** — กรอง Top Defense Teams ตามประเภททีม (ทั้งหมด + 6 ประเภท)
- **Badge ประเภททีมบนการ์ด Defense** — ทีมที่ยังไม่แท็ก (`team_type = null`) แสดงเป็น "ทีมอื่นๆ"
- **Admin เปลี่ยนประเภททีมได้จากหน้า Home** — คลิก badge บนการ์ด → dropdown เลือกประเภท
  (ผ่าน RPC `set_defense_team_type` เช็คสิทธิ์ admin ฝั่ง DB)
- **เลือกประเภทตอนสร้าง defense ใหม่** — กด "+ Contribute Counter" กับทีมที่ยังไม่มีในระบบ
  จะเจอ `TeamTypeSelectModal` ให้เลือกประเภทก่อน แล้วค่อยเข้า Contribute flow ตามปกติ
- **SQL migration** (`supabase_migration_v1.3_team_type.sql`)
  - คอลัมน์ `gvg_defenses.team_type` + CHECK constraint
  - RPC `set_defense_team_type(p_defense_id, p_team_type)` (security definer + `is_admin()`)

### Notes
- ต้องรัน SQL migration ก่อน deploy ไม่งั้น insert defense ใหม่จะ error (ไม่มีคอลัมน์)
- Filter กรองจากรายการ Top 20 ที่โหลดมาแล้ว (client-side)

---

## [1.2.0] - 2026-07-18

### Added
- **Filter "✦ Awake"** ใน `KnightSelectModal` — chip สีม่วง `#a855f7` ในแถว Grade filter
  กดเปิดเพื่อกรองเฉพาะอัศวินที่ปลุกพลังแล้ว (toggle เปิด/ปิดได้ และรวมอยู่ใน Reset / Clear filters)
- **Badge ✦ มุมขวาบนการ์ดอัศวิน** สำหรับตัวที่ `awake = true` ให้เห็นชัดว่าตัวไหนปลุกพลังแล้ว

### Changed
- **ลำดับการเรียงใน `KnightSelectModal`** — อัศวิน awake ขึ้นบนสุดก่อนเสมอ
  จากนั้นเรียงตาม logic เดิม (grade → ชื่อ) — ครอบคลุมทุกทางเข้า:
  Contribute flow, เลือก Defense knights และ Edit counter (ใช้ modal เดียวกัน)

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
