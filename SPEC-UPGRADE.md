# SPEC-UPGRADE.md — อัปเกรดเป็น Solar Feasibility Studio

> วางไฟล์นี้ไว้ที่ root ของ repo `solar-calculator` แล้วสั่ง Claude Code:
> "อ่าน CLAUDE.md และ SPEC-UPGRADE.md แล้วเริ่มทำ Phase 1"
> ไฟล์นี้เป็นสเปกอัปเกรดจากเว็บคำนวณบ้านเดี่ยว → เครื่องมือ feasibility ระดับมืออาชีพ
> (อ้างอิงดีไซน์จากภาพหน้าจอชุด "Kuy Energy Studio" — เฉพาะส่วน Solar ไม่รวม EV Charger)

---

## 0) บทบาทและเป้าหมาย

คุณคือ Senior Product Engineer + นักวิเคราะห์การเงินพลังงาน พัฒนาเว็บแอป
**Solar Feasibility Studio** — เครื่องมือวิเคราะห์ความคุ้มค่าการลงทุน (techno-economic
feasibility) สำหรับโครงการ Solar Rooftop ที่เปลี่ยนการเดา "น่าจะคุ้ม" ให้เป็นตัวเลขทางการเงิน
ที่ยืนยันได้และตรวจย้อนได้ทีละปี

กลุ่มผู้ใช้: ผู้รับเหมา/ผู้วางระบบ · เจ้าของธุรกิจ/นักลงทุน · ทีมขาย · ที่ปรึกษาพลังงาน/ESCO ·
ผู้อนุมัติสินเชื่อ — **ไม่ใช่แค่เจ้าของบ้านรายเดียวอีกต่อไป**

## 1) กติกาบังคับ (Hard Rules)

1. **ห้ามใส่ข้อมูลจำลอง** — ไม่มีราคาตัวอย่าง ไม่มีโปรเจกต์ตัวอย่าง ทุกช่องเริ่มจากว่าง
   ทุกจุดที่ยังไม่มีข้อมูลใช้ **empty state ที่ชวนกรอก** (ไอคอน + ประโยคสั้น + ปุ่มเริ่ม)
2. ค่าตั้งต้นที่อนุญาตมีเฉพาะ **ค่าคงที่เชิงกฎ/อัตราทางการ** (เช่น VAT 7%, อัตรารับซื้อตามประกาศ)
   และต้อง**แก้ไขได้เสมอ** พร้อมข้อความเตือนให้ตรวจสอบฉบับล่าสุด
3. ผลลัพธ์เป็นการวิเคราะห์ช่วยตัดสินใจ ไม่ใช่การรับประกันผลตอบแทน — มี disclaimer ทุกรายงาน
4. **โปร่งใส ไม่ใช่กล่องดำ** — ทุกตัวเลขสรุปต้องตรวจย้อนได้จากตาราง Cash Flow รายปี
   และมีหน้า "วิธีคำนวณ" อธิบายสูตรทั้งหมด
5. UI ภาษาไทยเป็นหลัก โครงสร้างรองรับอังกฤษ (เก็บ string ใน locale file ตั้งแต่แรก)
6. ทำงานออฟไลน์ เก็บข้อมูลใน localStorage ทั้งหมด (autosave) — **ไม่มี backend**
7. Export/Import JSON ได้ทั้งรายโครงการและทั้งพอร์ต, Export CSV สำหรับตาราง Cash Flow
8. **`src/lib/` ยังคงเป็น pure JS ไม่ผูก React** — engine ทดสอบแยกจาก UI ได้เสมอ

## 2) สิ่งที่มีอยู่แล้ว vs สิ่งที่ต้องเพิ่ม (Gap Analysis)

