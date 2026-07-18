# Solar Feasibility Studio

เว็บแอปวิเคราะห์ความคุ้มค่าการลงทุน (techno-economic feasibility) โครงการ Solar Rooftop
สำหรับผู้รับเหมา/ผู้วางระบบ เจ้าของธุรกิจ ทีมขาย ที่ปรึกษาพลังงาน และผู้อนุมัติสินเชื่อ —
เปลี่ยนการเดา "น่าจะคุ้ม" ให้เป็นตัวเลขทางการเงินที่ยืนยันได้และตรวจย้อนได้ทีละปี

**ความสามารถหลัก**: NPV/IRR (Project + Equity), Simple & Discounted Payback, LCOE,
Debt Schedule + DSCR, ภาษีนิติบุคคล (ค่าเสื่อม, interest shield) / บุคคลธรรมดา,
Cost Database รายบรรทัด + Price List + นำเข้า CSV/XLSX, โหลด/PV รายเดือน 12 เดือน,
แบตเตอรี่, Sensitivity heatmap + Break-even + Scenarios, เปรียบเทียบใบเสนอราคา,
Portfolio หลายโครงการ, Screening Score 0-100 และหน้า "วิธีคำนวณ" เปิดสูตรทั้งหมด
— UI ไทย/อังกฤษ

คำนวณทั้งหมดฝั่งเบราว์เซอร์ — **ไม่มี backend ไม่มีฐานข้อมูล** ข้อมูลเก็บใน localStorage
(autosave) พร้อม Export/Import JSON ทั้งรายโครงการและทั้งพอร์ต

## โครงสร้างโปรเจกต์ (ย่อ)

```
solar-calculator/
├── CLAUDE.md            ★ บริบทโปรเจกต์ + กติกาสำหรับ Claude Code (อ่านอัตโนมัติ)
├── SPEC-UPGRADE.md      สเปกอัปเกรดฉบับเต็ม (ทำครบ 7 Phases แล้ว)
├── index.html           entry HTML (ฟอนต์ Kanit + Sarabun)
└── src/
    ├── lib/             ★ engine การเงิน/พลังงานทั้งหมด — pure JS + เทสประกบทุกไฟล์
    ├── locale/          string ทั้งหมดของ UI (th.js / en.js)
    ├── state/           React context ครอบ state + autosave
    ├── shell/  ui/      โครงหน้า (sidebar/topbar) และ UI พื้นฐาน
    ├── components/charts/  กราฟ recharts (lazy-loaded)
    └── pages/           10 หน้า: ภาพรวม · โครงการและระบบ · ต้นทุน · พลังงานและค่าไฟ ·
                         การเงิน · Cash Flow · Sensitivity · Comparison · Portfolio · วิธีคำนวณ
```

**`src/lib/calculations.js` (`computeProject`) คือจุดเข้าเดียวของ engine** — pure JS
ไม่ผูก React ห้ามคำนวณการเงินใน component ดูกติกาเต็มใน `CLAUDE.md`

## เริ่มต้นใช้งาน (ต้องมี Node.js 18+ ติดตั้งไว้ก่อน)

```bash
npm install
npm run dev      # เปิด http://localhost:5173
npm test         # Vitest ทั้งชุด (ต้องผ่านก่อน commit)
```

## Build สำหรับ production

```bash
npm run build    # ได้ไฟล์ static ใน dist/
```

ใช้ HashRouter จึงวางบน static hosting อะไรก็ได้โดยไม่ต้องตั้ง rewrite rules และใช้งาน
offline ได้

## วิธี Deploy (แนะนำ Vercel — ฟรี, เร็วที่สุด)

1. push โค้ดขึ้น GitHub (repo นี้ push แล้ว)
2. ไปที่ [vercel.com](https://vercel.com) → New Project → เลือก repo
3. Vercel ตรวจจับ Vite อัตโนมัติ (build: `npm run build`, output: `dist`) → กด Deploy
4. ได้ URL ทันที — ผูกโดเมนเองภายหลังได้ (Settings → Domains)

ทางเลือกอื่น: Netlify, Cloudflare Pages, GitHub Pages

## หมายเหตุด้านข้อมูล

ค่าที่อ้างอิงประกาศ/กฎหมาย (อัตรารับซื้อ FiT, เพดานส่งออก, VAT) เก็บเป็น **preset แบบ
opt-in** ใน `src/lib/state.js` (`ENERGY_PRESETS`) — ผู้ใช้กดใช้เองและแก้ได้เสมอ พร้อม
คำเตือนให้ตรวจสอบประกาศฉบับล่าสุด ถ้าประกาศเปลี่ยน แก้ที่ไฟล์นี้ไฟล์เดียว

ผลลัพธ์ทั้งหมดเป็นการวิเคราะห์เพื่อช่วยตัดสินใจ ไม่ใช่การรับประกันผลตอบแทน —
ดูข้อจำกัดเต็มในหน้า "วิธีคำนวณ" ของแอป
