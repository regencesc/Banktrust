import Card from "./Card.jsx";
import Slider from "./Slider.jsx";
import SegmentedControl from "./SegmentedControl.jsx";

export default function FinanceInputs({ assumptions, update }) {
  return (
    <Card title="การเงิน" subtitle="วิธีจ่ายเงินและภาระภาษีของคุณ">
      <div className="mb-5">
        <SegmentedControl
          options={[
            { label: "จ่ายเงินสด 100%", value: false },
            { label: "ผ่อนชำระ", value: true },
          ]}
          value={assumptions.loanEnabled}
          onChange={(v) => update({ loanEnabled: v })}
        />
      </div>

      {assumptions.loanEnabled && (
        <div className="mb-5 pb-5 border-b border-ink/10">
          <Slider
            label="สัดส่วนวงเงินกู้ต่อค่าติดตั้ง"
            value={assumptions.loanToCostRatio}
            onChange={(v) => update({ loanToCostRatio: v })}
            min={0.1}
            max={1}
            step={0.05}
            format={(v) => `${Math.round(v * 100)}%`}
          />
          <Slider
            label="อัตราดอกเบี้ย"
            value={assumptions.interestRate}
            onChange={(v) => update({ interestRate: v })}
            min={0.01}
            max={0.15}
            step={0.005}
            format={(v) => `${(v * 100).toFixed(1)}%/ปี`}
          />
          <Slider
            label="ระยะเวลาผ่อนทั้งหมด"
            value={assumptions.loanTenor}
            onChange={(v) => update({ loanTenor: Math.max(v, assumptions.gracePeriod + 1) })}
            min={2}
            max={15}
            step={1}
            format={(v) => `${v} ปี`}
          />
          <Slider
            label="ปีที่จ่ายดอกเบี้ยอย่างเดียว (grace period)"
            value={assumptions.gracePeriod}
            onChange={(v) => update({ gracePeriod: Math.min(v, assumptions.loanTenor - 1) })}
            min={0}
            max={5}
            step={1}
            format={(v) => `${v} ปี`}
          />
        </div>
      )}

      <Slider
        label="ฐานภาษีเงินได้ส่วนเพิ่มของคุณ"
        value={assumptions.taxBracket}
        onChange={(v) => update({ taxBracket: v })}
        min={0}
        max={0.35}
        step={0.05}
        format={(v) => `${(v * 100).toFixed(0)}%`}
      />
      <p className="text-xs text-ink/45 -mt-2 mb-4">
        ลดหย่อนได้สูงสุด {assumptions.taxDeductionCap.toLocaleString("th-TH")} บาท ตามมาตรการปี 2569-2571
      </p>

      <Slider
        label="ผลตอบแทนขั้นต่ำที่คุณคาดหวัง (Discount Rate)"
        value={assumptions.loanEnabled ? assumptions.equityDiscountRate : assumptions.projectDiscountRate}
        onChange={(v) =>
          update(
            assumptions.loanEnabled ? { equityDiscountRate: v } : { projectDiscountRate: v }
          )
        }
        min={0.02}
        max={0.2}
        step={0.005}
        format={(v) => `${(v * 100).toFixed(1)}%`}
      />
      <p className="text-xs text-ink/45 -mt-2">
        เทียบเท่าดอกเบี้ยเงินฝาก/พันธบัตรที่คุณจะได้ถ้าไม่เอาเงินก้อนนี้มาลงทุนโซลาร์
      </p>

      <Slider
        label="อัตราขึ้นค่าไฟในอนาคต"
        value={assumptions.retailEscalation}
        onChange={(v) => update({ retailEscalation: v })}
        min={0}
        max={0.05}
        step={0.005}
        format={(v) => `${(v * 100).toFixed(1)}%/ปี`}
      />
    </Card>
  );
}