| ด้าน | มีแล้ว (v ปัจจุบัน) | ต้องเพิ่ม/เปลี่ยน |
|---|---|---|
| ระบบ PV | systemSize kW เดี่ยว, capacity factor | แผง Wp × จำนวน → DC kWp, ขนาด Inverter AC, DC/AC ratio (คำนวณ), พื้นที่หลังคา (m²/แผง, พื้นที่ใช้ได้, % ใช้พื้นที่), specific yield แทน CF (แปลงกันได้), availability %, system losses % (พร้อม toggle "yield รวม losses แล้ว") |
| พลังงาน/โหลด | สัดส่วนใช้เอง % คงที่ | โหลดไฟฟ้าปีแรก kWh/ปี + load growth %/ปี, โหมดพลังงาน 2 แบบ: (a) Annual screening (% self-consumption) (b) Interval profile 12 เดือน (ตาราง load/PV รายเดือน + อัปโหลด CSV template), demand charge savings |
| แบตเตอรี่ | ไม่มี | ขนาด kWh, DoD %, round-trip % — โมเดลอย่างง่าย: ย้ายพลังงานส่วนเกินมาแทนการซื้อไฟ ไม่เกิน kWh×DoD×RTE×365/ปี; **แบต=0 ผลลัพธ์ต้องเท่าไม่มีแบตเป๊ะ** (เกณฑ์ผ่าน) |
| อัตราค่าไฟ | retailRate + FiT ล็อกกับ MEA | ค่าไฟซื้อเข้า/ราคาขายออก แก้ได้อิสระ, tariff escalation %/ปี, ระยะเวลารับซื้อ (ปี) แก้ได้ — เก็บ preset "บ้านอยู่อาศัย MEA 2569" (2.20฿, 10ปี, เพดาน 5kW) ไว้เป็นปุ่มเลือก scheme พร้อมคำเตือนตรวจสอบประกาศล่าสุด |
| ต้นทุน | capexPerKw เดียว + omRate % | **Cost Database เต็มรูปแบบ** (ดูข้อ 4.3) — CAPEX/OPEX รายบรรทัด, VAT, ส่วนลด, ปีเปลี่ยนอุปกรณ์/รอบซ้ำ/% ค่าเปลี่ยน, escalation รายรายการ, Price List ใช้ซ้ำข้ามโครงการ, นำเข้า-ส่งออก CSV/XLSX |
| ภาษี | ลดหย่อนบุคคลธรรมดา 200k | **ภาษีนิติบุคคล**: corporate tax %, ค่าเสื่อมราคา (depreciation period ปี, depreciable basis % ของ Net CAPEX, straight-line), ดอกเบี้ยหักภาษีได้, decommissioning % CAPEX ปีสุดท้าย, รายได้อื่น + %เพิ่มต่อปี — เก็บโหมดบุคคลธรรมดาเดิมไว้เป็นทางเลือก (tax mode: corporate / personal) |
| เงินกู้ | มีครบ (ratio, ดอกเบี้ย, เทอม, grace) | เพิ่ม Minimum DSCR target (เส้นเทียบ), **ตาราง Debt Schedule** รายปี (ต้นปี/ดอกเบี้ย/เงินต้น/ชำระรวม/ปลายปี/DSCR badge) |
| ตัวชี้วัด | NPV×2, IRR×2, Payback, LCOE, MinDSCR | เพิ่ม Simple + Discounted Payback แยกกัน, ป้ายคำตัดสิน (verdict badge), **Screening Score 0-100** (ดูข้อ 5.4) |
| Cash Flow | ตารางใน engine, กราฟสะสม | **หน้าตารางเต็ม**: ปี, PV kWh, ใช้เอง, ส่งออก, รายได้/ประหยัด, OPEX, Replacement, ดอกเบี้ย, เงินต้น, ภาษี, Equity CF, สะสม, DSCR — ทำสีปีที่สะสมพลิกบวก (=ปีคืนทุน), Export CSV |
| Sensitivity | ไม่มีใน web | **ตาราง 2 มิติ** Yield × CAPEX (−20%..+20% ก้าว 10%) แสดง Equity NPV heatmap สีเขียวไล่เฉด, **Break-even indicators**: tariff multiplier ที่ NPV=0, break-even import rate ฿/kWh, max CAPEX multiplier, **3 ฉาก** Downside/Base/Upside |
| เปรียบเทียบ | ไม่มี | **Comparison ราคาเสนอ**: หลายแพ็กเกจ (ชื่อ, PV kW, Battery kWh, ราคาเสนอรวม, OPEX/ปี, ปีเปลี่ยน, %ค่าเปลี่ยน) คำนวณ engine เดียวกัน แสดงการ์ดผล (ปีคืนทุนตัวใหญ่, NPV, IRR, ประหยัดปี 1, ป้ายสถานะ) + ไฮไลต์ตัวคุ้มสุด (NPV) และคืนทุนเร็วสุดอัตโนมัติ + ราคาต่อ kW |
| หลายโครงการ | โครงการเดียว | **Portfolio**: รายการโครงการใน sidebar (เพิ่ม/ลบ/duplicate), หน้าเปรียบเทียบทุกโปรเจกต์ (ตาราง: ชื่อ, ประเภท, สถานที่, kWp, Net CAPEX, Equity NPV, IRR, Payback, LCOE, MinDSCR, Score, ผลคัดกรอง + แถวรวม) |
| Setup โครงการ | ไม่มี | ชื่อโครงการ, บริษัท, ประเทศ, สถานที่, lat/long, สกุลเงิน, อายุโครงการ, grid emission factor (kgCO₂/kWh เพื่อประมาณ CO₂ avoided), หมายเหตุ/แหล่งข้อมูล |
| บันทึก/ส่งออก | ไม่มี | Autosave localStorage + indicator, Export โปรเจกต์นี้/ทั้งหมด (JSON), Import JSON, รีเซ็ตโปรเจกต์ (ปุ่มแดง + confirm) |
| หน้า | หน้าเดียว | **Sidebar navigation** หลายหน้า (ดูข้อ 5) |

