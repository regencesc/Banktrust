# CLAUDE.md

คำแนะนำนี้ Claude Code จะอ่านอัตโนมัติทุกครั้งที่เปิดโฟลเดอร์นี้ ไม่ต้องอธิบายบริบทซ้ำทุกครั้ง

## โปรเจกต์คืออะไร

**Solar Feasibility Studio** — เว็บแอปวิเคราะห์ความคุ้มค่าการลงทุน (techno-economic feasibility)
โครงการ Solar Rooftop ระดับมืออาชีพ รองรับหลายโครงการ (portfolio), Cost Database รายบรรทัด,
ภาษีนิติบุคคล/บุคคลธรรมดา, เงินกู้+Debt Schedule, Sensitivity/Break-even, เปรียบเทียบใบเสนอราคา
และ Screening Score — อัปเกรดมาจากเว็บคำนวณบ้านเดี่ยวตามสเปกใน **`SPEC-UPGRADE.md`**
(ทำครบทั้ง 7 Phases แล้ว)

เป็น static site ล้วน (Vite + React + Tailwind + react-router HashRouter) **ไม่มี backend** —
คำนวณทั้งหมดในเบราว์เซอร์ ข้อมูลเก็บใน localStorage (autosave + Export/Import JSON)

## กติกาสำคัญที่ต้องยึดตาม

1. **`src/lib/` คือ engine ทั้งหมด — pure JS ห้ามผูก React** แตกเป็นโมดูล:
   `energy.js` (พลังงาน/แบต/เพดานส่งออก) → `costs.js` (CAPEX/OPEX line items) →
   `finance.js` (debt schedule, ภาษี, metrics) โดย `calculations.js` เป็น orchestrator
   (`computeProject(project)` = จุดเข้าเดียว) ส่วน `sensitivity.js`, `scoring.js`, `variants.js`
   ต่อยอดจาก computeProject — **ห้ามคำนวณการเงินใน component เด็ดขาด**
2. **ค่าอ้างอิงจาก Excel ที่ตรวจสอบแล้วถูก lock ไว้ในเทส** — เคส 5 kWp, selfConsumption 90%,
   CAPEX 150,000฿, ค่าไฟ 4.4฿, discount 7% (โหมด personal) ต้องได้ `NPV≈166,601`,
   `IRR≈20.1%`, `LCOE≈2.34` — ดู "legacy parity" ใน `finance.test.js` ถ้าแก้สูตรแล้วเทสนี้แดง
   แปลว่าผลลัพธ์เพี้ยนจากต้นฉบับ **รัน `npm test` ก่อน commit ทุกครั้ง** (183 เทส)
3. **Hard Rules จากสเปกที่ยังบังคับตลอด** (รายละเอียดเต็มใน SPEC-UPGRADE.md ข้อ 1):
   - โปรเจกต์ใหม่**ว่างทุกช่อง** ไม่มีข้อมูลจำลอง — จุดที่ไม่มีข้อมูลใช้ empty state เสมอ
   - ค่า prefill มีได้เฉพาะค่าคงที่เชิงกฎหมาย/ทางการ เป็น **preset แบบ opt-in** ที่แก้ได้เสมอ
     พร้อมคำเตือนให้ตรวจประกาศล่าสุด (ดู `ENERGY_PRESETS` ใน `state.js` — MEA 2569:
     2.2฿/kWh, 10 ปี, เพดาน 5kW) ห้ามเปลี่ยนค่าเหล่านี้โดยไม่แจ้ง
   - โปร่งใสไม่มีกล่องดำ — ตัวเลขสรุปทุกตัวตรวจย้อนได้จากตาราง Cash Flow และหน้า "วิธีคำนวณ"
     ต้องอัปเดตเมื่อสูตรเปลี่ยน
   - มี disclaimer ทุกหน้าผลลัพธ์ (`ui/Disclaimer.jsx`)
   - แบตเตอรี่ = 0 ต้องให้ผลเท่าไม่มีแบตเป๊ะ (มีเทส lock ไว้)
4. **ทุก string ใน UI ต้องอยู่ใน locale file** — `src/locale/th.js` (หลัก) และ `en.js`
   (mirror กัน มีเทส structural parity ใน `locale/locale.test.js` — เพิ่ม key ที่ไหนต้องเพิ่มทั้งคู่)
   ห้าม hardcode ข้อความในหน้า component ป้ายคำตัดสินใน `th.verdicts` ต้องตรงกับ
   `scoring.js` (มีเทสตรวจ)
