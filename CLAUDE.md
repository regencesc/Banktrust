# CLAUDE.md

คำแนะนำนี้ Claude Code จะอ่านอัตโนมัติทุกครั้งที่เปิดโฟลเดอร์นี้ ไม่ต้องอธิบายบริบทซ้ำทุกครั้ง

## โปรเจกต์คืออะไร

เว็บคำนวณความคุ้มค่าการลงทุนโซลาร์รูฟท็อปสำหรับบ้านอยู่อาศัย ให้บุคคลทั่วไปกรอกข้อมูลของตัวเอง
แล้วเห็น NPV, IRR, ระยะเวลาคืนทุน ทันที ตามเกณฑ์รับซื้อไฟฟ้าส่วนเกินของ กฟน. (ประกาศที่ 58/2569)
เป็น static site ล้วน ๆ (Vite + React + Tailwind) ไม่มี backend คำนวณทั้งหมดในเบราว์เซอร์

## กติกาสำคัญที่ต้องยึดตาม

1. **`src/lib/calculations.js` คือ single source of truth ของทุกสูตรการเงิน** — เป็น pure JS
   function ไม่ผูก React ห้ามคำนวณซ้ำในที่อื่น ถ้าจะแก้สูตร แก้ที่นี่ที่เดียว แล้วให้ component ดึงค่า
   จาก `computeMetrics()` เสมอ
2. **สูตรพอร์ตมาจากไฟล์ Excel ที่ตรวจสอบแล้ว** — ก่อนแก้ไข logic ใด ๆ ในไฟล์นี้ ให้ทดสอบว่าเลขยังตรงกับ
   ค่าอ้างอิงเดิม: `systemSize=5, selfConsumptionRatio=0.9, capexPerKw=30000, retailRate=4.4,
   projectDiscountRate=0.07` ต้องได้ `projectNpv≈166,601`, `projectIrr≈20.1%`, `lcoe≈2.34`
   ถ้ามีไฟล์ทดสอบ (ดูข้อ "งานที่ควรทำต่อ" ข้อ 1) ให้รันก่อน commit ทุกครั้ง
3. **แบ่งค่าอินพุตเป็น 2 กลุ่มเสมอ**:
   - **User-facing** (ปรับได้ในหน้าเว็บ): ทุกอย่างที่สะท้อนพฤติกรรมผู้ใช้ไฟ (ขนาดระบบ, สัดส่วนใช้เอง)
     และทุกอย่างที่เกี่ยวกับการเงิน (ราคาติดตั้ง, ค่าไฟ, สินเชื่อ, ภาษี, discount rate)
   - **Backend-only** (fix ค่าไว้ใน `defaultAssumptions`, ไม่มี UI ให้ปรับ): พารามิเตอร์ทางเทคนิคล้วน ๆ
     ที่ผู้ใช้ทั่วไปไม่รู้จัก — capacityFactor, degradation, projectLife, omRate, inverterReplacement*,
     generalInflation, fitRate/fitTerm/exportCapKw/taxDeductionCap (กำหนดโดยกฎหมาย ไม่ใช่ทางเลือกผู้ใช้)
   - ถ้าจะเพิ่ม input ใหม่ ให้จัดหมวดตามกฎนี้ก่อนตัดสินใจว่าจะโชว์ใน UI หรือไม่
