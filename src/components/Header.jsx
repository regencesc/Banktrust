export default function Header() {
  const rays = Array.from({ length: 12 });
  return (
    <header className="relative overflow-hidden bg-sky-900">
      <svg
        className="absolute -top-16 -right-16 w-72 h-72 opacity-40"
        viewBox="0 0 200 200"
        aria-hidden="true"
      >
        <circle cx="100" cy="100" r="34" fill="none" stroke="#EDA23A" strokeWidth="2" />
        {rays.map((_, i) => {
          const a = (i / rays.length) * Math.PI * 2;
          const x1 = 100 + 46 * Math.cos(a);
          const y1 = 100 + 46 * Math.sin(a);
          const x2 = 100 + 92 * Math.cos(a);
          const y2 = 100 + 92 * Math.sin(a);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#EDA23A"
              strokeWidth="2"
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      <div className="relative max-w-5xl mx-auto px-5 py-10 md:py-14">
        <p className="font-sans text-sun-300 text-xs tracking-[0.2em] uppercase mb-3">
          เครื่องมือประเมินการลงทุน
        </p>
        <h1 className="font-display text-3xl md:text-4xl font-semibold text-white leading-tight max-w-xl">
          โซลาร์รูฟท็อปบ้านคุณ คุ้มค่าแค่ไหน
        </h1>
        <p className="text-sky-100 text-sm mt-3 max-w-lg">
          กรอกพฤติกรรมการใช้ไฟและเงื่อนไขการเงินของคุณ ดูระยะเวลาคืนทุนและผลตอบแทนได้ทันที
          ตามเกณฑ์รับซื้อไฟฟ้าส่วนเกินของ กฟน. พ.ศ. 2569
        </p>
      </div>
    </header>
  );
}
