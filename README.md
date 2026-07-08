# เครื่องคำนวณความคุ้มค่าโซลาร์รูฟท็อป (Solar Rooftop Financial Calculator)

เว็บแอปสำหรับให้บุคคลทั่วไปกรอกข้อมูลบ้านของตัวเอง แล้วดูผลตอบแทนการลงทุนติดตั้งโซลาร์รูฟท็อป
(NPV, IRR, ระยะเวลาคืนทุน, LCOE) ตามเกณฑ์รับซื้อไฟฟ้าส่วนเกินของ กฟน. (ประกาศที่ 58/2569)

คำนวณทั้งหมดฝั่งเบราว์เซอร์ (client-side) — ไม่มี backend, ไม่มีฐานข้อมูล, ข้อมูลที่กรอกไม่ถูกส่งไปที่ไหนเลย

## โครงสร้างโปรเจกต์

```
solar-calculator/
├── CLAUDE.md                     ★ บริบทโปรเจกต์สำหรับ Claude Code (อ่านอัตโนมัติ)
├── index.html                    entry HTML (โหลดฟอนต์ Kanit + Sarabun)
├── package.json
├── vite.config.js
├── tailwind.config.js            โทนสี sky/sun/paper + ฟอนต์ display/sans
├── postcss.config.js
├── src/
│   ├── main.jsx                  React entry point
│   ├── App.jsx                   หน้าหลัก ประกอบทุก component
│   ├── index.css                 Tailwind directives + style ของ slider
│   ├── lib/
│   │   ├── calculations.js       ★ แกนคำนวณทั้งหมด (พอร์ตจากไฟล์ Excel)
│   │   └── formatters.js         ตัวช่วยจัดรูปแบบตัวเลข/หน่วยเงิน
│   └── components/
│       ├── Header.jsx            ส่วนหัว พร้อมลาย sun-ray SVG
│       ├── BehaviorInputs.jsx    ขนาดระบบ, พฤติกรรมใช้ไฟ, ราคา, ค่าไฟ (ผู้ใช้ปรับได้ทั้งหมด)
│       ├── FinanceInputs.jsx     สินเชื่อ, ภาษี, discount rate (ผู้ใช้ปรับได้ทั้งหมด)
│       ├── ResultsSummary.jsx    ผลลัพธ์แบบ "ใบเสร็จ" มี SunGauge เป็นจุดเด่น
│       ├── SunGauge.jsx          ★ signature visual — เกจโค้งแสดงปีคืนทุน
│       ├── CashflowChart.jsx     กราฟกระแสเงินสดสะสม (recharts)
│       ├── SegmentedControl.jsx  ปุ่มแท็บ (cash/loan toggle)
│       └── Card.jsx / Slider.jsx UI พื้นฐานที่ใช้ซ้ำ
```

**หลักการจัดหมวดอินพุต**: ค่าที่สะท้อนพฤติกรรมผู้ใช้ไฟและค่าที่เกี่ยวกับการเงินทั้งหมด
ปรับได้ในหน้าเว็บ (`BehaviorInputs` + `FinanceInputs`) ส่วนพารามิเตอร์ทางเทคนิคล้วน ๆ
(capacity factor, degradation, O&M rate, inverter replacement ฯลฯ) ถูกกำหนดค่าคงที่ไว้ใน
`defaultAssumptions` ภายใน `calculations.js` โดยไม่มี UI ให้ผู้ใช้ทั่วไปเห็น — ดูรายละเอียดกติกา
การจัดหมวดเต็ม ๆ ใน `CLAUDE.md`

**`src/lib/calculations.js` คือหัวใจของทั้งระบบ** — เป็น pure JS function ไม่ผูกกับ React
ถ้าจะทดสอบว่าคำนวณตรงกับไฟล์ Excel หรือไม่ ให้ใส่ค่าเดียวกันใน `defaultAssumptions` แล้วเทียบผลลัพธ์จาก
`computeMetrics()` กับชีต Outputs ในไฟล์ Excel ได้โดยตรง

## เริ่มต้นใช้งาน (ต้องมี Node.js 18+ ติดตั้งไว้ก่อน)

```bash
npm install
npm run dev
```

เปิดเบราว์เซอร์ที่ `http://localhost:5173`

## Build สำหรับ production

```bash
npm run build
```

ได้ไฟล์ static ในโฟลเดอร์ `dist/` — เอาไปวางบน hosting อะไรก็ได้ที่รองรับ static site

## วิธี Deploy (แนะนำ Vercel — ฟรี, เร็วที่สุด)

1. สร้าง repo บน GitHub แล้ว push โค้ดนี้ขึ้นไป
2. ไปที่ [vercel.com](https://vercel.com) → New Project → เลือก repo
3. Vercel จะตรวจจับว่าเป็น Vite project อัตโนมัติ (build command: `npm run build`, output: `dist`) — กด Deploy ได้เลย
4. ได้ URL ทันที เช่น `solar-calculator.vercel.app` — จะผูกโดเมนของหน่วยงานเองภายหลังก็ได้ (Settings → Domains)

ทางเลือกอื่น: Netlify (ขั้นตอนคล้ายกัน), Cloudflare Pages, หรือ GitHub Pages (ต้องตั้งค่า `base` ใน `vite.config.js` เพิ่ม)

## แผนต่อยอด (Roadmap)

รายการงานที่ควรทำต่อ พร้อมลำดับความสำคัญ อยู่ใน **`CLAUDE.md`** (หัวข้อ "งานที่ควรทำต่อ") —
เก็บไว้ที่เดียวเพื่อไม่ให้ข้อมูลสองที่ไม่ตรงกัน ถ้าใช้ Claude Code ให้เปิดโฟลเดอร์นี้แล้วพิมพ์
`อ่าน CLAUDE.md แล้วเริ่มทำข้อ 1` ได้เลย

## หมายเหตุด้านข้อมูล

ค่าเริ่มต้นทั้งหมดอยู่ใน `defaultAssumptions` ในไฟล์ `src/lib/calculations.js` — ถ้าอัตรารับซื้อไฟฟ้า (FiT),
เพดานส่งออก, หรือมาตรการภาษีมีการเปลี่ยนแปลงในอนาคต ให้แก้ที่ไฟล์นี้ไฟล์เดียว ค่าจะอัปเดตทั่วทั้งแอปทันที