4. **ธีมสี/ฟอนต์ที่ตั้งใจเลือกไว้แล้ว** — อย่าเปลี่ยนกลับไปเป็น default Tailwind blue/slate:
   - สี: `sky-*` (เขียวอมฟ้าเข้ม, โทนความน่าเชื่อถือ/ท้องฟ้า) เป็นสีหลัก, `sun-*` (ส้ม/ทอง, โทนพลังงานแสงอาทิตย์)
     เป็น accent, `paper` (#F6F4EE) เป็นพื้นหลังหลัก, `leaf`/`clay` สำหรับสถานะดี/แย่
   - ฟอนต์: `font-display` (Kanit) สำหรับหัวข้อ/ตัวเลขใหญ่, `font-sans` (Sarabun) สำหรับ body/label
   - ซิกเนเจอร์ของเว็บคือ `SunGauge.jsx` (เกจโค้งแสดงปีคืนทุน) — เป็น visual ที่จงใจออกแบบให้ผูกกับธีม
     พลังงานแสงอาทิตย์ อย่าแทนที่ด้วย metric card ธรรมดา
5. **ภาษาไทยเป็นภาษาหลักของ UI ทั้งหมด** ยกเว้น commit message / code comment ที่เขียนอังกฤษได้ตามปกติ

## โครงสร้างไฟล์

```
src/
├── App.jsx                    ประกอบทุก component, จัดการ state ของ assumptions
├── lib/
│   ├── calculations.js        ★ สูตรการเงินทั้งหมด (ดูกติกาข้อ 1-2) + estimateSystemSize()
│   │                            (helper แนะนำขนาดระบบจากหน่วยไฟที่ใช้ต่อเดือน ไม่ใช่ส่วนหนึ่งของ
│   │                            financial model จึงไม่ต้องผ่าน computeMetrics())
│   └── formatters.js          จัดรูปแบบตัวเลข/หน่วยเงิน
└── components/
    ├── Header.jsx              ส่วนหัว พร้อมลาย sun-ray SVG
    ├── BehaviorInputs.jsx       ขนาดระบบ, พฤติกรรมใช้ไฟ (พร้อม preset), ราคา, ค่าไฟ
    ├── FinanceInputs.jsx        สินเชื่อ (cash/loan toggle), ภาษี, discount rate
    ├── ResultsSummary.jsx       ผลลัพธ์แบบ "ใบเสร็จ" มี SunGauge เป็น hero
    ├── SunGauge.jsx             ★ signature visual — เกจโค้งแสดงปีคืนทุน
    ├── CashflowChart.jsx        กราฟกระแสเงินสดสะสม (recharts)
    ├── SegmentedControl.jsx     ปุ่มแท็บ (ใช้กับ cash/loan toggle)
    ├── Slider.jsx / Card.jsx    UI พื้นฐานที่ใช้ซ้ำ
```

## งานที่ควรทำต่อ (เรียงตามลำดับความสำคัญ)

1. **เขียนเทสสำหรับ `calculations.js`** (Vitest) — ยังไม่มีเทสอัตโนมัติเลยตอนนี้ ตรวจสอบด้วยมือแล้วว่า
   ตรงกับ Excel (ดูค่าอ้างอิงในกติกาข้อ 2) แต่ควร lock ไว้เป็นเทสกัน regression โดยเฉพาะ edge case:
   เพดานส่งออก 5kW ทำงานถูกไหมเมื่อ systemSize>5, FiT ตัดหลังปีที่ 10 จริงไหม, DSCR/Payback ตอน
   cash-only (loanEnabled=false) ต้องได้ `minDscr=null`
2. **Responsive/mobile polish** — เลย์เอาต์ปัจจุบันเทสบน desktop เป็นหลัก ให้ตรวจสอบ breakpoint mobile
   จริงจัง โดยเฉพาะ `SunGauge` กับกราฟที่อาจล้นจอเล็ก
3. **Accessibility pass** — ใส่ `aria-label` ให้ slider ทุกตัว, ตรวจ contrast ของสี sun-300 บนพื้น sky-900,
   ทดสอบ keyboard navigation
4. **แชร์ผลลัพธ์ผ่าน URL** — encode `assumptions` ลง query string เมื่อ state เปลี่ยน (debounce)
   แล้ว hydrate จาก URL ตอนโหลดหน้า จะได้แชร์ลิงก์พร้อมผลลัพธ์เฉพาะบุคคลได้โดยไม่ต้องมี backend
5. **Analytics** — ต่อ Plausible หรือ GA เพื่อดูว่าคนกรอกค่าอะไรบ้าง จะได้ปรับ default ให้สอดคล้องผู้ใช้จริง
6. **Export PDF/รูปสรุปผล** ให้ผู้ใช้ดาวน์โหลดไปดูภายหลังหรือส่งต่อผู้ติดตั้ง
7. **Code splitting** — bundle ปัจจุบัน ~540KB (recharts เป็นตัวหลักที่หนัก) ลอง `dynamic import()` สำหรับ
   `CashflowChart` เพื่อลด initial load

## คำสั่งที่ใช้บ่อย

```bash
npm run dev      # dev server, hot reload
npm run build    # production build -> dist/
npm run preview  # serve ไฟล์ที่ build แล้ว ทดสอบก่อน deploy
```

## สิ่งที่ห้ามทำ

- ห้ามเพิ่ม backend/database โดยไม่จำเป็น — โปรเจกต์นี้ตั้งใจให้เป็น static site ล้วน ๆ
  (ยกเว้นงานข้อ 4-5 ที่ยังทำแบบ client-only ได้อยู่)
- ห้ามเปลี่ยนค่า default ใน `defaultAssumptions` โดยไม่แจ้ง — โดยเฉพาะ `fitRate`, `fitTerm`,
  `exportCapKw`, `taxDeductionCap` เพราะเป็นค่าที่อ้างอิงกฎหมาย/ประกาศจริง เปลี่ยนเองไม่ได้ตามใจ