## 3) โครงสร้างข้อมูล (Data Model)

เก็บทั้งหมดใน localStorage คีย์เดียว `solar-studio-state-v1` โครงสร้าง:

```
AppState {
  version: 1,
  language: 'th' | 'en',
  activeProjectId,
  projects: Project[],
  priceList: CostItem[]          // คลังราคากลาง ใช้ร่วมทุกโครงการ
}

Project {
  id, name, company, country, location, lat, lng, currency,
  projectLife, gridEmissionFactor, notes,
  system: {
    panelWp, panelCount,                 // -> dcKwp = panelWp*panelCount/1000
    inverterAcKw,                        // -> dcAcRatio = dcKwp/inverterAcKw
    panelAreaM2, roofAreaM2,             // -> areaUsedPct
    batteryKwh, batteryDoD, batteryRTE,
  },
  energy: {
    mode: 'annual' | 'interval',
    specificYield,                       // kWh/kWp/ปี
    availability, systemLosses, yieldIncludesLosses: bool,
    degradation,
    loadYear1Kwh, loadGrowth,
    selfConsumptionPct,                  // ใช้ในโหมด annual
    monthlyProfile: [{month, loadKwh, pvKwh}] | null,   // โหมด interval
    importRate, exportRate, tariffEscalation,
    exportTermYears, exportCapKw,        // preset MEA เติมให้ แก้ได้
    demandChargeSavings,
  },
  costs: { capexItems: CostItem[], opexItems: OpexItem[] },
  finance: {
    discountRate, generalInflation,
    taxMode: 'corporate' | 'personal',
    corporateTaxRate, depreciationYears, depreciableBasisPct,
    personalTaxBracket, personalDeductionCap,     // โหมดเดิม
    decommissioningPct, otherIncomeY1, otherIncomeGrowth,
    loanEnabled, debtRatio, interestRate, loanTerm, gracePeriod, minDscrTarget,
  },
  variants: Variant[],
}

CostItem  { id, category, name, spec, qty, unit, unitPrice, discountPct, vatPct,
            replacementYear, replacementCycles, replacementPct, kind:'capex' }
OpexItem  { id, category, name, costPerOccurrence, escalationPct,
            startYear, endYear, everyNYears }
Variant   { id, name, pvKw, batteryKwh, quotedPrice, opexPerYear,
            replacementYear, replacementPct }
```

## 4) Engine (`src/lib/`) — สูตรและการเปลี่ยนแปลง

แตกไฟล์: `energy.js` (พลังงาน), `costs.js` (รวม CAPEX/OPEX จาก line items),
`finance.js` (debt schedule, ภาษี, metrics), `sensitivity.js`, `scoring.js`
โดย `calculations.js` เดิมเป็น orchestrator เรียกต่อกัน — **เขียน Vitest ให้ทุกไฟล์**

