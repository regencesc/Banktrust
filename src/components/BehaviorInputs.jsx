import { useState } from "react";
import Card from "./Card.jsx";
import Slider from "./Slider.jsx";
import { estimateSystemSize } from "../lib/calculations.js";

const PRESETS = [
  { label: "ไม่อยู่บ้านตอนกลางวัน", value: 0.2 },
  { label: "อยู่บ้านบางวัน", value: 0.4 },
  { label: "อยู่บ้าน/ทำงานที่บ้านทั้งวัน", value: 0.65 },
];

export default function BehaviorInputs({ assumptions, update }) {
  const [monthlyUsage, setMonthlyUsage] = useState(450);
  const recommended = estimateSystemSize(monthlyUsage, assumptions.capacityFactor);

  const activePreset = PRESETS.find(
    (p) => Math.abs(p.value - assumptions.selfConsumptionRatio) < 0.001
  );

  return (
    <Card title="บ้านและพฤติกรรมการใช้ไฟ" subtitle="ค่าที่มีผลต่อผลตอบแทนมากที่สุดอยู่ในนี้">
      <Slider
        label="ใช้ไฟฟ้าประมาณกี่หน่วยต่อเดือน"
        value={monthlyUsage}
        onChange={setMonthlyUsage}
        min={100}
        max={2000}
        step={50}
        format={(v) => `${v.toLocaleString("th-TH")} หน่วย/เดือน`}
      />
      <p className="text-xs text-ink/45 -mt-2 mb-2">ดูได้จากใบแจ้งค่าไฟฟ้าย้อนหลัง (หน่วยเฉลี่ยต่อเดือน)</p>

      {recommended && (
        <div className="flex items-center justify-between gap-3 bg-sun-50 border border-sun-100 rounded-xl px-4 py-3 mb-5">
          <p className="text-sm text-ink/80">
            แนะนำขนาดระบบ{" "}
            <span className="font-display font-semibold text-sky-700">{recommended} kW</span>
            <span className="block text-xs text-ink/45 mt-0.5">
              ครอบคลุมการใช้ไฟประมาณ 70% (ประมาณการเบื้องต้น)
            </span>
          </p>
          <button
            type="button"
            onClick={() => update({ systemSize: recommended })}
            className="shrink-0 text-xs font-medium bg-sky-700 text-white px-3 py-1.5 rounded-full hover:bg-sky-800 transition-colors"
          >
            ใช้ขนาดนี้
          </button>
        </div>
      )}

      <Slider
        label="ขนาดระบบที่จะติดตั้ง"
        value={assumptions.systemSize}
        onChange={(v) => update({ systemSize: v })}
        min={1}
        max={20}
        step={0.5}
        format={(v) => `${v} kW`}
      />

      <div className="mb-2">
        <p className="text-sm text-ink/60 mb-2">ช่วงเวลาที่มีคนอยู่บ้าน</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => update({ selfConsumptionRatio: p.value })}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                activePreset?.label === p.label
                  ? "bg-sun-500 border-sun-500 text-white font-medium"
                  : "border-ink/15 text-ink/60 hover:border-ink/30"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <Slider
        label="สัดส่วนไฟที่ใช้เอง (ปรับละเอียดได้)"
        value={assumptions.selfConsumptionRatio}
        onChange={(v) => update({ selfConsumptionRatio: v })}
        min={0.1}
        max={0.9}
        step={0.05}
        format={(v) => `${Math.round(v * 100)}%`}
      />

      <Slider
        label="ราคาติดตั้งต่อ kW"
        value={assumptions.capexPerKw}
        onChange={(v) => update({ capexPerKw: v })}
        min={20000}
        max={50000}
        step={1000}
        format={(v) => `${v.toLocaleString("th-TH")} บาท`}
      />
      <Slider
        label="ค่าไฟที่หลีกเลี่ยงได้ (ค่าไฟบ้านช่วงกลางวัน)"
        value={assumptions.retailRate}
        onChange={(v) => update({ retailRate: v })}
        min={3.5}
        max={5.5}
        step={0.1}
        format={(v) => `${v.toFixed(2)} บาท/หน่วย`}
      />

      <div className="mt-5 pt-4 border-t border-ink/10 text-xs text-ink/45 space-y-1">
        <p>อัตรารับซื้อไฟฟ้าส่วนเกิน (FiT): 2.20 บาท/หน่วย คงที่ 10 ปี ตามประกาศ กฟน. ที่ 58/2569</p>
        <p>เพดานขายไฟ: ไม่เกิน 5 kW ต่อมิเตอร์ ไม่ว่าจะติดตั้งระบบใหญ่แค่ไหน</p>
      </div>
    </Card>
  );
}