5. **ธีม Studio** (SPEC ข้อ 6): พื้น `surface` #F7F8FA, การ์ดขาว radius 14-16px ขอบ `line`,
   สีหลัก `brand` (ส้มพลังงาน #F97316), บวก `ok` เขียว / ลบ `danger` แดง, ฟอนต์ Kanit
   (หัวข้อ/ตัวเลข) + Sarabun (body) — token อยู่ที่เดียวใน `tailwind.config.js`
6. **ของหนักต้อง lazy-load** — recharts (`components/charts/`) และ SheetJS (`lib/sheet.js`)
   ถูก dynamic import แยก chunk แล้ว อย่า import แบบ static จาก initial bundle

## โครงสร้างไฟล์

```
src/
├── main.jsx / App.jsx        HashRouter + shell (sidebar/topbar/routes + mobile drawer)
├── lib/                      ★ engine ทั้งหมด — pure JS มีเทสประกบทุกไฟล์
│   ├── calculations.js       orchestrator: computeProject(project)
│   ├── energy.js             ผลผลิต/โหลด/แบต/เพดานส่งออก (annual + interval 12 เดือน)
│   ├── costs.js              รวม CAPEX/OPEX จาก line items (VAT, replacement, escalation)
│   ├── finance.js            debt schedule, ภาษี corporate/personal, NPV/IRR/Payback/LCOE/DSCR
│   ├── sensitivity.js        ตาราง 5×5, break-even (bisection), 3 ฉาก
│   ├── scoring.js            Screening Score 0-100 + verdict + dataChecks
│   ├── variants.js           แปลงใบเสนอราคา (Variant) → Project แล้วรัน engine เดิม
│   ├── riskChecks.js         คำเตือนอัตโนมัติบน dashboard
│   ├── cashflowExport.js     รวมตาราง Cash Flow + serialize CSV
│   ├── costItems.js          factories + CAPEX↔OPEX + แปลงแถว spreadsheet
│   ├── state.js              AppState/Project data model, CRUD, presets, Export/Import JSON
│   ├── persistence.js        localStorage (คีย์ solar-studio-state-v1) + debounced autosaver
│   ├── sheet.js              SheetJS I/O (lazy import)
│   └── formatters.js         จัดรูปแบบตัวเลข (formatYears รับ labels ต่อ locale)
├── state/AppContext.jsx      React glue: useApp / useActiveProject / useProjectResult
├── locale/th.js, en.js       ★ string ทั้งหมดของ UI (ดูกติกาข้อ 4)
├── shell/                    Sidebar, TopBar, ScoreCard, EmptyState
├── ui/                       Panel, Field, inputs, Segmented, Badge, Disclaimer
├── components/charts/        recharts (lazy)
└── pages/                    10 หน้า: Overview, ProjectSystem, Costs, Energy, Finance,
                              Cashflow, Sensitivity, Comparison, Portfolio, Methodology
```

เทส: `*.test.js(x)` ประกบไฟล์ engine + `Phase*.test.jsx` (jsdom) เทสระดับหน้า

## คำสั่งที่ใช้บ่อย

```bash
npm run dev      # dev server, hot reload
npm test         # Vitest ทั้งชุด — ต้องผ่านก่อน commit
npm run build    # production build -> dist/ (ต้องไม่มี error)
npm run preview  # serve ไฟล์ที่ build แล้ว
```

## สิ่งที่ห้ามทำ

- ห้ามเพิ่ม backend/database — แอปนี้ตั้งใจเป็น static + offline (localStorage) ตามสเปก
- ห้ามแก้ regulatory preset (`ENERGY_PRESETS`, `VAT_DEFAULT` ใน `state.js`) โดยไม่แจ้ง —
  อ้างอิงประกาศจริง
- ห้ามคำนวณการเงินนอก `src/lib/` หรือ import recharts/xlsx แบบ static
- ห้ามเพิ่ม string ใน locale เดียวโดยไม่เพิ่มอีกภาษา (เทส parity จะแดง)
- อย่าเปลี่ยน schema ของ AppState โดยไม่อัปเดต `normalizeProject`/`migrateAppState` —
  save เก่าของผู้ใช้ต้องโหลดได้เสมอ (เติมค่า default ให้ฟิลด์ใหม่)

## งานที่อาจทำต่อ (ไม่เรียงลำดับ — 7 Phases ตามสเปกเสร็จหมดแล้ว)

1. **Deploy Vercel** — repo push ขึ้น GitHub แล้ว เหลือเชื่อมที่ vercel.com (Vite auto-detect)
2. **Tax loss carry-forward** — โหมด corporate ปัจจุบันไม่ยกยอดขาดทุน (ระบุไว้ในสเปกว่า
   เป็นข้อจำกัดของเวอร์ชันนี้)
3. **Export PDF รายงาน** ต่อโครงการ สำหรับส่งผู้อนุมัติ/ลูกค้า
4. **PWA/offline caching** ให้ติดตั้งเป็นแอปได้
5. **แชร์โครงการผ่าน URL** (encode ลง query string) เสริมจาก Export JSON