### 4.1 พลังงาน (ต่อปี t = 1..life)
```
grossYield_t = dcKwp × specificYield × availability
             × (yieldIncludesLosses ? 1 : (1 − systemLosses))
             × (1 − degradation)^(t−1)
load_t      = loadYear1Kwh × (1 + loadGrowth)^(t−1)

โหมด annual:   selfUse_t = min(grossYield_t × selfConsumptionPct, load_t)
โหมด interval: selfUse_t = Σ รายเดือน min(pv_m, load_m) แล้ว scale ตาม degradation/growth

battery (ถ้า batteryKwh > 0):
  shiftable_t = min(export_t, batteryKwh × DoD × RTE × 365)
  selfUse_t += shiftable_t ; export_t −= shiftable_t
export_t = grossYield_t − selfUse_t
  แล้ว cap ด้วย exportCapKw × specificYield × availability × (1−deg)^(t−1) (ถ้ากำหนด)
  ส่วนเกิน = curtailed (แสดงเป็นข้อมูล ไม่คิดเงิน)

savings_t = selfUse_t × importRate × (1+tariffEscalation)^(t−1) + demandChargeSavings
exportRevenue_t = (t ≤ exportTermYears) ? export_t × exportRate : 0
```

### 4.2 ต้นทุน
```
รายการ CAPEX: net = qty × unitPrice × (1−discount) ; +VAT เมื่อขอคืนไม่ได้ (มี toggle)
GrossCAPEX = Σ ทุกรายการ
Replacement_t = Σ รายการที่ replacementYear ตรง t (และรอบซ้ำ) × replacementPct × ราคารายการ
OPEX_t = Σ รายการที่ active ในปี t (start/end/everyN) × (1+escalation)^(t−1)
```

### 4.3 การเงินและภาษี (โหมด corporate)
```
Debt = GrossCAPEX × debtRatio ; Equity = ส่วนที่เหลือ
Debt schedule: grace = จ่ายดอกเบี้ยอย่างเดียว, หลัง grace ผ่อน annuity รายปี
Depreciation_t = (GrossCAPEX × depreciableBasisPct) / depreciationYears  (t ≤ depYears)
EBITDA_t = savings + exportRevenue + otherIncome − OPEX
TaxableIncome_t = EBITDA − Depreciation − Interest_t   (ติดลบ = ภาษี 0, ไม่ carry-forward ใน v นี้)
Tax_t = max(0, TaxableIncome_t) × corporateTaxRate
ProjectCF_t = EBITDA − Replacement − Tax(ไม่รวมผลดอกเบี้ย) ; ปี 0 = −GrossCAPEX
EquityCF_t  = EBITDA − Replacement − Interest − Principal − Tax ; ปี 0 = −Equity
ปีสุดท้าย: หัก decommissioning = GrossCAPEX × decommissioningPct
DSCR_t = (EBITDA − Tax) / DebtService_t   เฉพาะปีที่มีหนี้
Metrics: NPV/IRR ทั้ง Project และ Equity, Simple & Discounted Payback,
LCOE = (CAPEX + PV(OPEX+Replacement)) / PV(พลังงานผลิต), MinDSCR
```
โหมด personal = ตรรกะเดิมของ repo (ลดหย่อนครั้งเดียวปี 1) — คงไว้และทดสอบว่าค่าอ้างอิงเดิมยังตรง

### 4.4 Sensitivity & Break-even
- ตาราง 5×5: yield −20..+20% (แถว) × CAPEX −20..+20% (คอลัมน์) → Equity NPV แต่ละช่อง
- Break-even (ใช้ bisection บน engine): tariff multiplier ที่ทำ Equity NPV=0,
  break-even import rate, max CAPEX multiplier
- ฉาก: Downside (yield−20, capex+20) / Base / Upside (yield+20, capex−20)

