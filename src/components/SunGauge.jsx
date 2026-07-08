const MAX_YEARS = 15;

export default function SunGauge({ years }) {
  const clamped = years === null ? MAX_YEARS : Math.min(years, MAX_YEARS);
  const pct = years === null ? 1 : clamped / MAX_YEARS;

  // semicircle arc from -180deg (left) to 0deg (right), radius 90, center (100,100)
  const angle = Math.PI - pct * Math.PI; // radians, PI -> 0
  const cx = 100;
  const cy = 100;
  const r = 82;
  const needleX = cx + r * Math.cos(angle);
  const needleY = cy - r * Math.sin(angle);

  const arcPath = (fracStart, fracEnd, radius) => {
    const a1 = Math.PI - fracStart * Math.PI;
    const a2 = Math.PI - fracEnd * Math.PI;
    const x1 = cx + radius * Math.cos(a1);
    const y1 = cy - radius * Math.sin(a1);
    const x2 = cx + radius * Math.cos(a2);
    const y2 = cy - radius * Math.sin(a2);
    return `M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`;
  };

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 118" className="w-full max-w-[260px]">
        <path d={arcPath(0, 1, 82)} fill="none" stroke="#E7E2D3" strokeWidth="14" strokeLinecap="round" />
        <path
          d={arcPath(0, 0.33, 82)}
          fill="none"
          stroke="#4C9A6A"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d={arcPath(0.33, 0.66, 82)}
          fill="none"
          stroke="#EDA23A"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d={arcPath(0.66, 1, 82)}
          fill="none"
          stroke="#C6533F"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r="5" fill="#16231F" />
        <line
          x1={cx}
          y1={cy}
          x2={needleX}
          y2={needleY}
          stroke="#16231F"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      <div className="text-center -mt-2">
        <p className="font-display text-4xl font-semibold text-ink leading-none">
          {years !== null ? years.toFixed(1) : "—"}
        </p>
        <p className="text-sm text-ink/60 mt-1">ปีคืนทุน</p>
      </div>
    </div>
  );
}
