export function formatTHB(value, opts = {}) {
  if (value === null || value === undefined || !isFinite(value)) return "-";
  return (
    new Intl.NumberFormat("th-TH", {
      maximumFractionDigits: opts.decimals ?? 0,
      minimumFractionDigits: opts.decimals ?? 0,
    }).format(value) + " ฿"
  );
}

export function formatPercent(value, decimals = 1) {
  if (value === null || value === undefined || !isFinite(value)) return "-";
  return (value * 100).toFixed(decimals) + "%";
}

export function formatYears(value, decimals = 1) {
  if (value === null || value === undefined || !isFinite(value)) return "ไม่คืนทุน";
  return value.toFixed(decimals) + " ปี";
}

export function formatNumber(value, decimals = 0) {
  if (value === null || value === undefined || !isFinite(value)) return "-";
  return new Intl.NumberFormat("th-TH", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(value);
}