### 4.5 Screening Score (0-100) + ป้ายคำตัดสิน
ถ่วงน้ำหนักอย่างง่ายและ**แสดงเกณฑ์ในหน้า "วิธีคำนวณ"**: IRR เทียบ hurdle (30),
Payback เทียบอายุโครงการ (25), NPV>0 (20), MinDSCR เทียบเป้า (15), ความครบของข้อมูล (10)
ป้าย: ≥80 "น่าสนใจสำหรับศึกษาต่อ" / 50-79 "พอไปได้ ควรปรับสมมติฐาน" / <50 "ยังไม่คุ้มตามข้อมูลปัจจุบัน"

## 5) หน้าจอ (ตามภาพอ้างอิง)

Layout: **Sidebar ซ้าย** (โลโก้+ชื่อแอป, รายการโครงการ+ปุ่มเพิ่ม, เมนู, การ์ด Screening Score,
กล่อง "ข้อควรจำ") + **Top bar** (สถานะ Autosave, Export โปรเจกต์นี้/ทั้งหมด, Import JSON,
รีเซ็ต) + พื้นที่เนื้อหาขวา

เมนู: ภาพรวม · Comparison ราคาเสนอ · เปรียบเทียบโปรเจกต์ · โครงการและระบบ · ต้นทุน ·
พลังงานและค่าไฟ · การเงิน · Sensitivity · Cash Flow · วิธีคำนวณ

1. **ภาพรวม (Dashboard)** — การ์ด KPI 6 ใบ (Equity NPV, Equity IRR, Simple Payback,
   LCOE, Year-1 Generation, Min DSCR แต่ละใบมี sub-text บริบท), กราฟกระแสเงินสดสะสม
   (เส้น+พื้นที่, เส้นประที่ 0), สรุปเงินลงทุน (Gross CAPEX/Incentive/Debt/Equity + แถบ %),
   กราฟแท่ง Load vs PV ตลอดอายุ, กล่อง Data & Risk Checks (คำเตือนอัตโนมัติ เช่น
   DSCR ต่ำกว่าเป้า, DC/AC ratio ผิดปกติ, ใช้ % self-consumption แบบ screening)
2. **โครงการและระบบ** — ฟอร์มข้อมูลโครงการ + ขนาดระบบ (ช่องคำนวณอัตโนมัติเป็นสีเทา
   read-only: DC รวม, พื้นที่แผงรวม, DC/AC ratio) + แถบสรุปด้านล่าง (กำลังติดตั้ง, %พื้นที่, CF ปี 1)
3. **ต้นทุน** — ตาราง CAPEX + OPEX แบบ inline edit, ปุ่มเพิ่มรายการ, dropdown ย้าย CAPEX↔OPEX,
   ปุ่ม PL (บันทึกลง Price List), แถว Gross CAPEX รวม, ปุ่มดาวน์โหลด Template / อัปโหลด
   CSV-XLSX (โหมดนำเข้า: แทนที่/ต่อท้าย), badge จำนวนรายการใน Price List
4. **พลังงานและค่าไฟ** — แท็บ Annual screening / Interval profile, ฟิลด์ตามข้อ 3,
   แถบสรุปส้มอ่อน (ผลผลิตปี 1, ผลผลิตที่ใช้คำนวณ, มูลค่าพลังงาน), ตารางโปรไฟล์ 12 เดือน
   + ดาวน์โหลด template + toggle "ใช้ PV จากไฟล์"
5. **การเงิน** — การ์ด Economic assumptions + การ์ด Debt financing (toggle ใช้เงินกู้,
   Debt amount คำนวณเป็นสีเทา), การ์ดผล 4 ใบ (P-IRR, E-IRR, P-NPV, E-NPV ตัวเลขเขียว),
   ตาราง Debt schedule + badge Min DSCR
6. **Cash Flow** — ตารางเต็มตามข้อ 2 + Export CSV, สะสมติดลบสีแดง/บวกสีเขียว
7. **Sensitivity** — heatmap 2 มิติ + การ์ด Break-even 3 ใบ + แถวฉาก 3 ใบ
8. **Comparison ราคาเสนอ** — การ์ดกรอกแพ็กเกจ (ลบได้) + ส่วน "ผลการเปรียบเทียบ"
   การ์ดผลพร้อมริบบิ้น "คุ้มที่สุด (NPV)" และ tag "เร็วสุด"
