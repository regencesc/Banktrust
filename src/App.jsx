import { useMemo, useState } from "react";
import { defaultAssumptions, computeMetrics } from "./lib/calculations.js";
import Header from "./components/Header.jsx";
import BehaviorInputs from "./components/BehaviorInputs.jsx";
import FinanceInputs from "./components/FinanceInputs.jsx";
import ResultsSummary from "./components/ResultsSummary.jsx";
import CashflowChart from "./components/CashflowChart.jsx";

export default function App() {
  const [assumptions, setAssumptions] = useState(defaultAssumptions);

  const update = (patch) => setAssumptions((prev) => ({ ...prev, ...patch }));

  const metrics = useMemo(() => computeMetrics(assumptions), [assumptions]);

  return (
    <div className="min-h-screen bg-paper">
      <Header />

      <main className="max-w-5xl mx-auto px-5 py-8 grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-5">
          <BehaviorInputs assumptions={assumptions} update={update} />
          <FinanceInputs assumptions={assumptions} update={update} />
        </div>

        <div className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          <ResultsSummary metrics={metrics} assumptions={assumptions} />
          <CashflowChart metrics={metrics} assumptions={assumptions} />
        </div>
      </main>

      <footer className="max-w-5xl mx-auto px-5 py-8 text-xs text-ink/40 leading-relaxed">
        <p>
          เครื่องมือนี้เป็นการประมาณการเบื้องต้นเพื่อการศึกษาเท่านั้น ไม่ใช่คำแนะนำทางการเงินหรือการลงทุน
          ตัวเลขจริงขึ้นอยู่กับใบเสนอราคา พฤติกรรมการใช้ไฟ และเงื่อนไขสินเชื่อของแต่ละบุคคล
          ควรปรึกษาผู้ติดตั้งและที่ปรึกษาทางการเงินก่อนตัดสินใจ
        </p>
        <p className="mt-2">
          อ้างอิง: ประกาศการไฟฟ้านครหลวง ที่ 58/2569 เรื่อง การรับซื้อไฟฟ้าโครงการผลิตไฟฟ้าจากพลังงานแสงอาทิตย์ที่ติดตั้งบนหลังคา
          สำหรับภาคประชาชน ประเภทบ้านอยู่อาศัย
        </p>
      </footer>
    </div>
  );
}