9. **เปรียบเทียบโปรเจกต์** — ตารางพอร์ต + แถวรวม + หมายเหตุเรื่องต่างสกุลเงิน
10. **วิธีคำนวณ** — อธิบายทุกสูตร (จากข้อ 4) + ที่มาของ Screening Score + disclaimer

## 6) UX/UI Direction

Premium, Clean, Modern, Data Dashboard — Light mode
- พื้นหลัง `#F7F8FA`, การ์ดขาว radius 14-16px ขอบ `#E9ECF0` เงาเบามาก
- **สีแบรนด์: ส้มพลังงาน** (primary `#F97316` โทนตามภาพอ้างอิง) ใช้กับ nav active,
  ปุ่มหลัก, accent — ตัวเลขผลลัพธ์บวกใช้ **เขียว** `#16A34A`, ลบ/เตือนใช้แดง `#DC2626`
  (หมายเหตุ: prompt ต้นทางระบุ "เขียวพลังงาน" แต่ภาพอ้างอิงใช้ส้ม — เลือกตามภาพ
  ถ้าจะสลับให้แก้ token เดียวที่ tailwind.config)
- ฟอนต์เดิม (Kanit หัวข้อ/ตัวเลข + Sarabun เนื้อหา) ใช้ต่อได้ เข้ากับดีไซน์นี้
- ตัวเลข KPI ใหญ่ชัด, badge มุมขวาการ์ด (NPV/IRR/PB/LCOE/DSCR), tabular-nums ทุกตาราง
- Empty state ทุกหน้าเมื่อยังไม่มีข้อมูล — ห้าม render ตาราง/กราฟว่างเปล่าเฉย ๆ

## 7) แผนงาน (ทำทีละ Phase, commit แยก, มีเทสทุก Phase)

- **Phase 1 — Engine ใหม่**: แตก lib เป็น 5 ไฟล์ตามข้อ 4, data model ข้อ 3,
  Vitest ครอบ: แบต=0 ≡ ไม่มีแบต, corporate vs personal, debt schedule, curtailment,
  ค่าอ้างอิงเดิมของโหมด personal ยังตรง (NPV≈166,601 ที่พารามิเตอร์เดิม)
- **Phase 2 — State & Persistence**: AppState + localStorage autosave + Export/Import JSON
  + multi-project CRUD (ยังใช้ UI เดิมชั่วคราวได้)
- **Phase 3 — App Shell**: Sidebar + Top bar + routing (react-router) + empty states +
  หน้าโครงการและระบบ + หน้าการเงิน
- **Phase 4 — ต้นทุน & พลังงาน**: Cost Database (inline edit, CSV/XLSX ผ่าน SheetJS,
  Price List) + หน้าพลังงาน 2 โหมด + โปรไฟล์ 12 เดือน
- **Phase 5 — ผลลัพธ์**: Dashboard, Cash Flow + CSV export, Debt schedule
- **Phase 6 — วิเคราะห์**: Sensitivity + Break-even + Scenarios, Comparison ราคาเสนอ,
  เปรียบเทียบโปรเจกต์, Screening Score, หน้า วิธีคำนวณ
- **Phase 7 — เก็บงาน**: i18n en, responsive/mobile, code-splitting (recharts),
  accessibility, disclaimer ครบทุกจุด

## 8) เกณฑ์ผ่าน (Definition of Done)

1. เปิดแอปครั้งแรก = ว่างสะอาด ไม่มีข้อมูลปลอม มี empty state ชวนเริ่มสร้างโครงการ
2. สร้างโครงการ กรอกเองครบ → ได้ NPV/IRR/Payback/LCOE/DSCR และตรวจย้อนรายปีได้ใน Cash Flow
3. แบตเตอรี่ = 0 ให้ผลเท่ากับไม่มีแบตทุกตัวเลข
4. Cost Database, Comparison, Sensitivity, Portfolio ใช้งานได้จริง ไม่ใช่ placeholder
5. Autosave + Export/Import ทำงาน, รีเฟรชหน้าแล้วข้อมูลอยู่ครบ
6. เทสทั้งหมดผ่าน (`npm test`) และ `npm run build` ไม่มี error
